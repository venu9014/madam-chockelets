import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Locating Whitefield outlet in database...");
  
  const whitefieldBranch = await prisma.branch.findFirst({
    where: {
      OR: [
        { code: "WHF" },
        { name: { contains: "Whitefield" } }
      ]
    }
  });

  if (!whitefieldBranch) {
    throw new Error("CRITICAL: Whitefield outlet not found in database!");
  }

  console.log(`Found Whitefield outlet: ${whitefieldBranch.name} (${whitefieldBranch.code}, ID: ${whitefieldBranch.id})`);

  // Target employee credentials & profile
  const employeeEmail = "employee.whitefield@madamchocolate.com";
  const employeeName = "Whitefield Test Employee";
  const employeeRole = "EMPLOYEE";
  const employeeCode = "MC-WHF-003";
  const plainPassword = "MadamChoc2026!";
  const designation = "Tasting Salon & Pastry Artisan";
  const phone = "+91 98450 11013";

  // Hash password with bcrypt
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  // Check if User already exists
  let user = await prisma.user.findUnique({
    where: { email: employeeEmail }
  });

  if (!user) {
    console.log(`Creating user record for ${employeeEmail}...`);
    user = await prisma.user.create({
      data: {
        email: employeeEmail,
        passwordHash,
        name: employeeName,
        role: employeeRole,
        phone,
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        active: true,
        isDemoUser: true,
      }
    });
    console.log(`Created User: ${user.id}`);
  } else {
    console.log(`Updating existing user record ${user.id}...`);
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: employeeName,
        role: employeeRole,
        passwordHash,
        active: true,
      }
    });
  }

  // Check if Employee profile exists
  let employee = await prisma.employee.findUnique({
    where: { userId: user.id }
  });

  if (!employee) {
    // Check if code is taken
    const existingCode = await prisma.employee.findUnique({
      where: { employeeCode }
    });

    const finalCode = existingCode ? `MC-WHF-${Date.now().toString().slice(-4)}` : employeeCode;

    console.log(`Creating Employee profile with code ${finalCode}...`);
    employee = await prisma.employee.create({
      data: {
        userId: user.id,
        branchId: whitefieldBranch.id,
        employeeCode: finalCode,
        designation,
        joinedDate: new Date("2026-01-15T09:00:00Z"),
        emergencyContact: "+91 98000 00000",
        active: true,
        employmentStatus: "ACTIVE",
      }
    });
    console.log(`Created Employee: ${employee.id} (Code: ${employee.employeeCode})`);
  } else {
    console.log(`Updating Employee profile ${employee.id} to ensure Whitefield branch assignment...`);
    employee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        branchId: whitefieldBranch.id,
        active: true,
        employmentStatus: "ACTIVE",
        designation,
      }
    });
  }

  // Verify relations
  const verified = await prisma.employee.findUnique({
    where: { id: employee.id },
    include: {
      user: true,
      branch: true,
    }
  });

  console.log("\n=== VERIFICATION SUCCESS ===");
  console.log("User ID:", verified.user.id);
  console.log("Name:", verified.user.name);
  console.log("Email:", verified.user.email);
  console.log("Role:", verified.user.role);
  console.log("Employee Code (ID):", verified.employeeCode);
  console.log("Employee Record ID:", verified.id);
  console.log("Assigned Branch:", verified.branch.name, `(${verified.branch.code})`);
  console.log("Branch ID:", verified.branch.id);
  console.log("Branch Wi-Fi SSID:", verified.branch.wifiSsid);
  console.log("Status: Active & Employed");
}

main()
  .catch((e) => {
    console.error("Error creating employee:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
