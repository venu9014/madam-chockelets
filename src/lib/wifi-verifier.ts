import crypto from "crypto";
import { prisma } from "./prisma";
import { DEFAULT_AUTHORIZED_SSID } from "./bakery-categories";
export { DEFAULT_AUTHORIZED_SSID };

export const DEFAULT_CHALLENGE_TTL_SECONDS = 60; // 60-second fresh challenge window
export const DEFAULT_WIFI_SECRET = process.env.WIFI_CHALLENGE_SECRET || "mc-workplace-secret-key-2026";

export interface ChallengePayload {
  nonce: string;
  branchId: string;
  employeeId: string;
  timestamp: number;
  expiresAt: number;
}

export interface WifiVerificationResult {
  isWifiVerified: boolean;
  status:
    | "VERIFIED"
    | "WRONG_SSID"
    | "WRONG_BSSID"
    | "BSSID_REQUIRED"
    | "BSSID_UNCONFIGURED"
    | "DISCONNECTED_WIFI"
    | "CHALLENGE_EXPIRED"
    | "CHALLENGE_REPLAYED"
    | "CHALLENGE_INVALID"
    | "POLICY_FAILED";
  message: string;

  ssid?: string | null;
  policyUsed: string;
}

/**
 * Generates an HMAC-SHA256 cryptographic challenge token for workplace Wi-Fi / LAN presence.
 * Stored in NetworkChallengeLog for strict single-use replay protection.
 */
export async function generateWorkplaceChallenge({
  branchId,
  employeeId,
  secretKey = DEFAULT_WIFI_SECRET,
  ttlSeconds = DEFAULT_CHALLENGE_TTL_SECONDS,
}: {
  branchId: string;
  employeeId: string;
  secretKey?: string;
  ttlSeconds?: number;
}): Promise<{ challengeToken: string; expiresAt: Date; nonce: string }> {
  const nonce = crypto.randomBytes(16).toString("hex");
  const now = Date.now();
  const expiresAtMs = now + ttlSeconds * 1000;
  const expiresAt = new Date(expiresAtMs);

  const payload: ChallengePayload = {
    nonce,
    branchId,
    employeeId,
    timestamp: now,
    expiresAt: expiresAtMs,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(payloadBase64)
    .digest("hex");

  const challengeToken = `${payloadBase64}.${signature}`;

  // Persist for anti-replay verification
  await prisma.networkChallengeLog.create({
    data: {
      challengeToken,
      nonce,
      branchId,
      employeeId,
      status: "ISSUED",
      issuedAt: new Date(now),
      expiresAt,
    },
  });

  return { challengeToken, expiresAt, nonce };
}

/**
 * Validates a challenge token, enforcing HMAC signature, freshness, and single-use consumption.
 */
export async function verifyChallengeToken({
  challengeToken,
  branchId,
  employeeId,
  secretKey = DEFAULT_WIFI_SECRET,
}: {
  challengeToken?: string | null;
  branchId: string;
  employeeId: string;
  secretKey?: string;
}): Promise<{ isValid: boolean; reason?: string }> {
  if (!challengeToken || typeof challengeToken !== "string") {
    return { isValid: false, reason: "No workplace Wi-Fi challenge token provided." };
  }

  const parts = challengeToken.split(".");
  if (parts.length !== 2) {
    return { isValid: false, reason: "Malformed challenge token format." };
  }

  const [payloadBase64, signature] = parts;

  // 1. Verify HMAC signature
  const expectedSig = crypto
    .createHmac("sha256", secretKey)
    .update(payloadBase64)
    .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { isValid: false, reason: "Invalid challenge token cryptographic signature." };
  }

  // 2. Parse payload
  let payload: ChallengePayload;
  try {
    const jsonStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    payload = JSON.parse(jsonStr);
  } catch {
    return { isValid: false, reason: "Failed to decode challenge payload." };
  }

  // 3. Verify binding to branch and employee
  if (payload.branchId !== branchId) {
    return { isValid: false, reason: "Challenge was issued for a different workplace." };
  }
  if (payload.employeeId !== employeeId) {
    return { isValid: false, reason: "Challenge does not belong to the authenticated employee." };
  }

  // 4. Verify freshness / expiry
  if (Date.now() > payload.expiresAt) {
    return { isValid: false, reason: "Workplace Wi-Fi challenge has expired (60s limit). Please retry." };
  }

  // 5. Check anti-replay status in database
  const challengeLog = await prisma.networkChallengeLog.findUnique({
    where: { nonce: payload.nonce },
  });

  if (!challengeLog) {
    return { isValid: false, reason: "Unrecognized challenge nonce." };
  }

  if (challengeLog.status === "CONSUMED") {
    return { isValid: false, reason: "Challenge token has already been consumed (replay detected)." };
  }

  // Mark consumed atomically
  try {
    await prisma.networkChallengeLog.update({
      where: { id: challengeLog.id },
      data: {
        status: "CONSUMED",
        consumedAt: new Date(),
      },
    });
  } catch {
    return { isValid: false, reason: "Challenge token status could not be updated." };
  }

  return { isValid: true };
}

/**
 * Evaluates the full workplace Wi-Fi policy.
 * Supported Policies:
 * - 'GPS_AND_WIFI': Both GPS geofence and Wi-Fi network challenge must succeed.
 * - 'GPS_ONLY': Only GPS is required (Wi-Fi is recorded as optional telemetry).
 * - 'WIFI_ONLY': Only Wi-Fi verification is required.
 * - 'GPS_OR_WIFI': Either GPS or Wi-Fi is sufficient.
 */
export async function evaluateWorkplaceWifi({
  policy = "GPS_AND_WIFI",
  branchSsid,
  branchBssid,
  requireBssidVerification = false,
  secondaryBssids,
  branchSecretKey,
  clientSsid,
  clientBssid,
  challengeToken,
  branchId,
  employeeId,
  isSimulated = false,
}: {
  policy?: string;
  branchSsid?: string | null;
  branchBssid?: string | null;
  requireBssidVerification?: boolean;
  secondaryBssids?: string | string[] | null;
  branchSecretKey?: string | null;
  clientSsid?: string | null;
  clientBssid?: string | null;
  challengeToken?: string | null;
  branchId: string;
  employeeId: string;
  isSimulated?: boolean;
}): Promise<WifiVerificationResult> {
  const secret = branchSecretKey || DEFAULT_WIFI_SECRET;
  const effectiveBranchSsid = (branchSsid && branchSsid.trim()) ? branchSsid.trim() : DEFAULT_AUTHORIZED_SSID;

  // 1. If policy is GPS_ONLY, Wi-Fi verification is not mandatory
  if (policy === "GPS_ONLY") {
    return {
      isWifiVerified: true,
      status: "VERIFIED",
      message: "Workplace verification policy is configured for GPS Only.",
      ssid: clientSsid,
      policyUsed: policy,
    };
  }

  // 2. If policy requires Wi-Fi and device is not connected to any Wi-Fi
  if ((policy === "GPS_AND_WIFI" || policy === "WIFI_ONLY") && (!clientSsid || !clientSsid.trim())) {
    return {
      isWifiVerified: false,
      status: "DISCONNECTED_WIFI",
      message: `Wi-Fi Not Verified — You are not connected to the authorized workplace Wi-Fi network.`,
      ssid: null,
      policyUsed: policy,
    };
  }

  // 3. Check client SSID match if client supplied an SSID
  if (clientSsid && clientSsid.trim()) {
    const normalizedClient = clientSsid.trim().replace(/^["']|["']$/g, "");
    const normalizedBranch = effectiveBranchSsid.replace(/^["']|["']$/g, "");

    if (normalizedClient.toLowerCase() !== normalizedBranch.toLowerCase()) {
      return {
        isWifiVerified: false,
        status: "WRONG_SSID",
        message: `Wi-Fi Not Verified — You are not connected to the authorized workplace Wi-Fi network.`,
        ssid: clientSsid,
        policyUsed: policy,
      };
    }
  }

  // 4. Build approved BSSIDs list
  const approvedBssidsList: string[] = [];
  if (branchBssid && branchBssid.trim()) {
    approvedBssidsList.push(branchBssid.trim().toLowerCase());
  }
  if (secondaryBssids) {
    if (Array.isArray(secondaryBssids)) {
      secondaryBssids.forEach((b) => {
        if (typeof b === "string" && b.trim()) approvedBssidsList.push(b.trim().toLowerCase());
      });
    } else if (typeof secondaryBssids === "string") {
      try {
        const parsed = JSON.parse(secondaryBssids);
        if (Array.isArray(parsed)) {
          parsed.forEach((b: string) => {
            if (typeof b === "string" && b.trim()) approvedBssidsList.push(b.trim().toLowerCase());
          });
        }
      } catch {
        secondaryBssids.split(",").forEach((b) => {
          if (b.trim()) approvedBssidsList.push(b.trim().toLowerCase());
        });
      }
    }
  }

  // 5. Check Mandatory BSSID configuration
  if (requireBssidVerification) {
    if (approvedBssidsList.length === 0) {
      return {
        isWifiVerified: false,
        status: "BSSID_UNCONFIGURED",
        message: "Branch has mandatory BSSID verification enabled but no approved BSSID has been registered by an administrator.",
        ssid: clientSsid,
        policyUsed: policy,
      };
    }

    if (!clientBssid || !clientBssid.trim()) {
      return {
        isWifiVerified: false,
        status: "BSSID_REQUIRED",
        message: "Mandatory router BSSID verification is enabled for this branch, but no device BSSID was detected or supplied.",
        ssid: clientSsid,
        policyUsed: policy,
      };
    }
  }


  // 6. Check client BSSID against approved BSSIDs
  if (approvedBssidsList.length > 0 && clientBssid && clientBssid.trim()) {
    const normClientBssid = clientBssid.trim().toLowerCase();
    const isMatched = approvedBssidsList.includes(normClientBssid);

    if (!isMatched) {
      return {
        isWifiVerified: false,
        status: "WRONG_BSSID",
        message: `Connected Access Point BSSID (${clientBssid}) does not match authorized workplace router BSSID.`,
        ssid: clientSsid,
        policyUsed: policy,
      };
    }
  }

  // If challenge token is missing
  if (!challengeToken) {
    return {
      isWifiVerified: false,
      status: "CHALLENGE_INVALID",
      message: "Missing workplace Wi-Fi verification challenge. Please reconnect to workplace Wi-Fi and retry.",
      ssid: clientSsid,
      policyUsed: policy,
    };
  }

  // Verify cryptographic challenge token
  const challengeCheck = await verifyChallengeToken({
    challengeToken,
    branchId,
    employeeId,
    secretKey: secret,
  });

  if (!challengeCheck.isValid) {
    const isReplay = challengeCheck.reason?.includes("replay");
    const isExpired = challengeCheck.reason?.includes("expired");

    return {
      isWifiVerified: false,
      status: isReplay
        ? "CHALLENGE_REPLAYED"
        : isExpired
        ? "CHALLENGE_EXPIRED"
        : "CHALLENGE_INVALID",
      message: challengeCheck.reason || "Workplace Wi-Fi challenge verification failed.",
      ssid: clientSsid,
      policyUsed: policy,
    };
  }

  return {
    isWifiVerified: true,
    status: "VERIFIED",
    message: `Workplace Wi-Fi verified successfully (${clientSsid || effectiveBranchSsid}).`,
    ssid: clientSsid || effectiveBranchSsid,
    policyUsed: policy,
  };
}
