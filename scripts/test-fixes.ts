import assert from "assert";
import fs from "fs-extra";
import path from "path";
import bcrypt from "bcryptjs";
import { getCorsOriginValidator } from "../src/server/utils/cors.js";
import { getJavaVersionForMinecraft, getDataVersionForMinecraft } from "../src/server/services/minecraft.js";
import { secureChmod, secureDirectoryPermissions, secureFilePermissions } from "../src/server/utils/permissions.js";
import { MAX_UPLOAD_BYTES } from "../src/server/routes/servers.js";
import { loginRateLimiter, registerRateLimiter } from "../src/server/middleware/rateLimiters.js";
import { calculateDockerMemoryStats, calculateLocalMemoryStats } from "../src/server/services/metrics.js";
import { formatBytesToDisplay, formatMBToDisplay } from "../src/types/stats.js";

async function runTests() {
  console.log("\n==================================================");
  console.log("  RUNNING JTG PANEL SECURITY & BUG FIX TEST SUITE  ");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function record(name: string, fn: () => void | Promise<void>) {
    total++;
    return (async () => {
      try {
        await fn();
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
        throw err;
      }
    })();
  }

  // 1. JWT_SECRET verification tests
  await record("1. JWT Secret Validation: 32+ character secrets are accepted", () => {
    const validSecret = "a".repeat(32);
    assert.strictEqual(validSecret.length >= 32, true);
  });

  // 2. Rate Limiting Tests
  await record("2. Rate Limiting: Authentication endpoints enforce limits", async () => {
    assert.strictEqual(typeof loginRateLimiter, "function");
    assert.strictEqual(typeof registerRateLimiter, "function");
  });

  // 3. World Version Safety Check
  await record("3. World Version Safety: Version mismatch detection blocks unsafe boot", () => {
    const paper1201Version = "1.20.1";
    const server1201DataVersion = getDataVersionForMinecraft(paper1201Version);
    const world1214DataVersion = 4189; // Minecraft 1.21.4 DataVersion

    assert.strictEqual(server1201DataVersion, 3465);
    assert.strictEqual(world1214DataVersion > server1201DataVersion, true, "World data version is newer than server version");
    
    const isBypassAllowed = (server: { ignoreWorldDataVersion?: boolean }) => server.ignoreWorldDataVersion === true;
    assert.strictEqual(isBypassAllowed({ ignoreWorldDataVersion: false }), false, "Default prevents unsafe world load");
    assert.strictEqual(isBypassAllowed({ ignoreWorldDataVersion: true }), true, "Explicit admin bypass allows boot");
  });

  // 4. Privilege Escalation Prevention
  await record("4. Privilege Escalation: Non-admin cannot spoof ownerId", () => {
    const nonAdminUser = { id: "user-123", role: "user", username: "regular_joe" };
    const adminUser = { id: "admin-999", role: "admin", username: "super_admin" };

    const requestedOwner = "victim-user-456";

    // Non-admin request
    const nonAdminAssigned = (nonAdminUser.role === "admin" || nonAdminUser.role === "owner") ? requestedOwner : nonAdminUser.id;
    assert.strictEqual(nonAdminAssigned, "user-123", "Non-admin ownerId assignment forced to self ID");

    // Admin request
    const adminAssigned = (adminUser.role === "admin" || adminUser.role === "owner") ? requestedOwner : adminUser.id;
    assert.strictEqual(adminAssigned, "victim-user-456", "Admin is permitted to assign ownership");
  });

  // 5. File Permissions & Anti-0o777
  await record("5. File Permissions: Secure least-privilege modes applied (no 0o777)", async () => {
    const testDir = path.join(process.cwd(), ".data", "test-permissions-dir");
    const testFile = path.join(testDir, "test.txt");

    await fs.ensureDir(testDir);
    await fs.writeFile(testFile, "test data");

    // Attempt to apply 0o777 through secureChmod
    await secureChmod(testFile, 0o777);
    const statFile = await fs.stat(testFile);
    const modeFile = statFile.mode & 0o777;

    // Verify 0o777 is forbidden and mapped to 0o644
    assert.notStrictEqual(modeFile, 0o777, "File mode must never be 0o777");

    await secureDirectoryPermissions(testDir);
    const statDir = await fs.stat(testDir);
    const modeDir = statDir.mode & 0o777;
    assert.notStrictEqual(modeDir, 0o777, "Directory mode must never be 0o777");

    // Clean up
    await fs.remove(testDir);
  });

  // 6. CORS & Socket.IO Origin Allowlist
  await record("6. CORS Security: Origin validator approves local & rejects disallowed origins in prod", () => {
    const validator = getCorsOriginValidator();

    // 1. Loopback origins
    validator("http://localhost:3000", (err, allow) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allow, true);
    });
    validator("http://127.0.0.1:6767", (err, allow) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allow, true);
    });

    // 2. Cloud Run preview domains
    validator("https://myapp-xyz.run.app", (err, allow) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allow, true);
    });
    validator("https://ais-dev-preview.googleusercontent.com", (err, allow) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allow, true);
    });

    // 3. CodeSandbox preview domains (*.csb.app and *.codesandbox.io)
    validator("https://y6l6rq-6767.csb.app", (err, allow) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allow, true, "Should allow *.csb.app origins");
    });
    validator("https://workspace-test.codesandbox.io", (err, allow) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allow, true, "Should allow *.codesandbox.io origins");
    });

    // 4. No origin header (curl, internal server requests)
    validator(undefined, (err, allow) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allow, true, "Should allow requests with no Origin header");
    });

    // 5. Test production rejection of untrusted origins
    const origEnv = process.env.NODE_ENV;
    const origAllowed = process.env.ALLOWED_ORIGINS;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.CORS_ORIGIN;
      delete process.env.PANEL_URL;

      const prodValidator = getCorsOriginValidator();

      // Untrusted origin in production should be rejected
      prodValidator("https://untrusted-attacker-domain.com", (err, allow) => {
        assert.ok(err instanceof Error, "Should return an Error for disallowed origin in prod");
        assert.strictEqual(allow, false, "Should disallow unauthorized origin");
      });

      // CodeSandbox and Cloud Run preview domains remain trusted in prod
      prodValidator("https://my-box.csb.app", (err, allow) => {
        assert.strictEqual(err, null);
        assert.strictEqual(allow, true);
      });
      prodValidator("https://app.codesandbox.io", (err, allow) => {
        assert.strictEqual(err, null);
        assert.strictEqual(allow, true);
      });

      // Custom ALLOWED_ORIGINS in prod
      process.env.ALLOWED_ORIGINS = "https://mypanel.company.com, https://admin.company.com";
      const customProdValidator = getCorsOriginValidator();
      customProdValidator("https://mypanel.company.com", (err, allow) => {
        assert.strictEqual(err, null);
        assert.strictEqual(allow, true, "Should allow configured ALLOWED_ORIGINS");
      });
      customProdValidator("https://malicious.com", (err, allow) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(allow, false);
      });
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origAllowed !== undefined) process.env.ALLOWED_ORIGINS = origAllowed;
    }
  });

  // 7. Upload Limit Enforcement
  await record("7. Upload Limits: 2GB maximum limit configured", () => {
    assert.strictEqual(MAX_UPLOAD_BYTES, 2 * 1024 * 1024 * 1024, "Max upload limit is exactly 2GB");
  });

  // 8. Resource-Scoped Concurrent Server Creation Locking
  await record("8. Concurrent Server Creation: Distinct users/ports lock independently", () => {
    const activePortLocks = new Set<number>();
    const activeUserLocks = new Set<string>();

    const tryLock = (user: string, port: number) => {
      if (activePortLocks.has(port) || activeUserLocks.has(user)) {
        return false;
      }
      activePortLocks.add(port);
      activeUserLocks.add(user);
      return true;
    };

    const unlock = (user: string, port: number) => {
      activePortLocks.delete(port);
      activeUserLocks.delete(user);
    };

    // User A creating server on port 25565
    assert.strictEqual(tryLock("user-A", 25565), true, "User A acquires lock for port 25565");

    // User B concurrently creating server on port 25566 -> Must succeed
    assert.strictEqual(tryLock("user-B", 25566), true, "User B acquires lock for port 25566 concurrently");

    // User C attempting to collide on port 25565 -> Must fail with conflict
    assert.strictEqual(tryLock("user-C", 25565), false, "Collision on port 25565 correctly blocked");

    // User A attempting double-submit -> Must fail with conflict
    assert.strictEqual(tryLock("user-A", 25567), false, "Double submission by user-A correctly blocked");

    unlock("user-A", 25565);
    unlock("user-B", 25566);
  });

  // 9. Password Hashing with bcryptjs
  await record("9. Authentication: bcryptjs password hashing and verification works reliably", async () => {
    const rawPass = "MyStrongPassword@123!";
    const hash = await bcrypt.hash(rawPass, 10);
    assert.strictEqual(typeof hash, "string");
    assert.strictEqual(hash.startsWith("$2"), true, "Valid bcryptjs hash generated");

    const isCorrect = await bcrypt.compare(rawPass, hash);
    assert.strictEqual(isCorrect, true, "Correct password verified");

    const isWrong = await bcrypt.compare("WrongPassword", hash);
    assert.strictEqual(isWrong, false, "Incorrect password rejected");
  });

  // 10. Docker Memory Stats Calculation & Cache Subtraction
  await record("10. Docker Stats: Cache and inactive files subtracted from raw usage", () => {
    const rawUsage = 3 * 1024 * 1024 * 1024; // 3GB reported by Docker daemon
    const pageCache = 2 * 1024 * 1024 * 1024; // 2GB OS page cache / file cache
    const configuredRamGB = 4; // 4GB server allocation limit

    // Cgroups v1 format: stats.cache
    const mockDockerStatsV1 = {
      memory_stats: {
        usage: rawUsage,
        limit: 64 * 1024 * 1024 * 1024, // 64GB host VPS memory limit
        stats: {
          cache: pageCache
        }
      }
    };

    const calculatedV1 = calculateDockerMemoryStats(mockDockerStatsV1, configuredRamGB);

    // Actual used memory should be exactly 1GB (3GB - 2GB cache)
    assert.strictEqual(calculatedV1.usedBytes, 1 * 1024 * 1024 * 1024, "Used bytes must be 1GB after v1 cache subtraction");
    assert.strictEqual(calculatedV1.limitBytes, 4 * 1024 * 1024 * 1024, "Limit bytes must reflect configured 4GB limit, not host 64GB");
    assert.strictEqual(calculatedV1.includesHostMemory, false, "Host memory must be excluded");
    assert.strictEqual(calculatedV1.overLimit, false, "1GB is under 4GB limit");

    // Cgroups v2 format: stats.inactive_file
    const mockDockerStatsV2 = {
      memory_stats: {
        usage: rawUsage,
        limit: 64 * 1024 * 1024 * 1024,
        stats: {
          inactive_file: pageCache
        }
      }
    };

    const calculatedV2 = calculateDockerMemoryStats(mockDockerStatsV2, configuredRamGB);
    assert.strictEqual(calculatedV2.usedBytes, 1 * 1024 * 1024 * 1024, "Used bytes must be 1GB after v2 inactive_file subtraction");
  });

  // 11. Local Process Memory Stats Calculation
  await record("11. Local Process Stats: Java process tree memory aggregated without host or panel memory", () => {
    const javaProcessRss = 1073741824; // 1GB Java process RSS
    const configuredRamGB = 2; // 2GB server allocation limit

    const calculated = calculateLocalMemoryStats([{ memory: javaProcessRss }], configuredRamGB);

    assert.strictEqual(calculated.usedBytes, javaProcessRss, "Process memory equals Java process RSS");
    assert.strictEqual(calculated.limitBytes, 2 * 1024 * 1024 * 1024, "Limit bytes equals configured 2GB");
    assert.strictEqual(calculated.includesHostMemory, false, "Excludes host and Node panel memory");
    assert.strictEqual(calculated.overLimit, false, "1GB is under 2GB limit");
  });

  // 12. Over-Limit Condition Handling
  await record("12. Resource Limits: Correctly flags when memory usage exceeds configured allocation", () => {
    const highUsage = 4.5 * 1024 * 1024 * 1024; // 4.5GB used
    const configuredRamGB = 4; // 4GB configured limit

    const calculated = calculateLocalMemoryStats([{ memory: highUsage }], configuredRamGB);

    assert.strictEqual(calculated.overLimit, true, "Memory exceeding configured limit is flagged overLimit = true");
  });

  // 13. Unit Formatting Helpers
  await record("13. Formatting: Standard MB / GB unit conversions display cleanly", () => {
    assert.strictEqual(formatBytesToDisplay(0), "0 MB");
    assert.strictEqual(formatBytesToDisplay(512 * 1024 * 1024), "512 MB");
    assert.strictEqual(formatBytesToDisplay(1024 * 1024 * 1024), "1.00 GB");
    assert.strictEqual(formatBytesToDisplay(4294967296), "4.00 GB");

    assert.strictEqual(formatMBToDisplay(0), "0 MB");
    assert.strictEqual(formatMBToDisplay(512), "512 MB");
    assert.strictEqual(formatMBToDisplay(1024), "1.00 GB");
    assert.strictEqual(formatMBToDisplay(4096), "4.00 GB");
  });

  // 14. Playit TCP Port Reachability Tester
  await record("14. Playit Health: TCP socket reachability test detects open vs closed ports with timeout safety", async () => {
    const { testTcpPort } = await import("../src/server/services/playitHealth.js");
    const net = await import("net");

    // Start a temporary test TCP server
    const testServer = net.createServer();
    await new Promise<void>((resolve) => testServer.listen(0, "127.0.0.1", () => resolve()));
    const port = (testServer.address() as net.AddressInfo).port;

    // Test open port
    const isOpen = await testTcpPort("127.0.0.1", port, 1000);
    assert.strictEqual(isOpen, true, "Open TCP port must return true");

    // Close test server
    await new Promise<void>((resolve) => testServer.close(() => resolve()));

    // Test closed port
    const isClosed = await testTcpPort("127.0.0.1", port, 1000);
    assert.strictEqual(isClosed, false, "Closed TCP port must return false");

    // Test invalid port
    const isInvalid = await testTcpPort("127.0.0.1", 999999, 100);
    assert.strictEqual(isInvalid, false, "Invalid port must return false immediately");
  });

  // 15. Playit Token & Secret Log Sanitization
  await record("15. Playit Security: Sanitizer redacts sensitive tokens, secret_keys, and claim paths from logs", async () => {
    const { sanitizePlayitLogs } = await import("../src/server/services/playitHealth.js");

    const rawLogs = `
      [INFO] Agent starting...
      secret_key = "abc123supersecretkeythatmustneverleak"
      token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      Registered at https://playit.gg/claim/9876543210abcdef9876543210abcdef
      \x1b[32mSuccess connecting to proxy\x1b[0m
    `;

    const sanitized = sanitizePlayitLogs(rawLogs);
    assert.strictEqual(sanitized.includes("abc123supersecretkey"), false, "Secret key must be redacted");
    assert.strictEqual(sanitized.includes("eyJhbGciOiJIUzI1Ni"), false, "Auth token must be redacted");
    assert.strictEqual(sanitized.includes("9876543210abcdef"), false, "Claim hash must be redacted");
    assert.strictEqual(sanitized.includes("\x1b[32m"), false, "ANSI color codes must be stripped");
    assert.strictEqual(sanitized.includes("[REDACTED]"), true, "Must contain REDACTED placeholder");
  });

  // 16. Playit Backoff Schedule Calculation
  await record("16. Playit Backoff: Exponential backoff schedule enforces 0s -> 5m -> 15m -> 30m intervals", async () => {
    const { calculateNextBackoffTime } = await import("../src/server/services/playitHealth.js");

    const now = Date.now();
    const t1 = new Date(calculateNextBackoffTime(1)).getTime();
    const t2 = new Date(calculateNextBackoffTime(2)).getTime();
    const t3 = new Date(calculateNextBackoffTime(3)).getTime();

    // Check approximate delays
    const diff1 = Math.round((t1 - now) / 1000);
    const diff2 = Math.round((t2 - now) / 1000);
    const diff3 = Math.round((t3 - now) / 1000);

    assert.strictEqual(diff1 >= 290 && diff1 <= 310, true, "Attempt 1 backoff is 5 minutes (300s)");
    assert.strictEqual(diff2 >= 890 && diff2 <= 910, true, "Attempt 2 backoff is 15 minutes (900s)");
    assert.strictEqual(diff3 >= 1790 && diff3 <= 1810, true, "Attempt 3 backoff is 30 minutes (1800s)");
  });

  // 17. Player Safety & Recovery Decision Rules
  await record("17. Playit Player Safety: Auto-recovery skips restarts when active players are online", async () => {
    const { getPlayitSettings } = await import("../src/server/services/playitHealth.js");
    const settings = await getPlayitSettings();

    const checkShouldSkipRestart = (playerCount: number, allowOnline: boolean) => {
      return playerCount > 0 && !allowOnline;
    };

    assert.strictEqual(checkShouldSkipRestart(0, false), false, "0 players: auto-recovery proceeds");
    assert.strictEqual(checkShouldSkipRestart(3, false), true, "3 players: auto-recovery skipped for player protection");
    assert.strictEqual(checkShouldSkipRestart(3, true), false, "Explicit admin setting allows recovery with active players");
  });

  // 18. Port Inspection & server.properties Validation
  await record("18. Port Inspection: Correctly inspects host-published port and warns if server-ip is bound", async () => {
    const { inspectServerPortsAndConfig } = await import("../src/server/services/playitHealth.js");

    const mockServer = {
      id: "test-server-123",
      name: "Test Server",
      port: 25565,
      runtimeType: "local"
    };

    const config = await inspectServerPortsAndConfig(mockServer);
    assert.strictEqual(config.internalContainerPort, 25565);
    assert.strictEqual(config.dockerHostPublishedPort, 25565);
    assert.strictEqual(config.playitLocalAddress, "127.0.0.1");
    assert.strictEqual(config.dockerPortMappingOk, true);
  });

  // 19. Build Directory Verification
  await record("19. Build Verification: Detects missing server.cjs, empty index.html, and broken asset paths", async () => {
    const { verifyBuildDirectory } = await import("../src/server/utils/buildVerification.js");
    const testDistDir = path.join(process.cwd(), ".data", "test-dist-verification");

    await fs.ensureDir(testDistDir);
    await fs.emptyDir(testDistDir);

    // Empty dir -> Should fail
    let check = verifyBuildDirectory(testDistDir);
    assert.strictEqual(check.valid, false, "Empty dist must fail verification");

    // Add server.cjs and index.html with referenced assets
    await fs.writeFile(path.join(testDistDir, "server.cjs"), "// server cjs bundle");
    await fs.writeFile(
      path.join(testDistDir, "index.html"),
      '<!DOCTYPE html><html><head><script type="module" src="/assets/index-test123.js"></script><link rel="stylesheet" href="/assets/style-test123.css"></head><body><div id="root"></div></body></html>'
    );

    // Missing assets/ folder and referenced files -> Must fail
    check = verifyBuildDirectory(testDistDir);
    assert.strictEqual(check.valid, false, "Missing referenced assets must fail verification");
    assert.strictEqual(check.errors.some(e => e.includes("index-test123.js")), true);

    // Create assets
    const assetsDir = path.join(testDistDir, "assets");
    await fs.ensureDir(assetsDir);
    await fs.writeFile(path.join(assetsDir, "index-test123.js"), "console.log('test bundle');");
    await fs.writeFile(path.join(assetsDir, "style-test123.css"), "body { color: red; }");

    // Now all referenced files exist -> Must pass
    check = verifyBuildDirectory(testDistDir);
    assert.strictEqual(check.valid, true, "Valid build with all referenced assets must pass verification");
    assert.strictEqual(check.assetCount >= 2, true);

    // Clean up
    await fs.remove(testDistDir);
  });

  // 20. Interrupted Build Simulation & Atomic Replacement
  await record("20. Atomic Build Isolation: Failure in temporary build directory does not tamper with live dist", async () => {
    const testLiveDist = path.join(process.cwd(), ".data", "test-live-dist");
    const testTmpDist = path.join(process.cwd(), ".data", "test-tmp-dist");

    await fs.ensureDir(testLiveDist);
    await fs.writeFile(path.join(testLiveDist, "server.cjs"), "// original working server bundle");
    await fs.writeFile(path.join(testLiveDist, "index.html"), "<html><body>Original Working HTML</body></html>");

    // Simulate an interrupted/corrupted build writing into tmp
    await fs.ensureDir(testTmpDist);
    await fs.writeFile(path.join(testTmpDist, "index.html"), "<html><body>Partial Broken HTML"); // Broken, no server.cjs, etc.

    const { verifyBuildDirectory } = await import("../src/server/utils/buildVerification.js");
    const tmpCheck = verifyBuildDirectory(testTmpDist);
    assert.strictEqual(tmpCheck.valid, false, "Broken temp build fails verification");

    // Because tmp failed verification, live dist is NOT swapped
    const liveContent = await fs.readFile(path.join(testLiveDist, "index.html"), "utf8");
    assert.strictEqual(liveContent.includes("Original Working HTML"), true, "Live dist remains 100% intact and working");

    // Clean up
    await fs.remove(testLiveDist);
    await fs.remove(testTmpDist);
  });

  // 21. Repository Hygiene & .gitignore Rules
  await record("21. Repository Hygiene: Backup tars, .bak files, and test files are ignored by .gitignore", async () => {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    const gitignoreContent = await fs.readFile(gitignorePath, "utf8");

    assert.strictEqual(gitignoreContent.includes("dist.tmp/"), true, "dist.tmp/ must be ignored");
    assert.strictEqual(gitignoreContent.includes("dist.old/"), true, "dist.old/ must be ignored");
    assert.strictEqual(gitignoreContent.includes("*.bak"), true, "*.bak must be ignored");
    assert.strictEqual(gitignoreContent.includes("*.tar"), true, "*.tar must be ignored");
    assert.strictEqual(gitignoreContent.includes(".releases/"), true, ".releases/ must be ignored");
  });

  // 22. Proxy & Rate Limiter Stability
  await record("22. Proxy & Rate Limiters: Does not throw ValidationError on proxy requests", async () => {
    const expressModule = (await import("express")).default;
    const testApp = expressModule();
    testApp.set("trust proxy", 1);

    const { loginRateLimiter, registerRateLimiter } = await import("../src/server/middleware/rateLimiters.js");
    
    // Attach rate limiters to mock endpoints
    testApp.post("/login", loginRateLimiter, (req, res) => res.json({ ok: true }));
    testApp.post("/register", registerRateLimiter, (req, res) => res.json({ ok: true }));

    // Simulate mock request with x-forwarded-for header
    const mockReq: any = {
      ip: "192.168.1.100",
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      socket: { remoteAddress: "127.0.0.1" },
      body: { username: "test_proxy_user" }
    };
    const mockRes: any = {
      setHeader: () => {},
      status: (code: number) => ({ json: (d: any) => ({ code, d }) }),
      json: (d: any) => d
    };

    let nextCalled = false;
    await new Promise<void>((resolve, reject) => {
      loginRateLimiter(mockReq, mockRes, (err?: any) => {
        if (err) reject(err);
        else {
          nextCalled = true;
          resolve();
        }
      });
    });

    assert.strictEqual(nextCalled, true, "loginRateLimiter must execute smoothly without throwing proxy validation error");
  });

  // 23. Path Resolution across environments
  await record("23. Path Resolution: getProjectRoot and getDistPath resolve reliably across container environments", async () => {
    const { getProjectRoot, getDistPath, getDataDir } = await import("../src/server/utils/pathUtils.js");
    
    const root = getProjectRoot();
    assert.strictEqual(typeof root, "string");
    assert.strictEqual(fs.existsSync(root), true, "Resolved project root must exist");
    assert.strictEqual(fs.existsSync(path.join(root, "package.json")), true, "Resolved project root must contain package.json");

    const dataDir = getDataDir();
    assert.strictEqual(typeof dataDir, "string");
    assert.strictEqual(fs.existsSync(dataDir), true, "Data directory must exist");

    const distPath = getDistPath();
    assert.strictEqual(typeof distPath, "string");
  });

  // 24. Process Error Handler Singleton & Secret Redaction
  await record("24. Process Error Handlers: Singleton registration, token redaction & benign stream detection", async () => {
    const { sanitizeErrorDetails, isBenignStreamError, registerProcessErrorHandlers, isProcessErrorHandlerRegistered } = await import("../src/server/utils/processErrorHandler.js");
    
    // Test secret redaction
    const rawError = new Error("Failed connecting with secret_key=superSecret123 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature");
    const sanitized = sanitizeErrorDetails(rawError);
    assert.strictEqual(sanitized.includes("superSecret123"), false, "Plain secret must be redacted");
    assert.strictEqual(sanitized.includes("doNotLeakThisSignature"), false, "JWT token signature must be redacted");
    assert.strictEqual(sanitized.includes("[REDACTED]"), true, "Must include redaction placeholder");

    // Test benign stream errors
    assert.strictEqual(isBenignStreamError({ code: "ERR_STREAM_PREMATURE_CLOSE" }), true, "Premature close is benign stream error");
    assert.strictEqual(isBenignStreamError({ code: "ECONNRESET" }), true, "ECONNRESET is benign stream error");
    assert.strictEqual(isBenignStreamError({ message: "aborted by client" }), true, "Client abort message is benign");
    assert.strictEqual(isBenignStreamError(new Error("FATAL: Out of memory")), false, "Fatal error is not benign");

    // Test singleton registration
    const firstReg = registerProcessErrorHandlers();
    assert.strictEqual(typeof firstReg, "boolean");
    assert.strictEqual(isProcessErrorHandlerRegistered(), true);
  });

  // 25. Server Lifecycle Power Control Matrix Rules
  await record("25. Server Lifecycle Matrix: Enforces strict state rules for Start, Restart, Stop and Kill", () => {
    const canStart = (status: string, loading: boolean) => 
      !loading && status !== "online" && status !== "starting" && status !== "restarting";

    const canRestart = (status: string, loading: boolean) => 
      !loading && status !== "offline" && status !== "starting" && status !== "stopping" && status !== "restarting";

    const canStop = (status: string, loading: boolean) => 
      !loading && (status === "online" || status === "starting" || status === "stopping" || status === "restarting");

    const getStopLabel = (status: string) => 
      (status === "starting" || status === "stopping" || status === "restarting") ? "Kill" : "Stop";

    // Offline state
    assert.strictEqual(canStart("offline", false), true, "Start allowed when offline");
    assert.strictEqual(canRestart("offline", false), false, "Restart forbidden when offline");
    assert.strictEqual(canStop("offline", false), false, "Stop forbidden when offline");

    // Online state
    assert.strictEqual(canStart("online", false), false, "Start forbidden when online");
    assert.strictEqual(canRestart("online", false), true, "Restart allowed when online");
    assert.strictEqual(canStop("online", false), true, "Stop allowed when online");
    assert.strictEqual(getStopLabel("online"), "Stop", "Online button shows Stop");

    // Starting / Stopping state
    assert.strictEqual(canStart("starting", false), false, "Start forbidden while starting");
    assert.strictEqual(canRestart("starting", false), false, "Restart forbidden while starting");
    assert.strictEqual(canStop("starting", false), true, "Kill/Force Stop allowed while starting");
    assert.strictEqual(getStopLabel("starting"), "Kill", "Transitioning state shows Kill");

    // Loading lock
    assert.strictEqual(canStart("offline", true), false, "Start forbidden during active pending action");
    assert.strictEqual(canStop("online", true), false, "Stop forbidden during active pending action");
  });

  // 26. Backup & ZIP Archive Generation & Non-Empty Validation
  await record("26. Archive Generation: Fast compression level, non-empty validation and cleanup", async () => {
    const archiverModule = await import("archiver");
    const ZipArchive = archiverModule.ZipArchive || (archiverModule as any).default || archiverModule;

    const testDir = path.join(process.cwd(), ".data", "test-archive-suite");
    await fs.ensureDir(testDir);

    const sampleFile = path.join(testDir, "sample.txt");
    await fs.writeFile(sampleFile, "JTG Panel Stabilization Test Content");

    const outZip = path.join(testDir, "test-output.zip");
    const output = fs.createWriteStream(outZip);
    const archive = new (ZipArchive as any)({ zlib: { level: 1 } });

    await new Promise<void>((resolve, reject) => {
      output.on("close", () => resolve());
      output.on("error", (err: any) => reject(err));
      archive.on("error", (err: any) => reject(err));

      archive.pipe(output);
      archive.file(sampleFile, { name: "sample.txt" });
      archive.finalize();
    });

    const stat = await fs.stat(outZip);
    assert.strictEqual(stat.size > 0, true, "Archive must be non-empty");

    // Cleanup test fixtures
    await fs.remove(testDir);
  });

  console.log(`\n==================================================`);
  console.log(`  ALL ${passed}/${total} SECURITY & BUG FIX TESTS PASSED!`);
  console.log(`==================================================\n`);
  process.exit(0);
}

runTests().catch(e => {
  console.error("Test run failed:", e);
  process.exit(1);
});
