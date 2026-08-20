# Changelog

All notable changes to the JTG Panel project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.1.0] - 2026-08-20

### Security Improvements
- **World DataVersion Safety Gate**: Gated `-DPaper.IgnoreWorldDataVersion=true` JVM flag behind pre-flight world version compatibility validation, explicit admin toggle in Server Settings, and safety backup recommendations to protect Minecraft worlds against chunk/entity corruption.
- **Strict JWT Secret Validation**: Removed hardcoded fallback secret (`jtg-panel-super-secret`). Enforced a mandatory 32+ character `JWT_SECRET` requirement in production environments and automated secure cryptographic secret generation in development mode.
- **Authentication Rate Limiting**: Added `express-rate-limit` middleware on `/api/auth/login` (5 attempts per 15 minutes) and `/api/auth/register` (3 accounts per hour) with standard HTTP 429 response handling and brute-force alert logging.
- **Privilege Escalation Prevention**: Fixed server creation and update endpoints in `servers.ts` to strictly require administrative roles (`admin` or `owner`) before allowing reassignment of `owner` / `ownerId`.
- **POSIX File Permissions Hardening**: Replaced all instances of `0o777` permissions with least-privilege modes (`0o750` for directories and executables, `0o644` for files) and implemented `secureChmod` interceptors across server file operations.
- **CORS & Socket.IO Allowlist**: Replaced wildcard `origin: "*"` with an environment-aware validator supporting `ALLOWED_ORIGINS`, local development loopbacks, and Cloud Run preview domains.
- **Upload Size Protection**: Enforced a strict 2GB limit on `multer` file and chunk uploads with proper HTTP 413 (Payload Too Large) error responses to prevent disk-exhaustion DoS attacks.

### Stability & Performance
- **Resource-Scoped Server Creation Locking**: Replaced the global `isCreatingServer` lock with fine-grained per-port and per-user lock sets, allowing multiple users to create servers concurrently on different ports without false 409 conflict errors.
- **Bcrypt Standardization**: Standardized password hashing and verification across all authentication and SFTP workflows on pure JavaScript `bcryptjs`, eliminating native build compilation dependencies.

---

## [3.0.0] - 2026-08-15
- Initial major 3.0 release featuring dual runtime support (Docker & native process), real-time web terminal, telemetry dashboards, and multi-version Java runtime manager.
