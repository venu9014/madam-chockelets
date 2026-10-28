import { describe, it, expect } from "vitest";
import {
  ALLOWED_BAKERY_CATEGORIES,
  isValidBakeryCategory,
  getBakeryCategoryLabel,
  DEFAULT_AUTHORIZED_SSID,
  BakeryCategory,
} from "../../src/lib/bakery-categories";
import {
  analyzeFloorCleanliness,
  MICROBIOLOGICAL_SAFETY_DISCLAIMER,
} from "../../src/lib/cleanliness-analyzer";
import { prisma } from "../../src/lib/prisma";

describe("Bakery Products & Category Enforcement Unit Tests", () => {
  it("should define exactly the 9 authorized bakery categories", () => {
    expect(ALLOWED_BAKERY_CATEGORIES).toHaveLength(9);
    expect(ALLOWED_BAKERY_CATEGORIES).toEqual([
      "CAKES_PASTRIES",
      "CHOCOLATES_TRUFFLES",
      "COOKIES_BISCUITS",
      "CUPCAKES_MUFFINS",
      "BREADS_BUNS",
      "DONUTS",
      "BROWNIES_BARS",
      "PUFFS_SAVOURIES",
      "INGREDIENTS_PACKAGING",
    ]);
  });

  it("should validate all 9 authorized bakery categories as valid", () => {
    ALLOWED_BAKERY_CATEGORIES.forEach((cat) => {
      expect(isValidBakeryCategory(cat)).toBe(true);
    });
  });

  it("should strictly reject any non-bakery categories", () => {
    const invalidCategories = [
      "ELECTRONICS",
      "BEVERAGES",
      "CLOTHING",
      "FAST_FOOD",
      "PIZZA",
      "COSMETICS",
      "STATIONERY",
      "",
      " ",
      null,
      undefined,
      123,
    ];

    invalidCategories.forEach((cat) => {
      expect(isValidBakeryCategory(cat)).toBe(false);
    });
  });

  it("should return human-friendly labels for each bakery category", () => {
    expect(getBakeryCategoryLabel("CAKES_PASTRIES")).toBe("Cakes & Pastries");
    expect(getBakeryCategoryLabel("CHOCOLATES_TRUFFLES")).toBe("Chocolates & Truffles");
    expect(getBakeryCategoryLabel("COOKIES_BISCUITS")).toBe("Cookies & Biscuits");
    expect(getBakeryCategoryLabel("CUPCAKES_MUFFINS")).toBe("Cupcakes & Muffins");
    expect(getBakeryCategoryLabel("BREADS_BUNS")).toBe("Breads & Buns");
    expect(getBakeryCategoryLabel("DONUTS")).toBe("Donuts");
    expect(getBakeryCategoryLabel("BROWNIES_BARS")).toBe("Brownies & Dessert Bars");
    expect(getBakeryCategoryLabel("PUFFS_SAVOURIES")).toBe("Puffs & Savouries");
    expect(getBakeryCategoryLabel("INGREDIENTS_PACKAGING")).toBe("Ingredients & Packaging");
  });

  it("should configure 'Moto G85 5G' as the default authorized Wi-Fi SSID", () => {
    expect(DEFAULT_AUTHORIZED_SSID).toBe("Moto G85 5G");
  });

  describe("Database Seeding Integrity", () => {
    it("should verify all database products belong strictly to authorized bakery categories", async () => {
      const products = await prisma.product.findMany();
      expect(products.length).toBeGreaterThan(0);

      for (const prod of products) {
        expect(isValidBakeryCategory(prod.category)).toBe(true);
      }
    });

    it("should verify all bakery branches are configured with default SSID 'Moto G85 5G'", async () => {
      const branches = await prisma.branch.findMany();
      expect(branches.length).toBeGreaterThan(0);

      for (const branch of branches) {
        expect(branch.wifiSsid).toBe("Moto G85 5G");
      }
    });
  });
});


describe("Floor Cleanliness Inspection Analyzer Unit Tests", () => {
  it("should include regulatory microbiological safety disclaimer", () => {
    expect(MICROBIOLOGICAL_SAFETY_DISCLAIMER).toBeDefined();
    expect(MICROBIOLOGICAL_SAFETY_DISCLAIMER).toContain("VISUAL CLEANLINESS SURFACE SCREENING ONLY");
    expect(MICROBIOLOGICAL_SAFETY_DISCLAIMER).toContain("FSSAI");
  });

  it("should pass surface inspection when brightness is good and debris is low", async () => {
    const result = await analyzeFloorCleanliness({
      zone: "Bakery Prep Counter & Floor",
      imageData: "data:image/jpeg;base64,samplecleandata",
      simulatedPreset: "clean",
    });

    expect(result.status).toBe("PASSED");
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.disclaimer).toContain("VISUAL CLEANLINESS");
  });

  it("should flag inspection as NEEDS_ATTENTION when debris or crumbs are detected", async () => {
    const result = await analyzeFloorCleanliness({
      zone: "Baking Oven Station",
      imageData: "data:image/jpeg;base64,samplecrumbsdata",
      simulatedPreset: "crumbs",
    });

    expect(result.status).toBe("NEEDS_ATTENTION");
    expect(result.score).toBeLessThan(75);
    expect(result.findings.some((f) => f.includes("debris") || f.includes("crumbs") || f.includes("particles"))).toBe(true);
  });

  it("should reject image as REJECTED_BLURRY when focus sharpness is poor", async () => {
    const result = await analyzeFloorCleanliness({
      zone: "Chocolate Display Showroom Floor",
      imageData: "data:image/jpeg;base64,sampleblurrydata",
      simulatedPreset: "blurry",
    });

    expect(result.status).toBe("REJECTED_BLURRY");
    expect(result.score).toBeLessThanOrEqual(40);
  });

  it("should reject image as REJECTED_DARK when lighting is insufficient", async () => {
    const result = await analyzeFloorCleanliness({
      zone: "Raw Ingredient Storage",
      imageData: "data:image/jpeg;base64,sampledarkdata",
      simulatedPreset: "dark",
    });

    expect(result.status).toBe("REJECTED_DARK");
    expect(result.score).toBeLessThanOrEqual(30);
  });
});
