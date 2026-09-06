import express from "express";
import { readJSON, writeJSON } from "../services/db.js";

const router = express.Router();
import authRoutes from "./auth.js";
import serverRoutes from "./servers.js";
import systemRoutes from "./system.js";
import apiKeyRoutes from "./api-keys.js";
import nodeRoutes from "./nodes.js";

router.use("/auth", authRoutes);
router.use("/servers", serverRoutes);
router.use("/system", systemRoutes);
router.use("/admin/api-keys", apiKeyRoutes);
router.use("/nodes", nodeRoutes);

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    panel: "DTG PANEL",
    timestamp: Date.now(),
    nodeEnv: process.env.NODE_ENV || "development"
  });
});

router.get("/settings", async (req, res) => {
  const settings = await readJSON("settings.json") || {};
  if (settings.panelName === "JTG Panel" || settings.panelName === "JTG PANEL") {
    settings.panelName = "DTG PANEL";
    await writeJSON("settings.json", settings);
  }
  res.json({ 
    panelName: settings.panelName && settings.panelName !== "JTG Panel" ? settings.panelName : "DTG PANEL",
    panelLogo: settings.panelLogo || "",
    panelBackgroundImage: settings.panelBackgroundImage || "",
    panelBackgroundBlur: settings.panelBackgroundBlur !== undefined ? settings.panelBackgroundBlur : 10,
    blueprintMode: settings.blueprintMode !== undefined ? settings.blueprintMode : true,
    blueprintOpacity: settings.blueprintOpacity !== undefined ? settings.blueprintOpacity : 0.12,
    blueprintSize: settings.blueprintSize !== undefined ? settings.blueprintSize : 48,
    enablePlayit: settings.enablePlayit !== undefined ? settings.enablePlayit : false,
    enableTutorial: settings.enableTutorial !== undefined ? settings.enableTutorial : true,
    enableLoginAnimation: settings.enableLoginAnimation !== undefined ? settings.enableLoginAnimation : true,
    enableRegistration: settings.enableRegistration !== undefined ? settings.enableRegistration : true,
    theme: settings.theme || "hyper-v1",
    customPrimary: settings.customPrimary || "#06b6d4",
    customSecondary: settings.customSecondary || "#0e7490",
    customGradient: settings.customGradient || "linear-gradient(135deg, #06b6d4, #0e7490)",
    enableGoogleLogin: settings.enableGoogleLogin !== undefined ? settings.enableGoogleLogin : false,
    enableDiscordLogin: settings.enableDiscordLogin !== undefined ? settings.enableDiscordLogin : false,
    discordClientId: settings.discordClientId || "",
    discordRedirectUri: settings.discordRedirectUri || "",
    firebaseApiKey: settings.firebaseApiKey || "",
    firebaseAuthDomain: settings.firebaseAuthDomain || "",
    firebaseProjectId: settings.firebaseProjectId || "",
    firebaseStorageBucket: settings.firebaseStorageBucket || "",
    firebaseMessagingSenderId: settings.firebaseMessagingSenderId || "",
    firebaseAppId: settings.firebaseAppId || "",
    defaultRuntime: settings.defaultRuntime || process.env.DEFAULT_RUNTIME || "docker"
  });
});

export default router;
