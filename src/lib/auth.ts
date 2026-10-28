import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { ROLES, UserRole } from "./constants";

const JWT_SECRET = process.env.JWT_SECRET || "dev-fallback-secret-madam-chocolate-2026";
export const SESSION_COOKIE_NAME = "mc_ops_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  employeeId?: string | null;
  isDemoUser: boolean;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function signSessionToken(payload: {
  userId: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifySessionToken(token: string): {
  userId: string;
  email: string;
  role: string;
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated user from the session cookie,
 * hydration-checked against the database for live status and branch association.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifySessionToken(token);
    if (!decoded?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, active: true },
      include: {
        employee: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      branchId: user.employee?.branchId ?? null,
      branchCode: user.employee?.branch?.code ?? null,
      branchName: user.employee?.branch?.name ?? null,
      employeeId: user.employee?.id ?? null,
      isDemoUser: user.isDemoUser,
    };
  } catch (err) {
    console.error("Error retrieving current user:", err);
    return null;
  }
}

/**
 * Server-side guard: Ensures the user is logged in and possesses one of the allowed roles.
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error(
      `FORBIDDEN: User role '${user.role}' lacks permission for this action.`
    );
  }

  return user;
}

/**
 * Server-side guard: Validates that the caller has access to the specified branch.
 * - OWNER & AUDITOR have global read/access across all branches.
 * - BRANCH_MANAGER & EMPLOYEE have access ONLY to their assigned branch.
 */
export async function requireBranchAccess(branchId: string, allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth(allowedRoles);

  if (user.role === ROLES.OWNER || user.role === ROLES.AUDITOR) {
    return user;
  }

  if (user.branchId !== branchId) {
    throw new Error(
      `FORBIDDEN: Access to branch '${branchId}' is restricted for your account.`
    );
  }

  return user;
}

/**
 * Permission checks matrix
 */
export const PERMISSIONS = {
  canManageUsers: (role: UserRole) => role === ROLES.OWNER,
  canManageSops: (role: UserRole) => role === ROLES.OWNER,
  canApproveAdjustments: (role: UserRole) => role === ROLES.OWNER,
  canReviewTasks: (role: UserRole) => role === ROLES.BRANCH_MANAGER,
  canReviewAttendanceExceptions: (role: UserRole) => role === ROLES.BRANCH_MANAGER,
  canInitiateTransfers: (role: UserRole) =>
    role === ROLES.OWNER || role === ROLES.BRANCH_MANAGER,
  canConductStockCount: (role: UserRole) =>
    role === ROLES.BRANCH_MANAGER || role === ROLES.EMPLOYEE,
  canInvestigateDiscrepancies: (role: UserRole) =>
    role === ROLES.OWNER || role === ROLES.BRANCH_MANAGER,
  canSubmitTasks: (role: UserRole) =>
    role === ROLES.EMPLOYEE || role === ROLES.BRANCH_MANAGER,
  canPerformAttendance: (role: UserRole) =>
    role === ROLES.EMPLOYEE || role === ROLES.BRANCH_MANAGER || role === ROLES.AUDITOR,
  isAttendanceExempt: (role: UserRole) => role === ROLES.OWNER,
  canImportData: (role: UserRole) => role === ROLES.OWNER || role === ROLES.BRANCH_MANAGER,
  isReadOnly: (role: UserRole) => role === ROLES.AUDITOR,
};

/**
 * Checks if an error is an authentication or authorization failure
 * and returns the appropriate HTTP status response.
 */
export function getAuthErrorResponse(error: unknown): { error: string; status: number } | null {
  if (error instanceof Error) {
    if (error.message.startsWith("UNAUTHORIZED")) {
      return { error: error.message, status: 401 };
    }
    if (error.message.startsWith("FORBIDDEN")) {
      return { error: error.message, status: 403 };
    }
  }
  return null;
}

