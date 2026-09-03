# JTG Panel — System Architecture & Works Documentation

## 1. Overview & Architecture

JTG Panel is a modern, high-performance Game Server Management Panel designed for Minecraft and related game servers.

### Architectural Layers
- **Frontend**: React 18 with TypeScript, Tailwind CSS, Lucide icons, Socket.IO client, and Axios.
- **Backend API**: Express.js server providing RESTful endpoints (`/api/servers`, `/api/system`, `/api/auth`, `/api/nodes`, `/api/api-keys`).
- **Real-time Engine**: Socket.IO server broadcasting server stats (CPU, RAM, disk, online players, console streams) and system health.
- **SFTP Subsystem**: Built-in SSH2/SFTP server listening on port 6868 for direct server file access.
- **Data Persistence**: JSON document store in `.data/` (`servers.json`, `users.json`, `settings.json`, `nodes.json`, `wings_nodes.json`, `api_keys.json`).
- **Runtime Drivers**: Dual execution engine supporting **Docker Container Runtime** (isolated Docker containers) and **Local Process Runtime** (Node child_process / spawn).

---

## 2. Port Usage & Isolation

| Port | Service | Environment | Access & Isolation Rules |
|------|---------|-------------|--------------------------|
| **6767** | Main Production Panel | Production (VPS) | Public panel access served via PM2 / systemd and reverse proxy. |
| **3000** | Developer Panel | Development / Cloud Run | Primary development server. **Runtime switching** (Docker vs Local) is strictly guarded and only permitted on Port 3000. |
| **6868** | Internal SFTP Service | Both | Dedicated SFTP daemon for server file transfer. |
| **25565+** | Game Server Allocations | Both | Assigned ports for active Minecraft servers. |

---

## 3. Role Hierarchy & Authorization

The system enforces a strict hierarchical Role-Based Access Control (RBAC) model:
$$\text{OWNER} > \text{ADMIN} > \text{USER}$$

### Role Matrix

| Capability | OWNER | ADMIN | USER |
|------------|:-----:|:-----:|:----:|
| Access All Servers & Fleet | ✅ | ✅ | ❌ (Own servers only) |
| Access Admin Settings & System Metrics | ✅ | ✅ | ❌ |
| Manage Nodes & Wings | ✅ | ✅ | ❌ |
| Manage API Keys | ✅ | ✅ | ❌ |
| Create Regular Users | ✅ | ✅ | ❌ |
| Delete Regular Users | ✅ | ✅ | ❌ |
| Reset Regular User Passwords | ✅ | ✅ | ❌ |
| Create Admin Users | ✅ | ❌ | ❌ |
| Change User Roles (Promote/Demote) | ✅ | ❌ | ❌ |
| Reset Admin Passwords | ✅ | ❌ | ❌ |
| Delete Admin Users | ✅ | ❌ | ❌ |
| Manage / Delete / Modify Owner | ❌ (Immune) | ❌ (Forbidden) | ❌ (Forbidden) |
| Create Owner via Web UI | ❌ (Forbidden) | ❌ (Forbidden) | ❌ (Forbidden) |
| Create Owner via VPS/CLI | ✅ (`createuser.ts`) | ❌ | ❌ |

### Security & Invariance Rules
1. **Owner is a Superset of Admin**: Any route or UI component requiring administrative access permits both `owner` and `admin`.
2. **Owner Immunity**: An Owner account cannot be deleted, modified, demoted, or have its password changed by an Admin or regular user.
3. **Restricted Owner Creation**: Owner accounts cannot be created via the web UI. They can only be provisioned via the installer (`install.sh`) or direct server command (`npm run createuser`).

---

## 4. Runtime Rules & Switching

1. **Docker Container Runtime**:
   - Spawns isolated Docker containers with memory and CPU constraints.
   - Server data mapped to `.data/servers/<id>`.
2. **Local Process Runtime**:
   - Executes Java directly using the host's installed Java environments (Java 8, 11, 17, 21).
   - Manages console streams and PID lifecycle.
3. **Switching Guard**:
   - Changing the default runtime (`/api/system/settings`) requires Developer Panel execution (Port 3000) to ensure VPS installations are not disrupted.

---

## 5. Installation & Management

### Initial VPS Installation
```bash
bash install.sh
```

### Owner Account Provisioning
To create or reset the master Owner account via CLI:
```bash
npm run createuser
```
Or via non-interactive environment variables:
```bash
JTG_OWNER_USER="admin" JTG_OWNER_PASS="YourSecurePassword123" npm run createuser
```

### Dev Server
```bash
npm run dev
```
Runs Vite + Express full-stack on Port 3000.
