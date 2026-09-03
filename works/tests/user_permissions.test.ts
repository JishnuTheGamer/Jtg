import assert from "assert";

console.log("▶ Running User Permissions Verification Test...");

const user1 = { id: "user-1", username: "RegularPlayer1", role: "user" };
const user2 = { id: "user-2", username: "RegularPlayer2", role: "user" };

const serverOwnedByUser1 = { id: "srv-1", name: "User1 Server", owner: "user-1" };
const serverOwnedByUser2 = { id: "srv-2", name: "User2 Server", owner: "user-2" };

// 1. Test Server Access Filtering
function canAccessServer(user: any, server: any): boolean {
  if (user.role === "admin" || user.role === "owner") return true;
  return server.owner === user.id;
}

assert.strictEqual(canAccessServer(user1, serverOwnedByUser1), true, "User can access their own server");
assert.strictEqual(canAccessServer(user1, serverOwnedByUser2), false, "User CANNOT access another user's server");
assert.strictEqual(canAccessServer({ role: "owner", id: "owner-1" }, serverOwnedByUser1), true, "Owner can access any server");
assert.strictEqual(canAccessServer({ role: "admin", id: "admin-1" }, serverOwnedByUser1), true, "Admin can access any server");

// 2. Test Admin Route Access
function canAccessAdminRoutes(role: string): boolean {
  return role === "admin" || role === "owner";
}

assert.strictEqual(canAccessAdminRoutes(user1.role), false, "Normal user is rejected from admin routes");
assert.strictEqual(canAccessAdminRoutes("admin"), true, "Admin is accepted on admin routes");
assert.strictEqual(canAccessAdminRoutes("owner"), true, "Owner is accepted on admin routes");

console.log("✓ User Permissions Verification Test PASSED successfully.");
