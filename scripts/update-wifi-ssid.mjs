import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Updating Branch Wi-Fi SSID to 'Moto G85 5G' ===");

  const branchesBefore = await prisma.branch.findMany({
    select: { id: true, code: true, name: true, wifiSsid: true, requireBssidVerification: true },
  });

  console.log("Branches before update:");
  for (const b of branchesBefore) {
    console.log(`  [${b.code}] ${b.name}: wifiSsid = "${b.wifiSsid}", requireBssidVerification = ${b.requireBssidVerification}`);
  }

  const result = await prisma.branch.updateMany({
    data: {
      wifiSsid: "Moto G85 5G",
    },
  });

  console.log(`\nUpdated ${result.count} branches to wifiSsid = "Moto G85 5G".`);

  const branchesAfter = await prisma.branch.findMany({
    select: { id: true, code: true, name: true, wifiSsid: true, requireBssidVerification: true },
  });

  console.log("\nBranches after update:");
  for (const b of branchesAfter) {
    console.log(`  [${b.code}] ${b.name}: wifiSsid = "${b.wifiSsid}", requireBssidVerification = ${b.requireBssidVerification}`);
  }

  // Also log audit events for compliance
  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  for (const b of branchesAfter) {
    await prisma.auditEvent.create({
      data: {
        actorId: owner?.id || "system",
        actorName: owner?.name || "System Administrator",
        actorRole: "OWNER",
        action: "WORKPLACE_ATTENDANCE_SETTINGS_UPDATED",
        entityType: "BRANCH",
        entityId: b.id,
        branchId: b.id,
        metadataJson: JSON.stringify({
          previousWifiSsid: "My destination_6floor",
          newWifiSsid: "Moto G85 5G",
          reason: "Live demo device Wi-Fi SSID reconfiguration",
          requireBssidVerification: b.requireBssidVerification,
        }),
      },
    });
  }

  console.log("Recorded audit log events for all updated branches.");
}

main()
  .catch((e) => {
    console.error("Update failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
