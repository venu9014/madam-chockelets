import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();

    const whereClause: any = {
      OR: [
        { userId: user.id },
        { branchId: user.branchId || undefined },
        { userId: null, branchId: null },
      ],
    };

    if (user.role === ROLES.OWNER) {
      whereClause.category = { not: "ATTENDANCE" };
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          OR: [
            { userId: user.id },
            { branchId: user.branchId || undefined },
          ],
          isRead: false,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (notificationId) {
      const notif = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notif) {
        return NextResponse.json({ error: "Notification not found." }, { status: 404 });
      }

      // Check ownership: notification must be user's own or for their assigned branch
      if (notif.userId && notif.userId !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: You cannot modify another user's notification." },
          { status: 403 }
        );
      }
      if (notif.branchId && user.role !== ROLES.OWNER && user.branchId && notif.branchId !== user.branchId) {
        return NextResponse.json(
          { error: "Forbidden: You cannot modify another branch's notification." },
          { status: 403 }
        );
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request parameters." }, { status: 400 });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Notifications PUT error:", error);
    return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
  }
}
