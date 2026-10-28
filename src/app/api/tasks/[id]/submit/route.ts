import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth([ROLES.EMPLOYEE, ROLES.BRANCH_MANAGER]);
    const taskId = params.id;
    const body = await req.json();
    const { notes, answers = [], evidenceUrl, evidenceCaption } = body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        sopVersion: true,
        submissions: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    // Branch authorization check
    if (user.role === ROLES.EMPLOYEE && user.branchId && user.branchId !== task.branchId) {
      return NextResponse.json({ error: "Unauthorized for this branch task." }, { status: 403 });
    }

    // Strict assigned employee check: Employee cannot submit tasks assigned to another employee
    if (
      user.role === ROLES.EMPLOYEE &&
      task.assignedEmployeeId &&
      user.employeeId &&
      task.assignedEmployeeId !== user.employeeId
    ) {
      return NextResponse.json(
        { error: "Forbidden: You cannot submit a task assigned to another employee." },
        { status: 403 }
      );
    }

    const submissionSeq = task.submissions.length + 1;

    // Transaction to create submission, answers, evidence, and update task status to SUBMITTED
    const result = await prisma.$transaction(async (tx) => {
      const submission = await tx.taskSubmission.create({
        data: {
          taskId: task.id,
          submittedById: user.id,
          notes: notes || "Operational checklist completed.",
          submissionSeq,
        },
      });

      // Save checklist answers
      for (const ans of answers) {
        if (ans.checklistItemId) {
          await tx.taskChecklistAnswer.create({
            data: {
              taskSubmissionId: submission.id,
              checklistItemId: ans.checklistItemId,
              isChecked: Boolean(ans.isChecked),
              valueText: ans.valueText || null,
              valueNumber: ans.valueNumber != null ? parseFloat(ans.valueNumber) : null,
              notes: ans.notes || null,
            },
          });
        }
      }

      // Evidence attachment
      if (evidenceUrl) {
        await tx.evidenceAttachment.create({
          data: {
            taskId: task.id,
            taskSubmissionId: submission.id,
            fileUrl: evidenceUrl,
            fileName: `evidence_task_${task.id.slice(-6)}.jpg`,
            caption: evidenceCaption || "Operational evidence photograph",
            isDemoPlaceholder: true,
          },
        });
      }

      // Update task status
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          status: "SUBMITTED",
        },
      });

      // Notification for branch managers & owners
      await tx.notification.create({
        data: {
          branchId: task.branchId,
          title: "New Task Submission",
          message: `${user.name} submitted "${task.title}". Review required.`,
          category: "TASK",
          type: "INFO",
          linkUrl: `/dashboard/tasks?id=${task.id}`,
        },
      });

      return { submission, updatedTask };
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "TASK_SUBMITTED",
      entityType: "TASK",
      entityId: task.id,
      branchId: task.branchId,
      metadata: {
        submissionSeq,
        checklistCount: answers.length,
        hasEvidence: Boolean(evidenceUrl),
      },
    });

    return NextResponse.json({ success: true, submission: result.submission });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Task submission error:", error);
    return NextResponse.json({ error: "Failed to submit task." }, { status: 500 });
  }
}
