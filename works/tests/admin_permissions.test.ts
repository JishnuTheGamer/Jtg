import assert from "assert";

console.log("▶ Running Admin Permissions Verification Test...");

const ownerUser = { id: "owner-1", username: "MasterOwner", role: "owner" };
const adminUser1 = { id: "admin-1", username: "AdminOne", role: "admin" };
const adminUser2 = { id: "admin-2", username: "AdminTwo", role: "admin" };
const normalUser = { id: "user-1", username: "PlayerOne", role: "user" };

// 1. Test Admin Deletion Restrictions
function canDeleteUser(requesterRole: string, targetUser: any): { allowed: boolean; reason?: string } {
  if (requesterRole !== "admin" && requesterRole !== "owner") return { allowed: false, reason: "Forbidden" };
  if (targetUser.role === "owner") return { allowed: false, reason: "Cannot delete owner" };
  if (requesterRole === "admin" && targetUser.role === "admin") return { allowed: false, reason: "Admin cannot delete Admin" };
  return { allowed: true };
}

assert.deepStrictEqual(canDeleteUser("admin", ownerUser), { allowed: false, reason: "Cannot delete owner" }, "Admin MUST NOT be allowed to delete Owner");
assert.deepStrictEqual(canDeleteUser("admin", adminUser2), { allowed: false, reason: "Admin cannot delete Admin" }, "Admin MUST NOT be allowed to delete another Admin");
assert.deepStrictEqual(canDeleteUser("admin", normalUser), { allowed: true }, "Admin is allowed to delete normal user");

// 2. Test Admin Role Changing Restrictions
function canChangeRole(requesterRole: string, targetUser: any, newRole: string): { allowed: boolean; reason?: string } {
  if (requesterRole !== "admin" && requesterRole !== "owner") return { allowed: false, reason: "Forbidden" };
  if (!["admin", "user"].includes(newRole)) return { allowed: false, reason: "Invalid role" };
  if (targetUser.role === "owner") return { allowed: false, reason: "Cannot modify owner" };
  if (requesterRole === "admin") return { allowed: false, reason: "Admin cannot change roles" };
  return { allowed: true };
}

assert.deepStrictEqual(canChangeRole("admin", normalUser, "admin"), { allowed: false, reason: "Admin cannot change roles" }, "Admin cannot promote users");
assert.deepStrictEqual(canChangeRole("admin", ownerUser, "admin"), { allowed: false, reason: "Cannot modify owner" }, "Admin cannot modify Owner");

// 3. Test Admin User Creation Restrictions
function canCreateUser(requesterRole: string, newRole: string): { allowed: boolean; reason?: string } {
  if (requesterRole !== "admin" && requesterRole !== "owner") return { allowed: false, reason: "Forbidden" };
  if (newRole === "owner") return { allowed: false, reason: "Cannot create owner from panel" };
  if (requesterRole === "admin" && newRole === "admin") return { allowed: false, reason: "Admin cannot create Admin" };
  return { allowed: true };
}

assert.deepStrictEqual(canCreateUser("admin", "owner"), { allowed: false, reason: "Cannot create owner from panel" }, "Admin cannot create Owner");
assert.deepStrictEqual(canCreateUser("admin", "admin"), { allowed: false, reason: "Admin cannot create Admin" }, "Admin cannot create Admin");
assert.deepStrictEqual(canCreateUser("admin", "user"), { allowed: true }, "Admin can create normal user");
assert.deepStrictEqual(canCreateUser("owner", "admin"), { allowed: true }, "Owner can create Admin");

console.log("✓ Admin Permissions Verification Test PASSED successfully.");
