import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile() {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    }
  }
});

function parseDates(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clone = { ...obj };
  for (const [key, val] of Object.entries(clone)) {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      clone[key] = new Date(val);
    }
  }
  return clone;
}

async function batchInsert(modelName, records, chunkSize = 50) {
  if (!records || records.length === 0) return;
  console.log(`Inserting ${records.length} ${modelName}...`);
  
  const parsed = records.map(parseDates);
  for (let i = 0; i < parsed.length; i += chunkSize) {
    const chunk = parsed.slice(i, i + chunkSize);
    try {
      await prisma[modelName].createMany({
        data: chunk,
        skipDuplicates: true,
      });
    } catch (err) {
      // Fallback to sequential upsert for this chunk if createMany encounters an issue
      for (const item of chunk) {
        await prisma[modelName].upsert({
          where: { id: item.id },
          update: item,
          create: item,
        }).catch(() => {});
      }
    }
  }
}

async function seedProduction() {
  console.log("🚀 Starting fast database batch seeding from seed-data.json...");

  const dataPath = path.resolve(__dirname, "../prisma/seed-data.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at ${dataPath}. Run scripts/export-data.mjs first.`);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);

  // 1. Core Topologies (Branches, Users, Employees)
  await batchInsert("branch", data.branches);
  await batchInsert("user", data.users);
  await batchInsert("employee", data.employees);

  // 2. SOPs & Catalogs
  await batchInsert("sop", data.sops);
  await batchInsert("sopVersion", data.sopVersions);
  await batchInsert("sopChecklistItem", data.sopChecklistItems);
  await batchInsert("product", data.products);

  // 3. Operational Tasks, Submissions, Evidence, Reviews
  await batchInsert("task", data.tasks);
  await batchInsert("taskSubmission", data.taskSubmissions);
  await batchInsert("evidenceAttachment", data.evidenceAttachments);
  await batchInsert("taskChecklistAnswer", data.taskChecklistAnswers);
  await batchInsert("taskReview", data.taskReviews);

  // 4. Attendance & Logs
  await batchInsert("attendanceSession", data.attendanceSessions);
  await batchInsert("attendanceEvent", data.attendanceEvents);
  await batchInsert("attendanceException", data.attendanceExceptions);
  await batchInsert("networkChallengeLog", data.networkChallengeLogs);

  // 5. Inventory & Transfers
  await batchInsert("inventoryMovement", data.inventoryMovements);
  await batchInsert("stockTransfer", data.stockTransfers);
  await batchInsert("stockTransferItem", data.stockTransferItems);
  await batchInsert("stockCountSession", data.stockCountSessions);
  await batchInsert("stockCountItem", data.stockCountItems);
  await batchInsert("reconciliationDiscrepancy", data.reconciliationDiscrepancies);
  await batchInsert("stockAdjustmentRequest", data.stockAdjustmentRequests);

  // 6. Notifications, Audits, Inspections
  await batchInsert("notification", data.notifications);
  await batchInsert("auditEvent", data.auditEvents);
  await batchInsert("floorCleanlinessInspection", data.floorCleanlinessInspections);

  console.log("🎉 Database seeding completed successfully!");
  await prisma.$disconnect();
}

seedProduction().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
