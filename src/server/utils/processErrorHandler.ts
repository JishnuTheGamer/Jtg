import fs from "fs";
import path from "path";

let isRegistered = false;
let isShuttingDown = false;

// Redacts sensitive tokens, secrets, passwords from error messages and stacks
export function sanitizeErrorDetails(error: unknown): string {
  if (!error) return "Unknown error";
  let message = typeof error === "object" && error !== null
    ? (error as any).stack || (error as any).message || String(error)
    : String(error);

  // Redact JWT patterns (header.payload.signature)
  message = message.replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, "[REDACTED_JWT]");
  // Redact generic token/secret parameters
  message = message.replace(/(token|secret|password|key|apiKey|secretKey|secret_key)=([^\s&"'`]+)/gi, "$1=[REDACTED]");
  // Redact bearer tokens
  message = message.replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, "Bearer [REDACTED]");

  return message;
}

// Checks if the error is a benign client cancellation/abort error (e.g. browser canceling a download)
export function isBenignStreamError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as any).code;
  const message = (error as any).message || "";
  
  if (
    code === "ERR_STREAM_PREMATURE_CLOSE" ||
    code === "ECANCELED" ||
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ECONNABORTED"
  ) {
    return true;
  }

  if (
    message.includes("Premature close") ||
    message.includes("aborted") ||
    message.includes("client closed")
  ) {
    return true;
  }

  return false;
}

// Centralized process error handler
export function handleProcessError(
  type: "uncaughtException" | "unhandledRejection",
  error: unknown
): void {
  if (isBenignStreamError(error)) {
    // Normal client stream cancellations or aborted connections: log at debug level, do not panic
    console.debug(`[Process Notice] Handled harmless client stream disconnect (${type}):`, (error as any)?.code || (error as any)?.message);
    return;
  }

  const sanitized = sanitizeErrorDetails(error);
  console.error(`[Process Error] ${type === "uncaughtException" ? "Uncaught Exception" : "Unhandled Rejection"}:`, sanitized);

  // Safe non-crashing crash log write
  try {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${type}] ${sanitized}\n\n`;
    fs.appendFileSync(path.join(process.cwd(), "crash.log"), logLine, "utf8");
  } catch (logErr) {
    // Prevent recursive loop if disk is full or read-only
    console.error("[Process Error] Failed to write crash.log:", (logErr as any)?.message);
  }
}

// Graceful shutdown handler
export function handleGracefulShutdown(
  signal: "SIGTERM" | "SIGINT",
  resources?: { httpServer?: any; socketIo?: any; sftpServer?: any }
): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[Process] Received ${signal}. Gracefully shutting down JTG Panel...`);

  const shutdownTimer = setTimeout(() => {
    console.warn("[Process] Forced shutdown timed out after 5s. Exiting.");
    process.exit(0);
  }, 5000);
  shutdownTimer.unref();

  try {
    if (resources?.socketIo?.close) {
      resources.socketIo.close();
    }
    if (resources?.httpServer?.close) {
      resources.httpServer.close(() => {
        console.log("[Process] HTTP Server closed cleanly.");
      });
    }
    if (resources?.sftpServer?.close) {
      resources.sftpServer.close();
    }
  } catch (err) {
    console.error("[Process] Error during shutdown cleanup:", err);
  }
}

// Register global error handlers exactly once
export function registerProcessErrorHandlers(resources?: {
  httpServer?: any;
  socketIo?: any;
  sftpServer?: any;
}): boolean {
  if (isRegistered) {
    return false; // Already registered
  }
  isRegistered = true;

  process.on("uncaughtException", (err) => {
    handleProcessError("uncaughtException", err);
  });

  process.on("unhandledRejection", (reason) => {
    handleProcessError("unhandledRejection", reason);
  });

  process.on("SIGTERM", () => {
    handleGracefulShutdown("SIGTERM", resources);
  });

  process.on("SIGINT", () => {
    handleGracefulShutdown("SIGINT", resources);
  });

  return true;
}

export function isProcessErrorHandlerRegistered(): boolean {
  return isRegistered;
}
