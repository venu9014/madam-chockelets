import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/branches/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const branch = await prisma.branch.findFirst({
      where: { OR: [{ id: params.id }, { code: params.id.toUpperCase() }] },
    });

    if (!branch) {
      return NextResponse.json({ error: "Outlet not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    return NextResponse.json({ error: "Failed to load outlet." }, { status: 500 });
  }
}

/**
 * PUT /api/branches/[id]
 * Updates outlet details, coordinates, or active status.
 * Restricted to Owner or assigned Branch Manager.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);

    const existing = await prisma.branch.findFirst({
      where: { OR: [{ id: params.id }, { code: params.id.toUpperCase() }] },
    });

    if (!existing) {
      return NextResponse.json({ error: "Outlet not found." }, { status: 404 });
    }

    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== existing.id) {
      return NextResponse.json({ error: "Forbidden: You may only modify your assigned outlet." }, { status: 403 });
    }

    const body = await req.json();
    const { name, address, latitude, longitude, geofenceRadiusMeters, wifiSsid, active } = body;

    const updated = await prisma.branch.update({
      where: { id: existing.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(address?.trim() ? { address: address.trim() } : {}),
        ...(latitude != null && !isNaN(parseFloat(latitude)) ? { latitude: parseFloat(latitude) } : {}),
        ...(longitude != null && !isNaN(parseFloat(longitude)) ? { longitude: parseFloat(longitude) } : {}),
        ...(geofenceRadiusMeters != null ? { geofenceRadiusMeters: parseFloat(geofenceRadiusMeters) } : {}),
        ...(wifiSsid !== undefined ? { wifiSsid: wifiSsid ? wifiSsid.trim() : null } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "WORKPLACE_OUTLET_UPDATED",
      entityType: "BRANCH",
      entityId: updated.id,
      branchId: updated.id,
      metadata: {
        name: updated.name,
        code: updated.code,
        latitude: updated.latitude,
        longitude: updated.longitude,
        active: updated.active,
      },
    });

    return NextResponse.json({ success: true, branch: updated });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    return NextResponse.json({ error: "Failed to update outlet." }, { status: 500 });
  }
}

/**
 * DELETE /api/branches/[id]
 * Soft-deactivates an outlet (Owner only).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth([ROLES.OWNER]);

    const existing = await prisma.branch.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Outlet not found." }, { status: 404 });
    }

    const updated = await prisma.branch.update({
      where: { id: params.id },
      data: { active: false },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "WORKPLACE_OUTLET_DEACTIVATED",
      entityType: "BRANCH",
      entityId: updated.id,
      branchId: updated.id,
      metadata: { code: updated.code, name: updated.name },
    });

    return NextResponse.json({ success: true, branch: updated });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    return NextResponse.json({ error: "Failed to deactivate outlet." }, { status: 500 });
  }
}
