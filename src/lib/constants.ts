// Madam Chocolate Digital Operations Platform - Brand & System Constants

export const BRAND_TOKENS = {
  name: "MADAM CHOCOLATE",
  tagline: "Artisan Chocolate & Contemporary Indian Confections",
  colors: {
    champagneGold: "#C6A45B",
    royalViolet: "#6F4A91",
    blushPink: "#EAD0E0",
    deepPlum: "#21182A",
    vanillaCream: "#FFF9F2",
    cocoaBrown: "#4A2926",
    white: "#FFFFFF",
    mutedNeutral: "#766D78",
  },
  currency: {
    symbol: "₹",
    code: "INR",
    locale: "en-IN",
  },
  timezone: "Asia/Kolkata",
};

export const ROLES = {
  OWNER: "OWNER",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  EMPLOYEE: "EMPLOYEE",
  AUDITOR: "AUDITOR",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const TASK_STATUSES = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;

export const INVENTORY_MOVEMENT_TYPES = {
  OPENING_STOCK: "OPENING_STOCK",
  PURCHASE: "PURCHASE",
  TRANSFER_IN: "TRANSFER_IN",
  TRANSFER_OUT: "TRANSFER_OUT",
  SALE: "SALE",
  RETURN: "RETURN",
  WASTAGE: "WASTAGE",
  DAMAGED: "DAMAGED",
  COMPLIMENTARY: "COMPLIMENTARY",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export type MovementType = (typeof INVENTORY_MOVEMENT_TYPES)[keyof typeof INVENTORY_MOVEMENT_TYPES];

// Standard Multipliers for Inventory Movements:
// Quantities are multiplied by this sign to compute net expected stock impact
export const MOVEMENT_SIGN_MULTIPLIER: Record<string, number> = {
  OPENING_STOCK: 1,
  PURCHASE: 1,
  TRANSFER_IN: 1,
  RETURN: 1,
  TRANSFER_OUT: -1,
  SALE: -1,
  WASTAGE: -1,
  DAMAGED: -1,
  COMPLIMENTARY: -1,
  ADJUSTMENT: 1, // Adjustments store signed quantity directly
};

export const DEMO_USERS = [
  {
    role: ROLES.OWNER,
    email: "owner@madamchocolate.com",
    name: "Ananya Deshmukh",
    title: "Executive Owner & Chief Chocolatier",
    branchId: null, // Full access to all branches
    badge: "Full Governance",
  },
  {
    role: ROLES.BRANCH_MANAGER,
    email: "manager.indiranagar@madamchocolate.com",
    name: "Vikram Rathore",
    title: "Store General Manager",
    branchCode: "IND", // Indiranagar Branch
    badge: "Branch Manager (Indiranagar)",
  },
  {
    role: ROLES.BRANCH_MANAGER,
    email: "manager.koramangala@madamchocolate.com",
    name: "Meera Nair",
    title: "Store General Manager",
    branchCode: "KOR", // Koramangala Branch
    badge: "Branch Manager (Koramangala)",
  },
  {
    role: ROLES.EMPLOYEE,
    email: "employee.rahul@madamchocolate.com",
    name: "Rahul Verma",
    title: "Pastry & Display Specialist",
    branchCode: "IND", // Indiranagar
    badge: "Store Operations Associate",
  },
  {
    role: ROLES.AUDITOR,
    email: "auditor@madamchocolate.com",
    name: "Pooja Hegde",
    title: "Internal Operations & Stock Auditor",
    branchId: null, // Read-only across system
    badge: "Audit & Oversight (Read-Only)",
  },
];
