import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readJSON } from "../services/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "jtg-panel-super-secret";

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const users = await readJSON("users.json") || [];
  
  if (users.length === 0) {
    if (username === "jtg" && password === "jtg") {
      const token = jwt.sign({ id: "temp-admin", username: "jtg", role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { id: "temp-admin", username: "jtg", role: "admin" } });
      return;
    }
  }

  const user = users.find((u: any) => u.username === username);

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const role = user.role || "admin";
  const token = jwt.sign({ id: user.id, username: user.username, role, passwordVersion: user.passwordVersion || 0 }, JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user: { id: user.id, username: user.username, role } });
};

export const logout = (req: Request, res: Response) => {
  res.json({ message: "Logged out" });
};

export const getMe = (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
};

export const getUsers = async (req: Request, res: Response) => {
  const users = await readJSON("users.json") || [];
  res.json(users.map((u: any) => ({ id: u.id, username: u.username, role: u.role })));
};

export const changePassword = async (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { oldPassword, newPassword } = req.body;
  
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  
  if (reqUser.id === "temp-admin") {
    return res.status(400).json({ error: "Cannot change password of default admin account. Create a new admin user instead." });
  }

  const users = await readJSON("users.json") || [];
  const userIndex = users.findIndex((u: any) => u.id === reqUser.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  
  const isMatch = await bcrypt.compare(oldPassword || "", users[userIndex].password);
  if (!isMatch) {
    return res.status(401).json({ error: "Incorrect old password" });
  }

  // Use dynamic import for writeJSON since it's in another file
  const { writeJSON } = await import("../services/db.js");
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  users[userIndex].password = hashedPassword;
  users[userIndex].passwordVersion = (users[userIndex].passwordVersion || 0) + 1;
  await writeJSON("users.json", users);
  
  res.json({ success: true });
};
