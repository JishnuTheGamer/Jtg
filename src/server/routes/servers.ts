import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getServers, createServer, getServer, deleteServer, startServer, stopServer, restartServer, changeServerVersion, getFiles, uploadFile, deleteFile, renameFile, saveFileContent, sendCommand, getServerStats, updateOwner, getBackups, createBackup, downloadBackup, deleteBackup } from "../controllers/servers.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: ".data/temp/" });

router.use(requireAuth);

router.get("/", getServers);
router.post("/", createServer);
router.get("/:id", getServer);
router.get("/:id/stats", getServerStats);
router.delete("/:id", deleteServer);
router.put("/:id/owner", updateOwner);

router.put("/:id/version", changeServerVersion);

router.post("/:id/start", startServer);
router.post("/:id/stop", stopServer);
router.post("/:id/restart", restartServer);
router.post("/:id/command", sendCommand);

// Simple file endpoints
router.get("/:id/files", getFiles);
router.post("/:id/files/upload", upload.single("file"), uploadFile);
router.post("/:id/files/rename", renameFile);
router.post("/:id/files/save", saveFileContent);
router.delete("/:id/files", deleteFile);

// Backup endpoints
router.get("/:id/backups", getBackups);
router.post("/:id/backups", createBackup);
router.get("/:id/backups/:filename", downloadBackup);
router.delete("/:id/backups/:filename", deleteBackup);

export default router;
