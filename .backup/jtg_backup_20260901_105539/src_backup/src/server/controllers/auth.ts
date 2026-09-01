import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readJSON, writeJSON } from "../services/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "jtg-panel-super-secret";

export const register = async (req: Request, res: Response) => {
  const settings = await readJSON("settings.json") || {};
  if (settings.enableRegistration === false) {
    res.status(403).json({ error: "User registration is currently disabled by administrator." });
    return;
  }

  const { username, password, confirmPassword } = req.body;

  if (!username || !password || !confirmPassword) {
    res.status(400).json({ error: "Username, password, and confirm password are required" });
    return;
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }

  const users = await readJSON("users.json") || [];
  const existingUser = users.find((u: any) => u.username.toLowerCase() === cleanUsername.toLowerCase());

  if (existingUser) {
    res.status(400).json({ error: "Username is already taken" });
    return;
  }

  const { writeJSON } = await import("../services/db.js");
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUser = {
    id: "user-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    username: cleanUsername,
    password: hashedPassword,
    role: "user",
    passwordVersion: 0
  };

  users.push(newUser);
  await writeJSON("users.json", users);

  res.status(201).json({
    message: "User registered successfully",
    user: { id: newUser.id, username: newUser.username, role: newUser.role }
  });
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const isDevMode = process.env.NODE_ENV !== "production" || process.env.PORT === "3000";

  if (isDevMode) {
    const users = await readJSON("users.json") || [];
    let user = users.find((u: any) => u.username === username);

    if (!user) {
      const { writeJSON } = await import("../services/db.js");
      const hashedPassword = await bcrypt.hash(password, 10);
      user = {
        id: "dev-user-" + Math.random().toString(36).substr(2, 9),
        username,
        password: hashedPassword,
        role: "admin",
        passwordVersion: 0
      };
      users.push(user);
      await writeJSON("users.json", users);
    }

    const role = user.role || "admin";
    const token = jwt.sign(
      { id: user.id, username: user.username, role, passwordVersion: user.passwordVersion || 0 },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user.id, username: user.username, role } });
    return;
  }

  const users = await readJSON("users.json") || [];
  
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

export const getMe = async (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser && reqUser.id !== "temp-admin") {
    const users = await readJSON("users.json") || [];
    const dbUser = users.find((u: any) => u.id === reqUser.id);
    if (dbUser) {
      return res.json({
        user: {
          ...reqUser,
          googleId: dbUser.googleId || null,
          isGoogleUser: !!(dbUser.googleId || !dbUser.password)
        }
      });
    }
  }
  res.json({ user: reqUser });
};

export const getUsers = async (req: Request, res: Response) => {
  const users = await readJSON("users.json") || [];
  res.json(users.map((u: any) => ({ id: u.id, username: u.username, role: u.role, isGoogleUser: !!u.googleId })));
};

export const changeUsername = async (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { newUsername } = req.body;

  if (!newUsername || typeof newUsername !== "string" || newUsername.trim().length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters long." });
  }

  const cleanUsername = newUsername.trim();

  if (reqUser.id === "temp-admin") {
    return res.status(400).json({ error: "Cannot change username of default admin account." });
  }

  const users = await readJSON("users.json") || [];
  const userIndex = users.findIndex((u: any) => u.id === reqUser.id);

  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!users[userIndex].googleId) {
    return res.status(400).json({ error: "Username change is only available for Google authenticated accounts." });
  }

  const existingUser = users.find((u: any) => u.id !== reqUser.id && u.username && u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: `Username '${cleanUsername}' is already taken.` });
  }

  users[userIndex].username = cleanUsername;
  await writeJSON("users.json", users);

  res.json({ success: true, username: cleanUsername });
};

export const changePassword = async (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { oldPassword, newPassword } = req.body;
  
  if (reqUser.id === "temp-admin") {
    return res.status(400).json({ error: "Cannot change password of default admin account. Create a new admin user instead." });
  }

  const users = await readJSON("users.json") || [];
  const userIndex = users.findIndex((u: any) => u.id === reqUser.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  if (users[userIndex].googleId || !users[userIndex].password) {
    return res.status(400).json({ error: "Password change is disabled for Google Auth accounts." });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
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

export const googleLogin = async (req: Request, res: Response) => {
  const { email, googleId, name, photoURL } = req.body;

  if (!email) {
    res.status(400).json({ error: "Google email is required" });
    return;
  }

  const settings = await readJSON("settings.json") || {};
  if (settings.enableGoogleLogin === false) {
    res.status(403).json({ error: "Google Login is disabled on this panel." });
    return;
  }

  // Derive username from Gmail (e.g. jishnumondal32@gmail.com -> jishnumondal32)
  const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "");
  const baseUsername = emailPrefix || "user";

  const users = await readJSON("users.json") || [];
  let user = users.find((u: any) => (u.email && u.email.toLowerCase() === email.toLowerCase()) || (u.googleId && u.googleId === googleId) || (u.username && u.username.toLowerCase() === baseUsername.toLowerCase()));

  if (!user) {
    // If no users exist yet in system at all, make this user an admin!
    const isFirstUser = users.length === 0;
    const role = isFirstUser ? "admin" : "user";

    const { writeJSON } = await import("../services/db.js");
    user = {
      id: "google-user-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      username: baseUsername,
      email,
      googleId,
      role,
      avatar: photoURL || "",
      passwordVersion: 0,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    await writeJSON("users.json", users);
  } else {
    // Link email & googleId if missing
    let updated = false;
    if (!user.email) { user.email = email; updated = true; }
    if (!user.googleId) { user.googleId = googleId; updated = true; }
    if (photoURL && !user.avatar) { user.avatar = photoURL; updated = true; }
    if (updated) {
      const { writeJSON } = await import("../services/db.js");
      await writeJSON("users.json", users);
    }
  }

  const role = user.role || "admin";
  const token = jwt.sign(
    { id: user.id, username: user.username, role, passwordVersion: user.passwordVersion || 0 },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ 
    token, 
    user: { 
      id: user.id, 
      username: user.username, 
      role, 
      email: user.email, 
      avatar: user.avatar,
      googleId: user.googleId,
      isGoogleUser: true 
    } 
  });
};
