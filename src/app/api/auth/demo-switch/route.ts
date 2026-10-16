import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    // Strictly prevent demo account switching in production
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      return NextResponse.json(
        { error: "Demo switching is disabled in production." },
        { status: 403 }
      );
    }

    const { role, email } = await req.json();

    const query = email
      ? { email: email.toLowerCase() }
      : { role: role.toUpperCase(), isDemoUser: true };

    const user = await prisma.user.findFirst({
      where: query,
      include: {
        employee: {
          include: { branch: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `Demo account for role '${role}' not found.` },
        { status: 404 }
      );
    }

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "DEMO_ROLE_SWITCH",
      entityType: "USER",
      entityId: user.id,
      branchId: user.employee?.branchId || null,
      metadata: { targetRole: user.role, targetEmail: user.email },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchId: user.employee?.branchId,
        branchCode: user.employee?.branch?.code,
        branchName: user.employee?.branch?.name,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Demo switch error:", error);
    return NextResponse.json(
      { error: "Internal server error during demo role switch." },
      { status: 500 }
    );
  }
}
