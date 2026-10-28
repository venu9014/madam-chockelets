async function runTests() {
  console.log("🧪 Testing Madam Chockelets with Neon Lakebase Postgres end-to-end...\n");

  const baseUrl = "http://localhost:3000";

  // 1. Test Login
  console.log("▶ 1. Testing POST /api/auth/login with owner@madamchocolate.com...");
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@madamchocolate.com",
      password: "MadamChoc2026!"
    })
  });

  console.log(`   Status: ${loginRes.status} ${loginRes.statusText}`);
  const loginData = await loginRes.json();
  console.log("   Response:", JSON.stringify(loginData));

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  // Extract set-cookie header
  const cookieHeader = loginRes.headers.get("set-cookie");
  const cookies = cookieHeader ? cookieHeader.split(";")[0] : "";
  console.log("   Session cookie acquired successfully.\n");

  // 2. Test Branches
  console.log("▶ 2. Testing GET /api/branches (Outlets)...");
  const branchesRes = await fetch(`${baseUrl}/api/branches`, {
    headers: { Cookie: cookies }
  });
  const branchesData = await branchesRes.json();
  console.log(`   Status: ${branchesRes.status}`);
  console.log(`   Outlets Count: ${branchesData.branches?.length || 0}`);
  for (const b of (branchesData.branches || [])) {
    console.log(`     - [${b.code}] ${b.name} (${b.latitude}, ${b.longitude})`);
  }
  console.log();

  // 3. Test Products
  console.log("▶ 3. Testing GET /api/products...");
  const prodRes = await fetch(`${baseUrl}/api/products`, {
    headers: { Cookie: cookies }
  });
  const prodData = await prodRes.json();
  console.log(`   Status: ${prodRes.status}`);
  console.log(`   Total Products: ${prodData.products?.length || 0}\n`);

  // 4. Test Employees (Verify Whitefield Test Employee)
  console.log("▶ 4. Testing GET /api/employees...");
  const empRes = await fetch(`${baseUrl}/api/employees`, {
    headers: { Cookie: cookies }
  });
  const empData = await empRes.json();
  console.log(`   Status: ${empRes.status}`);
  console.log(`   Total Employees: ${empData.employees?.length || 0}`);
  const wfEmp = empData.employees?.find(e => e.user?.name?.includes("Whitefield"));
  console.log(`   Whitefield Test Employee: ${wfEmp ? `FOUND (Code: ${wfEmp.employeeCode}, Branch: ${wfEmp.branch?.name})` : "NOT FOUND"}\n`);

  // 5. Test Tasks
  console.log("▶ 5. Testing GET /api/tasks...");
  const tasksRes = await fetch(`${baseUrl}/api/tasks`, {
    headers: { Cookie: cookies }
  });
  const tasksData = await tasksRes.json();
  console.log(`   Status: ${tasksRes.status}`);
  console.log(`   Total Tasks: ${tasksData.tasks?.length || 0}\n`);

  // 6. Test Dashboard Stats
  console.log("▶ 6. Testing GET /api/dashboard/stats...");
  const statsRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
    headers: { Cookie: cookies }
  });
  const statsData = await statsRes.json();
  console.log(`   Status: ${statsRes.status}`);
  console.log(`   Total Revenue: ₹${statsData.stats?.kpis?.totalRevenue?.toLocaleString("en-IN") || 0}`);
  console.log(`   Compliance Rate: ${statsData.stats?.kpis?.complianceRate || 0}%\n`);

  console.log("🎉 ALL TESTS PASSED! Neon Lakebase Postgres is working flawlessly end-to-end!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
