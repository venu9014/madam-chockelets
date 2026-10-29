# 🍫 MADAM CHOCKELETS — DIGITAL OPERATIONS PLATFORM
## Master System Documentation & Architectural Blueprint

> **Brand Identity:** Madam Chockelets  
> **Platform Version:** 1.0.0 (Production Ready)  
> **Hosting & Runtime:** Vercel Serverless (Next.js 14 App Router, Region: `bom1` Mumbai)  
> **Database:** Neon Lakebase Postgres (Serverless Pooled + Unpooled DDL Engine)  
> **Primary Repository:** [github.com/venu9014/madam-chockelets](https://github.com/venu9014/madam-chockelets)  
> **Live Deployment:** [madam-chockelets-ghsh.vercel.app](https://madam-chockelets-ghsh.vercel.app/)

---

## 1. Executive Summary & Brand System

**Madam Chockelets** is an enterprise-grade, multi-outlet digital operations management platform engineered specifically for luxury artisan confectioneries and boutique ateliers. The platform centralizes multi-branch inventory tracking, SOP execution, staff attendance with dual geospatial + network verification, stock reconciliation, and floor hygiene monitoring into a unified, secure portal.

### Brand Visual Theme & Color Palette

The interface embodies luxury artisanal confectionery aesthetics using the official Madam Chockelets design system:

| Color Token | Hex Code | Semantic Role | Tailwind Class |
|---|---|---|---|
| **Deep Plum** | `#21182A` | Primary brand canvas, header background, dark surface | `bg-plum` |
| **Plum Dark** | `#17101E` | Sidebar background, modal backdrop, terminal cards | `bg-plum-dark` |
| **Champagne Gold (500)** | `#C6A45B` | Signature luxury accent, active pills, brand banners | `text-gold-500`, `bg-gold-500` |
| **Champagne Gold Light** | `#D4B66B` | Hover states, secondary accents, metric values | `text-gold-400`, `border-gold-400` |
| **Champagne Gold Lightest**| `#FAF7EE` | Card backgrounds, badge fills, subtle pill fills | `bg-gold-50` |
| **Royal Violet (500)** | `#6F4A91` | Secondary executive accent, auditor badges | `text-violet-500`, `bg-violet-500` |
| **Blush Pink** | `#EAD0E0` | Delicate status indicators, artisan highlights | `bg-blush-200` |
| **Vanilla Cream** | `#FFF9F2` | Page background, content container fill | `bg-cream` |
| **Cream Border** | `#EFE5D6` | Subtle dividers, card borders, table separators | `border-cream-border` |
| **Cocoa Brown** | `#4A2926` | Deep body typography, chocolate metadata labels | `text-cocoa` |

---

## 2. System Architecture & Tech Stack

- **Frontend:** Next.js 14.2.25 App Router, React 18, Tailwind CSS, Lucide React, Recharts.
- **Backend:** Next.js Serverless Route Handlers (`src/app/api/...`), TypeScript 5.6, JWT Session cookies (`mc_ops_session`).
- **Database & ORM:** Prisma 5.21.1 / 5.22.0 with Neon Lakebase Postgres (branch: `production`, AWS US-East-2 / `bom1` edge routing).
- **Security:** HTTP-only `SameSite=lax` secure JWT session tokens, bcrypt password hashing (10 salt rounds), automated immutable audit logging for all critical operations.

---

## 3. Multi-Outlet Architecture & Scoping

The platform operates across persisted physical bakery outlets in Bengaluru, enforcing strict data isolation between branches:

| Outlet Code | Outlet Name | Address | Latitude | Longitude | Approved Wi-Fi SSID | Geofence Radius |
|---|---|---|---|---|---|---|
| **`IND`** | Indiranagar Boutique & Atelier | 100 Feet Road, HAL 2nd Stage, Indiranagar | `12.978400` | `77.640800` | `Moto G85 5G` | 150 meters |
| **`KOR`** | Koramangala Flagship Confectionery | 80 Feet Road, 4th Block, Koramangala | `12.935200` | `77.624500` | `Moto G85 5G` | 150 meters |
| **`WHF`** | Whitefield Salon & Tasting Room | Prestige Ozone Gate, ITPL Main Road, Whitefield | `12.983694` | `77.766261` | `Moto G85 5G` | 150 meters |
| **`MHD`** | Mahadevapura | Outer Ring Road, Mahadevapura | `12.990230` | `77.687810` | `Moto G85 5G` | 150 meters |

### Outlet Switching & Data Scoping Rules:
1. **Executive Owner (`OWNER`):** Has global governance across all outlets. Can switch between outlets using the persistent header selector or select `ALL` outlets for consolidated financials and KPIs.
2. **Branch Manager (`BRANCH_MANAGER`):** Bound strictly to their assigned outlet (`user.branchId`). All queries, tasks, staff lists, and inventory requests are automatically scoped to their branch.
3. **Employee (`EMPLOYEE`):** Scoped exclusively to their assigned workplace. When an employee logs in, the portal automatically locks to their outlet (e.g. `WHF` for `Whitefield Test Employee`), hiding all other outlets from the interface and rejecting any cross-outlet API calls.
4. **Auditor (`AUDITOR`):** Read-only visibility across outlets for compliance auditing without modification privileges.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Functional Area | `OWNER` | `BRANCH_MANAGER` | `EMPLOYEE` | `AUDITOR` |
|---|:---:|:---:|:---:|:---:|
| **Executive Revenue & KPI Dashboard** | Full Access | Outlet Scoped | **Hidden (No Stock/Sales)** | Read-Only |
| **Outlet Management & Geofencing** | Full CRUD | View Assigned | Assigned Only | Read-Only |
| **Employee Roster & Credentials** | Full CRUD | Manage Assigned | View Assigned Peers | Read-Only |
| **Product Catalog & Pricing** | Full CRUD | View Catalog | View Products | Read-Only |
| **Inventory Ledger & Movements** | Full Access | Outlet Scoped | **Forbidden (403)** | Read-Only |
| **Stock Reconciliation & Variances** | Approve Adjustments | Submit Requests | **Forbidden (403)** | Read-Only |
| **Inter-Outlet Stock Transfers** | Full Governance | Dispatch / Receive | **Forbidden (403)** | Read-Only |
| **SOP Checklists & Operational Tasks** | Create / Assign | Assign / Review | **Execute & Submit** | Read-Only |
| **Workplace Attendance Punching** | **Exempt** | Punch In / Out | **Punch In / Out** | View Logs |
| **Attendance Exceptions & Overrides** | Resolve Any | Resolve Outlet | View Personal Status | Read-Only |
| **Floor Cleanliness Inspections** | View All | Inspect / View | Inspect / Submit | Read-Only |
| **System Audit Trails** | Full History | Outlet History | **Forbidden (403)** | Read-Only |

---

## 5. Attendance & Dual-Verification Engine

### Verification Logic & Error Messaging:
- **Independent Failure Reporting:** Wi-Fi failures and GPS failures are evaluated separately.
  - If Wi-Fi fails: *"Wi-Fi Not Verified — You are not connected to the authorized workplace Wi-Fi network."*
  - If GPS distance exceeds 150m: *"GPS Location Outside Geofence — You are X meters away from the outlet boundary."*
  - If GPS accuracy exceeds 50m: *"Location Accuracy Insufficient — Device GPS accuracy cannot confirm workplace boundary."*
- **Executive Exemption:** The `OWNER` role is strictly exempt from employee attendance tracking. Calling attendance endpoints with an Owner token returns HTTP 403 with an informative message.

---

## 6. Complete Backend REST API Reference

All routes are located under `src/app/api/`:

### 6.1 Authentication (`/api/auth/*`)
- **`POST /api/auth/login`**: Accepts `{ email, password }`. Issues signed HTTP-only `mc_ops_session` JWT cookie (7-day TTL).
- **`POST /api/auth/logout`**: Clears session cookie and invalidates client auth state.
- **`GET /api/auth/me`**: Returns current session user, role, assigned outlet, and permissions.
- **`POST /api/auth/demo-switch`**: Accepts `{ role, email }`. Quick-switches between demo personas for presentations.

### 6.2 Outlets & Branches (`/api/branches/*`)
- **`GET /api/branches`**: Lists active outlets. Ordinary employees strictly receive only their assigned outlet.
- **`POST /api/branches`**: Creates a new outlet with address, coordinates, and network settings (`OWNER` only).
- **`GET /api/branches/[id]`**: Retrieves outlet configuration.
- **`PUT /api/branches/[id]`**: Updates outlet settings, coordinates, geofence radius, or Wi-Fi credentials.
- **`DELETE /api/branches/[id]`**: Deactivates an outlet.

### 6.3 Workplace Attendance (`/api/attendance/*`)
- **`POST /api/attendance/punch`**: Records `PUNCH_IN` or `PUNCH_OUT`. Evaluates dual GPS + Wi-Fi.
- **`POST /api/attendance/checkin`**: Legacy/alternative dual verification check-in route.
- **`GET /api/attendance/session`**: Fetches active shift session, today's accumulated work minutes, and shift summary.
- **`GET /api/attendance/history`**: Scoped attendance records (Employees see self; Managers see branch).
- **`GET /api/attendance/exceptions`**: Returns flagged attendance exceptions.
- **`PUT /api/attendance/exceptions`**: Resolves exceptions with manager notes and approval status.
- **`GET /api/attendance/settings`**: Retrieves outlet geofence coordinates and Wi-Fi SSID/BSSID configurations.
- **`POST` / `PUT /api/attendance/settings`**: Updates geofence boundaries and approved network parameters.
- **`GET` / `POST /api/attendance/wifi-challenge`**: Issues and verifies cryptographic network challenges.

### 6.4 Staff & Employees (`/api/employees/*`)
- **`GET /api/employees`**: Lists staff filtered by branch and role. Scoped by user authorization.
- **`POST /api/employees`**: Registers employee profile with unique Employee Code (`MC-WHF-003`, etc.).

### 6.5 Products & Catalog (`/api/products/*`)
- **`GET /api/products`**: Product list with categories (`CHOCOLATES`, `CAKES`, `PASTRIES`, etc.) and search.
- **`POST /api/products`**: Adds new confectionery product with SKU, cost price, and retail price.
- **`GET` / `PUT` / `DELETE /api/products/[id]`**: Individual product lifecycle management.

### 6.6 Inventory & Stock Transfers (`/api/inventory/*`, `/api/transfers/*`)
- **`GET /api/inventory/movements`**: Outlet-isolated inventory ledger (`PRODUCTION`, `SALE`, `WASTAGE`).
- **`POST /api/inventory/movements`**: Records manual stock movement.
- **`GET /api/transfers`**: Lists inter-outlet transfers.
- **`POST /api/transfers`**: Dispatches stock transfer from source branch.
- **`PUT /api/transfers`**: Receives and reconciles incoming stock transfer.

### 6.7 Stock Reconciliation & Discrepancies (`/api/reconciliation/*`)
- **`GET /api/reconciliation/discrepancies`**: Lists physical stock count variances.
- **`PUT /api/reconciliation/discrepancies`**: Acknowledges or flags stock discrepancies.
- **`GET /api/reconciliation/adjustments`**: Pending and approved stock adjustment requests.
- **`POST /api/reconciliation/adjustments`**: Submits adjustment request for inventory reconciliation.
- **`PUT /api/reconciliation/adjustments`**: Approves/rejects adjustments with financial ledger write-back (`OWNER` only).

### 6.8 Operational Tasks & SOP Checklists (`/api/tasks/*`)
- **`GET /api/tasks`**: Returns shift checklist tasks scoped by outlet and role.
- **`POST /api/tasks`**: Creates and assigns tasks to employees or roles.
- **`POST /api/tasks/[id]/submit`**: Submits checklist answers and evidence photos for review.
- **`POST /api/tasks/[id]/review`**: Approves, rejects, or requests changes on task submission.

### 6.9 Floor Cleanliness & Hygiene (`/api/cleanliness/*`)
- **`GET /api/cleanliness`**: Lists historical floor cleanliness inspection scores and reports.
- **`POST /api/cleanliness`**: Submits floor inspection photo with automated blur/debris scoring.

### 6.10 Dashboard & Analytics (`/api/dashboard/*`)
- **`GET /api/dashboard/stats`**: Real-time sales, time-series, attendance rates, and stock health scoped by selected outlet. (Employee dashboard automatically excludes stock/revenue widgets).

### 6.11 Audit & Notifications (`/api/audit/*`, `/api/notifications/*`)
- **`GET /api/audit`**: Immutable audit logs of all logins, approvals, transfers, and punches.
- **`GET` / `PUT /api/notifications`**: In-app notifications with mark-as-read functionality.

---

## 7. Verified Test Personas & Login Credentials

All demo accounts use the standard password: **`MadamChoc2026!`**

| Persona | Role | Email | Assigned Outlet | Permissions |
|---|---|---|---|---|
| **Ananya Deshmukh** | `OWNER` | `owner@madamchocolate.com` | All Outlets (`ALL`) | Executive oversight, financial analytics, outlet switching, adjustment approval. Exempt from attendance. |
| **Vikram Rathore** | `BRANCH_MANAGER` | `manager.indiranagar@madamchocolate.com` | Indiranagar (`IND`) | Branch management, task assignment & review, staff roster, local stock adjustment requests. |
| **Rahul Verma** | `EMPLOYEE` | `employee.rahul@madamchocolate.com` | Indiranagar (`IND`) | Task execution, attendance punch-in/out, personal checklists. No inventory or sales graphs. |
| **Whitefield Test Employee** | `EMPLOYEE` | `employee.whitefield@madamchocolate.com` | Whitefield (`WHF`) | Dedicated Whitefield staff. Locked to Whitefield Salon coordinates (`12.983694, 77.766261`). |
| **Pooja Hegde** | `AUDITOR` | `auditor@madamchocolate.com` | All Outlets (Read-Only) | Independent audit review, inspection logs, exception monitoring, discrepancy analysis. |

---

## 8. DevOps, Neon Integration & Deployment

### Neon Lakebase Postgres Configuration (`neon.ts`)
```typescript
import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: false,
  branch: (branch) => {
    if (branch.isDefault) return {};
    if (!branch.exists) return { ttl: "7d" };
    return {};
  },
});
```

### Environment Variables for Vercel:
- **`DATABASE_URL`**: `postgresql://neondb_owner:npg_SOFg4Qw8YjHd@ep-fancy-art-b45sprt4-pooler.c-6.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require`
- **`DATABASE_URL_UNPOOLED`**: `postgresql://neondb_owner:npg_SOFg4Qw8YjHd@ep-fancy-art-b45sprt4.c-6.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require`
- **`JWT_SECRET`**: High-entropy 256-bit signing secret.
- **`NODE_ENV`**: `production`
- **`NEXT_PUBLIC_APP_ENV`**: `production`
- **`NEXT_PUBLIC_APP_NAME`**: `Madam Chockelets`
- **`NEXT_PUBLIC_DEFAULT_CURRENCY`**: `INR`
- **`NEXT_PUBLIC_TIMEZONE`**: `Asia/Kolkata`
- **`NEXT_PUBLIC_DEMO_MODE`**: `true`
