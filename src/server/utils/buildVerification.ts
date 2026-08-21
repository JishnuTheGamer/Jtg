import fs from "fs-extra";
import path from "path";
import { getDistPath } from "./pathUtils.js";

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  assetCount: number;
  referencedAssets: string[];
  referencedJs: string[];
  referencedCss: string[];
}

/**
 * Validates that a compiled dist directory contains all necessary files
 * and that all assets referenced in index.html actually exist on disk.
 */
export function verifyBuildDirectory(targetDir?: string): VerificationResult {
  const resolvedDir = path.resolve(targetDir || getDistPath());
  const result: VerificationResult = {
    valid: true,
    errors: [],
    warnings: [],
    assetCount: 0,
    referencedAssets: [],
    referencedJs: [],
    referencedCss: []
  };

  if (!fs.existsSync(resolvedDir)) {
    result.valid = false;
    result.errors.push(`Dist directory does not exist: ${resolvedDir}`);
    return result;
  }

  // 1. Verify server.cjs
  const serverPath = path.join(resolvedDir, "server.cjs");
  if (!fs.existsSync(serverPath)) {
    result.valid = false;
    result.errors.push(`Missing backend server bundle: ${serverPath}`);
  } else {
    try {
      const serverStat = fs.statSync(serverPath);
      if (serverStat.size === 0) {
        result.valid = false;
        result.errors.push(`Backend server bundle is empty (0 bytes): ${serverPath}`);
      }
    } catch (e: any) {
      result.valid = false;
      result.errors.push(`Could not read server bundle: ${e.message}`);
    }
  }

  // 2. Verify index.html
  const indexPath = path.join(resolvedDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    result.valid = false;
    result.errors.push(`Missing frontend index.html: ${indexPath}`);
    return result;
  }

  let indexContent = "";
  try {
    indexContent = fs.readFileSync(indexPath, "utf8");
    if (!indexContent.trim()) {
      result.valid = false;
      result.errors.push(`index.html is empty (0 bytes): ${indexPath}`);
      return result;
    }
  } catch (e: any) {
    result.valid = false;
    result.errors.push(`Could not read index.html: ${e.message}`);
    return result;
  }

  // 3. Extract asset references from index.html
  const scriptRegex = /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
  const linkRegex = /<link\b[^>]*?\bhref=["']([^"']+)["'][^>]*>/gi;

  const rawAssets = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(indexContent)) !== null) {
    if (match[1]) {
      rawAssets.add(match[1]);
      result.referencedJs.push(match[1]);
    }
  }

  while ((match = linkRegex.exec(indexContent)) !== null) {
    if (match[1]) {
      rawAssets.add(match[1]);
      if (match[1].endsWith(".css") || match[0].includes("stylesheet")) {
        result.referencedCss.push(match[1]);
      }
    }
  }

  if (result.referencedJs.length === 0) {
    result.valid = false;
    result.errors.push(`No JavaScript module script tag found in index.html`);
  }

  const assetsDir = path.join(resolvedDir, "assets");
  let jsAssetCount = 0;

  if (fs.existsSync(assetsDir)) {
    try {
      const files = fs.readdirSync(assetsDir);
      jsAssetCount = files.filter(f => f.endsWith(".js")).length;
    } catch (_) {}
  }

  if (jsAssetCount === 0) {
    result.valid = false;
    result.errors.push(`No JavaScript bundle files (.js) found inside ${assetsDir}`);
  }

  for (const rawSrc of rawAssets) {
    // Ignore external URLs and data URIs
    if (
      rawSrc.startsWith("http://") ||
      rawSrc.startsWith("https://") ||
      rawSrc.startsWith("//") ||
      rawSrc.startsWith("data:")
    ) {
      continue;
    }

    // Normalize relative path
    const cleanPath = rawSrc.replace(/^\/+/, "").split("?")[0].split("#")[0];
    const fullAssetPath = path.join(resolvedDir, cleanPath);

    result.referencedAssets.push(cleanPath);

    if (!fs.existsSync(fullAssetPath)) {
      result.valid = false;
      result.errors.push(
        `Broken asset link in index.html: referenced "${rawSrc}", but file does not exist on disk at "${fullAssetPath}"`
      );
    } else {
      try {
        const assetStat = fs.statSync(fullAssetPath);
        if (assetStat.size === 0) {
          result.valid = false;
          result.errors.push(`Referenced asset is empty (0 bytes): ${fullAssetPath}`);
        } else {
          result.assetCount++;
        }
      } catch (e: any) {
        result.valid = false;
        result.errors.push(`Could not read asset "${cleanPath}": ${e.message}`);
      }
    }
  }

  return result;
}
