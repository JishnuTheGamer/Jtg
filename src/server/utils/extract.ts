import fs from "fs-extra";
import path from "path";
import extractZip from "extract-zip";
import AdmZip from "adm-zip";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Robustly extracts zip/tar/tgz/gz/jar archives using multiple fallback strategies:
 * 1. Tar command for .tar / .tar.gz / .tgz
 * 2. System `unzip -o -q` command
 * 3. Python `python3 -m zipfile -e` command
 * 4. AdmZip JS library
 * 5. extract-zip (yauzl) fallback
 */
export async function extractArchive(targetPath: string, destDir: string): Promise<{ success: boolean; method: string }> {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Archive file does not exist: ${path.basename(targetPath)}`);
  }

  const stat = await fs.stat(targetPath);
  if (stat.isDirectory()) {
    throw new Error(`'${path.basename(targetPath)}' is a directory folder, not a zip archive file.`);
  }

  if (stat.size === 0) {
    throw new Error(`'${path.basename(targetPath)}' is an empty file (0 bytes).`);
  }

  await fs.ensureDir(destDir);
  const lowerPath = targetPath.toLowerCase();

  // 1. Tar / Tar.Gz / Tgz archives
  if (lowerPath.endsWith(".tar.gz") || lowerPath.endsWith(".tgz") || lowerPath.endsWith(".tar")) {
    try {
      const flag = lowerPath.endsWith(".tar") ? "-xf" : "-xzf";
      await execAsync(`tar ${flag} ${JSON.stringify(targetPath)} -C ${JSON.stringify(destDir)}`);
      return { success: true, method: "tar" };
    } catch (tarErr: any) {
      console.error("tar command failed:", tarErr?.message);
      throw new Error(`Failed to extract tar archive: ${tarErr?.message || tarErr}`);
    }
  }

  let lastError: Error | null = null;

  // 2. System `unzip` command
  try {
    await execAsync(`unzip -o -q ${JSON.stringify(targetPath)} -d ${JSON.stringify(destDir)}`);
    return { success: true, method: "system-unzip" };
  } catch (unzipCmdErr: any) {
    console.warn("System unzip command failed, trying Python zipfile...", unzipCmdErr?.message);
    lastError = unzipCmdErr;
  }

  // 3. Python 3 `zipfile` module
  try {
    await execAsync(`python3 -m zipfile -e ${JSON.stringify(targetPath)} ${JSON.stringify(destDir)}`);
    return { success: true, method: "python-zipfile" };
  } catch (pyErr: any) {
    console.warn("Python zipfile failed, trying AdmZip...", pyErr?.message);
    lastError = pyErr;
  }

  // 4. AdmZip (Pure JS, handles most zip variants)
  try {
    const zip = new AdmZip(targetPath);
    zip.extractAllTo(destDir, true);
    return { success: true, method: "adm-zip" };
  } catch (admZipErr: any) {
    console.warn("AdmZip failed, trying extract-zip...", admZipErr?.message);
    lastError = admZipErr;
  }

  // 5. extract-zip (Yauzl based)
  try {
    await extractZip(targetPath, { dir: path.resolve(destDir) });
    return { success: true, method: "extract-zip" };
  } catch (extractZipErr: any) {
    console.error("extract-zip failed:", extractZipErr?.message);
    lastError = extractZipErr;
  }

  throw new Error(`Failed to extract archive '${path.basename(targetPath)}': ${lastError?.message || "Unsupported archive or corrupted file."}`);
}
