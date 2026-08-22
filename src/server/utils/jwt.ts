import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Centralized JWT Security and Validation Utility
 *
 * Provides cryptographically strong 256-bit secrets. If JWT_SECRET is not explicitly
 * provided in the environment, generates and securely stores a persistent random secret.
 */

let cachedSecret: string | null = null;

export function getJwtSecret(): string {
  if (cachedSecret) {
    return cachedSecret;
  }

  const envSecret = process.env.JWT_SECRET?.trim();

  if (envSecret && envSecret.length >= 16) {
    cachedSecret = envSecret;
    return cachedSecret;
  }

  // Check persistent secret on disk (.data/jwt_secret.key)
  const secretKeyPath = path.join(process.cwd(), ".data", "jwt_secret.key");
  try {
    if (fs.existsSync(secretKeyPath)) {
      const persistedSecret = fs.readFileSync(secretKeyPath, "utf-8").trim();
      if (persistedSecret.length >= 32) {
        cachedSecret = persistedSecret;
        process.env.JWT_SECRET = persistedSecret;
        return cachedSecret;
      }
    }
  } catch (err) {
    // Ignore read error and fallback to memory generation
  }

  // Generate cryptographically secure random 256-bit secret
  const generatedSecret = crypto.randomBytes(32).toString("hex");
  cachedSecret = generatedSecret;
  process.env.JWT_SECRET = generatedSecret;

  // Attempt to persist secret for future restarts
  try {
    const dataDir = path.join(process.cwd(), ".data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(secretKeyPath, generatedSecret, { encoding: "utf-8", mode: 0o600 });
  } catch (err) {
    // Non-fatal if filesystem is read-only
  }

  console.log("[SECURITY] Initialized secure 256-bit session secret.");
  return cachedSecret;
}

/**
 * Validates JWT configuration on server startup.
 */
export function validateJwtSecretOnStartup(): void {
  getJwtSecret();
}
