import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "readline";
import path from "path";
import fs from "fs-extra";

// Dynamically locate root .data directory whether run from project root, scripts/, or parent directory
function resolveDataDir(): string {
  if (fs.existsSync(path.join(process.cwd(), ".data"))) {
    return path.join(process.cwd(), ".data");
  }
  const parentData = path.resolve(__dirname, "..", ".data");
  if (fs.existsSync(parentData)) {
    return parentData;
  }
  const jtgChildData = path.join(process.cwd(), "Jtg", ".data");
  if (fs.existsSync(jtgChildData)) {
    return jtgChildData;
  }
  return path.resolve(__dirname, "..", ".data");
}

const DATA_DIR = resolveDataDir();
const USERS_FILE = path.join(DATA_DIR, "users.json");

fs.ensureDirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");

async function saveOwnerUser(username: string, password: string): Promise<void> {
  const users = (await fs.readJson(USERS_FILE).catch(() => [])) || [];
  const existingIndex = users.findIndex((u: any) => u.username?.toLowerCase() === username.toLowerCase());

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingIndex !== -1) {
    users[existingIndex].password = hashedPassword;
    users[existingIndex].role = "owner";
    users[existingIndex].updatedAt = new Date().toISOString();
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    console.log(`[OK] Owner user '${username}' updated successfully with role 'owner'.`);
  } else {
    users.push({
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      role: "owner",
      createdAt: new Date().toISOString(),
    });
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    console.log(`[OK] Owner user '${username}' created successfully with role 'owner'.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  // Check if username and password passed as CLI arguments: npm run createuser admin pass
  if (args.length >= 2) {
    const [username, password] = args;
    await saveOwnerUser(username.trim(), password.trim());
    process.exit(0);
  }

  console.log("\n========================================");
  console.log("   JTG PANEL - PRIMARY OWNER SETUP      ");
  console.log("========================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter Owner Username [default: admin]: ", async (rawUser) => {
    const username = (rawUser || "admin").trim();
    rl.question("Enter Owner Password: ", async (rawPass) => {
      const password = rawPass ? rawPass.trim() : "";
      if (!password) {
        console.error("\n[ERROR] Password cannot be empty.");
        rl.close();
        process.exit(1);
      }

      await saveOwnerUser(username, password);
      rl.close();
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
