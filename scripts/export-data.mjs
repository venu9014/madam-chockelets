import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function exportData() {
  console.log("📦 Exporting all database records from current database...");

  const data = {
    exportedAt: new Date().toISOString(),
    branches: await prisma.branch.findMany({ orderBy: { id: "asc" } }),
    users: await prisma.user.findMany({ orderBy: { id: "asc" } }),
    employees: await prisma.employee.findMany({ orderBy: { id: "asc" } }),
    sops: await prisma.sop.findMany({ orderBy: { id: "asc" } }),
    sopVersions: await prisma.sopVersion.findMany({ orderBy: { id: "asc" } }),
    sopChecklistItems: await prisma.sopChecklistItem.findMany({ orderBy: { id: "asc" } }),
    products: await prisma.product.findMany({ orderBy: { id: "asc" } }),
    tasks: await prisma.task.findMany({ orderBy: { id: "asc" } }),
    taskSubmissions: await prisma.taskSubmission.findMany({ orderBy: { id: "asc" } }),
    taskChecklistAnswers: await prisma.taskChecklistAnswer.findMany({ orderBy: { id: "asc" } }),
    evidenceAttachments: await prisma.evidenceAttachment.findMany({ orderBy: { id: "asc" } }),
    taskReviews: await prisma.taskReview.findMany({ orderBy: { id: "asc" } }),
    attendanceSessions: await prisma.attendanceSession.findMany({ orderBy: { id: "asc" } }),
    attendanceEvents: await prisma.attendanceEvent.findMany({ orderBy: { id: "asc" } }),
    attendanceExceptions: await prisma.attendanceException.findMany({ orderBy: { id: "asc" } }),
    networkChallengeLogs: await prisma.networkChallengeLog.findMany({ orderBy: { id: "asc" } }),
    inventoryMovements: await prisma.inventoryMovement.findMany({ orderBy: { id: "asc" } }),
    stockTransfers: await prisma.stockTransfer.findMany({ orderBy: { id: "asc" } }),
    stockTransferItems: await prisma.stockTransferItem.findMany({ orderBy: { id: "asc" } }),
    stockCountSessions: await prisma.stockCountSession.findMany({ orderBy: { id: "asc" } }),
    stockCountItems: await prisma.stockCountItem.findMany({ orderBy: { id: "asc" } }),
    reconciliationDiscrepancies: await prisma.reconciliationDiscrepancy.findMany({ orderBy: { id: "asc" } }),
    stockAdjustmentRequests: await prisma.stockAdjustmentRequest.findMany({ orderBy: { id: "asc" } }),
    notifications: await prisma.notification.findMany({ orderBy: { id: "asc" } }),
    auditEvents: await prisma.auditEvent.findMany({ orderBy: { id: "asc" } }),
    importJobs: await prisma.importJob.findMany({ orderBy: { id: "asc" } }),
    importRowErrors: await prisma.importRowError.findMany({ orderBy: { id: "asc" } }),
    appConfigs: await prisma.appConfig.findMany({ orderBy: { id: "asc" } }),
    floorCleanlinessInspections: await prisma.floorCleanlinessInspection.findMany({ orderBy: { id: "asc" } }),
  };

  const outputPath = path.resolve(__dirname, "../prisma/seed-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");

  const counts = Object.entries(data)
    .filter(([k, v]) => Array.isArray(v) && v.length > 0)
    .map(([k, v]) => `${k}: ${v.length}`)
    .join(", ");

  console.log(`✅ Successfully exported database to ${outputPath}`);
  console.log(`📊 Summary: ${counts}`);

  await prisma.$disconnect();
}

exportData().catch((err) => {
  console.error("❌ Export failed:", err);
  process.exit(1);
});
