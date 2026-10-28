import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { recordAuditEvent } from "@/lib/audit";
import { DEFAULT_AUTHORIZED_SSID } from "@/lib/bakery-categories";

export const dynamic = "force-dynamic";

/**
 * GET /api/branches
 * Returns all registered bakery outlets / branches from the database.
 * Accessible by all authenticated users to populate branch selectors and headers.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    let branchWhere: any = includeInactive ? {} : { active: true };

    // Role-based outlet visibility:
    // Ordinary employees can strictly ONLY access their assigned branch
    if (user.role === ROLES.EMPLOYEE) {
      if (user.branchId) {
        branchWhere = { ...branchWhere, id: user.branchId };
      } else {
        branchWhere = { ...branchWhere, id: "NONE" };
      }
    }

    const branches = await prisma.branch.findMany({
      where: branchWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        geofenceType: true,
        geofenceRadiusMeters: true,
        maxGpsAccuracyMeters: true,
        maxLocationAgeSeconds: true,
        wifiVerificationPolicy: true,
        wifiSsid: true,
        wifiBssid: true,
        requireBssidVerification: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, branches });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("GET /api/branches error:", error);
    return NextResponse.json({ error: "Failed to load boutique outlets." }, { status: 500 });
  }
}

/**
 * POST /api/branches
 * Creates and persists a new bakery outlet in the database.
 * Authorized ONLY for Owner role.
 */
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
      wifiVerificationPolicy = "GPS_AND_WIFI",
      wifiSsid = DEFAULT_AUTHORIZED_SSID,
      active = true,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Outlet name is required." }, { status: 400 });
    }

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "3-letter outlet code is required." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    if (latitude == null || longitude == null || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return NextResponse.json({ error: "Valid latitude and longitude coordinates are required." }, { status: 400 });
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return NextResponse.json({ error: "Coordinates are outside valid geographic range." }, { status: 400 });
    }

    // Check for code uniqueness to avoid duplicates
    const existingByCode = await prisma.branch.findUnique({
      where: { code: cleanCode },
    });

    if (existingByCode) {
      return NextResponse.json(
        { error: `An outlet with code "${cleanCode}" already exists (${existingByCode.name}).` },
        { status: 409 }
      );
    }

    const existingByName = await prisma.branch.findFirst({
      where: { name: name.trim() },
    });

    if (existingByName) {
      return NextResponse.json(
        { error: `An outlet named "${name.trim()}" already exists (Code: ${existingByName.code}).` },
        { status: 409 }
      );
    }

    const branch = await prisma.branch.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        address: address?.trim() || `${name.trim()}, Bengaluru`,
        city,
        state,
        postalCode,
        latitude: latNum,
        longitude: lngNum,
        geofenceRadiusMeters: parseFloat(geofenceRadiusMeters) || 150.0,
        maxGpsAccuracyMeters: parseFloat(maxGpsAccuracyMeters) || 50.0,
        maxLocationAgeSeconds: parseInt(maxLocationAgeSeconds, 10) || 60,
        geofenceType,
        wifiVerificationPolicy,
        wifiSsid: wifiSsid ? wifiSsid.trim() : DEFAULT_AUTHORIZED_SSID,
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
    console.error("POST /api/branches error:", error);
    return NextResponse.json({ error: "Failed to create outlet." }, { status: 500 });
  }
}
