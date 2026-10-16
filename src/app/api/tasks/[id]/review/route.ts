import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const taskId = params.id;
    const body = await req.json();
    const { status, comments } = body;

    if (!["APPROVED", "REJECTED", "CHANGES_REQUESTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid review status." }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        submissions: {
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    // Branch manager permission check
    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== task.branchId) {
      return NextResponse.json({ error: "Unauthorized for another branch's tasks." }, { status: 403 });
    }

    const latestSubmission = task.submissions[0];
    if (!latestSubmission) {
      return NextResponse.json({ error: "No submission found to review." }, { status: 400 });
    }

    const review = await prisma.$transaction(async (tx) => {
      const rev = await tx.taskReview.create({
        data: {
          taskId: task.id,
          taskSubmissionId: latestSubmission.id,
          reviewerId: user.id,
          status,
          comments: comments || null,
        },
      });

      await tx.task.update({
        where: { id: task.id },
        data: { status },
      });

      // Notify the submitter
      await tx.notification.create({
        data: {
          userId: latestSubmission.submittedById,
          branchId: task.branchId,
          title: `Task ${status.replace("_", " ")}`,
          message: `Your submission for "${task.title}" was marked as ${status.toLowerCase()}.${
            comments ? ` Feedback: "${comments}"` : ""
          }`,
          category: "TASK",
          type: status === "APPROVED" ? "SUCCESS" : status === "CHANGES_REQUESTED" ? "WARNING" : "URGENT",
          linkUrl: `/dashboard/tasks?id=${task.id}`,
        },
      });

      return rev;
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `TASK_${status}`,
      entityType: "TASK",
      entityId: task.id,
      branchId: task.branchId,
      metadata: { reviewId: review.id, comments },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("Task review error:", error);
    return NextResponse.json({ error: "Failed to record task review." }, { status: 500 });
  }
}
