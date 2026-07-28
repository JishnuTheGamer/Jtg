import "dotenv/config";
import readline from "readline";
import path from "path";
import fs from "fs-extra";

interface User {
  id: string;
  username: string;
  role: string;
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
    if (!(await fs.pathExists(USERS_FILE))) {
      console.error("Error: Users file does not exist. No users to remove.");
      process.exit(1);
    }

    console.log("=== JTG Panel Admin User Removal ===");

    const username = (await askQuestion("Username to remove: ")).trim();

    if (!username) {
      console.error("Error: Username is required.");
      process.exit(1);
    }

    const users: User[] = await fs.readJson(USERS_FILE);
    const initialCount = users.length;

    const filteredUsers = users.filter(
      (u) => u.username.toLowerCase() !== username.toLowerCase()
    );

    if (filteredUsers.length === initialCount) {
      console.error(`Error: User "${username}" not found.`);
      process.exit(1);
    }

    await fs.writeJson(USERS_FILE, filteredUsers, { spaces: 2 });
    console.log(`User "${username}" removed successfully.`);

  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
