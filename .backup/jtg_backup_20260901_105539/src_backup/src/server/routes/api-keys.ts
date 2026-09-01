import express from "express";
import crypto from "crypto";
import { requireAdmin } from "../middleware/auth.js";
import { readJSON, writeJSON } from "../services/db.js";

const router = express.Router();

router.use(requireAdmin);

// List API Keys
router.get("/", async (req, res) => {
  try {
    const apiKeys = await readJSON("api_keys.json") || [];
    // Omit key_hash when listing
    const keysWithoutHash = apiKeys.map((key: any) => ({
      id: key.id,
      label: key.label,
      scopes: key.scopes,
      created_by: key.created_by,
      created_at: key.created_at,
      expires_at: key.expires_at,
      last_used_at: key.last_used_at,
      revoked: key.revoked
    }));
    res.json(keysWithoutHash);
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create API Key
router.post("/", async (req, res) => {
  try {
    const { label, scopes, expires_at } = req.body;
    const user = (req as any).user;

    // Generate random API key (14 chars)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(14);
    let rawKey = '';
    for (let i = 0; i < 14; i++) {
      rawKey += chars[randomBytes[i] % chars.length];
    }
    const keyString = `jtg-${rawKey}`;
    
    // Hash the key for storage
    const keyHash = crypto.createHash('sha256').update(keyString).digest('hex');

    const apiKeys = await readJSON("api_keys.json") || [];
    
    const newKey = {
      id: crypto.randomUUID(),
      key_hash: keyHash,
      label: label || "Unnamed Key",
      scopes: scopes || ["*"],
      created_by: user.id,
      created_at: new Date().toISOString(),
      expires_at: expires_at || null,
      last_used_at: null,
      revoked: false
    };

    apiKeys.push(newKey);
    await writeJSON("api_keys.json", apiKeys);

    res.json({
      success: true,
      key: keyString, // Only show once
      id: newKey.id,
      label: newKey.label,
      scopes: newKey.scopes,
      expires_at: newKey.expires_at
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete API Key
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const apiKeys = await readJSON("api_keys.json") || [];
    const keyIndex = apiKeys.findIndex((k: any) => k.id === id);
    
    if (keyIndex === -1) {
      return res.status(404).json({ error: "Key not found" });
    }

    apiKeys.splice(keyIndex, 1);
    await writeJSON("api_keys.json", apiKeys);

    res.json({ success: true, message: "Key deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


export default router;
