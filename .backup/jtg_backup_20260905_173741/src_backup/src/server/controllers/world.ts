import { Request, Response } from "express";
import path from "path";
import fs from "fs-extra";
import nbt from "prismarine-nbt";
import { promisify } from "util";
import * as archiverPkg from "archiver";
import { extractArchive } from "../utils/extract.js";

const archiver = (archiverPkg as any).default || archiverPkg;
const parseNbt = promisify(nbt.parse);

async function getLevelName(serverDir: string) {
  const propsPath = path.join(serverDir, "server.properties");
  if (fs.existsSync(propsPath)) {
    const props = await fs.readFile(propsPath, "utf-8");
    const match = props.match(/^level-name=(.*)$/m);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  return "world";
}

async function setLevelNameInProperties(serverDir: string, newLevelName: string) {
  const propsPath = path.join(serverDir, "server.properties");
  if (fs.existsSync(propsPath)) {
    let props = await fs.readFile(propsPath, "utf-8");
    if (/^level-name=.*$/m.test(props)) {
      props = props.replace(/^level-name=.*$/m, `level-name=${newLevelName}`);
    } else {
      props += `\nlevel-name=${newLevelName}\n`;
    }
    await fs.writeFile(propsPath, props, "utf-8");
  } else {
    // create basic server.properties if not present
    await fs.writeFile(propsPath, `level-name=${newLevelName}\n`, "utf-8");
  }
}

interface ScoredWorldCandidate {
  worldDir: string;
  score: number;
  hasLevelDat: boolean;
  detectedName: string;
  detectedFiles: string[];
}

/**
 * Robustly searches a directory tree for the folder that directly contains standard Minecraft world files.
 * Uses high-confidence heuristics and scoring to detect Java and Bedrock worlds across any folder depth.
 */
async function locateMinecraftWorldFolder(rootDir: string): Promise<ScoredWorldCandidate | null> {
  const candidates: ScoredWorldCandidate[] = [];

  const evaluateDir = async (dir: string, depth = 0) => {
    if (depth > 8) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const lowerNames = entries.map((e) => e.name.toLowerCase());
      let score = 0;
      let hasLevelDat = false;

      const hasLevelDatFile = lowerNames.includes("level.dat") || lowerNames.includes("level.dat_old") || lowerNames.includes("level.dat_mcr");
      if (hasLevelDatFile) {
        score += 50;
        hasLevelDat = true;
      }

      const hasRegionDir = entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "region");
      if (hasRegionDir) {
        score += 60;
        // Check if region contains .mca files for extra confidence
        try {
          const regionEntries = await fs.readdir(path.join(dir, entries.find((e) => e.name.toLowerCase() === "region")!.name));
          if (regionEntries.some((f) => f.toLowerCase().endsWith(".mca") || f.toLowerCase().endsWith(".mcr"))) {
            score += 40;
          }
        } catch {}
      }

      // Check for .mca directly in dir
      if (entries.some((e) => e.name.toLowerCase().endsWith(".mca") || e.name.toLowerCase().endsWith(".mcr"))) {
        score += 60;
      }

      if (entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "data")) score += 25;
      if (entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "datapacks")) score += 25;
      if (entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "advancements")) score += 25;
      if (entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "entities")) score += 25;
      if (entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "poi")) score += 25;
      if (entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "playerdata")) score += 20;
      if (entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "stats")) score += 20;
      if (entries.some((e) => e.isDirectory() && (e.name.toLowerCase() === "dim1" || e.name.toLowerCase() === "dim-1" || e.name.toLowerCase() === "dimensions"))) score += 30;
      if (lowerNames.includes("session.lock")) score += 15;
      if (lowerNames.includes("uid.dat")) score += 10;
      if (lowerNames.includes("icon.png") || lowerNames.includes("world_icon.jpeg")) score += 10;

      // Bedrock world markers
      if (entries.some((e) => e.isDirectory() && e.name.toLowerCase() === "db") && (lowerNames.includes("levelname.txt") || hasLevelDatFile)) {
        score += 70;
      }

      if (score >= 20) {
        let detectedName = path.basename(dir);
        if (dir === rootDir || detectedName.startsWith("temp_")) {
          detectedName = "world";
        }
        candidates.push({
          worldDir: dir,
          score,
          hasLevelDat,
          detectedName,
          detectedFiles: entries.map((e) => e.name),
        });
      }

      // Recurse down subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await evaluateDir(path.join(dir, entry.name), depth + 1);
        }
      }
    } catch {}
  };

  await evaluateDir(rootDir, 0);

  if (candidates.length === 0) {
    return null;
  }

  // Sort by highest score first, then prefer directories that contain 'region' or 'level.dat'
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

export const getWorldInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    const levelName = await getLevelName(serverDir);
    const worldDir = path.join(serverDir, levelName);
    const levelDatPath = path.join(worldDir, "level.dat");

    let worldVersion = "Unknown";
    let dataVersion = 0;
    let worldName = levelName;

    if (fs.existsSync(levelDatPath)) {
      try {
        const buffer = await fs.readFile(levelDatPath);
        const { parsed } = (await parseNbt(buffer)) as any;
        if (parsed?.value?.Data?.value) {
          const data = parsed.value.Data.value;
          if (data.Version?.value?.Name?.value) {
            worldVersion = data.Version.value.Name.value;
          }
          if (data.DataVersion?.value) {
            dataVersion = data.DataVersion.value;
          }
          if (data.LevelName?.value) {
            worldName = data.LevelName.value;
          }
        }
      } catch (nbtErr) {
        console.warn("Could not read level.dat for worldInfo:", nbtErr);
      }
    }

    res.json({
      levelName,
      worldName,
      worldVersion,
      dataVersion,
      exists: fs.existsSync(worldDir),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const analyzeWorld = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { zipPath } = req.body;
  const serverDir = path.join(process.cwd(), ".data", "servers", id);

  try {
    if (!zipPath) {
      return res.status(400).json({ error: "Missing zipPath parameter" });
    }

    let zipFullPath = path.join(serverDir, zipPath);
    if (!fs.existsSync(zipFullPath)) {
      return res.status(400).json({ error: "Zip file not found in server directory" });
    }

    // If zipFullPath is a directory, look for the actual archive file inside
    if ((await fs.stat(zipFullPath)).isDirectory()) {
      const filesInside = await fs.readdir(zipFullPath);
      const matched = filesInside.find((f) => /\.(zip|tar|gz|tgz|jar|rar|7z)$/i.test(f));
      if (matched) {
        zipFullPath = path.join(zipFullPath, matched);
      } else {
        // The directory itself might contain world files
        const directDetect = await locateMinecraftWorldFolder(zipFullPath);
        if (directDetect) {
          return res.json({
            status: "valid",
            worldDataVersion: 0,
            worldName: directDetect.detectedName || "world",
            folderName: directDetect.detectedName || "world",
            hasLevelDat: directDetect.hasLevelDat,
            detectedFiles: directDetect.detectedFiles.slice(0, 12),
          });
        }
        return res.status(400).json({ error: "No archive file found inside folder" });
      }
    }

    const tempExtractDir = path.join(serverDir, `temp_analyze_${Date.now()}`);
    await extractArchive(zipFullPath, tempExtractDir);

    const detected = await locateMinecraftWorldFolder(tempExtractDir);

    let worldDataVersion = 0;
    let worldName = detected?.detectedName || "world";
    let detectedFiles: string[] = [];

    if (detected) {
      detectedFiles = detected.detectedFiles || [];

      const levelDatPath = path.join(detected.worldDir, "level.dat");
      if (fs.existsSync(levelDatPath)) {
        try {
          const buffer = await fs.readFile(levelDatPath);
          const { parsed } = (await parseNbt(buffer)) as any;
          if (parsed?.value?.Data?.value?.DataVersion?.value) {
            worldDataVersion = parsed.value.Data.value.DataVersion.value;
          }
          if (parsed?.value?.Data?.value?.LevelName?.value) {
            worldName = parsed.value.Data.value.LevelName.value;
          }
        } catch (err) {
          console.warn("Could not parse level.dat nbt during analyze:", err);
        }
      }
    }

    // Clean up temporary extract directory
    await fs.remove(tempExtractDir);

    if (!detected) {
      return res.json({
        status: "invalid",
        message: "No Minecraft world folder found. The archive must contain world files (such as region, data, datapacks, advancements, or level.dat).",
      });
    }

    res.json({
      status: "valid",
      worldDataVersion,
      worldName: worldName || detected.detectedName,
      folderName: detected.detectedName,
      hasLevelDat: detected.hasLevelDat,
      detectedFiles: detectedFiles.slice(0, 12),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const importWorld = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { zipPath, targetFolderName, autoUpdateProperties = true } = req.body;
  const serverDir = path.join(process.cwd(), ".data", "servers", id);

  try {
    // 1. Verify server is stopped
    const serversJSON = await fs.readFile(
      path.join(process.cwd(), ".data", "servers.json"),
      "utf8"
    );
    const servers = JSON.parse(serversJSON);
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (
      server.status === "running" ||
      server.status === "starting" ||
      server.status === "online"
    ) {
      return res
        .status(400)
        .json({ error: "Server is currently running. Please stop it first." });
    }

    let zipFullPath = path.join(serverDir, zipPath);
    let origPathToDelete = zipFullPath;
    if (!fs.existsSync(zipFullPath)) {
      return res.status(400).json({ error: "Zip file not found" });
    }

    // If zipFullPath is a directory, find the archive file inside
    if ((await fs.stat(zipFullPath)).isDirectory()) {
      const filesInside = await fs.readdir(zipFullPath);
      const matched = filesInside.find((f) => /\.(zip|tar|gz|tgz|jar|rar|7z)$/i.test(f));
      if (matched) {
        zipFullPath = path.join(zipFullPath, matched);
      }
    }

    // 2. Extract world to temporary folder
    const tempExtractDir = path.join(serverDir, `temp_world_${Date.now()}`);
    await extractArchive(zipFullPath, tempExtractDir);

    // 3. Locate the actual Minecraft world directory inside the extracted contents
    const detected = await locateMinecraftWorldFolder(tempExtractDir);
    if (!detected) {
      await fs.remove(tempExtractDir);
      return res.status(400).json({
        error: "Invalid world archive: No Minecraft world folder structure (advancements, data, datapacks, region, level.dat) found.",
      });
    }

    // 4. Determine final destination folder name in server root (defaults to 'world' or user's chosen folder)
    const configuredLevel = await getLevelName(serverDir);
    const chosenFolderName = (targetFolderName || "world" || detected.detectedName || configuredLevel)
      .trim()
      .replace(/[/\\?%*:|"<>]/g, "-");

    const finalWorldDestination = path.join(serverDir, chosenFolderName);

    // 5. Create automatic safety backup of current server state before replacing
    const backupDir = path.join(process.cwd(), ".data", "backups", id);
    await fs.ensureDir(backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupZipPath = path.join(
      backupDir,
      `pre_world_import_${timestamp}.zip`
    );

    try {
      const output = fs.createWriteStream(backupZipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(output);
      archive.directory(serverDir, false);
      await archive.finalize();
    } catch (bErr) {
      console.warn("Safety backup warning:", bErr);
    }

    // 6. Clean existing target world directory if it exists and move detected world folder directly to root
    if (fs.existsSync(finalWorldDestination)) {
      await fs.remove(finalWorldDestination);
    }
    await fs.ensureDir(finalWorldDestination);

    // Move / Copy the verified world files directly into root/{chosenFolderName}
    await fs.copy(detected.worldDir, finalWorldDestination);

    // 7. Clean up temporary extract folder
    await fs.remove(tempExtractDir);

    // 8. Delete the original uploaded zip file and any wrapper folder
    if (fs.existsSync(zipFullPath)) {
      await fs.remove(zipFullPath);
    }
    if (origPathToDelete !== zipFullPath && fs.existsSync(origPathToDelete)) {
      await fs.remove(origPathToDelete);
    }

    // 9. Remove stale session.lock files
    const lockFiles = [
      path.join(finalWorldDestination, "session.lock"),
      path.join(serverDir, `${chosenFolderName}_nether`, "session.lock"),
      path.join(serverDir, `${chosenFolderName}_the_end`, "session.lock"),
    ];
    for (const lockFile of lockFiles) {
      if (fs.existsSync(lockFile)) {
        await fs.remove(lockFile);
      }
    }

    // 10. Automatically update server.properties level-name so server loads the new world
    if (autoUpdateProperties) {
      await setLevelNameInProperties(serverDir, chosenFolderName);
    }

    res.json({
      success: true,
      message: `World files placed directly into '/${chosenFolderName}' in File Manager, level-name updated, and zip file deleted.`,
      worldFolder: chosenFolderName,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to import world" });
  }
};
