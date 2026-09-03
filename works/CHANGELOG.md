# JTG Panel — Changelog

## Session Changes & Master Stability Audit

### 1. Role Hierarchy & Authorization Fixes
- **Frontend API Keys Access (`src/pages/ApiKeysPage.tsx`)**:
  - Fixed permission gate from `user?.role !== "admin"` to `user?.role !== "admin" && user?.role !== "owner"`.
  - Owners now have full access to view, create, and revoke API keys.
- **Frontend User Management in Account Page (`src/pages/AccountPage.tsx`)**:
  - Fixed `fetchUsers` condition from `if (user.role !== "admin")` to `if (user.role !== "admin" && user.role !== "owner")`.
  - Updated default admin account checks from username-based comparison (`user.username === "admin"`) to immutable ID check (`user.id === "temp-admin"`), ensuring owners named "admin" are not blocked from updating their passwords.
- **Admin Controls Component (`src/components/AdminControls.tsx`)**:
  - Added visual Owner badge with gold shield (`Shield` icon with `text-amber-500`).
  - Allowed Owners to manage roles, reset passwords, and delete users regardless of their username (protecting only the fallback `temp-admin` ID).
  - Maintained strict RBAC: Admins cannot change roles or delete other admins or the owner.
- **Admin Settings Page (`src/pages/AdminSettingsPage.tsx`)**:
  - Explicitly grouped access condition `!user || (user.role !== "admin" && user.role !== "owner")`.
- **Sub-users & SFTP Route Authorization (`src/server/routes/servers.ts`)**:
  - Added authorization guards across subuser endpoints (`GET`, `POST`, `DELETE`) and SFTP endpoints (`GET`, `POST /create`, `POST /reset-password`, `DELETE`).
  - Ensured Owners and Admins have administrative oversight on all server subusers and SFTP configurations, while normal users can only manage their own servers.
- **Plugin & Mod Installation Endpoints (`src/server/controllers/servers.ts`)**:
  - Added server ownership checks on `installPlugin` and `installMod` allowing Owners and Admins to manage any server, and regular users only their assigned servers.
- **Initial Dev Login Role Assignment (`src/server/controllers/auth.ts`)**:
  - Updated auto-creation logic in dev mode to assign `role: "owner"` to the initial user if no owner exists in `users.json`, ensuring immediate administrative authority.
  - Promoted existing single dev user in `.data/users.json` to `"owner"`.

### 2. Works System Implementation
- Created `/works/README.md` with complete architectural documentation, port usage rules, role hierarchy matrix, runtime switching guard, and installer instructions.
- Created `/works/CHANGELOG.md` tracking all changes.
- Added comprehensive verification test suite in `/works/tests/`:
  - `owner_permissions.test.ts`
  - `admin_permissions.test.ts`
  - `user_permissions.test.ts`
  - `runtime_management.test.ts`
  - `port_isolation.test.ts`
