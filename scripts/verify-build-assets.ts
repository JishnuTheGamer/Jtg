import path from "path";
import fs from "fs-extra";
import { getDistPath } from "../src/server/utils/pathUtils.js";

async function verifyBuildAssets() {
  const distDir = path.resolve(getDistPath());
  console.log(`\x1b[36m[Build Asset Verification]\x1b[0m Checking: ${distDir}`);

  if (!fs.existsSync(distDir)) {
    console.error(`\x1b[31m[✗] Dist directory does not exist: ${distDir}\x1b[0m`);
    process.exit(1);
  }

  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(`\x1b[31m[✗] Missing dist/index.html at: ${indexPath}\x1b[0m`);
    process.exit(1);
  }
  console.log(`\x1b[32m✓ dist/index.html exists\x1b[0m`);

  const indexContent = fs.readFileSync(indexPath, "utf8");
  if (!indexContent.trim()) {
    console.error(`\x1b[31m[✗] dist/index.html is empty\x1b[0m`);
    process.exit(1);
  }

  // Regex to detect script tags and css link tags
  const scriptRegex = /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
  const linkRegex = /<link\b[^>]*?\bhref=["']([^"']+)["'][^>]*>/gi;

  const jsAssets: string[] = [];
  const cssAssets: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(indexContent)) !== null) {
    if (match[1]) jsAssets.push(match[1]);
  }
  while ((match = linkRegex.exec(indexContent)) !== null) {
    if (match[1] && (match[1].endsWith(".css") || match[0].includes("stylesheet"))) {
      cssAssets.push(match[1]);
    }
  }

  if (jsAssets.length === 0) {
    console.error(`\x1b[31m[✗] No JavaScript module script tag found in dist/index.html\x1b[0m`);
    process.exit(1);
  }

  let errorCount = 0;

  for (const jsSrc of jsAssets) {
    if (jsSrc.startsWith("http://") || jsSrc.startsWith("https://") || jsSrc.startsWith("//")) continue;
    console.log(`\x1b[32m✓ JavaScript entry found: ${jsSrc}\x1b[0m`);
    const cleanPath = jsSrc.replace(/^\/+/, "").split("?")[0].split("#")[0];
    const fullPath = path.join(distDir, cleanPath);
    
    // Security check: ensure path stays inside distDir
    if (!path.resolve(fullPath).startsWith(path.resolve(distDir))) {
      console.error(`\x1b[31m[✗] JavaScript asset path escapes dist directory: ${jsSrc}\x1b[0m`);
      errorCount++;
      continue;
    }

    if (!fs.existsSync(fullPath)) {
      console.error(`\x1b[31m[✗] JavaScript asset does not exist: ${fullPath}\x1b[0m`);
      errorCount++;
    } else {
      const stat = fs.statSync(fullPath);
      if (stat.size === 0) {
        console.error(`\x1b[31m[✗] JavaScript asset is empty (0 bytes): ${fullPath}\x1b[0m`);
        errorCount++;
      } else {
        console.log(`\x1b[32m✓ JavaScript asset exists (${(stat.size / 1024).toFixed(1)} KB)\x1b[0m`);
      }
    }
  }

  for (const cssHref of cssAssets) {
    if (cssHref.startsWith("http://") || cssHref.startsWith("https://") || cssHref.startsWith("//")) continue;
    console.log(`\x1b[32m✓ CSS asset found: ${cssHref}\x1b[0m`);
    const cleanPath = cssHref.replace(/^\/+/, "").split("?")[0].split("#")[0];
    const fullPath = path.join(distDir, cleanPath);

    if (!path.resolve(fullPath).startsWith(path.resolve(distDir))) {
      console.error(`\x1b[31m[✗] CSS asset path escapes dist directory: ${cssHref}\x1b[0m`);
      errorCount++;
      continue;
    }

    if (!fs.existsSync(fullPath)) {
      console.error(`\x1b[31m[✗] CSS asset does not exist: ${fullPath}\x1b[0m`);
      errorCount++;
    } else {
      const stat = fs.statSync(fullPath);
      if (stat.size === 0) {
        console.error(`\x1b[31m[✗] CSS asset is empty (0 bytes): ${fullPath}\x1b[0m`);
        errorCount++;
      } else {
        console.log(`\x1b[32m✓ CSS asset exists (${(stat.size / 1024).toFixed(1)} KB)\x1b[0m`);
      }
    }
  }

  if (errorCount > 0) {
    console.error(`\n\x1b[31m[✗ Build Verification Failed with ${errorCount} error(s)]\x1b[0m`);
    process.exit(1);
  }

  console.log(`\x1b[32m✓ No missing assets\x1b[0m`);
  console.log(`\x1b[32m\x1b[1m[✓ BUILD ASSET VERIFICATION PASSED]\x1b[0m\n`);
}

verifyBuildAssets().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
