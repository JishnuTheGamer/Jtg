import express from "express";
import { readJSON } from "../services/db.js";
import { exec } from "child_process";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", panel: "JTG Panel", version: "3.2.0" });
});

import authRoutes from "./auth.js";
import serverRoutes from "./servers.js";
import systemRoutes from "./system.js";
import apiKeyRoutes from "./api-keys.js";
import nodeRoutes from "./nodes.js";

// GitHub Auto-Update Webhook endpoint
router.post("/webhook/github-update", async (req, res) => {
  const secretHeader = req.headers["x-hub-signature-256"] || req.headers["x-webhook-secret"] || req.query.secret;
  const configuredSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (configuredSecret && secretHeader !== configuredSecret) {
    return res.status(401).json({ error: "Invalid webhook secret" });
  }

  console.log("[JTG Panel] GitHub push webhook triggered! Initiating automatic panel update...");
  res.json({ success: true, message: "Automatic update triggered from GitHub push." });

  setTimeout(() => {
    exec("bash update.sh", (error, stdout, stderr) => {
      if (error) {
        console.error(`[JTG Panel Auto-Update Error]:`, error);
      }
      console.log(`[JTG Panel Auto-Update Output]:\n${stdout}`);
    });
  }, 1000);
});

router.use("/auth", authRoutes);
router.use("/servers", serverRoutes);
router.use("/system", systemRoutes);
router.use("/admin/api-keys", apiKeyRoutes);
router.use("/nodes", nodeRoutes);

router.get("/settings", async (req, res) => {
  const settings = await readJSON("settings.json") || {};
  res.json({ 
    panelName: settings.panelName || "JTG Panel",
    panelLogo: settings.panelLogo || "",
    panelBackgroundImage: settings.panelBackgroundImage || "",
    panelBackgroundBlur: settings.panelBackgroundBlur !== undefined ? settings.panelBackgroundBlur : 10,
    enablePlayit: settings.enablePlayit !== undefined ? settings.enablePlayit : false,
    enableTutorial: settings.enableTutorial !== undefined ? settings.enableTutorial : true,
    enableLoginAnimation: settings.enableLoginAnimation !== undefined ? settings.enableLoginAnimation : true,
    enableRegistration: settings.enableRegistration !== undefined ? settings.enableRegistration : true,
    theme: settings.theme || "red",
    enableGoogleLogin: settings.enableGoogleLogin !== undefined ? settings.enableGoogleLogin : false,
    firebaseApiKey: settings.firebaseApiKey || "",
    firebaseAuthDomain: settings.firebaseAuthDomain || "",
    firebaseProjectId: settings.firebaseProjectId || "",
    firebaseStorageBucket: settings.firebaseStorageBucket || "",
    firebaseMessagingSenderId: settings.firebaseMessagingSenderId || "",
    firebaseAppId: settings.firebaseAppId || "",
    defaultRuntime: settings.defaultRuntime || process.env.DEFAULT_RUNTIME || "docker",
    runtimeLocked: settings.runtimeLocked !== undefined ? settings.runtimeLocked : (process.env.PANEL_RUNTIME_LOCKED === "true" || process.env.PANEL_RUNTIME_LOCKED === "1"),
    isDev: process.env.NODE_ENV === "development" || process.env.PORT === "30000" || process.env.PANEL_DEV_MODE === "true" || process.env.DEV_MODE === "true",
    playitServiceMode: settings.playitServiceMode || "managed_process",
    playitServiceName: settings.playitServiceName || "playit",
    healthCheckIntervalMinutes: settings.healthCheckIntervalMinutes || 5,
    restartDelaySeconds: settings.restartDelaySeconds || 20,
    maxRecoveryAttempts: settings.maxRecoveryAttempts || 3,
    allowRecoveryWhilePlayersOnline: settings.allowRecoveryWhilePlayersOnline === true
  });
});

export default router;
