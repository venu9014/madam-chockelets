import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCurrentUser } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await recordAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "USER_LOGOUT",
      entityType: "USER",
      entityId: user.id,
      branchId: user.branchId || null,
      metadata: { method: "MANUAL_LOGOUT" },
    });
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
