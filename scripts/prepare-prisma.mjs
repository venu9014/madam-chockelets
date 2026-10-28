import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");

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

function preparePrisma() {
  loadEnvFile();
  const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  console.log(`🔍 [prepare-prisma] Detected database target: ${isPostgres ? "PostgreSQL" : "SQLite"}`);

  let schema = fs.readFileSync(schemaPath, "utf-8");

  if (isPostgres) {
    const directUrlLine = (process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING)
      ? '\n  directUrl = env("DATABASE_URL_UNPOOLED")'
      : '';
    // Switch provider to postgresql
    schema = schema.replace(
      /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"[^"]*"[\s\S]*?\}/,
      `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")${directUrlLine}\n}`
    );
    console.log("⚡ [prepare-prisma] Configured prisma/schema.prisma for PostgreSQL (Production).");
  } else {
    // Keep or revert to sqlite
    schema = schema.replace(
      /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"[^"]*"[\s\S]*?\}/,
      `datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}`
    );
    console.log("⚡ [prepare-prisma] Configured prisma/schema.prisma for SQLite (Local).");
  }

  fs.writeFileSync(schemaPath, schema, "utf-8");
}

preparePrisma();
