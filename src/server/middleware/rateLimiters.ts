import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

/**
 * Authentication Rate Limiters
 *
 * Protects against brute-force password guessing and registration spam
 * while ensuring authenticated endpoints remain unhindered.
 */

// Login limiter: max 5 attempts per 15 minutes per IP
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const username = req.body?.username || "unknown_user";
    
    // Log security alert
    console.warn(`[SECURITY ALERT] Rate limit exceeded on /login from IP: ${ip} (targeted username: '${username}')`);
    
    // Calculate remaining retry-after seconds
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfter = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 900;
    
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "Too many login attempts from this IP address. Please try again after 15 minutes.",
      retryAfterSeconds: retryAfter
    });
  }
});

// Register limiter: max 3 attempts per hour per IP
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 register requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const username = req.body?.username || "unknown_user";
    
    // Log security alert
    console.warn(`[SECURITY ALERT] Rate limit exceeded on /register from IP: ${ip} (attempted username: '${username}')`);
    
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfter = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 3600;
    
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "Too many registration attempts from this IP address. Please try again after 1 hour.",
      retryAfterSeconds: retryAfter
    });
  }
});
