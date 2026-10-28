import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, active: true },
      },
      branch: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  console.log(`Total employees in database: ${employees.length}`);
  for (const emp of employees) {
    console.log(
      `ID: ${emp.id} | Code: ${emp.employeeCode} | Name: ${emp.user.name} | Role: ${emp.user.role} | Active: ${emp.active} (UserActive: ${emp.user.active}) | Branch: ${emp.branch.code}`
    );
  }
}

main().finally(() => prisma.$disconnect());
