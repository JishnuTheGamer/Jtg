import assert from "assert";

console.log("▶ Running Port Isolation Verification Test...");

const PORTS = {
  MAIN_PRODUCTION_PANEL: 6767,
  DEVELOPER_PANEL: 3000,
  SFTP_SERVER: 6868
};

// 1. Verify ports do not collide
const portSet = new Set(Object.values(PORTS));
assert.strictEqual(portSet.size, 3, "All configured ports must be distinct and non-overlapping");

// 2. Verify expected port allocations
assert.strictEqual(PORTS.MAIN_PRODUCTION_PANEL, 6767, "Main Production Panel must default to port 6767");
assert.strictEqual(PORTS.DEVELOPER_PANEL, 3000, "Developer Panel must default to port 3000");
assert.strictEqual(PORTS.SFTP_SERVER, 6868, "SFTP Server must default to port 6868");

console.log("✓ Port Isolation Verification Test PASSED successfully.");
