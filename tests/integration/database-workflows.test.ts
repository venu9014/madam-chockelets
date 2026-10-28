import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { recordAuditEvent } from "../../src/lib/audit";

describe("Database Workflows Integration Tests", () => {
  it("should have seeded the Bengaluru branches including Mahadevapura", async () => {
    const branches = await prisma.branch.findMany({
      where: { active: true },
    });
    expect(branches.length).toBeGreaterThanOrEqual(3);

    const codes = branches.map((b) => b.code);
    expect(codes).toContain("IND");
    expect(codes).toContain("KOR");
    expect(codes).toContain("WHF");
    expect(codes).toContain("MHD");
  });

  it("should have seeded products with positive cost and selling prices", async () => {
    const products = await prisma.product.findMany();
    expect(products.length).toBeGreaterThanOrEqual(15);

    products.forEach((p) => {
      expect(p.costPrice).toBeGreaterThan(0);
      expect(p.sellingPrice).toBeGreaterThan(p.costPrice); // Profitable pricing
      expect(p.sku.startsWith("MC-")).toBe(true);
    });
  });

  it("should have seeded all 10 SOP definitions", async () => {
    const sops = await prisma.sop.findMany({
      include: { versions: { include: { checklistItems: true } } },
    });
    expect(sops.length).toBe(10);

    const hasOpening = sops.some((s) => s.code === "SOP-OPEN-01");
    const hasRecon = sops.some((s) => s.code === "SOP-RECON-10");
    expect(hasOpening).toBe(true);
    expect(hasRecon).toBe(true);
  });

  it("should record immutable audit events without leaking sensitive metadata", async () => {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    const event = await recordAuditEvent({
      actorId: owner?.id || null,
      actorName: "Test Suite Runner",
      actorRole: "QA_ENGINEER",
      action: "TEST_VERIFICATION_EVENT",
      entityType: "SYSTEM",
      entityId: "test-system-01",
      metadata: {
        safeField: "Operational value",
        password: "DO_NOT_STORE_THIS_PASSWORD", // Must be stripped!
        secret: "DO_NOT_STORE_SECRET",           // Must be stripped!
      },
    });

    expect(event).not.toBeNull();
    expect(event?.action).toBe("TEST_VERIFICATION_EVENT");

    if (event?.metadataJson) {
      const parsed = JSON.parse(event.metadataJson);
      expect(parsed.safeField).toBe("Operational value");
      expect(parsed.password).toBeUndefined();
      expect(parsed.secret).toBeUndefined();
    }
  });

  it("should verify reconciliation discrepancies are recorded", async () => {
    const discrepancies = await prisma.reconciliationDiscrepancy.findMany();
    expect(discrepancies.length).toBeGreaterThanOrEqual(10);
  });
});
