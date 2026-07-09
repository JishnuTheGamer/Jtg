import express from "express";
import { login, logout, getMe, getUsers, changePassword } from "../controllers/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.get("/users", requireAuth, getUsers);
router.put("/password", requireAuth, changePassword);

export default router;
