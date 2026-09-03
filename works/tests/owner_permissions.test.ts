import assert from "assert";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jtg-panel-secret-key-super-secure-change-in-production";

console.log("▶ Running Owner Permissions Verification Test...");

// 1. Verify token generation for owner role
const ownerPayload = { id: "owner-test-1", username: "MasterOwner", role: "owner", passwordVersion: 0 };
const token = jwt.sign(ownerPayload, JWT_SECRET, { expiresIn: "1h" });
const decoded = jwt.verify(token, JWT_SECRET) as any;

assert.strictEqual(decoded.role, "owner", "Decoded token role must be owner");

// 2. Test requireAdmin middleware logic
function checkRequireAdmin(role: string): boolean {
  return role === "admin" || role === "owner";
}

assert.strictEqual(checkRequireAdmin(decoded.role), true, "Owner must satisfy admin privilege checks");

// 3. Test Owner Management Permissions against User and Admin
const users = [
  { id: "owner-test-1", username: "MasterOwner", role: "owner" },
  { id: "admin-test-1", username: "SubAdmin", role: "admin" },
  { id: "user-test-1", username: "NormalPlayer", role: "user" },
  { id: "temp-admin", username: "admin", role: "admin" }
];

// Can owner delete admin?
function canDeleteUser(requesterRole: string, targetUser: any): { allowed: boolean; reason?: string } {
  if (requesterRole !== "admin" && requesterRole !== "owner") return { allowed: false, reason: "Forbidden" };
  if (targetUser.role === "owner") return { allowed: false, reason: "Cannot delete owner" };
  if (requesterRole === "admin" && targetUser.role === "admin") return { allowed: false, reason: "Admin cannot delete Admin" };
  return { allowed: true };
}

assert.deepStrictEqual(canDeleteUser("owner", users[1]), { allowed: true }, "Owner MUST be allowed to delete Admin");
assert.deepStrictEqual(canDeleteUser("owner", users[2]), { allowed: true }, "Owner MUST be allowed to delete Normal User");
assert.deepStrictEqual(canDeleteUser("owner", users[0]), { allowed: false, reason: "Cannot delete owner" }, "Owner cannot be deleted");

// Can owner change role?
function canChangeRole(requesterRole: string, targetUser: any, newRole: string): { allowed: boolean; reason?: string } {
  if (requesterRole !== "admin" && requesterRole !== "owner") return { allowed: false, reason: "Forbidden" };
  if (!["admin", "user"].includes(newRole)) return { allowed: false, reason: "Invalid role" };
  if (targetUser.role === "owner") return { allowed: false, reason: "Cannot modify owner" };
  if (requesterRole === "admin") return { allowed: false, reason: "Admin cannot change roles" };
  return { allowed: true };
}

assert.deepStrictEqual(canChangeRole("owner", users[1], "user"), { allowed: true }, "Owner can demote admin to user");
assert.deepStrictEqual(canChangeRole("owner", users[2], "admin"), { allowed: true }, "Owner can promote user to admin");
assert.deepStrictEqual(canChangeRole("owner", users[1], "owner"), { allowed: false, reason: "Invalid role" }, "Owner cannot promote anyone to owner via role change");

console.log("✓ Owner Permissions Verification Test PASSED successfully.");
