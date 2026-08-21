import path from 'path';
import { verifyBuildDirectory } from '../src/server/utils/buildVerification.js';
import { getDistPath } from '../src/server/utils/pathUtils.js';

export { verifyBuildDirectory };

// CLI execution: tsx scripts/verify-build.ts [dir]
const target = process.argv[2] || getDistPath();
console.log(`\x1b[36m[Verify Build] Checking integrity of: ${target}\x1b[0m`);
const result = verifyBuildDirectory(target);

if (!result.valid) {
  console.error(`\x1b[31m\x1b[1m[✗ BUILD VERIFICATION FAILED]\x1b[0m`);
  result.errors.forEach(err => console.error(`  - \x1b[31m${err}\x1b[0m`));
  process.exit(1);
} else {
  console.log(`\x1b[32m\x1b[1m[✓ BUILD INTEGRITY VERIFIED]\x1b[0m`);
  console.log(`  - Verified ${result.assetCount} asset(s) and server bundle successfully.`);
  result.referencedAssets.forEach(a => console.log(`    • ${a}`));
  process.exit(0);
}
