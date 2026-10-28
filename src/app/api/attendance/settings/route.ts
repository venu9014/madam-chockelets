import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";
import { validatePolygon } from "@/lib/geofence";
import { DEFAULT_AUTHORIZED_SSID } from "@/lib/bakery-categories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Only Owners, Branch Managers, and Auditors may access workplace attendance settings
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER, ROLES.AUDITOR]);
    const { searchParams } = new URL(req.url);

    let branchId: string | null | undefined = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;
    if (user.role === ROLES.BRANCH_MANAGER) {
      branchId = user.branchId || null;
    }

    let resolvedBranchId = branchId;
    if (branchId && branchId !== "ALL") {
      const foundBranch = await prisma.branch.findFirst({
        where: { OR: [{ id: branchId }, { code: branchId.toUpperCase() }] },
      });
      resolvedBranchId = foundBranch ? foundBranch.id : branchId;
    }

    const branches = await prisma.branch.findMany({
      where: resolvedBranchId && resolvedBranchId !== "ALL" ? { id: resolvedBranchId } : { active: true },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        geofenceType: true,
        geofenceRadiusMeters: true,
        geofencePolygonJson: true,
        maxGpsAccuracyMeters: true,
        maxLocationAgeSeconds: true,
        wifiVerificationPolicy: true,
        wifiSsid: true,
        wifiBssid: true,
        requireBssidVerification: true,
        secondaryBssids: true,
        active: true,
        updatedAt: true,
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ branches });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Attendance settings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance settings." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER, ROLES.BRANCH_MANAGER]);
    const body = await req.json();

    const {
      branchId,
      latitude,
      longitude,
      geofenceType,
      geofenceRadiusMeters,
      geofencePolygonJson,
      maxGpsAccuracyMeters,
      maxLocationAgeSeconds,
      wifiVerificationPolicy,
      wifiSsid,
      wifiBssid,
      requireBssidVerification,
      secondaryBssids,
      active,
    } = body;

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID is required." }, { status: 400 });
    }

    let resolvedBranchId = branchId;
    const foundBranch = await prisma.branch.findFirst({
      where: { OR: [{ id: branchId }, { code: branchId.toUpperCase() }] },
    });
    if (foundBranch) {
      resolvedBranchId = foundBranch.id;
    }

    // Branch Managers can only modify their assigned branch
    if (user.role === ROLES.BRANCH_MANAGER && user.branchId !== resolvedBranchId) {
      return NextResponse.json(
        { error: "Forbidden: You may only configure your assigned branch." },
        { status: 403 }
      );
    }

    // Validate polygon format if specified
    if (geofenceType === "POLYGON" && geofencePolygonJson) {
      try {
        const parsed = typeof geofencePolygonJson === "string" ? JSON.parse(geofencePolygonJson) : geofencePolygonJson;
        const validation = validatePolygon(parsed);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: `Invalid polygon geofence: ${validation.error}` },
            { status: 400 }
          );
        }
      } catch (parseErr) {
        return NextResponse.json(
          { error: "Invalid JSON format for polygon geofence coordinates." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.branch.update({
      where: { id: resolvedBranchId },
      data: {
        ...(latitude != null ? { latitude: parseFloat(latitude) } : {}),
        ...(longitude != null ? { longitude: parseFloat(longitude) } : {}),
        ...(geofenceType ? { geofenceType } : {}),
        ...(geofenceRadiusMeters != null ? { geofenceRadiusMeters: parseFloat(geofenceRadiusMeters) } : {}),
        ...(geofencePolygonJson !== undefined ? {
          geofencePolygonJson: typeof geofencePolygonJson === "string" ? geofencePolygonJson : JSON.stringify(geofencePolygonJson)
        } : {}),
        ...(maxGpsAccuracyMeters != null ? { maxGpsAccuracyMeters: parseFloat(maxGpsAccuracyMeters) } : {}),
        ...(maxLocationAgeSeconds != null ? { maxLocationAgeSeconds: parseInt(maxLocationAgeSeconds, 10) } : {}),
        ...(wifiVerificationPolicy ? { wifiVerificationPolicy } : {}),
        ...(wifiSsid !== undefined ? { wifiSsid } : {}),
        ...(wifiBssid !== undefined ? { wifiBssid: wifiBssid ? wifiBssid.trim() : null } : {}),
        ...(requireBssidVerification !== undefined ? { requireBssidVerification: Boolean(requireBssidVerification) } : {}),
        ...(secondaryBssids !== undefined ? {
          secondaryBssids: typeof secondaryBssids === "string" ? secondaryBssids : JSON.stringify(secondaryBssids)
        } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "WORKPLACE_ATTENDANCE_SETTINGS_UPDATED",
      entityType: "BRANCH",
      entityId: branchId,
      branchId: branchId,
      metadata: {
        geofenceType: updated.geofenceType,
        geofenceRadiusMeters: updated.geofenceRadiusMeters,
        maxGpsAccuracyMeters: updated.maxGpsAccuracyMeters,
        maxLocationAgeSeconds: updated.maxLocationAgeSeconds,
        wifiVerificationPolicy: updated.wifiVerificationPolicy,
        wifiSsid: updated.wifiSsid,
        requireBssidVerification: updated.requireBssidVerification,
      },
    });

    return NextResponse.json({ success: true, branch: updated });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Attendance settings PUT error:", error);
    return NextResponse.json({ error: "Failed to update attendance settings." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER]);
    const body = await req.json();
    const {
      name,
      code,
      address,
      city = "Bengaluru",
      state = "Karnataka",
      postalCode = "560048",
      latitude,
      longitude,
      geofenceRadiusMeters = 150.0,
      maxGpsAccuracyMeters = 50.0,
      maxLocationAgeSeconds = 60,
      geofenceType = "CIRCLE",
      geofencePolygonJson,
      wifiVerificationPolicy = "GPS_AND_WIFI",
      wifiSsid = DEFAULT_AUTHORIZED_SSID,
      wifiBssid = null,
      requireBssidVerification = false,
      secondaryBssids,
      active = true,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Outlet name is required." }, { status: 400 });
    }

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Outlet code is required." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    if (latitude == null || longitude == null || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return NextResponse.json({ error: "Valid latitude and longitude coordinates are required." }, { status: 400 });
    }

    // Check for code uniqueness
    const existing = await prisma.branch.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `An outlet with code "${cleanCode}" already exists.` }, { status: 409 });
    }

    if (geofenceType === "POLYGON" && geofencePolygonJson) {
      try {
        const parsed = typeof geofencePolygonJson === "string" ? JSON.parse(geofencePolygonJson) : geofencePolygonJson;
        const validation = validatePolygon(parsed);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: `Invalid polygon geofence: ${validation.error}` },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON format for polygon geofence coordinates." },
          { status: 400 }
        );
      }
    }

    const branch = await prisma.branch.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        address: address?.trim() || `${name.trim()}, Bengaluru`,
        city,
        state,
        postalCode,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        geofenceRadiusMeters: parseFloat(geofenceRadiusMeters) || 150.0,
        maxGpsAccuracyMeters: parseFloat(maxGpsAccuracyMeters) || 50.0,
        maxLocationAgeSeconds: parseInt(maxLocationAgeSeconds, 10) || 60,
        geofenceType,
        geofencePolygonJson: geofencePolygonJson
          ? (typeof geofencePolygonJson === "string" ? geofencePolygonJson : JSON.stringify(geofencePolygonJson))
          : null,
        wifiVerificationPolicy,
        wifiSsid: wifiSsid ? wifiSsid.trim() : DEFAULT_AUTHORIZED_SSID,
        wifiBssid: wifiBssid ? wifiBssid.trim() : null,
        requireBssidVerification: Boolean(requireBssidVerification),
        secondaryBssids: secondaryBssids
          ? (typeof secondaryBssids === "string" ? secondaryBssids : JSON.stringify(secondaryBssids))
          : null,
        active: Boolean(active),
      },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "WORKPLACE_OUTLET_CREATED",
      entityType: "BRANCH",
      entityId: branch.id,
      branchId: branch.id,
      metadata: {
        code: branch.code,
        name: branch.name,
        latitude: branch.latitude,
        longitude: branch.longitude,
        geofenceRadiusMeters: branch.geofenceRadiusMeters,
        wifiSsid: branch.wifiSsid,
      },
    });

    return NextResponse.json({ success: true, branch }, { status: 201 });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Attendance settings POST error:", error);
    return NextResponse.json({ error: "Failed to create outlet." }, { status: 500 });
  }
}

