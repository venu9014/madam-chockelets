// Authoritative Bakery-Only Categories and System Constants for MADAM CHOCOLATE

export const DEFAULT_AUTHORIZED_SSID = "Moto G85 5G";

export const BAKERY_CATEGORIES = [
  {
    id: "CAKES_PASTRIES",
    label: "Cakes & Pastries",
    description: "Artisan celebration cakes, opera cakes, tarts, and delicate French pastries.",
    icon: "Cake",
  },
  {
    id: "CHOCOLATES_TRUFFLES",
    label: "Chocolates & Truffles",
    description: "Single-origin couverture bars, hand-rolled truffles, and artisanal bonbons.",
    icon: "Candy",
  },
  {
    id: "COOKIES_BISCUITS",
    label: "Cookies & Biscuits",
    description: "Sea salt sablés, chocolate chunk cookies, biscotti, and shortbreads.",
    icon: "Cookie",
  },
  {
    id: "CUPCAKES_MUFFINS",
    label: "Cupcakes & Muffins",
    description: "Gourmet frosted cupcakes, blueberry streusel muffins, and tea cakes.",
    icon: "Coffee",
  },
  {
    id: "BREADS_BUNS",
    label: "Breads & Buns",
    description: "Slow-fermented sourdough loaves, brioche loaves, croissants, and milk buns.",
    icon: "Utensils",
  },
  {
    id: "DONUTS",
    label: "Donuts",
    description: "Brioche dough donuts filled with dark chocolate ganache, glazes, and custards.",
    icon: "CircleDot",
  },
  {
    id: "BROWNIES_BARS",
    label: "Brownies & Dessert Bars",
    description: "Fudge chocolate brownies, salted caramel blondies, and cheesecake bars.",
    icon: "Layers",
  },
  {
    id: "PUFFS_SAVOURIES",
    label: "Puffs & Savouries",
    description: "Flaky butter puff pastries, quiches, paneer croissants, and savoury rolls.",
    icon: "Flame",
  },
  {
    id: "INGREDIENTS_PACKAGING",
    label: "Ingredients & Packaging",
    description: "Couverture blocks, stone-ground flour, organic butter, and luxury gift boxes.",
    icon: "Package",
  },
] as const;

export type BakeryCategoryId = (typeof BAKERY_CATEGORIES)[number]["id"];
export type BakeryCategory = BakeryCategoryId;

export const ALLOWED_BAKERY_CATEGORIES: BakeryCategoryId[] = BAKERY_CATEGORIES.map(
  (c) => c.id
);

export const VALID_BAKERY_CATEGORY_IDS = new Set<string>(
  BAKERY_CATEGORIES.map((c) => c.id)
);

/**
 * Validates if a category ID belongs to the authorized bakery categories
 */
export function isValidBakeryCategory(category: unknown): boolean {
  if (typeof category !== "string") return false;
  return VALID_BAKERY_CATEGORY_IDS.has(category.trim().toUpperCase());
}

/**
 * Returns a human-readable display label for a bakery category ID
 */
export function getBakeryCategoryLabel(category: unknown): string {
  if (typeof category !== "string") return "Unknown";
  const found = BAKERY_CATEGORIES.find(
    (c) => c.id.toUpperCase() === category.trim().toUpperCase()
  );
  return found ? found.label : category.replace(/_/g, " ");
}
