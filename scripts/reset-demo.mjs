import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

async function resetDemo() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_RESET !== "true") {
    console.error("🛑 CRITICAL SECURITY REJECTION: Demo reset is permanently disabled in production environments.");
    process.exit(1);
  }

  console.log("⚠️  RESETTING DEMO DATA: Clearing fictional records from development database...");

  // Delete in reverse order of foreign key dependency
  await prisma.importRowError.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.stockAdjustmentRequest.deleteMany();
  await prisma.reconciliationDiscrepancy.deleteMany();
  await prisma.stockCountItem.deleteMany();
  await prisma.stockCountSession.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.networkChallengeLog.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.attendanceException.deleteMany();
  await prisma.attendanceEvent.deleteMany();
  await prisma.evidenceAttachment.deleteMany();
  await prisma.taskReview.deleteMany();
  await prisma.taskChecklistAnswer.deleteMany();
  await prisma.taskSubmission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.sopChecklistItem.deleteMany();
  await prisma.sopVersion.deleteMany();
  await prisma.sop.deleteMany();
  await prisma.floorCleanlinessInspection.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.appConfig.deleteMany();

  console.log("✓ Cleared all operational tables.");

  console.log("🌱 Re-running deterministic seed...");
  execSync("node scripts/seed.mjs", { stdio: "inherit" });

  console.log("✅ Demo environment successfully restored to pristine baseline state.");
}

resetDemo()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
