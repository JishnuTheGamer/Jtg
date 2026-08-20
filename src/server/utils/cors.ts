/**
 * CORS and Socket.IO Origin Security Validator
 */
export function getCorsOriginValidator() {
  const allowedEnv = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || process.env.PANEL_URL;
  const isProduction = process.env.NODE_ENV === "production";

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Requests with no origin (e.g. mobile apps, curl, same-origin internal requests)
    if (!origin) {
      return callback(null, true);
    }

    try {
      const parsed = new URL(origin);
      const hostname = parsed.hostname.toLowerCase();

      // Always allow loopback / local development
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0" ||
        hostname.endsWith(".googleusercontent.com") ||
        hostname.endsWith(".run.app") ||
        hostname.endsWith(".qzz.io")
      ) {
        return callback(null, true);
      }

      if (allowedEnv && allowedEnv.trim() !== "") {
        const allowedList = allowedEnv.split(",").map(s => s.trim().toLowerCase());
        if (allowedList.includes(origin.toLowerCase()) || allowedList.includes(hostname)) {
          return callback(null, true);
        }
      }

      // If development and no explicit list provided, allow the origin
      if (!isProduction) {
        return callback(null, true);
      }

      console.warn(`[SECURITY] Rejected CORS / Socket.IO connection from disallowed origin: ${origin}`);
      return callback(new Error(`Origin ${origin} is not allowed by CORS security policy`), false);
    } catch {
      return callback(new Error("Invalid origin header"), false);
    }
  };
}
