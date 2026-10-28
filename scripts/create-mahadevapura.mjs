import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Creating Mahadevapura Outlet in dev.db ===");

  const existing = await prisma.branch.findFirst({
    where: {
      OR: [{ code: "MHD" }, { name: "Mahadevapura" }],
    },
  });

  if (existing) {
    console.log("Outlet already exists:", existing.name, `(${existing.code})`);
    const updated = await prisma.branch.update({
      where: { id: existing.id },
      data: {
        name: "Mahadevapura",
        latitude: 12.99023,
        longitude: 77.68781,
        active: true,
      },
    });
    console.log("Updated existing outlet with exact coordinates:", updated);
    return;
  }

  const branch = await prisma.branch.create({
    data: {
      code: "MHD",
      name: "Mahadevapura",
      address: "Outer Ring Road, Mahadevapura",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560048",
      latitude: 12.99023,
      longitude: 77.68781,
      geofenceType: "CIRCLE",
      geofenceRadiusMeters: 150.0,
      maxGpsAccuracyMeters: 50.0,
      maxLocationAgeSeconds: 60,
      wifiVerificationPolicy: "GPS_AND_WIFI",
      wifiSsid: "Moto G85 5G",
      wifiBssid: null,
      requireBssidVerification: false,
      active: true,
    },
  });

  console.log("Successfully created Mahadevapura outlet in database:");
  console.log(`  ID: ${branch.id}`);
  console.log(`  Code: ${branch.code}`);
  console.log(`  Name: ${branch.name}`);
  console.log(`  Coordinates: ${branch.latitude}° N, ${branch.longitude}° E`);
  console.log(`  Active: ${branch.active}`);
  console.log(`  Geofence Radius: ${branch.geofenceRadiusMeters}m`);
  console.log(`  Wi-Fi SSID: ${branch.wifiSsid}`);

  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  await prisma.auditEvent.create({
    data: {
      actorId: owner?.id || null,
      actorName: owner?.name || "Executive Administrator",
      actorRole: "OWNER",
      action: "WORKPLACE_OUTLET_CREATED",
      entityType: "BRANCH",
      entityId: branch.id,
      branchId: branch.id,
      metadataJson: JSON.stringify({
        code: branch.code,
        name: branch.name,
        latitude: branch.latitude,
        longitude: branch.longitude,
        geofenceRadiusMeters: branch.geofenceRadiusMeters,
        wifiSsid: branch.wifiSsid,
      }),
    },
  });
  console.log("Audit log recorded for Mahadevapura creation.");
}

main()
  .catch((e) => {
    console.error("Error creating Mahadevapura:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
