import { prisma } from "./prisma";

export interface RecordAuditParams {
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  branchId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an immutable audit record in the database.
 * Normal application workflows cannot alter or delete audit history.
 * Strips any sensitive keys (passwords, tokens) before serializing metadata.
 */
export async function recordAuditEvent({
  actorId,
  actorName,
  actorRole,
  action,
  entityType,
  entityId,
  branchId,
  metadata,
  ipAddress = "127.0.0.1",
  userAgent,
}: RecordAuditParams) {
  try {
    let cleanMetadata: string | null = null;
    if (metadata) {
      const sanitized = { ...metadata };
      // Defensive removal of sensitive fields
      delete (sanitized as Record<string, unknown>).password;
      delete (sanitized as Record<string, unknown>).passwordHash;
      delete (sanitized as Record<string, unknown>).token;
      delete (sanitized as Record<string, unknown>).jwt;
      delete (sanitized as Record<string, unknown>).secret;
      cleanMetadata = JSON.stringify(sanitized);
    }

    return await prisma.auditEvent.create({
      data: {
        actorId: actorId || null,
        actorName,
        actorRole,
        action,
        entityType,
        entityId: entityId || null,
        branchId: branchId || null,
        metadataJson: cleanMetadata,
        ipAddress,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    // In production, log to structured observability. Never throw to break user workflows if logging fails.
    console.error("Failed to record audit event:", error);
    return null;
  }
}
