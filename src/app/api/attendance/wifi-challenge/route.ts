import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuthErrorResponse } from "@/lib/auth";
import { generateWorkplaceChallenge, evaluateWorkplaceWifi } from "@/lib/wifi-verifier";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Owner accounts are strictly exempt from attendance Wi-Fi verification
    if (user.role === "OWNER") {
      return NextResponse.json(
        { error: "Owner accounts are strictly exempt from attendance Wi-Fi verification." },
        { status: 403 }
      );
    }

    let employee = await prisma.employee.findFirst({
      where: user.employeeId ? { id: user.employeeId } : { userId: user.id },
      include: { branch: true },
    });

    if (!employee) {
      const defaultBranch = await prisma.branch.findFirst({ where: { active: true } });
      if (defaultBranch) {
        employee = await prisma.employee.create({
          data: {
            userId: user.id,
            branchId: defaultBranch.id,
            employeeCode: `MC-${user.role.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
            designation: `${user.role} Operations`,
            joinedDate: new Date(),
          },
          include: { branch: true },
        });
      }
    }

    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const requestedBranchParam = searchParams.get("branchId") || req.cookies.get("mc_selected_outlet")?.value;
    let branch = employee.branch;

    if (requestedBranchParam && requestedBranchParam !== "ALL") {
      const foundBranch = await prisma.branch.findFirst({
        where: {
          active: true,
          OR: [{ id: requestedBranchParam }, { code: requestedBranchParam.toUpperCase() }],
        },
      });
      if (foundBranch) {
        branch = foundBranch;
      }
    }

    const { challengeToken, expiresAt, nonce } = await generateWorkplaceChallenge({
      branchId: branch.id,
      employeeId: employee.id,
      secretKey: branch.wifiSecretKey || undefined,
      ttlSeconds: 60,
    });

    return NextResponse.json({
      success: true,
      challengeToken,
      expiresAt: expiresAt.toISOString(),
      nonce,
      workplace: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        wifiVerificationPolicy: branch.wifiVerificationPolicy,
        expectedSsid: branch.wifiSsid,
      },
    });
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Wi-Fi challenge generation error:", error);
    return NextResponse.json({ error: "Failed to generate Wi-Fi challenge." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { challengeToken, clientSsid, clientBssid } = body;

    let employee = await prisma.employee.findFirst({
      where: user.employeeId ? { id: user.employeeId } : { userId: user.id },
      include: { branch: true },
    });

    if (!employee) {
      const defaultBranch = await prisma.branch.findFirst({ where: { active: true } });
      if (defaultBranch) {
        employee = await prisma.employee.create({
          data: {
            userId: user.id,
            branchId: defaultBranch.id,
            employeeCode: user.role === "OWNER" ? "MC-EXEC-001" : `MC-${user.role.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
            designation: user.role === "OWNER" ? "Executive Founder & Chief Chocolatier" : `${user.role} Operations`,
            joinedDate: new Date(),
          },
          include: { branch: true },
        });
      }
    }

    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
    }

    const result = await evaluateWorkplaceWifi({
      policy: employee.branch.wifiVerificationPolicy,
      branchSsid: employee.branch.wifiSsid,
      branchBssid: employee.branch.wifiBssid,
      branchSecretKey: employee.branch.wifiSecretKey,
      clientSsid,
      clientBssid,
      challengeToken,
      branchId: employee.branch.id,
      employeeId: employee.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const authErr = getAuthErrorResponse(error);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }
    console.error("Wi-Fi challenge verification error:", error);
    return NextResponse.json({ error: "Failed to verify Wi-Fi challenge." }, { status: 500 });
  }
}
