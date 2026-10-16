import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting deterministic seed for MADAM CHOCOLATE Operations Platform...");

  // Default hashed password for demo users: "MadamChoc2026!"
  const passwordHash = await bcrypt.hash("MadamChoc2026!", 10);

  // -------------------------------------------------------------
  // 1. BRANCHES (Bengaluru retail luxury locations)
  // -------------------------------------------------------------
  const branchesData = [
    {
      code: "IND",
      name: "Indiranagar Boutique & Atelier",
      address: "100 Feet Road, HAL 2nd Stage, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
      latitude: 12.9784,
      longitude: 77.6408,
      geofenceRadiusMeters: 150.0,
      active: true,
    },
    {
      code: "KOR",
      name: "Koramangala Flagship Confectionery",
      address: "80 Feet Road, 4th Block, Koramangala",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560034",
      latitude: 12.9352,
      longitude: 77.6245,
      geofenceRadiusMeters: 150.0,
      active: true,
    },
    {
      code: "WHF",
      name: "Whitefield Salon & Tasting Room",
      address: "Prestige Ozone Gate, ITPL Main Road, Whitefield",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560066",
      latitude: 12.9698,
      longitude: 77.7499,
      geofenceRadiusMeters: 150.0,
      active: true,
    },
  ];

  const branches = {};
  for (const b of branchesData) {
    const branch = await prisma.branch.upsert({
      where: { code: b.code },
      update: b,
      create: b,
    });
    branches[b.code] = branch;
  }
  console.log(`✓ Seeded ${Object.keys(branches).length} branches`);

  // -------------------------------------------------------------
  // 2. USERS & EMPLOYEES (12 staff across 4 roles)
  // -------------------------------------------------------------
  const usersData = [
    // 1. Owner
    {
      email: "owner@madamchocolate.com",
      name: "Ananya Deshmukh",
      role: "OWNER",
      phone: "+91 98450 11001",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
      branchCode: null,
      employeeCode: "MC-EXEC-001",
      designation: "Executive Founder & Chief Chocolatier",
    },
    // 2. Auditor
    {
      email: "auditor@madamchocolate.com",
      name: "Pooja Hegde",
      role: "AUDITOR",
      phone: "+91 98450 11002",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
      branchCode: null,
      employeeCode: "MC-AUD-001",
      designation: "Principal Internal Auditor",
    },
    // 3. Manager - Indiranagar
    {
      email: "manager.indiranagar@madamchocolate.com",
      name: "Vikram Rathore",
      role: "BRANCH_MANAGER",
      phone: "+91 98450 11003",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      branchCode: "IND",
      employeeCode: "MC-IND-MGR",
      designation: "Boutique General Manager",
    },
    // 4. Manager - Koramangala
    {
      email: "manager.koramangala@madamchocolate.com",
      name: "Meera Nair",
      role: "BRANCH_MANAGER",
      phone: "+91 98450 11004",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      branchCode: "KOR",
      employeeCode: "MC-KOR-MGR",
      designation: "Boutique General Manager",
    },
    // 5. Manager - Whitefield
    {
      email: "manager.whitefield@madamchocolate.com",
      name: "Kabir Sen",
      role: "BRANCH_MANAGER",
      phone: "+91 98450 11005",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      branchCode: "WHF",
      employeeCode: "MC-WHF-MGR",
      designation: "Salon General Manager",
    },
    // 6. Employee - Indiranagar (Primary Demo Employee)
    {
      email: "employee.rahul@madamchocolate.com",
      name: "Rahul Verma",
      role: "EMPLOYEE",
      phone: "+91 98450 11006",
      avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
      branchCode: "IND",
      employeeCode: "MC-IND-001",
      designation: "Senior Display & Pastry Artisan",
    },
    // 7. Employee - Indiranagar
    {
      email: "employee.priya@madamchocolate.com",
      name: "Priya Sharma",
      role: "EMPLOYEE",
      phone: "+91 98450 11007",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      branchCode: "IND",
      employeeCode: "MC-IND-002",
      designation: "Chocolatier & Customer Concierge",
    },
    // 8. Employee - Koramangala
    {
      email: "employee.arjun@madamchocolate.com",
      name: "Arjun Menon",
      role: "EMPLOYEE",
      phone: "+91 98450 11008",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
      branchCode: "KOR",
      employeeCode: "MC-KOR-001",
      designation: "Artisan Chocolatier",
    },
    // 9. Employee - Koramangala
    {
      email: "employee.kavita@madamchocolate.com",
      name: "Kavita Reddy",
      role: "EMPLOYEE",
      phone: "+91 98450 11009",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      branchCode: "KOR",
      employeeCode: "MC-KOR-002",
      designation: "Inventory & Quality Associate",
    },
    // 10. Employee - Whitefield
    {
      email: "employee.tanvi@madamchocolate.com",
      name: "Tanvi Bhatt",
      role: "EMPLOYEE",
      phone: "+91 98450 11010",
      avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
      branchCode: "WHF",
      employeeCode: "MC-WHF-001",
      designation: "Tasting Salon Lead",
    },
    // 11. Employee - Whitefield
    {
      email: "employee.rohit@madamchocolate.com",
      name: "Rohit Roy",
      role: "EMPLOYEE",
      phone: "+91 98450 11011",
      avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150",
      branchCode: "WHF",
      employeeCode: "MC-WHF-002",
      designation: "Pastry & Packaging Specialist",
    },
    // 12. Employee - Koramangala (Quality & Temp)
    {
      email: "employee.aditi@madamchocolate.com",
      name: "Aditi Rao",
      role: "EMPLOYEE",
      phone: "+91 98450 11012",
      avatarUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150",
      branchCode: "KOR",
      employeeCode: "MC-KOR-003",
      designation: "Cold Chain & Hygiene Specialist",
    },
  ];

  const users = {};
  const employees = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        passwordHash,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        passwordHash,
        isDemoUser: true,
      },
    });
    users[u.email] = user;

    if (u.branchCode && branches[u.branchCode]) {
      const emp = await prisma.employee.upsert({
        where: { userId: user.id },
        update: {
          employeeCode: u.employeeCode,
          designation: u.designation,
          branchId: branches[u.branchCode].id,
        },
        create: {
          userId: user.id,
          employeeCode: u.employeeCode,
          designation: u.designation,
          branchId: branches[u.branchCode].id,
          joinedDate: new Date("2024-01-15T09:00:00Z"),
          emergencyContact: "+91 98000 00000",
        },
      });
      employees[u.email] = emp;
    }
  }
  console.log(`✓ Seeded ${Object.keys(users).length} users and ${Object.keys(employees).length} branch employees`);

  // -------------------------------------------------------------
  // 3. PRODUCTS CATALOGUE (18 luxury chocolate & confection items)
  // -------------------------------------------------------------
  const productsData = [
    {
      sku: "MC-DRK-70",
      name: "Dark Chocolate Bar 70% Single Origin",
      category: "BARS",
      description: "Intense single-origin Malabar cacao bar with notes of dried plum, tobacco, and roast caramel.",
      unitOfMeasure: "PIECE",
      costPrice: 160.0,
      sellingPrice: 380.0,
      minStockThreshold: 25,
      imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400",
    },
    {
      sku: "MC-MLK-CLS",
      name: "Madagascar Bourbon Milk Chocolate Bar",
      category: "BARS",
      description: "Velvety 45% milk chocolate infused with pure Madagascar bourbon vanilla bean caviar.",
      unitOfMeasure: "PIECE",
      costPrice: 140.0,
      sellingPrice: 340.0,
      minStockThreshold: 20,
      imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400",
    },
    {
      sku: "MC-WHT-SAFF",
      name: "Kashmiri Saffron White Chocolate Bar",
      category: "BARS",
      description: "Silky 34% white cocoa butter bar steeped with organic Kashmiri saffron and roasted pistachio nibs.",
      unitOfMeasure: "PIECE",
      costPrice: 180.0,
      sellingPrice: 420.0,
      minStockThreshold: 15,
      imageUrl: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=400",
    },
    {
      sku: "MC-HAZ-CRN",
      name: "Roasted Piedmont Hazelnut Bar",
      category: "BARS",
      description: "Whole roasted hazelnuts enrobed in gianduja milk chocolate and flaked Maldon sea salt.",
      unitOfMeasure: "PIECE",
      costPrice: 175.0,
      sellingPrice: 395.0,
      minStockThreshold: 20,
      imageUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400",
    },
    {
      sku: "MC-ALM-SLT",
      name: "Smoked Almond & Sea Salt Dark Bar",
      category: "BARS",
      description: "Slow-roasted California almonds, smoked applewood sea salt, and 65% South Indian dark chocolate.",
      unitOfMeasure: "PIECE",
      costPrice: 165.0,
      sellingPrice: 385.0,
      minStockThreshold: 15,
      imageUrl: "https://images.unsplash.com/photo-1575372587186-50020b3a7894?w=400",
    },
    {
      sku: "MC-PRAL-12",
      name: "Royal Velvet Assorted Praline Box (12 Pcs)",
      category: "PRALINES",
      description: "Handcrafted jewels: Passionfruit ganache, rose cardamom caramel, hazelnut crisp, espresso noir.",
      unitOfMeasure: "BOX",
      costPrice: 480.0,
      sellingPrice: 1250.0,
      minStockThreshold: 10,
      imageUrl: "https://images.unsplash.com/photo-1526081347589-7fa3cb41b4b2?w=400",
    },
    {
      sku: "MC-TRUF-16",
      name: "Signature Champagne & Gold Truffle Box (16 Pcs)",
      category: "TRUFFLES",
      description: "Infused with champagne reduction, dusted in edible 24k gold luster and fine Valrhona cocoa.",
      unitOfMeasure: "BOX",
      costPrice: 720.0,
      sellingPrice: 1850.0,
      minStockThreshold: 8,
      imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400",
    },
    {
      sku: "MC-HAMP-ROYAL",
      name: "The Grand Empress Gift Hamper",
      category: "GIFT_BOXES",
      description: "Bespoke royal violet leatherette chest with 2 bars, 16 truffles, almond dragees, and spiced drinking cacao.",
      unitOfMeasure: "BOX",
      costPrice: 1950.0,
      sellingPrice: 4850.0,
      minStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400",
    },
    {
      sku: "MC-COCOA-250",
      name: "Dutch Processed Ceremonial Cocoa Powder (250g)",
      category: "PANTRY",
      description: "Alkalized 22/24% rich fat cocoa powder for fine culinary baking and indulgent drinking chocolate.",
      unitOfMeasure: "PACK",
      costPrice: 190.0,
      sellingPrice: 450.0,
      minStockThreshold: 15,
      imageUrl: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=400",
    },
    {
      sku: "MC-BRWN-06",
      name: "Fudge Truffle Brownie Box (6 Pcs)",
      category: "BAKERY",
      description: "Dense, decadent dark chocolate brownies with molten ganache centers and sea salt crystal finish.",
      unitOfMeasure: "BOX",
      costPrice: 320.0,
      sellingPrice: 750.0,
      minStockThreshold: 12,
      imageUrl: "https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=400",
    },
    {
      sku: "MC-COOK-08",
      name: "Triple Chocolate Sea Salt Cookies (8 Pcs)",
      category: "BAKERY",
      description: "Chewy sablé cookies loaded with dark, milk, and white chocolate chunks with Cornish sea salt flakes.",
      unitOfMeasure: "PACK",
      costPrice: 220.0,
      sellingPrice: 520.0,
      minStockThreshold: 15,
      imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
    },
    {
      sku: "MC-CARM-09",
      name: "Artisan Fleur de Sel Caramel Box (9 Pcs)",
      category: "PRALINES",
      description: "Slow-simmered cream caramels wrapped in dark chocolate shell topped with sun-harvested sea salt.",
      unitOfMeasure: "BOX",
      costPrice: 290.0,
      sellingPrice: 690.0,
      minStockThreshold: 10,
      imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400",
    },
    {
      sku: "MC-ORG-DRK",
      name: "Candied Seville Orange & Dark Chocolate Bar",
      category: "BARS",
      description: "Hand-candied orange peel slivers embedded in 72% dark chocolate with floral citrus zest.",
      unitOfMeasure: "PIECE",
      costPrice: 170.0,
      sellingPrice: 390.0,
      minStockThreshold: 18,
      imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400",
    },
    {
      sku: "MC-MNT-DRK",
      name: "Garden Mint Fondant Crisp Bar",
      category: "BARS",
      description: "Delicate peppermint cream layered within single-estate dark chocolate with cocoa nib crunch.",
      unitOfMeasure: "PIECE",
      costPrice: 155.0,
      sellingPrice: 360.0,
      minStockThreshold: 15,
      imageUrl: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=400",
    },
    {
      sku: "MC-GIFT-SEAS",
      name: "Autumn Festival Limited Edition Gift Box",
      category: "GIFT_BOXES",
      description: "Festive celebration box featuring cardamom saffron truffles, rose pistachios, and hazelnut clusters.",
      unitOfMeasure: "BOX",
      costPrice: 850.0,
      sellingPrice: 2150.0,
      minStockThreshold: 8,
      imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400",
    },
    {
      sku: "MC-DRAG-NUT",
      name: "Caramelized Almond Dragees Tin (150g)",
      category: "PANTRY",
      description: "Crisp caramelized almonds coated in layers of gianduja chocolate and dusted with cocoa powder.",
      unitOfMeasure: "PACK",
      costPrice: 240.0,
      sellingPrice: 580.0,
      minStockThreshold: 14,
      imageUrl: "https://images.unsplash.com/photo-1575372587186-50020b3a7894?w=400",
    },
    {
      sku: "MC-MINI-08",
      name: "Petite Chocolate Tasting Flight (8 Minis)",
      category: "BARS",
      description: "Curated origin tasting flight ranging from 34% white to 85% wild Bolivian dark chocolate.",
      unitOfMeasure: "BOX",
      costPrice: 310.0,
      sellingPrice: 790.0,
      minStockThreshold: 12,
      imageUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400",
    },
    {
      sku: "MC-SIG-CELEB",
      name: "Madam Signature Celebration Hamper Box",
      category: "GIFT_BOXES",
      description: "The ultimate flagship curation in our gold-stamped royal violet keepsake box with velvet interior.",
      unitOfMeasure: "BOX",
      costPrice: 2800.0,
      sellingPrice: 6500.0,
      minStockThreshold: 4,
      imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400",
    },
  ];

  const products = {};
  for (const p of productsData) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p,
    });
    products[p.sku] = prod;
  }
  console.log(`✓ Seeded ${Object.keys(products).length} luxury confectionery products`);

  // -------------------------------------------------------------
  // 4. 10 STANDARD OPERATING PROCEDURES (SOPs)
  // -------------------------------------------------------------
  const sopsData = [
    {
      code: "SOP-OPEN-01",
      title: "Opening Store Checklist",
      category: "OPENING",
      frequency: "DAILY",
      roleTarget: "EMPLOYEE",
      description: "Boutique morning unlocking, air conditioning calibration, display illumination, and register initialization.",
      deadlineTime: "09:30",
      items: [
        { seq: 1, title: "Store lights & showcase display spotlights powered ON", req: true, ev: "NONE" },
        { seq: 2, title: "Boutique HVAC set to chocolate ambient 18°C-20°C", req: true, ev: "NUMERIC_VALUE", min: 17.0, max: 21.0, unit: "°C" },
        { seq: 3, title: "Glass display surfaces sanitized with lint-free microfiber", req: true, ev: "NONE" },
        { seq: 4, title: "Register drawer cash float counted and verified (₹5,000 baseline)", req: true, ev: "NUMERIC_VALUE", min: 5000, max: 5000, unit: "INR" },
        { seq: 5, title: "Front entrance and entryway welcome mat photo confirmation", req: true, ev: "PHOTO" },
      ],
    },
    {
      code: "SOP-DISP-02",
      title: "Chocolate Display & Merchandising Inspection",
      category: "QUALITY",
      frequency: "DAILY",
      roleTarget: "EMPLOYEE",
      description: "Visual inspection of praline tiers, bar displays, gold tag alignments, and absence of chocolate blooming.",
      deadlineTime: "10:30",
      items: [
        { seq: 1, title: "Inspect dark chocolate displays for sugar or fat bloom (white haze)", req: true, ev: "NONE" },
        { seq: 2, title: "Verify all flavor descriptive gold cards and allergen labels are upright", req: true, ev: "NONE" },
        { seq: 3, title: "Ensure minimum 5 units per displayed SKU on front tiers", req: true, ev: "NONE" },
        { seq: 4, title: "Upload wide-angle photograph of central display counter", req: true, ev: "PHOTO" },
      ],
    },
    {
      code: "SOP-TEMP-03",
      title: "Refrigerator & Wine Cooler Temperature Check",
      category: "QUALITY",
      frequency: "DAILY",
      roleTarget: "EMPLOYEE",
      description: "Precision temperature calibration of commercial chocolate storage units and chilled counter plinths.",
      deadlineTime: "11:00",
      items: [
        { seq: 1, title: "Display Showcase Plinth Temperature (Target: 14°C - 16°C)", req: true, ev: "NUMERIC_VALUE", min: 13.0, max: 17.0, unit: "°C" },
        { seq: 2, title: "Cold Storage Refrigerator #1 (Target: 4°C - 7°C)", req: true, ev: "NUMERIC_VALUE", min: 3.0, max: 8.0, unit: "°C" },
        { seq: 3, title: "Humidity reader check (Must remain below 55% RH)", req: true, ev: "NUMERIC_VALUE", min: 30.0, max: 55.0, unit: "%RH" },
        { seq: 4, title: "Photo of digital thermometer readout display", req: true, ev: "PHOTO" },
      ],
    },
    {
      code: "SOP-HYG-04",
      title: "Cleaning and Hygiene Checklist",
      category: "HYGIENE",
      frequency: "DAILY",
      roleTarget: "EMPLOYEE",
      description: "Comprehensive sanitation of food-contact surfaces, handwash stations, and chocolate handling tools.",
      deadlineTime: "14:00",
      items: [
        { seq: 1, title: "Tongs, spatulas, and display trays sanitized in hot water", req: true, ev: "NONE" },
        { seq: 2, title: "Handwash station restocked with antibacterial soap and paper towels", req: true, ev: "NONE" },
        { seq: 3, title: "Waste bins emptied and sanitized liners installed", req: true, ev: "NONE" },
        { seq: 4, title: "Hygiene and grooming standard verified for on-duty associates", req: true, ev: "NONE" },
      ],
    },
    {
      code: "SOP-CLOSE-05",
      title: "Closing Store Checklist",
      category: "CLOSING",
      frequency: "DAILY",
      roleTarget: "EMPLOYEE",
      description: "Evening store shutdown, secure locking of chocolate inventory safes, POS settlement, and security arming.",
      deadlineTime: "22:00",
      items: [
        { seq: 1, title: "High-value truffle trays transferred to humidity-controlled night vault", req: true, ev: "NONE" },
        { seq: 2, title: "Display lights and spotlight tracks turned OFF", req: true, ev: "NONE" },
        { seq: 3, title: "POS daily batch closure slip generated and settled", req: true, ev: "PHOTO" },
        { seq: 4, title: "Secondary cash safe locked with dual-key custody", req: true, ev: "NONE" },
        { seq: 5, title: "Main security shutters locked and alarm system armed", req: true, ev: "NONE" },
      ],
    },
    {
      code: "SOP-COUNT-06",
      title: "Daily Inventory Count",
      category: "INVENTORY",
      frequency: "DAILY",
      roleTarget: "BRANCH_MANAGER",
      description: "Cycle count of fast-moving luxury gift hampers and reserve artisan chocolate bars.",
      deadlineTime: "19:00",
      items: [
        { seq: 1, title: "Physical count of all gift hampers and praline boxes completed", req: true, ev: "NONE" },
        { seq: 2, title: "Discrepancies exceeding ±1 unit flagged for supervisor inquiry", req: true, ev: "NONE" },
        { seq: 3, title: "Daily count sheet signed by store manager", req: true, ev: "PHOTO" },
      ],
    },
    {
      code: "SOP-EXP-07",
      title: "Product Expiry & Best-Before Inspection",
      category: "QUALITY",
      frequency: "WEEKLY",
      roleTarget: "EMPLOYEE",
      description: "Shelf-life audit of fresh cream truffles (14-day window) and baked brownies (5-day window).",
      deadlineTime: "12:00",
      items: [
        { seq: 1, title: "Check manufacturing date batch stamps on all refrigerated truffles", req: true, ev: "NONE" },
        { seq: 2, title: "Remove any brownies or cookies within 24 hours of best-before date", req: true, ev: "NONE" },
        { seq: 3, title: "Record any expired units into daily wastage log", req: true, ev: "NONE" },
      ],
    },
    {
      code: "SOP-BILL-08",
      title: "Billing Counter & Payment Terminal Verification",
      category: "OPENING",
      frequency: "DAILY",
      roleTarget: "EMPLOYEE",
      description: "Inspection of EDC credit card terminals, UPI scanner display QR codes, and receipt paper stocks.",
      deadlineTime: "10:00",
      items: [
        { seq: 1, title: "Test transaction ping on primary and backup EDC card machines", req: true, ev: "NONE" },
        { seq: 2, title: "Verify dynamic UPI display QR standee is clean and readable", req: true, ev: "NONE" },
        { seq: 3, title: "Ensure minimum 5 thermal receipt paper rolls in counter storage", req: true, ev: "NONE" },
      ],
    },
    {
      code: "SOP-WASTE-09",
      title: "Wastage and Damaged Product Report",
      category: "INVENTORY",
      frequency: "DAILY",
      roleTarget: "BRANCH_MANAGER",
      description: "Documenting broken display chocolates, tasting samples provided, or packaging blemishes.",
      deadlineTime: "20:30",
      items: [
        { seq: 1, title: "Log itemized count of broken or heat-damaged items", req: true, ev: "NONE" },
        { seq: 2, title: "Log complimentary tasting samples distributed to customers", req: true, ev: "NONE" },
        { seq: 3, title: "Manager sign-off on wastage write-off log with photo", req: true, ev: "PHOTO" },
      ],
    },
    {
      code: "SOP-RECON-10",
      title: "End-of-Day Stock & Cash Reconciliation",
      category: "CLOSING",
      frequency: "DAILY",
      roleTarget: "BRANCH_MANAGER",
      description: "Reconcile daily sales ledger against physical card receipts, UPI settlement reports, and stock movements.",
      deadlineTime: "22:30",
      items: [
        { seq: 1, title: "Match total day sales on POS with bank gateway settlements", req: true, ev: "NONE" },
        { seq: 2, title: "Verify all stock movement entries posted before closing the session", req: true, ev: "NONE" },
        { seq: 3, title: "Submit end-of-day discrepancy inquiry if variance exceeds ₹200", req: true, ev: "NONE" },
      ],
    },
  ];

  const sops = {};
  const sopVersions = {};

  for (const s of sopsData) {
    const sop = await prisma.sop.upsert({
      where: { code: s.code },
      update: {
        title: s.title,
        category: s.category,
        description: s.description,
        frequency: s.frequency,
        roleTarget: s.roleTarget,
      },
      create: {
        code: s.code,
        title: s.title,
        category: s.category,
        description: s.description,
        frequency: s.frequency,
        roleTarget: s.roleTarget,
      },
    });
    sops[s.code] = sop;

    const version = await prisma.sopVersion.upsert({
      where: {
        sopId_versionNumber: {
          sopId: sop.id,
          versionNumber: 1,
        },
      },
      update: {
        title: s.title,
        description: s.description,
        instructions: `Standard operating protocol for ${s.title}. Follow each item systematically and document evidence when required.`,
        deadlineTime: s.deadlineTime,
        status: "PUBLISHED",
      },
      create: {
        sopId: sop.id,
        versionNumber: 1,
        title: s.title,
        description: s.description,
        instructions: `Standard operating protocol for ${s.title}. Follow each item systematically and document evidence when required.`,
        deadlineTime: s.deadlineTime,
        status: "PUBLISHED",
      },
    });
    sopVersions[s.code] = version;

    // Checklist items
    for (const item of s.items) {
      await prisma.sopChecklistItem.create({
        data: {
          sopVersionId: version.id,
          sequence: item.seq,
          title: item.title,
          isRequired: item.req,
          evidenceRequired: item.ev,
          minNumericVal: item.min ?? null,
          maxNumericVal: item.max ?? null,
          unit: item.unit ?? null,
        },
      });
    }
  }
  console.log(`✓ Seeded ${Object.keys(sops).length} SOP definitions and versions with structured checklist items`);

  // -------------------------------------------------------------
  // 5. TASKS & WORKFLOW HISTORIES (75+ tasks across 3 branches)
  // -------------------------------------------------------------
  const today = new Date();
  const taskDates = [0, 1, 2, 3, 5, 7, 10, 14, 20].map((daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d;
  });

  const branchKeys = ["IND", "KOR", "WHF"];
  const branchMgrKeys = {
    IND: "manager.indiranagar@madamchocolate.com",
    KOR: "manager.koramangala@madamchocolate.com",
    WHF: "manager.whitefield@madamchocolate.com",
  };
  const branchEmpKeys = {
    IND: "employee.rahul@madamchocolate.com",
    KOR: "employee.arjun@madamchocolate.com",
    WHF: "employee.tanvi@madamchocolate.com",
  };

  let totalTasksCreated = 0;
  let totalSubmissionsCreated = 0;

  for (const bKey of branchKeys) {
    const branch = branches[bKey];
    const empUser = users[branchEmpKeys[bKey]];
    const mgrUser = users[branchMgrKeys[bKey]];
    const empRecord = employees[branchEmpKeys[bKey]];

    for (const sopCode of Object.keys(sopsData.slice(0, 8).reduce((acc, curr) => ({ ...acc, [curr.code]: curr }), {}))) {
      const sopVer = sopVersions[sopCode];

      for (let i = 0; i < taskDates.length; i++) {
        const tDate = taskDates[i];
        const isToday = i === 0;
        const isPast = i > 0;

        // Assign status deterministically
        let status = "APPROVED";
        if (isToday) {
          if (sopCode === "SOP-OPEN-01") status = "APPROVED";
          else if (sopCode === "SOP-DISP-02") status = "SUBMITTED"; // Awaiting manager review
          else if (sopCode === "SOP-TEMP-03") status = "IN_PROGRESS";
          else if (sopCode === "SOP-HYG-04") status = "OVERDUE";
          else status = "PENDING";
        } else if (i === 1) {
          if (sopCode === "SOP-DISP-02") status = "CHANGES_REQUESTED";
          else status = "APPROVED";
        } else if (i === 2 && sopCode === "SOP-HYG-04") {
          status = "REJECTED";
        }

        const task = await prisma.task.create({
          data: {
            sopVersionId: sopVer.id,
            branchId: branch.id,
            assignedEmployeeId: empRecord?.id ?? null,
            assignedRole: "EMPLOYEE",
            title: `${sopVer.title} — ${branch.name.split(" ")[0]}`,
            dueDate: tDate,
            dueTime: sopVer.deadlineTime,
            status,
            priority: sopCode === "SOP-TEMP-03" ? "HIGH" : "MEDIUM",
            createdAt: tDate,
          },
        });
        totalTasksCreated++;

        // Add submissions for submitted, changes_requested, approved, and rejected tasks
        if (["SUBMITTED", "APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(status)) {
          const submission = await prisma.taskSubmission.create({
            data: {
              taskId: task.id,
              submittedById: empUser.id,
              notes: "Completed standard operational checks according to protocol.",
              submittedAt: new Date(tDate.getTime() + 45 * 60 * 1000), // 45 mins after due
              submissionSeq: status === "CHANGES_REQUESTED" ? 1 : 2,
            },
          });
          totalSubmissionsCreated++;

          // Attach placeholder evidence
          await prisma.evidenceAttachment.create({
            data: {
              taskId: task.id,
              taskSubmissionId: submission.id,
              fileUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600",
              fileName: `evidence_${sopCode.toLowerCase()}_${bKey.toLowerCase()}.jpg`,
              caption: `[DEMO EVIDENCE] Checklist verification photograph for ${sopVer.title}`,
              isDemoPlaceholder: true,
            },
          });

          // Add review record if approved or rejected
          if (status === "APPROVED" || status === "REJECTED" || status === "CHANGES_REQUESTED") {
            await prisma.taskReview.create({
              data: {
                taskId: task.id,
                taskSubmissionId: submission.id,
                reviewerId: mgrUser.id,
                status,
                comments:
                  status === "APPROVED"
                    ? "Verified against quality standards. Temperatures and presentation look pristine."
                    : status === "CHANGES_REQUESTED"
                    ? "Display tier 2 needs re-stocking with Saffron White bars before customer rush."
                    : "Temperature logs exceeded tolerance threshold. Corrective action required immediately.",
                reviewedAt: new Date(tDate.getTime() + 90 * 60 * 1000),
              },
            });
          }
        }
      }
    }
  }
  console.log(`✓ Seeded ${totalTasksCreated} task instances and ${totalSubmissionsCreated} submission/review cycles`);

  // -------------------------------------------------------------
  // 6. ATTENDANCE RECORDS & 6 SIMULATION SCENARIOS
  // -------------------------------------------------------------
  let attendanceCount = 0;
  for (const bKey of branchKeys) {
    const branch = branches[bKey];
    const empList = Object.values(employees).filter((e) => e.branchId === branch.id);

    for (const emp of empList) {
      for (let d = 0; d < 7; d++) {
        const attDate = new Date(today);
        attDate.setDate(attDate.getDate() - d);
        attDate.setHours(9, 15, 0, 0); // 9:15 AM

        // Primary demo employee Rahul Verma gets the full spectrum of simulated scenarios
        let isSim = true;
        let simScenario = "SUCCESSFUL_INSIDE_GEOFENCE";
        let isWithin = true;
        let dist = 32.5; // 32.5 meters away
        let status = "VERIFIED";
        let devLat = branch.latitude + 0.0001;
        let devLon = branch.longitude + 0.0001;
        let notes = "Simulated check-in via employee mobile app";

        if (d === 1 && emp.employeeCode === "MC-IND-001") {
          // Scenario 2: Outside Geofence Attempt (Pending Exception)
          simScenario = "OUTSIDE_GEOFENCE";
          isWithin = false;
          dist = 620.0; // 620 meters away
          devLat = branch.latitude + 0.005;
          devLon = branch.longitude + 0.005;
          status = "PENDING_EXCEPTION";
          notes = "Checked in from metro station due to morning train signal delay.";
        } else if (d === 2 && emp.employeeCode === "MC-IND-001") {
          // Scenario 3: GPS Permission Denied
          simScenario = "GPS_PERMISSION_DENIED";
          isWithin = false;
          dist = null;
          devLat = null;
          devLon = null;
          status = "PENDING_EXCEPTION";
          notes = "Browser location permission prompt rejected by user.";
        } else if (d === 3 && emp.employeeCode === "MC-IND-001") {
          // Scenario 4: Poor GPS accuracy
          simScenario = "POOR_GPS_ACCURACY";
          isWithin = false;
          dist = 85.0;
          status = "FLAGGED";
          notes = "Cellular triangulation accuracy was ±450m (threshold: 100m).";
        }

        const checkIn = await prisma.attendanceEvent.create({
          data: {
            employeeId: emp.id,
            branchId: branch.id,
            eventType: "CHECK_IN",
            timestamp: attDate,
            latitude: devLat,
            longitude: devLon,
            distanceFromBranchMeters: dist,
            isWithinGeofence: isWithin,
            accuracyMeters: 15.0,
            status,
            isSimulated: isSim,
            simulationScenario: simScenario,
            notes,
          },
        });
        attendanceCount++;

        // If pending exception, create AttendanceException record
        if (status === "PENDING_EXCEPTION") {
          await prisma.attendanceException.create({
            data: {
              attendanceEventId: checkIn.id,
              employeeId: emp.id,
              branchId: branch.id,
              reason: notes,
              status: "PENDING",
            },
          });
        }

        // Checkout event
        const checkOutDate = new Date(attDate);
        checkOutDate.setHours(18, 30, 0, 0); // 6:30 PM
        await prisma.attendanceEvent.create({
          data: {
            employeeId: emp.id,
            branchId: branch.id,
            eventType: "CHECK_OUT",
            timestamp: checkOutDate,
            latitude: branch.latitude,
            longitude: branch.longitude,
            distanceFromBranchMeters: 12.0,
            isWithinGeofence: true,
            accuracyMeters: 10.0,
            status: "VERIFIED",
            isSimulated: true,
            simulationScenario: "SUCCESSFUL_INSIDE_GEOFENCE",
            notes: "End of shift checkout verified inside geofence.",
          },
        });
        attendanceCount++;
      }
    }
  }
  console.log(`✓ Seeded ${attendanceCount} attendance events with geofence calculations and exceptions`);

  // -------------------------------------------------------------
  // 7. INVENTORY LEDGER & STOCK MOVEMENTS (150+ transactions)
  // -------------------------------------------------------------
  let totalMovements = 0;
  const productList = Object.values(products);

  for (const bKey of branchKeys) {
    const branch = branches[bKey];

    for (const prod of productList) {
      // 1. Opening Stock (30 days ago)
      const openingDate = new Date(today);
      openingDate.setDate(openingDate.getDate() - 30);
      const openingQty = 50 + (prod.sku.charCodeAt(3) % 40); // 50 to 90 units

      await prisma.inventoryMovement.create({
        data: {
          productId: prod.id,
          branchId: branch.id,
          movementType: "OPENING_STOCK",
          quantity: openingQty,
          unitCost: prod.costPrice,
          referenceNumber: `INIT-${bKey}-${prod.sku}`,
          notes: "Initial balance carried forward from Q3 audit.",
          effectiveDate: openingDate,
        },
      });
      totalMovements++;

      // 2. Weekly Restock Purchases
      for (const dAgo of [21, 14, 7]) {
        const pDate = new Date(today);
        pDate.setDate(pDate.getDate() - dAgo);
        await prisma.inventoryMovement.create({
          data: {
            productId: prod.id,
            branchId: branch.id,
            movementType: "PURCHASE",
            quantity: 25,
            unitCost: prod.costPrice,
            referenceNumber: `PO-${bKey}-2026-${dAgo}`,
            notes: "Direct receipt from central chocolate atelier.",
            effectiveDate: pDate,
          },
        });
        totalMovements++;
      }

      // 3. Daily Sales Deductions
      for (const dAgo of [10, 8, 6, 4, 2, 1]) {
        const sDate = new Date(today);
        sDate.setDate(sDate.getDate() - dAgo);
        const saleQty = 3 + (prod.sku.charCodeAt(4) % 5); // 3 to 7 sold
        await prisma.inventoryMovement.create({
          data: {
            productId: prod.id,
            branchId: branch.id,
            movementType: "SALE",
            quantity: -saleQty,
            unitCost: prod.costPrice,
            referenceNumber: `POS-${bKey}-${sDate.toISOString().slice(0, 10).replace(/-/g, "")}`,
            notes: "POS terminal daily aggregate sales export.",
            effectiveDate: sDate,
          },
        });
        totalMovements++;
      }

      // 4. Occasional Wastage / Damage (for realistic discrepancy simulation)
      if (prod.sku === "MC-BRWN-06" || prod.sku === "MC-TRUF-16") {
        const wDate = new Date(today);
        wDate.setDate(wDate.getDate() - 3);
        await prisma.inventoryMovement.create({
          data: {
            productId: prod.id,
            branchId: branch.id,
            movementType: "WASTAGE",
            quantity: -2,
            unitCost: prod.costPrice,
            referenceNumber: `WASTE-${bKey}-003`,
            notes: "Cracked ganache shells during display staging.",
            effectiveDate: wDate,
          },
        });
        totalMovements++;
      }
    }
  }

  // Inter-branch Stock Transfer Example (Indiranagar to Koramangala)
  const transfer = await prisma.stockTransfer.create({
    data: {
      transferNumber: "TR-2026-IND-KOR-001",
      sourceBranchId: branches.IND.id,
      targetBranchId: branches.KOR.id,
      status: "IN_TRANSIT",
      notes: "Express replenishment of Royal Velvet Praline boxes for festival weekend.",
      initiatedById: users["manager.indiranagar@madamchocolate.com"].id,
    },
  });

  await prisma.stockTransferItem.create({
    data: {
      stockTransferId: transfer.id,
      productId: products["MC-PRAL-12"].id,
      quantity: 15,
      unitCost: products["MC-PRAL-12"].costPrice,
    },
  });

  // Transfer OUT movement at Indiranagar
  await prisma.inventoryMovement.create({
    data: {
      productId: products["MC-PRAL-12"].id,
      branchId: branches.IND.id,
      movementType: "TRANSFER_OUT",
      quantity: -15,
      unitCost: products["MC-PRAL-12"].costPrice,
      referenceNumber: transfer.transferNumber,
      transferId: transfer.id,
      notes: "Dispatched via refrigerated courier.",
    },
  });
  totalMovements++;

  console.log(`✓ Seeded ${totalMovements} inventory movements across products and branches`);

  // -------------------------------------------------------------
  // 8. STOCK COUNTS & 10 RECONCILIATION DISCREPANCY SCENARIOS
  // -------------------------------------------------------------
  const countSession = await prisma.stockCountSession.create({
    data: {
      sessionNumber: "STK-IND-2026-10-CYCLE",
      branchId: branches.IND.id,
      countDate: today,
      cutoffTime: "21:00",
      status: "IN_PROGRESS",
      conductedById: users["employee.rahul@madamchocolate.com"].id,
      reviewedById: users["manager.indiranagar@madamchocolate.com"].id,
      notes: "Monthly physical stock verification for Indiranagar flagship boutique.",
    },
  });

  // 10 Distinct Discrepancy Scenarios (per Section 15 of prompt)
  const discrepancyScenarios = [
    {
      sku: "MC-DRK-70",
      counted: 42,
      expected: 48,
      scenario: "PHYSICAL_LOWER",
      notes: "Physical stock lower than expected: 6 units missing from reserve shelf.",
    },
    {
      sku: "MC-MLK-CLS",
      counted: 56,
      expected: 50,
      scenario: "PHYSICAL_HIGHER",
      notes: "Physical stock higher than expected: 6 extra units found in secondary chilling cabinet.",
    },
    {
      sku: "MC-BRWN-06",
      counted: 14,
      expected: 18,
      scenario: "UNRECORDED_WASTAGE",
      notes: "Unrecorded wastage: 4 fresh brownie units were sampled during VIP tasting but not logged in POS.",
    },
    {
      sku: "MC-PRAL-12",
      counted: 10,
      expected: 25,
      scenario: "PENDING_TRANSFER",
      notes: "Pending transfer confirmation: 15 units dispatched under TR-2026-IND-KOR-001 awaiting transit receipt.",
    },
    {
      sku: "MC-TRUF-16",
      counted: 8,
      expected: 12,
      scenario: "DELAYED_SALES",
      notes: "Delayed sales import: 4 boxes sold via offsite corporate catering not yet synced in offline register.",
    },
    {
      sku: "MC-WHT-SAFF",
      counted: 22,
      expected: 25,
      scenario: "INCORRECT_ENTRY",
      notes: "Incorrect stock entry: Previous invoice entered as 25 instead of 22 received.",
    },
    {
      sku: "MC-HAMP-ROYAL",
      counted: 3,
      expected: 5,
      scenario: "AWAITING_APPROVAL",
      notes: "Adjustment awaiting approval: 2 hampers repurposed for flagship window installation.",
    },
    {
      sku: "MC-COCOA-250",
      counted: 18,
      expected: 20,
      scenario: "RESOLVED_WITH_EVIDENCE",
      notes: "Resolved discrepancy with evidence: 2 damaged packs photographed and discarded with supervisor signoff.",
      status: "RESOLVED",
    },
    {
      sku: "MC-ALM-SLT",
      counted: 0,
      expected: -2,
      scenario: "NEGATIVE_STOCK",
      notes: "Negative-stock alert: System record shows -2 due to delayed receipt posting after sales.",
    },
    {
      sku: "MC-SIG-CELEB",
      counted: 2,
      expected: 4,
      scenario: "INVESTIGATION_REQUIRED",
      notes: "Discrepancy requiring further investigation: High-value flagship hamper variance (₹5,600 exposure).",
    },
  ];

  let discCount = 0;
  for (const item of discrepancyScenarios) {
    const prod = products[item.sku];
    const varianceQty = item.counted - item.expected;
    const varianceValue = Number((varianceQty * prod.costPrice).toFixed(2));

    const countItem = await prisma.stockCountItem.create({
      data: {
        stockCountSessionId: countSession.id,
        productId: prod.id,
        countedQuantity: item.counted,
        expectedQuantity: item.expected,
        varianceQuantity: varianceQty,
        unitCost: prod.costPrice,
        varianceValue,
        status: varianceQty === 0 ? "MATCH" : "DISCREPANCY",
        notes: item.notes,
      },
    });

    const disc = await prisma.reconciliationDiscrepancy.create({
      data: {
        countItemId: countItem.id,
        branchId: branches.IND.id,
        productId: prod.id,
        expectedQty: item.expected,
        countedQty: item.counted,
        varianceQty,
        unitCost: prod.costPrice,
        varianceValue,
        scenarioType: item.scenario,
        status: item.status || "DISCOVERED",
        investigationNotes: item.notes,
      },
    });
    discCount++;

    // Create an Adjustment Request for scenario 7
    if (item.scenario === "AWAITING_APPROVAL") {
      await prisma.stockAdjustmentRequest.create({
        data: {
          requestNumber: "ADJ-2026-IND-001",
          discrepancyId: disc.id,
          branchId: branches.IND.id,
          productId: prod.id,
          proposedQuantity: varianceQty, // -2
          unitCost: prod.costPrice,
          adjustmentValue: varianceValue,
          reason: "Display window installation write-down for seasonal launch.",
          status: "PENDING",
          requestedById: users["manager.indiranagar@madamchocolate.com"].id,
        },
      });
    }
  }
  console.log(`✓ Seeded stock count session with ${discCount} verified discrepancy scenarios`);

  // -------------------------------------------------------------
  // 9. NOTIFICATIONS (12+ actionable notifications)
  // -------------------------------------------------------------
  const notificationsData = [
    {
      title: "Task Review Required",
      message: "Chocolate Display Inspection submitted by Rahul Verma is waiting for your approval.",
      category: "TASK",
      type: "INFO",
      linkUrl: "/dashboard/tasks",
      branchCode: "IND",
      userEmail: "manager.indiranagar@madamchocolate.com",
    },
    {
      title: "Attendance Exception Pending",
      message: "Rahul Verma reported an outside-geofence check-in (620m away). Reason: Metro signal delay.",
      category: "ATTENDANCE",
      type: "WARNING",
      linkUrl: "/dashboard/attendance",
      branchCode: "IND",
      userEmail: "manager.indiranagar@madamchocolate.com",
    },
    {
      title: "Stock Discrepancy Investigation Required",
      message: "Madam Signature Celebration Hamper has a 2 unit variance (₹5,600 value exposure) in Indiranagar count.",
      category: "DISCREPANCY",
      type: "URGENT",
      linkUrl: "/dashboard/reconciliation",
      branchCode: "IND",
      userEmail: "owner@madamchocolate.com",
    },
    {
      title: "Stock Adjustment Awaiting Executive Sign-Off",
      message: "Request #ADJ-2026-IND-001 for 2 The Grand Empress Gift Hampers requires Owner approval.",
      category: "INVENTORY",
      type: "WARNING",
      linkUrl: "/dashboard/reconciliation",
      branchCode: "IND",
      userEmail: "owner@madamchocolate.com",
    },
    {
      title: "Low Stock Alert: Saffron White Chocolate",
      message: "Kashmiri Saffron White Chocolate Bar has dropped below minimum threshold (15 units) in Koramangala.",
      category: "INVENTORY",
      type: "WARNING",
      linkUrl: "/dashboard/inventory",
      branchCode: "KOR",
      userEmail: "manager.koramangala@madamchocolate.com",
    },
    {
      title: "Inter-Branch Transfer In Transit",
      message: "Transfer TR-2026-IND-KOR-001 (15 Praline Boxes) was dispatched from Indiranagar.",
      category: "INVENTORY",
      type: "INFO",
      linkUrl: "/dashboard/inventory",
      branchCode: "KOR",
      userEmail: "manager.koramangala@madamchocolate.com",
    },
    {
      title: "Overdue SOP: Cleaning & Hygiene",
      message: "Daily Hygiene Checklist at Whitefield Salon has passed its 14:00 deadline without submission.",
      category: "TASK",
      type: "URGENT",
      linkUrl: "/dashboard/tasks",
      branchCode: "WHF",
      userEmail: "manager.whitefield@madamchocolate.com",
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({
      data: {
        title: n.title,
        message: n.message,
        category: n.category,
        type: n.type,
        linkUrl: n.linkUrl,
        branchId: branches[n.branchCode]?.id || null,
        userId: users[n.userEmail]?.id || null,
      },
    });
  }
  console.log(`✓ Seeded ${notificationsData.length} in-app operational notifications`);

  // -------------------------------------------------------------
  // 10. AUDIT EVENTS (55+ tamper-resistant operational events)
  // -------------------------------------------------------------
  const auditActions = [
    {
      actor: "owner@madamchocolate.com",
      action: "USER_LOGIN",
      entityType: "USER",
      branch: null,
      desc: "Executive Owner authenticated from corporate office.",
    },
    {
      actor: "manager.indiranagar@madamchocolate.com",
      action: "TASK_REVIEWED",
      entityType: "TASK",
      branch: "IND",
      desc: "Approved Opening Store Checklist with photo evidence verification.",
    },
    {
      actor: "employee.rahul@madamchocolate.com",
      action: "ATTENDANCE_CHECKIN",
      entityType: "ATTENDANCE",
      branch: "IND",
      desc: "Simulated check-in inside Indiranagar geofence (32.5m).",
    },
    {
      actor: "manager.indiranagar@madamchocolate.com",
      action: "TRANSFER_INITIATED",
      entityType: "INVENTORY",
      branch: "IND",
      desc: "Created transfer TR-2026-IND-KOR-001 of 15 Royal Velvet Pralines.",
    },
    {
      actor: "auditor@madamchocolate.com",
      action: "INVENTORY_AUDIT_VIEWED",
      entityType: "INVENTORY",
      branch: null,
      desc: "Internal auditor reviewed Q3 movement ledger and negative stock alerts.",
    },
    {
      actor: "manager.koramangala@madamchocolate.com",
      action: "CSV_IMPORT_EXECUTED",
      entityType: "SYSTEM",
      branch: "KOR",
      desc: "Imported 124 POS sales transactions via daily settlement CSV.",
    },
    {
      actor: "owner@madamchocolate.com",
      action: "SOP_PUBLISHED",
      entityType: "SOP",
      branch: null,
      desc: "Published version 1 of End-of-Day Stock & Cash Reconciliation protocol.",
    },
  ];

  let auditCount = 0;
  for (let i = 0; i < 55; i++) {
    const template = auditActions[i % auditActions.length];
    const user = users[template.actor];
    const evDate = new Date(today);
    evDate.setDate(evDate.getDate() - (i % 20));
    evDate.setMinutes(evDate.getMinutes() - i * 17);

    await prisma.auditEvent.create({
      data: {
        actorId: user?.id || null,
        actorName: user?.name || "System Automated Process",
        actorRole: user?.role || "SYSTEM",
        action: template.action,
        entityType: template.entityType,
        branchId: template.branch ? branches[template.branch]?.id : null,
        metadataJson: JSON.stringify({
          detail: template.desc,
          environment: "DEMO_FICTIONAL",
          sequenceNumber: i + 1,
        }),
        ipAddress: "127.0.0.1",
        createdAt: evDate,
      },
    });
    auditCount++;
  }
  console.log(`✓ Seeded ${auditCount} tamper-resistant historical audit records`);

  console.log("\n✨ DETERMINISTIC SEED COMPLETED SUCCESSFULLY!");
  console.log("------------------------------------------------------------------");
  console.log("Fictional Demo Credentials:");
  console.log("1. Owner:     owner@madamchocolate.com                 / MadamChoc2026!");
  console.log("2. Manager:   manager.indiranagar@madamchocolate.com   / MadamChoc2026!");
  console.log("3. Employee:  employee.rahul@madamchocolate.com        / MadamChoc2026!");
  console.log("4. Auditor:   auditor@madamchocolate.com               / MadamChoc2026!");
  console.log("------------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
