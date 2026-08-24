# JTG Panel Stabilization Audit Report
**Date**: August 23, 2026  
**Auditor**: Lead Senior Engineer  
**Target Repository**: JishnuTheGamer/Jtg (JTG Panel V3)  
**Safety Baseline Commit**: `8ece0d9`  
**Safety Backup Tag**: `pre-stabilization-2026-08-23`  
**Safety Archive**: `JTG-Panel-Pre-Stabilization-Backup-2026-08-23-0753.zip`  
**SHA-256 Checksum**: `1ea39a6a27a2ba35aad409ff862e7086560e0e528a5715af0a474cab3ffe1b5a`

---

## Executive Summary
A systematic full-stack audit was performed on the JTG Panel V3 codebase following rapid additions of features (Playit health monitoring, world version protection, safe storage wrappers, Docker/local runtime dual engines, CORS/preview domains, and auto-updaters).

The core architecture is solid, but suffers from:
1. **Duplicate / redundant error handlers and scripts** (`server.ts` top & bottom `uncaughtException`, duplicate patch scripts in root).
2. **Missing `test` script in `package.json`** causing `update.sh` to warn or fail during updates.
3. **Missing `.gitignore` rules** (`dist.tmp/`, `dist.old/`, `*.bak`, `*.tar`, `.releases/`), causing test failures in `scripts/test-fixes.ts`.
4. **Subtle UI styling & state stability issues** on the Server lifecycle buttons in `ServerView.tsx` during state transitions (`starting` / `stopping` / `offline`).
5. **Robustness of streaming zip & backup compression**: ensuring clean error handling on streams and socket cleanup.

---

## 1. Frontend Audit

| File / Component | Status | Findings / Risks | Required Stabilization Action |
|---|---|---|---|
| `src/main.tsx` | Clean | Has global error boundary and unhandled rejection filters for canceled requests. | Keep intact. Ensure clean mounting into `#root`. |
| `src/App.tsx` | Clean | Uses React Router v7 with lazy/standard route boundaries, SettingsContext, AuthContext. | Verified clean route tree and no unhandled exceptions. |
| `src/components/ErrorBoundary.tsx` | Clean | Robust exception catcher with token redaction, diagnostics reporting, and hard refresh. | Keep as primary client error shield. |
| `src/utils/storage.ts` | Clean | Safe wrapper handling disabled `localStorage` / `sessionStorage` in restricted iframes. | Ensure all components import `safeStorage` / `safeSessionStorage`. |
| `src/pages/ServerView.tsx` | Minor Polish | Power button bar has start/restart/stop buttons. Stop button transitions to "Kill" when starting/stopping. Needs rock-solid fixed dimensions, spinner feedback, and no layout shifting. | Ensure button width/height and flex layout remain fixed under all status states (`online`, `starting`, `stopping`, `offline`). |
| `src/components/ServerConsole.tsx` | Good | Socket.io log stream with auto-scroll and command input. | Ensure socket reconnect handles token refreshes cleanly. |
| `src/components/FileManager.tsx` | Good | Supports chunked upload up to 2GB, unzipping, in-place edit, and download. | Verify path traversal validations on client and server. |
| `src/components/WorldManager.tsx` | Good | World DataVersion analyzer and safe import. | Ensure clean integration with ServerView. |
| `src/components/ServerBackups.tsx` | Good | Backup creator with cache exclusion toggle and direct browser streaming download. | Verify streaming download triggers standard browser file save. |

---

## 2. Backend Audit

| Module / File | Status | Findings / Risks | Required Stabilization Action |
|---|---|---|---|
| `server.ts` | Redundant code | Lines 1-10 and Lines 306-314 both register `uncaughtException` and `unhandledRejection`. | Consolidate error handling into a single centralized logger that prevents panel crash without double logging. |
| `src/server/utils/jwt.ts` | Secure | 256-bit cryptographically secure secret auto-generated and persisted to `.data/jwt_secret.key`. | Keep centralized and cached. |
| `src/server/utils/cors.ts` | Secure | Whitelists localhost, loopback, CodeSandbox, Cloud Run, and user-configured origins. | Keep origin validation strict in production while permissive in preview containers. |
| `src/server/middleware/auth.ts` | Secure | Supports Bearer token, Cookie token, x-api-key, and query token (for file streams). | Keep unified token extraction and role validation. |
| `src/server/controllers/servers.ts` | Clean | Enforces 2GB upload limit, session.lock cleanup on boot, World DataVersion checks, least-privilege permissions (`0o644`/`0o755`), and streaming zips. | Standardize `archiver` import and verify backup creation. |
| `src/server/services/metrics.ts` | Clean | Docker metrics isolate cgroup memory (deducting file cache) with configurable limit floor. Local metrics isolate Java PID tree. | Verified clean isolation between host metrics and container/process metrics. |
| `src/server/services/docker.ts` | Clean | Handles Docker daemon detection, remote nodes, socket connections, and fallback sandbox. | Ensure graceful fallback if Docker socket is unreachable. |
| `src/server/services/local.ts` | Clean | Portable Java / Adoptium auto-provisioning (Java 8 to 25) for local native processes. | Verified robust process tracking via PID maps. |
| `src/server/services/playitHealth.ts` | Clean | TCP socket reachability, exponential backoff (0s, 5m, 15m, 30m), online player safety before restart. | Keep background monitoring non-blocking. |

---

## 3. Infrastructure, Scripts & Build Audit

| Item | Status | Findings / Risks | Required Stabilization Action |
|---|---|---|---|
| `.gitignore` | Incomplete | Missing entries required by test suite (`dist.tmp/`, `dist.old/`, `*.bak`, `*.tar`, `.releases/`). | Update `.gitignore` with all temporary, build, and release directories. |
| `package.json` | Missing script | Missing `"test": "tsx scripts/test-fixes.ts"`. | Add `"test"` script to `package.json` so `npm test` and `update.sh` run tests cleanly. |
| `update.sh` | Good | Contains 11-step update suite with backup, stash, build verification, and automatic rollback. | Verified full compatibility with npm and pm2. |
| `install.sh` | Good | Comprehensive interactive & automated installer with dependency checks, Node.js 22 LTS, and service generation. | Keep as primary installation entry point. |
| `scripts/verify-build-assets.ts` | Good | Verifies `dist/index.html` references exist on disk and `dist/server.cjs` is compiled. | Integrates with build pipeline. |

---

## 4. Deduplication & Consolidation Plan (Phase 2)
1. **Consolidate server.ts Process Error Handlers**: Remove the duplicate `process.on('uncaughtException')` and `process.on('unhandledRejection')` blocks at the bottom of `server.ts`.
2. **Update `.gitignore`**: Add missing rules (`dist.tmp/`, `dist.old/`, `*.bak`, `*.tar`, `.releases/`).
3. **Register Test Command in `package.json`**: Add `"test": "tsx scripts/test-fixes.ts"`.
4. **Run Full Test Suite**: Verify 23/23 tests pass cleanly.
5. **Verify Server Power Controls & Lifecycle UX**: Ensure the Stop/Kill button and Start/Restart buttons are mathematically stable, cleanly styled, and responsive across desktop and mobile.
