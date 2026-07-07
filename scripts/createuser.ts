import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "readline";
import path from "path";
import fs from "fs-extra";

interface User {
  id: string;
  username: string;
  password?: string;
  role: string;
  createdAt?: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  try {
    await fs.ensureDir(DATA_DIR);
    if (!(await fs.pathExists(USERS_FILE))) {
      await fs.writeJson(USERS_FILE, []);
    }

    console.log("=== JTG Panel Admin User Creation ===");

    const username = (await askQuestion("Username: ")).trim();
    const password = await askQuestion("Password: ");

    if (!username || !password) {
      console.error("Error: Username and password are required.");
      process.exit(1);
    }

    const users: User[] = await fs.readJson(USERS_FILE);
    const existingIndex = users.findIndex((u) => u.username.toLowerCase() === username.toLowerCase());
    
    if (existingIndex !== -1) {
      console.error(`Error: User "${username}" already exists.`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    users.push({
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      role: "admin",
      createdAt: new Date().toISOString()
    });

    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    console.log("Admin user created successfully.");

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
