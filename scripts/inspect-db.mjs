import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const models = [
    "user",
    "branch",
    "employee",
    "sop",
    "sopVersion",
    "sopStep",
    "sopChecklist",
    "task",
    "taskSubmission",
    "taskSubmissionAnswer",
    "taskSubmissionEvidence",
    "taskReview",
    "attendanceEvent",
    "attendanceSession",
    "attendanceException",
    "networkChallengeLog",
    "product",
    "inventoryMovement",
    "stockTransfer",
    "stockTransferItem",
    "stockCountSession",
    "stockCountItem",
    "reconciliationDiscrepancy",
    "stockAdjustmentRequest",
    "notification",
    "auditEvent",
    "importJob",
    "importRowError",
    "appConfig",
    "floorCleanlinessInspection"
  ];

  console.log("Database Model Counts in dev.db:");
  for (const m of models) {
    try {
      const count = await prisma[m].count();
      if (count > 0) {
        console.log(`  ${m}: ${count}`);
      }
    } catch (err) {
      // Model might not exist or error
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
