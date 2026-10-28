import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import {
  analyzeFloorCleanliness,
  CLEANLINESS_DISCLAIMER,
} from "@/lib/cleanliness-analyzer";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/cleanliness
 * List past floor cleanliness inspection records
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const requestedBranchId = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;

    const where: any = {};
    if (user.role === ROLES.EMPLOYEE || user.role === ROLES.BRANCH_MANAGER) {
      where.branchId = user.branchId || "NONE";
    } else if (requestedBranchId && requestedBranchId !== "ALL") {
      const foundBranch = await prisma.branch.findFirst({
        where: {
          OR: [{ id: requestedBranchId }, { code: requestedBranchId.toUpperCase() }],
        },
      });
      where.branchId = foundBranch ? foundBranch.id : requestedBranchId;
    }

    const inspections = await prisma.floorCleanlinessInspection.findMany({
      where,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        inspector: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { inspectedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ inspections });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Cleanliness GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve floor cleanliness inspections." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cleanliness
 * Analyze floor inspection image and persist verified inspection record
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.EMPLOYEE, ROLES.BRANCH_MANAGER, ROLES.AUDITOR]);
    const body = await req.json();

    const {
      branchId,
      zone = "KITCHEN",
      imageUrl,
      fileName,
      simulatedScenario,
      simulatedPreset,
      notes,
    } = body;

    let targetBranchId: string | null = null;
    if (user.role === ROLES.EMPLOYEE || user.role === ROLES.BRANCH_MANAGER) {
      if (branchId && user.branchId && branchId !== user.branchId) {
        return NextResponse.json(
          { error: "Forbidden: You cannot submit cleanliness inspections for another branch." },
          { status: 403 }
        );
      }
      targetBranchId = user.branchId || null;
    } else {
      targetBranchId = branchId || user.branchId || null;
    }

    if (targetBranchId) {
      const foundBranch = await prisma.branch.findFirst({
        where: { OR: [{ id: targetBranchId }, { code: targetBranchId.toUpperCase() }] },
      });
      if (foundBranch) {
        targetBranchId = foundBranch.id;
      }
    }

    if (!targetBranchId) {
      const firstBranch = await prisma.branch.findFirst({ where: { active: true } });
      targetBranchId = firstBranch?.id || null;
    }

    if (!targetBranchId) {
      return NextResponse.json(
        { error: "A valid boutique branch must be specified for floor inspection." },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "An inspection photograph or image URL is required." },
        { status: 400 }
      );
    }

    // Run cleanliness computer-vision analysis
    const analysis = analyzeFloorCleanliness({
      imageUrl,
      zone,
      fileName,
      simulatedScenario,
      simulatedPreset,
    });

    // Create database record
    const inspection = await prisma.floorCleanlinessInspection.create({
      data: {
        branchId: targetBranchId,
        inspectorId: user.id,
        zone,
        imageUrl,
        fileName: fileName || "floor_inspection.jpg",
        cleanlinessScore: analysis.cleanlinessScore,
        status: analysis.status,
        visibleDebris: analysis.visibleDebris,
        debrisNotes: analysis.debrisNotes,
        disclaimer: CLEANLINESS_DISCLAIMER,
        analysisDetails: JSON.stringify(analysis.metrics),
        notes: notes || null,
        inspectedAt: new Date(),
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        inspector: { select: { id: true, name: true, role: true } },
      },
    });

    // Record audit event
    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "FLOOR_CLEANLINESS_INSPECTED",
      entityType: "CLEANLINESS_INSPECTION",
      entityId: inspection.id,
      branchId: targetBranchId,
      metadata: {
        zone,
        status: analysis.status,
        cleanlinessScore: analysis.cleanlinessScore,
        visibleDebris: analysis.visibleDebris,
      },
    });

    return NextResponse.json(
      {
        success: true,
        inspection,
        analysis,
      },
      { status: 201 }
    );
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Cleanliness POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit floor cleanliness inspection." },
      { status: 500 }
    );
  }
}
