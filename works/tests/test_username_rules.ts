import { changeUsername } from "../src/server/controllers/auth.js";
import { readJSON, writeJSON } from "../src/server/services/db.js";

async function runTests() {
  console.log("Starting Username Permission Rule Tests...");

  // Mock DB with test users
  const testUsers = [
    {
      id: "google-user-1",
      username: "googleuser",
      email: "googleuser@gmail.com",
      googleId: "gid-12345",
      provider: "google",
      role: "user"
    },
    {
      id: "google-admin-1",
      username: "googleadmin",
      email: "googleadmin@company.com", // non-gmail domain but Google OAuth
      googleId: "gid-67890",
      provider: "google",
      role: "admin"
    },
    {
      id: "local-user-1",
      username: "localuser",
      email: "localuser@gmail.com", // Gmail address but local auth!
      password: "hashedpassword123",
      role: "user"
    },
    {
      id: "local-admin-1",
      username: "localadmin",
      email: "admin@jtg.internal",
      password: "hashedpassword456",
      role: "admin"
    }
  ];

  await writeJSON("users.json", testUsers);

  // Helper mock res
  const createMockRes = () => {
    const res: any = {};
    res.statusCode = 200;
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.body = data;
      return res;
    };
    return res;
  };

  // TEST 1: Google user change username -> SUCCESS
  {
    const req: any = { user: { id: "google-user-1" }, body: { newUsername: "google_renamed" } };
    const res = createMockRes();
    await changeUsername(req, res);
    console.log("TEST 1 (Google User):", res.statusCode === 200 && res.body.success ? "PASSED" : "FAILED", res.body);
  }

  // TEST 2: Google Admin change username -> SUCCESS
  {
    const req: any = { user: { id: "google-admin-1" }, body: { newUsername: "google_admin_new" } };
    const res = createMockRes();
    await changeUsername(req, res);
    console.log("TEST 2 (Google Admin):", res.statusCode === 200 && res.body.success ? "PASSED" : "FAILED", res.body);
  }

  // TEST 3: Local User change username -> REJECTED (403)
  {
    const req: any = { user: { id: "local-user-1" }, body: { newUsername: "local_hacked" } };
    const res = createMockRes();
    await changeUsername(req, res);
    console.log("TEST 3 (Local User with Gmail address):", res.statusCode === 403 ? "PASSED" : "FAILED", res.statusCode, res.body);
  }

  // TEST 4: Local Admin change username -> REJECTED (403)
  {
    const req: any = { user: { id: "local-admin-1" }, body: { newUsername: "local_admin_hack" } };
    const res = createMockRes();
    await changeUsername(req, res);
    console.log("TEST 4 (Local Admin):", res.statusCode === 403 ? "PASSED" : "FAILED", res.statusCode, res.body);
  }

  // TEST 5: Duplicate username -> REJECTED (400)
  {
    const req: any = { user: { id: "google-user-1" }, body: { newUsername: "google_admin_new" } };
    const res = createMockRes();
    await changeUsername(req, res);
    console.log("TEST 5 (Duplicate Username):", res.statusCode === 400 ? "PASSED" : "FAILED", res.statusCode, res.body);
  }

  // TEST 6: Short username -> REJECTED (400)
  {
    const req: any = { user: { id: "google-user-1" }, body: { newUsername: "ab" } };
    const res = createMockRes();
    await changeUsername(req, res);
    console.log("TEST 6 (Short Username):", res.statusCode === 400 ? "PASSED" : "FAILED", res.statusCode, res.body);
  }

  console.log("All unit verification tests completed.");
}

runTests().catch(console.error);
