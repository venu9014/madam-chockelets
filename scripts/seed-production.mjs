import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

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

async function seedProduction() {
  console.log("🚀 Starting database seeding from seed-data.json...");

  const dataPath = path.resolve(__dirname, "../prisma/seed-data.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at ${dataPath}. Run scripts/export-data.mjs first.`);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);

  // 1. Branches
  console.log(`Inserting ${data.branches.length} branches...`);
  for (const b of data.branches) {
    const item = parseDates(b);
    await prisma.branch.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 2. Users
  console.log(`Inserting ${data.users.length} users...`);
  for (const u of data.users) {
    const item = parseDates(u);
    await prisma.user.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 3. Employees
  console.log(`Inserting ${data.employees.length} employees...`);
  for (const e of data.employees) {
    const item = parseDates(e);
    await prisma.employee.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 4. SOPs
  console.log(`Inserting ${data.sops.length} SOPs...`);
  for (const s of data.sops) {
    const item = parseDates(s);
    await prisma.sop.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 5. SOP Versions
  console.log(`Inserting ${data.sopVersions.length} SOP versions...`);
  for (const sv of data.sopVersions) {
    const item = parseDates(sv);
    await prisma.sopVersion.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 6. SOP Checklist Items
  if (data.sopChecklistItems?.length) {
    console.log(`Inserting ${data.sopChecklistItems.length} checklist items...`);
    for (const sci of data.sopChecklistItems) {
      const item = parseDates(sci);
      await prisma.sopChecklistItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 7. Products
  console.log(`Inserting ${data.products.length} products...`);
  for (const p of data.products) {
    const item = parseDates(p);
    await prisma.product.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 8. Tasks
  console.log(`Inserting ${data.tasks.length} tasks...`);
  for (const t of data.tasks) {
    const item = parseDates(t);
    await prisma.task.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 9. Task Submissions
  console.log(`Inserting ${data.taskSubmissions.length} task submissions...`);
  for (const ts of data.taskSubmissions) {
    const item = parseDates(ts);
    await prisma.taskSubmission.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 10. Evidence Attachments
  if (data.evidenceAttachments?.length) {
    console.log(`Inserting ${data.evidenceAttachments.length} evidence attachments...`);
    for (const ea of data.evidenceAttachments) {
      const item = parseDates(ea);
      await prisma.evidenceAttachment.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 11. Task Checklist Answers
  if (data.taskChecklistAnswers?.length) {
    console.log(`Inserting ${data.taskChecklistAnswers.length} task checklist answers...`);
    for (const tca of data.taskChecklistAnswers) {
      const item = parseDates(tca);
      await prisma.taskChecklistAnswer.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 12. Task Reviews
  console.log(`Inserting ${data.taskReviews.length} task reviews...`);
  for (const tr of data.taskReviews) {
    const item = parseDates(tr);
    await prisma.taskReview.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 13. Attendance Sessions
  console.log(`Inserting ${data.attendanceSessions.length} attendance sessions...`);
  for (const as of data.attendanceSessions) {
    const item = parseDates(as);
    await prisma.attendanceSession.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 14. Attendance Events
  console.log(`Inserting ${data.attendanceEvents.length} attendance events...`);
  for (const ae of data.attendanceEvents) {
    const item = parseDates(ae);
    await prisma.attendanceEvent.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 15. Attendance Exceptions
  if (data.attendanceExceptions?.length) {
    console.log(`Inserting ${data.attendanceExceptions.length} attendance exceptions...`);
    for (const aex of data.attendanceExceptions) {
      const item = parseDates(aex);
      await prisma.attendanceException.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 16. Network Challenge Logs
  if (data.networkChallengeLogs?.length) {
    console.log(`Inserting ${data.networkChallengeLogs.length} network challenge logs...`);
    for (const ncl of data.networkChallengeLogs) {
      const item = parseDates(ncl);
      await prisma.networkChallengeLog.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 17. Inventory Movements
  console.log(`Inserting ${data.inventoryMovements.length} inventory movements...`);
  for (const im of data.inventoryMovements) {
    const item = parseDates(im);
    await prisma.inventoryMovement.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  // 18. Stock Transfers & Items
  if (data.stockTransfers?.length) {
    console.log(`Inserting ${data.stockTransfers.length} stock transfers...`);
    for (const st of data.stockTransfers) {
      const item = parseDates(st);
      await prisma.stockTransfer.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  if (data.stockTransferItems?.length) {
    console.log(`Inserting ${data.stockTransferItems.length} stock transfer items...`);
    for (const sti of data.stockTransferItems) {
      const item = parseDates(sti);
      await prisma.stockTransferItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 19. Stock Count Sessions & Items
  if (data.stockCountSessions?.length) {
    console.log(`Inserting ${data.stockCountSessions.length} stock count sessions...`);
    for (const scs of data.stockCountSessions) {
      const item = parseDates(scs);
      await prisma.stockCountSession.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  if (data.stockCountItems?.length) {
    console.log(`Inserting ${data.stockCountItems.length} stock count items...`);
    for (const sci of data.stockCountItems) {
      const item = parseDates(sci);
      await prisma.stockCountItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 20. Reconciliation Discrepancies
  if (data.reconciliationDiscrepancies?.length) {
    console.log(`Inserting ${data.reconciliationDiscrepancies.length} reconciliation discrepancies...`);
    for (const rd of data.reconciliationDiscrepancies) {
      const item = parseDates(rd);
      await prisma.reconciliationDiscrepancy.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 21. Stock Adjustment Requests
  if (data.stockAdjustmentRequests?.length) {
    console.log(`Inserting ${data.stockAdjustmentRequests.length} adjustment requests...`);
    for (const sar of data.stockAdjustmentRequests) {
      const item = parseDates(sar);
      await prisma.stockAdjustmentRequest.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 22. Notifications
  if (data.notifications?.length) {
    console.log(`Inserting ${data.notifications.length} notifications...`);
    for (const n of data.notifications) {
      const item = parseDates(n);
      await prisma.notification.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 23. Audit Events
  if (data.auditEvents?.length) {
    console.log(`Inserting ${data.auditEvents.length} audit events...`);
    for (const ae of data.auditEvents) {
      const item = parseDates(ae);
      await prisma.auditEvent.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  // 24. Cleanliness Inspections
  if (data.floorCleanlinessInspections?.length) {
    console.log(`Inserting ${data.floorCleanlinessInspections.length} floor inspections...`);
    for (const fci of data.floorCleanlinessInspections) {
      const item = parseDates(fci);
      await prisma.floorCleanlinessInspection.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  console.log("🎉 Database seeding completed successfully!");
  await prisma.$disconnect();
}

seedProduction().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
