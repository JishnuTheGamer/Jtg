import fs from "fs-extra";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * SECURITY ARCHITECTURE NOTICE:
 * World-writable permissions (0o777) create severe security vulnerabilities on multi-tenant
 * and Linux host environments. It allows any unprivileged user or rogue process on the system
 * to modify, overwrite, inject malicious code into JARs, or delete Minecraft files and backups.
 *
 * We enforce least-privilege POSIX file permissions:
 * - Server / Plugin Directories: 0o750 (Owner: Read/Write/Execute, Group: Read/Execute, Others: None)
 * - Config & World Files (eula.txt, server.properties, etc.): 0o644 or 0o640
 * - Executable Server JARs & Binaries: 0o750 or 0o755
 * - Backups & Archives: 0o640 or 0o644
 *
 * Under no circumstances should chmod 0o777 be reintroduced.
 */

let cachedUidGid: { uid: number; gid: number } | null = null;

/**
 * Detects the runtime container / process UID and GID for proper ownership assignment.
 */
export async function detectContainerUidGid(): Promise<{ uid: number; gid: number }> {
  if (cachedUidGid) return cachedUidGid;

  try {
    if (typeof process.getuid === "function" && typeof process.getgid === "function") {
      const uid = process.getuid();
      const gid = process.getgid();
      if (typeof uid === "number" && typeof gid === "number") {
        cachedUidGid = { uid, gid };
        return cachedUidGid;
      }
    }
  } catch {}

  try {
    const { stdout } = await execAsync("id -u && id -g");
    const lines = stdout.trim().split("\n");
    if (lines.length >= 2) {
      const uid = parseInt(lines[0].trim(), 10);
      const gid = parseInt(lines[1].trim(), 10);
      if (!isNaN(uid) && !isNaN(gid)) {
        cachedUidGid = { uid, gid };
        return cachedUidGid;
      }
    }
  } catch (err: any) {
    console.warn(`[PERMISSIONS WARNING] Could not query container UID/GID (${err.message}). Defaulting to process ownership with safe 0o750/0o644 mask.`);
  }

  // Fallback to standard root or current process user
  cachedUidGid = { uid: 0, gid: 0 };
  return cachedUidGid;
}

/**
 * Safely applies secure POSIX permissions and container ownership to a path.
 * Replaces dangerous 0o777 calls with strict least-privilege modes.
 */
export async function secureChmod(targetPath: string, mode?: number): Promise<void> {
  try {
    const stat = await fs.stat(targetPath).catch(() => null);
    if (!stat) return;

    let targetMode = mode;
    if (targetMode === undefined || targetMode === 0o777) {
      // Never allow 0o777; substitute with safe mode
      targetMode = stat.isDirectory() ? 0o750 : 0o644;
    }

    await fs.chmod(targetPath, targetMode).catch((chmodErr) => {
      // If setting 0o750 fails on strict filesystem, fall back to 0o770
      if (stat.isDirectory()) {
        fs.chmod(targetPath, 0o770).catch(() => {});
      }
    });

    // Apply container user/group ownership on non-Windows hosts
    if (process.platform !== "win32") {
      const { uid, gid } = await detectContainerUidGid();
      if (typeof uid === "number" && typeof gid === "number") {
        await fs.chown(targetPath, uid, gid).catch(() => {});
      }
    }
  } catch (err: any) {
    console.warn(`[PERMISSIONS] Failed to safely apply permissions on ${targetPath}: ${err.message}`);
  }
}

export async function secureDirectoryPermissions(dirPath: string): Promise<void> {
  await secureChmod(dirPath, 0o750);
}

export async function secureFilePermissions(filePath: string): Promise<void> {
  await secureChmod(filePath, 0o644);
}

export async function secureExecutablePermissions(filePath: string): Promise<void> {
  await secureChmod(filePath, 0o750);
}
