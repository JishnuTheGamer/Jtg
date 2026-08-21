import fs from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env");
const EXAMPLE_PATH = path.join(process.cwd(), ".env.example");

if (!fs.existsSync(EXAMPLE_PATH)) {
  console.log("No .env.example found, skipping env migration.");
  process.exit(0);
}

if (!fs.existsSync(ENV_PATH)) {
  console.log("No .env found, copying from .env.example...");
  fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
  process.exit(0);
}

const parseEnv = (content: string) => {
  const vars: Record<string, string> = {};
  content.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  });
  return vars;
};

const currentEnvStr = fs.readFileSync(ENV_PATH, "utf8");
const exampleEnvStr = fs.readFileSync(EXAMPLE_PATH, "utf8");

const currentVars = parseEnv(currentEnvStr);
const exampleVars = parseEnv(exampleEnvStr);

let addedVars = 0;
let newEnvStr = currentEnvStr;

// Append missing variables from example to current
for (const [key, value] of Object.entries(exampleVars)) {
  if (currentVars[key] === undefined) {
    // Only log the key name, not the value, to prevent secret leakage
    console.log(`[Env Migration] Added missing variable: ${key}`);
    newEnvStr += `\n${key}=${value}`;
    addedVars++;
  }
}

if (addedVars > 0) {
  fs.writeFileSync(ENV_PATH, newEnvStr);
  console.log(`[Env Migration] Successfully added ${addedVars} missing environment variables.`);
} else {
  console.log("[Env Migration] Environment variables are up-to-date.");
}
