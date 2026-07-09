import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jtg-panel-super-secret";

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];
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
