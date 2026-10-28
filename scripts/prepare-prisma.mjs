import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");

function preparePrisma() {
  const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  console.log(`🔍 [prepare-prisma] Detected database target: ${isPostgres ? "PostgreSQL" : "SQLite"}`);

  let schema = fs.readFileSync(schemaPath, "utf-8");

  if (isPostgres) {
    // Switch provider to postgresql
    schema = schema.replace(
      /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"[^"]*"[\s\S]*?\}/,
      `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`
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
