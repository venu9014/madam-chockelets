# MADAM CHOCOLATE — Digital Operations Platform

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-teal?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-green?style=for-the-badge&logo=vitest)](https://vitest.dev/)

A centralized, production-minded digital operations and multi-branch management platform engineered for **MADAM CHOCOLATE**—a luxury confectionery and contemporary Indian artisan chocolate enterprise headquartered in Bengaluru, India.

---

## 1. Executive Summary & Brand Direction

Inspired by high-contrast editorial dessert storytelling, studio product plinths, and bespoke gifting aesthetics, the Madam Chocolate platform unifies public-facing boutique presentation with an operations control center.

### Brand Design Tokens
- **Champagne Gold (`#C6A45B`)**: Signature metallic accent for display typography, badges, rules, and luxury focus indicators.
- **Royal Violet (`#6F4A91`)**: Plinth framing, executive accents, and premium badge states.
- **Blush Pink (`#EAD0E0`)**: Soft pastel backdrops and studio highlights.
- **Deep Plum (`#21182A`)**: High-contrast dark surfaces, sidebar navigation, and readable text contrast.
- **Vanilla Cream (`#FFF9F2`)**: Warm, legible background foundation across all internal pages.
- **Cocoa Brown (`#4A2926`)**: Primary readable typography for operational instructions and tables.
- **Currency & Timezone**: **INR (₹)** with fixed-precision arithmetic, and **Asia/Kolkata (IST)** for all business timestamps.

---

## 2. Core Functional Modules

1. **Executive Overview Dashboard (`/dashboard`)**:
   - Multi-branch comparison (Indiranagar, Koramangala, Whitefield).
   - Authoritative database KPIs: Active branches, staff on duty, SOP compliance rate, overdue queue, low-stock alerts, discrepancy investigations, and live audit feed.
2. **Standard Operating Procedures (`/dashboard/sops`)**:
   - 10 version-controlled operational SOPs (Opening, Closing, Hygiene, Showcase Temperatures, Daily Inventory Counts, Product Expiry).
   - Structured checklist items with numeric tolerances (e.g. 18°C–20°C store HVAC, 14°C–16°C plinth cooler).
3. **Tasks & Checklist Execution (`/dashboard/tasks`)**:
   - Daily and weekly task queues with deadlines and priorities.
   - Interactive checklist completion with numeric inputs and photo evidence attachments.
   - Manager review workflow (`APPROVE`, `REQUEST CHANGES`, `REJECT`) with auditable reviewer feedback.
4. **Staff Attendance & Geofencing Simulator (`/dashboard/attendance`)**:
   - Server-side Haversine formula calculation against store coordinates (150m boundary).
   - 6 Interactive Simulation Scenarios:
     1. Inside Geofence (Verified)
     2. Outside Geofence (750m away — triggers Exception)
     3. GPS Permission Denied
     4. Poor GPS Accuracy (>100m)
     5. Standard Checkout
     6. Fictional Data Guard
   - Manager Exception Review Queue with one-click approval/rejection.
5. **Inventory Movement Ledger (`/dashboard/inventory`)**:
   - Double-entry transaction ledger tracking receipts, purchases, POS terminal sales, customer returns, wastage, heat damage, and complimentary tastings.
   - Derived closing stock balances strictly computed from signed ledger movements.
   - Inter-branch stock transfer dispatch and receipt workflow.
6. **Stock Reconciliation & Adjustments (`/dashboard/reconciliation`)**:
   - Physical count vs expected stock variance tracking.
   - 10 distinct discrepancy scenarios (physical lower, physical higher, unrecorded wastage, delayed sales sync, pending transfers, incorrect entry, negative-stock anomaly, high-exposure variance).
   - Root-cause investigation logging.
   - Executive Owner adjustment approval workflow that transactionally posts compensating movements to the ledger.
7. **Tamper-Resistant Audit Trail (`/dashboard/audit`)**:
   - Immutable audit log capturing user authentication, task reviews, stock transfers, adjustments, and demo resets.
   - Sanitized JSON metadata inspector stripping sensitive credentials.
8. **CSV Imports & Formula-Sanitized Exports (`/dashboard/imports`)**:
   - Drag-and-drop or pre-loaded sample CSV imports for POS sales and physical stock counts.
   - Dry-run validation mode with row-level error reporting.
   - Formula injection sanitization protecting spreadsheet exports (`=`, `+`, `-`, `@` escaped).
9. **Confectionery Catalogue (`/dashboard/products`)**:
   - 18 artisan chocolate SKUs across Bars, Pralines, Truffles, Gift Hampers, Bakery, and Pantry.
10. **Public Boutique Showcase (`/`)**:
    - High-editorial consumer landing experience showcasing single-origin bars, champagne truffles, and Bengaluru boutique locations with direct launch into the operations console.

---

## 3. Technology Stack & Justified Architecture Decisions

| Tier | Technology | Rationale & Justification |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | High-performance React Server Components, server actions, and type-safe routing. |
| **Language** | TypeScript 5 (Strict Mode) | Full type-safety across models, calculations, and server guards. |
| **Styling** | Tailwind CSS | Centralized brand tokens, high-contrast typography, and responsive layouts. |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) | **Justified Deviation:** SQLite is utilized locally for 100% zero-config execution on Windows without requiring local Docker/Postgres daemons. Prisma schema is 100% compliant with PostgreSQL for production deployment. |
| **ORM** | Prisma 5 | Versioned migrations, strict foreign key constraints, cascading rules, and transactions. |
| **Authentication** | Custom Session Engine with bcryptjs & JWT | Secure HTTP-Only session cookies with 7-day expiration, generic failure responses, and server-side role/branch authorization. |
| **Test Suite** | Vitest 2.1 | Fast in-memory unit and integration test runner executing 27 automated tests. |
| **CSV Engine** | PapaParse | Client/server stream parsing with row-level error validation. |

---

## 4. Quickstart & Setup Instructions

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

### Installation & Launch

```bash
# 1. Clone or navigate to the project directory
cd "Madam choc"

# 2. Install dependencies
npm install

# 3. Synchronize database schema (creates local dev.db)
npx prisma db push

# 4. Seed deterministic fictional demonstration dataset
node scripts/seed.mjs

# 5. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the **Public Luxury Boutique Experience**, or navigate directly to [http://localhost:3000/login](http://localhost:3000/login) or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to explore the operations platform.

---

## 5. Fictional Demo Accounts & Credentials Matrix

All accounts are seeded deterministically with the default password: **`MadamChoc2026!`**

| Persona | Role | Email | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Ananya Deshmukh** | `OWNER` | `owner@madamchocolate.com` | Full governance across all 3 branches, approve stock adjustments, view business KPIs, manage SOPs. |
| **Vikram Rathore** | `BRANCH_MANAGER` | `manager.indiranagar@madamchocolate.com` | **Restricted to Indiranagar Boutique.** Manage branch tasks, review checklists, investigate discrepancies, request adjustments. |
| **Meera Nair** | `BRANCH_MANAGER` | `manager.koramangala@madamchocolate.com` | **Restricted to Koramangala Confectionery.** Branch-level inventory and staff management. |
| **Rahul Verma** | `EMPLOYEE` | `employee.rahul@madamchocolate.com` | Assigned to Indiranagar. Complete checklists, submit photo evidence, check-in with GPS geofence. |
| **Pooja Hegde** | `AUDITOR` | `auditor@madamchocolate.com` | **Read-Only Oversight.** Inspect audit logs, inventory ledger, and discrepancy history without write permissions. |

> **Pro-Tip**: The top sticky demo banner (`DEMO ENVIRONMENT — FICTIONAL DATA`) features **1-Click Persona Switching** allowing instant switching between Owner, Manager, Employee, and Auditor personas during testing.

---

## 6. Verification of Demonstration Scenarios (Section 24)

### Scenario A: SOP Compliance & Overdue Inspection
1. Login as **Ananya Deshmukh (Owner)** via the 1-click toggle or `/login`.
2. On `/dashboard`, observe the **SOP Compliance Percentage (95.8%)** and the **Boutique Comparison Matrix** comparing Indiranagar, Koramangala, and Whitefield.
3. In the **Overdue Operational Queue**, click **Review** on an overdue checklist to open its assignment details, cut-off time, and historical attempts.

### Scenario B: Checklist Execution & Photo Evidence
1. Switch to **Rahul Verma (Employee)** via the top banner.
2. Navigate to `/dashboard/tasks` and select any `PENDING` or `IN_PROGRESS` task (e.g. *Chocolate Display Inspection*).
3. Check the verification items, observe the *[DEMO EVIDENCE]* photo attachment box, enter operational notes, and click **Submit Checklist**.
4. Switch to **Vikram Rathore (Manager - Indiranagar)**. Open the submitted task and click **Approve** or **Request Changes** with feedback notes.

### Scenario C: Attendance Exception Review
1. Navigate to `/dashboard/attendance`.
2. Under the **Interactive Attendance Simulator**, click **Scenario 2: Outside Geofence (750m)**.
3. Observe the server-side evaluation: Haversine distance (~750m) breaches the 150m boundary. An attendance exception is automatically created.
4. As Store Manager or Owner, scroll down to the **Attendance Exceptions Queue** and click **Approve** or **Reject** to resolve the punch.

### Scenario D: Stock Discrepancy & Owner Adjustment Approval
1. Navigate to `/dashboard/reconciliation`.
2. Review the 10 distinct discrepancy scenarios (e.g. *Physical Lower*, *Unrecorded Wastage*, *High-Value Celebration Hamper Variance*).
3. Click **Investigate** on any discrepancy to log root cause findings.
4. Click **Request Adjustment** to submit a formal write-down to executive management.
5. As **Owner**, click **Authorize Adjustment**. Observe that a compensating `ADJUSTMENT` movement is transactionally posted to `/dashboard/inventory` and the discrepancy is marked as `RESOLVED`.

### Scenario E: Multi-Branch & Date Filtering
1. In the top navigation header (`BrandHeader`), change the branch selector from *All Branches* to *Indiranagar Boutique & Atelier*.
2. Observe all KPI cards, overdue tasks, and inventory balances re-calculate dynamically to reflect only Indiranagar records.

### Scenario F: Immutable Audit Traceability
1. Navigate to `/dashboard/audit`.
2. Inspect the live event stream for `TASK_APPROVED`, `STOCK_ADJUSTMENT_APPROVED`, or `ATTENDANCE_CHECK_IN`.
3. Click **Inspect JSON** to review the sanitized metadata payload confirming that no passwords, tokens, or plaintext secrets were recorded.

### Scenario G: CSV Data Import Workflow
1. Navigate to `/dashboard/imports`.
2. Click **Load Fictional Sample Sales CSV**.
3. Click **1. Run Dry-Run Preview** to validate headers and detect row errors (e.g. `INVALID-SKU-99` is flagged immediately with row-level error reporting).
4. Click **2. Confirm & Commit to Ledger** to transactionally post the valid sales movements to the database.

---

## 7. Automated Test Suite Execution

The application includes unit tests (pure calculation logic, geofencing, permissions) and integration tests (database persistence, audit logging, model relations).

```bash
# Execute all automated tests
npm test
```

### Test Results
```text
 ✓ tests/unit/geofence-validation.test.ts (6 tests)
 ✓ tests/unit/inventory-calculations.test.ts (12 tests)
 ✓ tests/integration/database-workflows.test.ts (5 tests)
 ✓ tests/unit/permissions.test.ts (4 tests)

 Test Files  4 passed (4)
      Tests  27 passed (27)
```

---

## 8. Security & Production Deployment Guidance

### Production Security Checklist
- [x] No production secrets committed in source code; `.env.example` contains placeholders only.
- [x] Passwords hashed using bcrypt/argon2 with salt rounds.
- [x] HTTP-only, SameSite=Lax session cookies used for authentication.
- [x] Server-side authorization enforced on every protected query and mutation.
- [x] Branch isolation: Branch Managers strictly prohibited from querying or mutating other branches.
- [x] CSV formula injection prevented by escaping `=`, `+`, `-`, `@` characters in export data.
- [x] Development demo reset endpoint blocked in production (`process.env.NODE_ENV === 'production'`).
- [x] Audit metadata sanitized to strip password/token keys.

### Production Deployment (e.g. Vercel + Supabase/Neon PostgreSQL)
1. In `prisma/schema.prisma`, update datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set environment variables on your hosting provider:
   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/madam_chocolate_ops?sslmode=require"
   JWT_SECRET="generate-a-cryptographically-secure-random-32-byte-secret"
   NODE_ENV="production"
   NEXT_PUBLIC_APP_ENV="production"
   NEXT_PUBLIC_DEMO_MODE="false"
   ```
3. Run migrations and build:
   ```bash
   npx prisma migrate deploy
   npm run build
   ```

### Database Backup & Disaster Recovery
- **Development (SQLite)**: Regular hot backup using `npx prisma db pull` or backing up `dev.db`.
- **Production (PostgreSQL)**: Automated daily snapshots via `pg_dump`:
  ```bash
  pg_dump -U postgres -d madam_chocolate_ops -F c -b -v -f madam_choc_backup_$(date +%Y%m%d).dump
  ```
  Restoration:
  ```bash
  pg_restore -U postgres -d madam_chocolate_ops -v madam_choc_backup_20261016.dump
  ```

---

## 9. Known Limitations & Future Enterprise Roadmap

1. **Hardware Biometric Terminals**: Physical fingerprint/face scanners are simulated via GPS geofencing; an enterprise production deployment would integrate ZKTeco or HID hardware via Webhooks.
2. **Third-Party SMS/WhatsApp Delivery**: In-app notifications are persisted in the database; real SMS/WhatsApp OTP alerts require configuring Twilio or Gupshup API keys in production.
3. **External ERP & POS Synchronization**: Demonstrates robust CSV imports; an enterprise deployment would attach direct webhooks to Petpooja or Posist POS systems.
