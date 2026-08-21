import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { verifyBuildDirectory } from '../src/server/utils/buildVerification.js';

const ROOT_DIR = process.cwd();
const DIST_FINAL = path.join(ROOT_DIR, 'dist');
const DIST_TMP = path.join(ROOT_DIR, 'dist.tmp');
const DIST_OLD = path.join(ROOT_DIR, 'dist.old');

console.log('\x1b[36m\x1b[1m[Atomic Build] Starting isolated atomic build...\x1b[0m');

try {
  // Step 1: Clean up any leftover temporary folders
  fs.removeSync(DIST_TMP);
  fs.removeSync(DIST_OLD);

  // Step 2: Build Vite frontend into temporary folder
  console.log('\x1b[34m[1/4] Building Vite frontend into dist.tmp...\x1b[0m');
  execSync('npx vite build --outDir dist.tmp', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Step 3: Bundle Express & WebSocket server into dist.tmp/server.cjs
  console.log('\x1b[34m[2/4] Compiling server backend bundle into dist.tmp/server.cjs...\x1b[0m');
  execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist.tmp/server.cjs', {
    stdio: 'inherit'
  });

  // Step 4: Verify build completeness and referenced assets
  console.log('\x1b[34m[3/4] Verifying build asset integrity in dist.tmp...\x1b[0m');
  const verification = verifyBuildDirectory(DIST_TMP);

  if (!verification.valid) {
    console.error('\x1b[31m[✗ BUILD VERIFICATION FAILED in temporary output]\x1b[0m');
    verification.errors.forEach(err => console.error(`  - \x1b[31m${err}\x1b[0m`));
    throw new Error('Build output failed verification. Aborting atomic swap.');
  }

  console.log(`\x1b[32m[✓] Verified ${verification.assetCount} asset(s) and server bundle successfully.\x1b[0m`);

  // Step 5: Atomic swap: Replace live dist only after 100% verified success
  console.log('\x1b[34m[4/4] Performing atomic directory swap (dist.tmp -> dist)...\x1b[0m');

  if (fs.existsSync(DIST_FINAL)) {
    // Preserve old dist until new dist is in place
    fs.moveSync(DIST_FINAL, DIST_OLD, { overwrite: true });
    try {
      fs.moveSync(DIST_TMP, DIST_FINAL, { overwrite: true });
      // Successfully swapped, remove old dist
      fs.removeSync(DIST_OLD);
    } catch (swapErr) {
      console.error('\x1b[31m[!] Atomic swap error. Restoring previous working dist...\x1b[0m', swapErr);
      if (fs.existsSync(DIST_OLD)) {
        fs.moveSync(DIST_OLD, DIST_FINAL, { overwrite: true });
      }
      throw swapErr;
    }
  } else {
    fs.moveSync(DIST_TMP, DIST_FINAL, { overwrite: true });
  }

  console.log('\x1b[32m\x1b[1m[✓ ATOMIC BUILD COMPLETE] Production bundle is active and verified.\x1b[0m');
} catch (err: any) {
  console.error('\x1b[31m\x1b[1m[✗ ATOMIC BUILD FAILED]\x1b[0m', err.message || err);
  // Clean up temporary build artifacts without affecting live dist
  fs.removeSync(DIST_TMP);
  if (fs.existsSync(DIST_OLD) && !fs.existsSync(DIST_FINAL)) {
    fs.moveSync(DIST_OLD, DIST_FINAL, { overwrite: true });
  }
  process.exit(1);
}
