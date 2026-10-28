import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

async function autoMigrate() {
  const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  if (!isPostgres) {
    console.log("ℹ️ [auto-migrate] Local SQLite or no remote DB detected during build. Skipping auto-push.");
    return;
  }

  console.log("🚀 [auto-migrate] Remote PostgreSQL detected! Ensuring schema and tables are synchronized...");
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: dbUrl }
    });
    console.log("✅ [auto-migrate] Prisma schema successfully synchronized with remote PostgreSQL.");

    const prisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      }
    });

    const userCount = await prisma.user.count().catch(() => 0);
    console.log(`📊 [auto-migrate] Current user count in database: ${userCount}`);

    if (userCount === 0) {
      console.log("🌱 [auto-migrate] Database is empty. Seeding all outlets, employees, products, and attendance data from seed-data.json...");
      execSync("node scripts/seed-production.mjs", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: dbUrl }
      });
      console.log("🎉 [auto-migrate] Initial database seeding completed successfully!");
    } else {
      console.log("✅ [auto-migrate] Database already populated. Existing records preserved.");
    }

    await prisma.$disconnect();
  } catch (err) {
    console.warn("⚠️ [auto-migrate] Auto-migration warning (build will continue):", err.message);
  }
}

autoMigrate().catch((err) => {
  console.warn("⚠️ [auto-migrate] Execution error:", err.message);
});
