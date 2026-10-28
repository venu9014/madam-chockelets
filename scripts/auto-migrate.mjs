import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile() {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function autoMigrate() {
  loadEnvFile();
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
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_UNPOOLED || dbUrl }
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
