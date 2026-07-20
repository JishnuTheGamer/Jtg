import express from "express";
import jwt from "jsonwebtoken";
import { readJSON } from "../services/db.js";

const router = express.Router();
import authRoutes from "./auth.js";
import serverRoutes from "./servers.js";
import systemRoutes from "./system.js";
import apiKeyRoutes from "./api-keys.js";

router.use("/auth", authRoutes);
router.use("/servers", serverRoutes);
router.use("/system", systemRoutes);
router.use("/admin/api-keys", apiKeyRoutes);

router.get("/settings", async (req, res) => {
  const settings = await readJSON("settings.json") || {};
  res.json({ 
    panelName: settings.panelName || "JTG Panel",
    panelLogo: settings.panelLogo || "",
    panelBackgroundImage: settings.panelBackgroundImage || "",
    panelBackgroundBlur: settings.panelBackgroundBlur !== undefined ? settings.panelBackgroundBlur : 10,
    enablePlayit: settings.enablePlayit !== undefined ? settings.enablePlayit : false,
    enableTutorial: settings.enableTutorial !== undefined ? settings.enableTutorial : true,
    enableLoginAnimation: settings.enableLoginAnimation !== undefined ? settings.enableLoginAnimation : true
  });
});

export default router;
