import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "readline";
import path from "path";
import fs from "fs-extra";

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

fs.ensureDirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");

console.log("=== JTG Panel Owner User Creation ===");

async function run() {
  const users = await fs.readJson(USERS_FILE);
  const existingOwner = users.find((u: any) => u.role === "owner");
  if (existingOwner) {
    console.log("An Owner user already exists in the system.");
    console.log("To protect security, you cannot create multiple Owners.");
    process.exit(0);
  }

  const envUser = process.env.JTG_OWNER_USER;
  const envPass = process.env.JTG_OWNER_PASS;

  if (envUser && envPass) {
    await createOrUpdateOwner(users, envUser, envPass);
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Username: ", async (username) => {
      // Note: readline doesn't natively mask input, so we prefer the env var from bash read -s
      rl.question("Password: ", async (password) => {
        rl.close();
        if (!username || !password) {
          console.error("Username and password are required.");
          process.exit(1);
        }
        await createOrUpdateOwner(users, username, password);
      });
    });
  }
}

async function createOrUpdateOwner(users: any[], username: string, password: string) {
  const existingIndex = users.findIndex((u: any) => u.username === username);
  const hashedPassword = await bcrypt.hash(password, 10);
  if (existingIndex !== -1) {
    users[existingIndex].password = hashedPassword;
    users[existingIndex].role = "owner";
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    console.log("Existing user updated to Owner successfully.");
  } else {
    users.push({
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      role: "owner",
      createdAt: new Date().toISOString()
    });
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    console.log("Owner user created successfully.");
  }
  process.exit(0);
}

run();
