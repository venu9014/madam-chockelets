import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.OWNER]);

    // Safety checks against production
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_RESET !== "true") {
      return NextResponse.json(
        { error: "Demo reset is disabled in production environments." },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (body.confirmation !== "RESET_DEMO_DATA") {
      return NextResponse.json(
        { error: 'Confirmation phrase mismatch. Please enter "RESET_DEMO_DATA" to proceed.' },
        { status: 400 }
      );
    }

    // Run reset script
    const { stdout, stderr } = await execPromise("node scripts/reset-demo.mjs");

    return NextResponse.json({
      success: true,
      message: "Demo dataset successfully reset to baseline.",
      details: stdout,
    });
  } catch (error) {
    console.error("Demo reset error:", error);
    return NextResponse.json({ error: "Failed to reset demo dataset." }, { status: 500 });
  }
}
