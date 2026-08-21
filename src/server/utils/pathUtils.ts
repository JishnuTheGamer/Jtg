import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

let cachedProjectRoot: string | null = null;
let cachedDistPath: string | null = null;

/**
 * Returns the true project root directory regardless of current working directory,
 * container filesystem structure, or execution context (ESM server.ts or CJS dist/server.cjs).
 */
export function getProjectRoot(): string {
  if (cachedProjectRoot && fs.existsSync(cachedProjectRoot)) {
    return cachedProjectRoot;
  }

  // 1. Explicit environment variable override
  if (process.env.PANEL_ROOT && fs.existsSync(process.env.PANEL_ROOT)) {
    cachedProjectRoot = path.resolve(process.env.PANEL_ROOT);
    return cachedProjectRoot;
  }

  const candidateDirs: string[] = [];

  // 2. From __dirname or import.meta.url
  try {
    let currentDir = "";
    if (typeof __dirname !== "undefined") {
      currentDir = __dirname;
    } else if (typeof import.meta !== "undefined" && import.meta.url) {
      currentDir = path.dirname(fileURLToPath(import.meta.url));
    }

    if (currentDir) {
      // If we are in dist/ (e.g. dist/server.cjs), root is ..
      candidateDirs.push(path.resolve(currentDir, ".."));
      candidateDirs.push(path.resolve(currentDir));
      // If we are in src/server/utils/, root is ../../..
      candidateDirs.push(path.resolve(currentDir, "../../.."));
      candidateDirs.push(path.resolve(currentDir, "../.."));
    }
  } catch (_) {}

  // 3. From process.cwd() and common subdirectories
  const cwd = process.cwd();
  candidateDirs.push(path.resolve(cwd));
  candidateDirs.push(path.resolve(cwd, "Jtg"));
  candidateDirs.push(path.resolve(cwd, "JTG"));
  candidateDirs.push(path.resolve(cwd, "jtg-panel"));

  // Check each candidate for package.json with name "jtg-panel" or existing critical files
  for (const dir of candidateDirs) {
    try {
      const pkgPath = path.join(dir, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = fs.readJSONSync(pkgPath, { throws: false });
        if (pkg && (pkg.name === "jtg-panel" || pkg.name === "minecraft-server-manager")) {
          cachedProjectRoot = dir;
          return dir;
        }
      }
    } catch (_) {}
  }

  // Fallback: search upwards from current working directory
  let checkDir = path.resolve(cwd);
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(checkDir, "package.json"))) {
      cachedProjectRoot = checkDir;
      return checkDir;
    }
    const parent = path.resolve(checkDir, "..");
    if (parent === checkDir) break;
    checkDir = parent;
  }

  cachedProjectRoot = path.resolve(cwd);
  return cachedProjectRoot;
}

/**
 * Returns the verified frontend dist directory.
 */
export function getDistPath(): string {
  if (cachedDistPath && fs.existsSync(cachedDistPath)) {
    return cachedDistPath;
  }

  const root = getProjectRoot();
  const candidates = [
    path.join(root, "dist"),
    path.join(process.cwd(), "dist"),
    typeof __dirname !== "undefined" && path.basename(__dirname) === "dist" ? __dirname : null,
    typeof __dirname !== "undefined" ? path.join(__dirname, "dist") : null,
    typeof __dirname !== "undefined" ? path.join(__dirname, "../dist") : null
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "index.html"))) {
        cachedDistPath = path.resolve(candidate);
        return cachedDistPath;
      }
    } catch (_) {}
  }

  cachedDistPath = path.join(root, "dist");
  return cachedDistPath;
}

/**
 * Returns the persistent data directory (.data)
 */
export function getDataDir(): string {
  const root = getProjectRoot();
  const dataDir = path.join(root, ".data");
  fs.ensureDirSync(dataDir);
  return dataDir;
}

/**
 * Returns the backups directory
 */
export function getBackupsDir(): string {
  const root = getProjectRoot();
  const backupsDir = path.join(root, "backups");
  fs.ensureDirSync(backupsDir);
  return backupsDir;
}
