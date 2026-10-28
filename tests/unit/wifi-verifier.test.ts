import { describe, it, expect, beforeEach } from "vitest";
import {
  generateWorkplaceChallenge,
  verifyChallengeToken,
  evaluateWorkplaceWifi,
  DEFAULT_AUTHORIZED_SSID,
} from "../../src/lib/wifi-verifier";
import { prisma } from "../../src/lib/prisma";

describe("Workplace Wi-Fi Verification Unit Tests", () => {
  let testBranchId: string;
  let testEmployeeId: string;
  const TEST_SECRET = "super-secret-test-key-2026";

  beforeEach(async () => {
    const branch = await prisma.branch.findFirst({ where: { active: true } });
    const employee = await prisma.employee.findFirst();
    if (!branch || !employee) {
      throw new Error("Seed data missing: Branch or Employee not found.");
    }
    testBranchId = branch.id;
    testEmployeeId = employee.id;

    // Ensure clean state for test tokens
    await prisma.networkChallengeLog.deleteMany({
      where: { employeeId: testEmployeeId },
    });
  });

  describe("generateWorkplaceChallenge", () => {
    it("should issue a valid HMAC-SHA256 challenge token with correct structure", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
        ttlSeconds: 60,
      });

      expect(challenge.challengeToken).toBeDefined();
      expect(challenge.nonce).toBeDefined();
      expect(challenge.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const parts = challenge.challengeToken.split(".");
      expect(parts.length).toBe(2);

      const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
      expect(payload.branchId).toBe(testBranchId);
      expect(payload.employeeId).toBe(testEmployeeId);
      expect(payload.nonce).toBe(challenge.nonce);
    });

    it("should store challenge log with status ISSUED", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const log = await prisma.networkChallengeLog.findUnique({
        where: { nonce: challenge.nonce },
      });

      expect(log).not.toBeNull();
      expect(log?.status).toBe("ISSUED");
      expect(log?.branchId).toBe(testBranchId);
    });
  });

  describe("verifyChallengeToken", () => {
    it("should successfully verify a valid fresh challenge token", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const result = await verifyChallengeToken({
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();

      // Should be marked as CONSUMED in database
      const log = await prisma.networkChallengeLog.findUnique({
        where: { nonce: challenge.nonce },
      });
      expect(log?.status).toBe("CONSUMED");
      expect(log?.consumedAt).not.toBeNull();
    });

    it("should reject replayed challenge token (single-use enforcement)", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      // First consumption
      const firstCheck = await verifyChallengeToken({
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });
      expect(firstCheck.isValid).toBe(true);

      // Replay attempt
      const replayCheck = await verifyChallengeToken({
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });
      expect(replayCheck.isValid).toBe(false);
      expect(replayCheck.reason).toContain("replay");
    });

    it("should reject token with tampered signature", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const parts = challenge.challengeToken.split(".");
      const tamperedToken = `${parts[0]}.badsignature1234567890abcdef`;

      const result = await verifyChallengeToken({
        challengeToken: tamperedToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("signature");
    });

    it("should reject token if used for a different branch", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const result = await verifyChallengeToken({
        challengeToken: challenge.challengeToken,
        branchId: "different-branch-99",
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("different workplace");
    });

    it("should reject expired token", async () => {
      // Issue token with -10 second TTL (already expired)
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
        ttlSeconds: -10,
      });

      const result = await verifyChallengeToken({
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("expired");
    });
  });

  describe("evaluateWorkplaceWifi", () => {
    it("should default authorized network to 'Moto G85 5G'", async () => {
      expect(DEFAULT_AUTHORIZED_SSID).toBe("Moto G85 5G");
    });

    it("should pass unconditionally when policy is GPS_ONLY", async () => {
      const result = await evaluateWorkplaceWifi({
        policy: "GPS_ONLY",
        branchId: testBranchId,
        employeeId: testEmployeeId,
        clientSsid: "Any-CoffeeShop-WiFi",
      });

      expect(result.isWifiVerified).toBe(true);
      expect(result.status).toBe("VERIFIED");
    });

    it("should fail when client Wi-Fi is disconnected under GPS_AND_WIFI policy", async () => {
      const result = await evaluateWorkplaceWifi({
        policy: "GPS_AND_WIFI",
        branchSsid: "Moto G85 5G",
        clientSsid: null,
        branchId: testBranchId,
        employeeId: testEmployeeId,
      });

      expect(result.isWifiVerified).toBe(false);
      expect(result.status).toBe("DISCONNECTED_WIFI");
      expect(result.message).toContain("No active Wi-Fi connection detected");
    });

    it("should fail when client connects to unauthorized SSID", async () => {
      const result = await evaluateWorkplaceWifi({
        policy: "GPS_AND_WIFI",
        branchSsid: "Moto G85 5G",
        clientSsid: "NeighboringCafe_Guest",
        branchId: testBranchId,
        employeeId: testEmployeeId,
      });

      expect(result.isWifiVerified).toBe(false);
      expect(result.status).toBe("WRONG_SSID");
      expect(result.message).toContain("NeighboringCafe_Guest");
      expect(result.message).toContain("Moto G85 5G");
    });

    it("should fail when registered BSSID does not match", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const result = await evaluateWorkplaceWifi({
        policy: "GPS_AND_WIFI",
        branchSsid: "Moto G85 5G",
        branchBssid: "00:14:22:01:45:10",
        clientSsid: "Moto G85 5G",
        clientBssid: "00:14:22:99:99:99", // Spoofed / wrong router
        branchSecretKey: TEST_SECRET,
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
      });

      expect(result.isWifiVerified).toBe(false);
      expect(result.status).toBe("WRONG_BSSID");
      expect(result.message).toContain("router BSSID");
    });

    it("should fail when requireBssidVerification is true and client does not provide BSSID", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const result = await evaluateWorkplaceWifi({
        policy: "GPS_AND_WIFI",
        branchSsid: "Moto G85 5G",
        branchBssid: "00:14:22:01:45:10",
        clientSsid: "Moto G85 5G",
        clientBssid: null, // Client omitted BSSID
        requireBssidVerification: true,
        branchSecretKey: TEST_SECRET,
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
      });

      expect(result.isWifiVerified).toBe(false);
      expect(result.status).toBe("BSSID_REQUIRED");
      expect(result.message).toContain("Mandatory router BSSID verification is enabled");
    });

    it("should fail when requireBssidVerification is true and branch has unconfigured BSSID", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const result = await evaluateWorkplaceWifi({
        policy: "GPS_AND_WIFI",
        branchSsid: "Moto G85 5G",
        branchBssid: null,
        clientSsid: "Moto G85 5G",
        clientBssid: "00:14:22:01:45:10",
        requireBssidVerification: true,
        branchSecretKey: TEST_SECRET,
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
      });

      expect(result.isWifiVerified).toBe(false);
      expect(result.status).toBe("BSSID_UNCONFIGURED");
      expect(result.message).toContain("Branch has mandatory BSSID verification enabled but no approved BSSID");
    });

    it("should pass when client matches one of multiple approved secondary BSSIDs", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const result = await evaluateWorkplaceWifi({
        policy: "GPS_AND_WIFI",
        branchSsid: "Moto G85 5G",
        branchBssid: "00:14:22:01:45:10",
        secondaryBssids: JSON.stringify(["00:11:22:33:44:55", "aa:bb:cc:dd:ee:ff"]),
        clientSsid: "Moto G85 5G",
        clientBssid: "AA:BB:CC:DD:EE:FF", // Matches second secondary BSSID (case insensitive)
        requireBssidVerification: true,
        branchSecretKey: TEST_SECRET,
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
      });

      expect(result.isWifiVerified).toBe(true);
      expect(result.status).toBe("VERIFIED");
    });

    it("should pass when valid Moto G85 5G SSID and fresh challenge token are presented", async () => {
      const challenge = await generateWorkplaceChallenge({
        branchId: testBranchId,
        employeeId: testEmployeeId,
        secretKey: TEST_SECRET,
      });

      const result = await evaluateWorkplaceWifi({
        policy: "GPS_AND_WIFI",
        branchSsid: "Moto G85 5G",
        clientSsid: '"Moto G85 5G"', // Handles quotes returned by some OS/browsers
        branchSecretKey: TEST_SECRET,
        challengeToken: challenge.challengeToken,
        branchId: testBranchId,
        employeeId: testEmployeeId,
      });

      expect(result.isWifiVerified).toBe(true);
      expect(result.status).toBe("VERIFIED");
    });
  });
});

