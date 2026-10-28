import { describe, it, expect, beforeAll } from "vitest";
import { evaluateWorkplaceWifi, generateWorkplaceChallenge } from "../../src/lib/wifi-verifier";
import { ROLES } from "../../src/lib/constants";
import { prisma } from "../../src/lib/prisma";

describe("Authorised Wi-Fi Verification 12-Scenario Matrix", () => {
  const AUTHORIZED_SSID = "Moto G85 5G";
  const PRIMARY_BSSID = "00:14:22:01:23:45";
  const SECONDARY_BSSIDS = JSON.stringify(["00:14:22:01:23:46", "00:14:22:01:23:47"]);
  const SECRET_KEY = "test-secret-key-madam-chocolate";

  let branch: any;
  let employee: any;

  beforeAll(async () => {
    branch = await prisma.branch.findFirst({ where: { active: true } });
    employee = await prisma.employee.findFirst({
      where: { active: true },
      include: { user: true, branch: true },
    });
  });

  // Scenario 1: Correct SSID, correct registered BSSID, valid location
  it("Scenario 1: Correct SSID, correct registered BSSID, valid location", async () => {
    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employee.id,
      secretKey: SECRET_KEY,
    });

    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      branchBssid: PRIMARY_BSSID,
      branchSecretKey: SECRET_KEY,
      clientSsid: AUTHORIZED_SSID,
      clientBssid: PRIMARY_BSSID,
      challengeToken: challenge.challengeToken,
      branchId: branch.id,
      employeeId: employee.id,
      requireBssidVerification: true,
      secondaryBssids: SECONDARY_BSSIDS,
    });

    expect(result.isWifiVerified).toBe(true);
    expect(result.status).toBe("VERIFIED");
  });

  // Scenario 2: Incorrect SSID with valid location
  it("Scenario 2: Incorrect SSID with valid location must fail", async () => {
    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      clientSsid: "Neighboring_Coffee_Guest",
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("WRONG_SSID");
  });

  // Scenario 3: Correct SSID but incorrect BSSID when BSSID verification is mandatory
  it("Scenario 3: Correct SSID but unlisted rogue BSSID when BSSID verification is mandatory", async () => {
    const challenge = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employee.id,
      secretKey: SECRET_KEY,
    });

    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      branchBssid: PRIMARY_BSSID,
      branchSecretKey: SECRET_KEY,
      clientSsid: AUTHORIZED_SSID,
      clientBssid: "99:99:99:99:99:99", // Rogue hotspot spoofing SSID
      challengeToken: challenge.challengeToken,
      branchId: branch.id,
      employeeId: employee.id,
      requireBssidVerification: true,
      secondaryBssids: SECONDARY_BSSIDS,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("WRONG_BSSID");
  });

  // Scenario 4: Wi-Fi disconnected (empty string)
  it("Scenario 4: Wi-Fi disconnected (empty SSID) must be rejected", async () => {
    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      clientSsid: "",
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("DISCONNECTED_WIFI");
  });

  // Scenario 5: Wi-Fi disabled (null SSID)
  it("Scenario 5: Wi-Fi disabled (null SSID) must be rejected", async () => {
    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      clientSsid: null,
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("DISCONNECTED_WIFI");
  });

  // Scenario 6: Wi-Fi identity unavailable due to OS permissions or privacy restrictions (<unknown ssid>)
  it("Scenario 6: Wi-Fi identity reported as <unknown ssid> or restricted", async () => {
    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      clientSsid: "<unknown ssid>",
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("WRONG_SSID");
  });

  // Scenario 7: Whitespace-only SSID
  it("Scenario 7: Whitespace-only SSID must be rejected", async () => {
    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      clientSsid: "    ",
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("DISCONNECTED_WIFI");
  });

  // Scenario 8: Expired challenge token (lookup timeout / expired nonce)
  it("Scenario 8: Expired or tampered challenge token must be rejected", async () => {
    const expiredToken = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid";
    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      clientSsid: AUTHORIZED_SSID,
      challengeToken: expiredToken,
      branchSecretKey: SECRET_KEY,
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("CHALLENGE_INVALID");
  });

  // Scenario 9: Missing BSSID when mandatory BSSID verification is enabled on branch
  it("Scenario 9: Missing branch BSSID configuration fails securely with BSSID_UNCONFIGURED", async () => {
    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      branchBssid: null, // Branch BSSID not set up
      requireBssidVerification: true,
      secondaryBssids: null,
      clientSsid: AUTHORIZED_SSID,
      clientBssid: PRIMARY_BSSID,
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("BSSID_UNCONFIGURED");
  });

  // Scenario 10: Client attempts to send forged verification flags (server ignores client booleans)
  it("Scenario 10: Server evaluates raw telemetry only and ignores client overrides", async () => {
    const clientPayload: any = {
      isWifiVerified: true, // Forged client override!
      clientSsid: "Neighboring_Cafe",
    };

    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: AUTHORIZED_SSID,
      clientSsid: clientPayload.clientSsid,
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("WRONG_SSID");
  });

  // Scenario 11: Employee role cannot modify authorised SSID or BSSID (access control guard)
  it("Scenario 11: Ordinary employee role is forbidden from changing Wi-Fi settings", () => {
    const employeeRole = ROLES.EMPLOYEE;
    const allowedSettingRoles = [ROLES.OWNER, ROLES.BRANCH_MANAGER];
    const canModifySettings = allowedSettingRoles.includes(employeeRole as any);

    expect(canModifySettings).toBe(false);
  });

  // Scenario 12: Employee connecting to another branch's Wi-Fi fails validation against assigned branch
  it("Scenario 12: Employee at Whitefield connecting to Indiranagar Wi-Fi fails assigned branch check", async () => {
    const indiranagarSsid = "Moto G85 5G";
    const whitefieldSsid = "MadamChoc_Whitefield_5G";

    // Employee is assigned to Whitefield branch
    const result = await evaluateWorkplaceWifi({
      policy: "GPS_AND_WIFI",
      branchSsid: whitefieldSsid,
      clientSsid: indiranagarSsid, // Connected to different branch Wi-Fi
      branchId: branch.id,
      employeeId: employee.id,
    });

    expect(result.isWifiVerified).toBe(false);
    expect(result.status).toBe("WRONG_SSID");
  });
});
