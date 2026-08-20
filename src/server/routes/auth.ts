import express from "express";
import { login, logout, getMe, getUsers, changePassword, changeUsername, register, googleLogin } from "../controllers/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { loginRateLimiter, registerRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.post("/register", registerRateLimiter, register);
router.post("/login", loginRateLimiter, login);
router.post("/google", googleLogin);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.get("/users", requireAuth, getUsers);
router.put("/password", requireAuth, changePassword);
router.put("/username", requireAuth, changeUsername);

export default router;
