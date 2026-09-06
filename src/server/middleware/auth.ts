import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
const JWT_SECRET = process.env.JWT_SECRET || "jtg-panel-super-secret";

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];

  // API Key Authentication
  if (token.startsWith("jtg-") || token.startsWith("jtg_")) {
    try {
      const { readJSON, writeJSON } = await import("../services/db.js");
      const apiKeys = await readJSON("api_keys.json") || [];
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const apiKey = apiKeys.find((k: any) => k.key_hash === keyHash);
      if (!apiKey || apiKey.revoked) {
        res.status(401).json({ error: "Invalid or revoked API key" });
        return;
      }
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        res.status(401).json({ error: "API key expired" });
        return;
      }

      // Update last_used_at
      apiKey.last_used_at = new Date().toISOString();
      await writeJSON("api_keys.json", apiKeys);

      // Verify the creator is still an admin
      const users = await readJSON("users.json") || [];
      let adminRole = "admin";
      if (apiKey.created_by !== "temp-admin") {
        const creator = users.find((u: any) => u.id === apiKey.created_by);
        if (!creator || (creator.role !== "admin" && creator.role !== "owner")) {
           res.status(403).json({ error: "Forbidden: API Key creator is no longer an admin" });
           return;
        }
        adminRole = creator.role;
      }

      (req as any).user = { id: apiKey.created_by, role: adminRole, isApiKey: true, scopes: apiKey.scopes };
      next();
      return;
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin' && decoded.role !== 'owner') {
       res.status(403).json({ error: "Forbidden: Admin access only" });
       return;
    }
    
    if (decoded.id !== "temp-admin") {
      const { readJSON } = await import("../services/db.js");
      const users = await readJSON("users.json") || [];
      const user = users.find((u: any) => u.id === decoded.id);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      if ((user.passwordVersion || 0) !== (decoded.passwordVersion || 0)) {
        res.status(401).json({ error: "Session expired" });
        return;
      }
    }
    
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];

  // API Key Authentication
  if (token.startsWith("jtg-") || token.startsWith("jtg_")) {
    try {
      const { readJSON, writeJSON } = await import("../services/db.js");
      const apiKeys = await readJSON("api_keys.json") || [];
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const apiKey = apiKeys.find((k: any) => k.key_hash === keyHash);
      if (!apiKey || apiKey.revoked) {
        res.status(401).json({ error: "Invalid or revoked API key" });
        return;
      }
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        res.status(401).json({ error: "API key expired" });
        return;
      }

      // Update last_used_at
      apiKey.last_used_at = new Date().toISOString();
      await writeJSON("api_keys.json", apiKeys);

      const users = await readJSON("users.json") || [];
      let role = "admin";
      if (apiKey.created_by !== "temp-admin") {
        const creator = users.find((u: any) => u.id === apiKey.created_by);
        if (creator) {
          role = creator.role;
        }
      }

      (req as any).user = { id: apiKey.created_by, role, isApiKey: true, scopes: apiKey.scopes };
      next();
      return;
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.id !== "temp-admin") {
      const { readJSON } = await import("../services/db.js");
      const users = await readJSON("users.json") || [];
      const user = users.find((u: any) => u.id === decoded.id);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      if ((user.passwordVersion || 0) !== (decoded.passwordVersion || 0)) {
        res.status(401).json({ error: "Session expired" });
        return;
      }
    }
    
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
