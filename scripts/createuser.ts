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
  const envUser = process.env.JTG_OWNER_USER;
  const envPass = process.env.JTG_OWNER_PASS;

  if (envUser && envPass) {
    await createOrUpdateOwner(users, envUser.trim(), envPass);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Username: ", async (username) => {
    rl.question("Password: ", async (password) => {
      rl.close();
      if (!username || !password) {
        console.error("Username and password are required.");
        process.exit(1);
      }
      await createOrUpdateOwner(users, username.trim(), password);
    });
  });
}

async function createOrUpdateOwner(users: any[], username: string, password: string) {
  if (!username || username.length < 3) {
    console.error("Error: Username must be at least 3 characters.");
    process.exit(1);
  }
  if (!password || password.length < 6) {
    console.error("Error: Password must be at least 6 characters.");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const existingIndex = users.findIndex((u: any) => u.username && u.username.toLowerCase() === username.toLowerCase());

  if (existingIndex !== -1) {
    users[existingIndex].password = hashedPassword;
    users[existingIndex].role = "owner";
    users[existingIndex].passwordVersion = (users[existingIndex].passwordVersion || 0) + 1;
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    console.log(`User '${username}' updated to Owner successfully.`);
  } else {
    // Demote any old owner so there is only one authoritative owner
    users.forEach((u: any) => {
      if (u.role === "owner") u.role = "admin";
    });

    users.push({
      id: "owner-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      username,
      password: hashedPassword,
      role: "owner",
      passwordVersion: 0,
      createdAt: new Date().toISOString()
    });
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    console.log(`Owner user '${username}' created successfully.`);
  }

  // Verification: Read back and verify
  const verifiedUsers = await fs.readJson(USERS_FILE);
  const verifiedUser = verifiedUsers.find((u: any) => u.username && u.username.toLowerCase() === username.toLowerCase());
  if (!verifiedUser || verifiedUser.role !== "owner") {
    console.error("Verification failed: Owner user not found in database.");
    process.exit(1);
  }
  const isMatch = await bcrypt.compare(password, verifiedUser.password);
  if (!isMatch) {
    console.error("Verification failed: Password hash comparison failed.");
    process.exit(1);
  }

  console.log("Owner user verified in database.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Failed to setup owner account:", err);
  process.exit(1);
});

