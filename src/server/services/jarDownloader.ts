import fs from "fs-extra";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { secureExecutablePermissions } from "../utils/permissions.js";

const DEFAULT_HEADERS = {
  "User-Agent": "JTGPanel/3.1.0 (https://github.com/jishnu; support@jtgpanel.net)",
  "Accept": "*/*"
};

const pipeDownloadToFile = async (url: string, tempPath: string): Promise<boolean> => {
  try {
    const response = await axios({
      method: "GET",
      url,
      responseType: "stream",
      headers: DEFAULT_HEADERS,
      timeout: 60000,
      maxRedirects: 8
    });

    if (response.status !== 200) {
      return false;
    }

    const writer = fs.createWriteStream(tempPath);
    await pipeline(response.data, writer);

    const stat = await fs.stat(tempPath);
    // Ensure the downloaded jar is a valid binary (> 500 KB)
    if (stat.size > 500 * 1024) {
      return true;
    } else {
      await fs.remove(tempPath).catch(() => {});
      return false;
    }
  } catch (err: any) {
    await fs.remove(tempPath).catch(() => {});
    return false;
  }
};

export const downloadJar = async (type: string, version: string, destPath: string): Promise<void> => {
  const normType = (type || "paper").toLowerCase().trim();
  let normVersion = (version || "latest").trim();
  if (normVersion === "latest" || normVersion === "" || normVersion === "default") {
    normVersion = "26.2";
  }

  const tempPath = `${destPath}.tmp.${Date.now()}`;
  console.log(`[JarDownloader] Request to download ${normType} (${normVersion}) -> ${destPath}`);

  // Build ordered list of candidate download URLs
  const urls: string[] = [];

  if (normType === "bungeecord" || normType === "waterfall") {
    urls.push(
      "https://ci.md-5.net/job/BungeeCord/lastSuccessfulBuild/artifact/bootstrap/target/BungeeCord.jar",
      "https://hub.spigotmc.org/jenkins/job/BungeeCord/lastSuccessfulBuild/artifact/bootstrap/target/BungeeCord.jar"
    );
    try {
      const waterfallMeta = await axios.get(`https://fill.papermc.io/v3/projects/waterfall/versions/1.20/builds/latest`, {
        headers: DEFAULT_HEADERS,
        timeout: 8000
      });
      const dlUrl = waterfallMeta.data?.downloads?.["server:default"]?.url || waterfallMeta.data?.downloads?.application?.url;
      if (dlUrl) urls.push(dlUrl);
    } catch (e) {}
  } else if (normType === "velocity") {
    // Fill v3 API for Velocity
    try {
      const veloMeta = await axios.get(`https://fill.papermc.io/v3/projects/velocity/versions/3.4.0-SNAPSHOT/builds/latest`, {
        headers: DEFAULT_HEADERS,
        timeout: 8000
      });
      const dlUrl = veloMeta.data?.downloads?.["server:default"]?.url || veloMeta.data?.downloads?.application?.url;
      if (dlUrl) {
        urls.push(dlUrl);
      }
    } catch (e) {}
    try {
      const veloMetaOld = await axios.get(`https://fill.papermc.io/v3/projects/velocity/versions/3.3.0-SNAPSHOT/builds/latest`, {
        headers: DEFAULT_HEADERS,
        timeout: 8000
      });
      const dlUrl = veloMetaOld.data?.downloads?.["server:default"]?.url || veloMetaOld.data?.downloads?.application?.url;
      if (dlUrl) {
        urls.push(dlUrl);
      }
    } catch (e) {}
    urls.push(
      "https://ci.md-5.net/job/BungeeCord/lastSuccessfulBuild/artifact/bootstrap/target/BungeeCord.jar"
    );
  } else if (normType === "forge") {
    // Official Forge maven links & fallback
    const forgePromoVer = normVersion === "1.20.1" ? "47.3.0" : (normVersion === "1.19.2" ? "43.3.0" : (normVersion === "1.18.2" ? "40.2.0" : (normVersion === "1.16.5" ? "36.2.39" : (normVersion === "1.12.2" ? "14.23.5.2860" : "latest"))));
    urls.push(
      `https://maven.minecraftforge.net/net/minecraftforge/forge/${normVersion}-${forgePromoVer}/forge-${normVersion}-${forgePromoVer}-installer.jar`,
      `https://maven.minecraftforge.net/net/minecraftforge/forge/${normVersion}-${forgePromoVer}/forge-${normVersion}-${forgePromoVer}-universal.jar`
    );
  } else if (normType === "fabric") {
    try {
      const metaRes = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${normVersion}`, {
        headers: DEFAULT_HEADERS,
        timeout: 10000
      });
      if (Array.isArray(metaRes.data) && metaRes.data.length > 0) {
        const loaderVer = metaRes.data[0].loader?.version || "0.19.3";
        const installerVer = "1.0.1";
        urls.push(`https://meta.fabricmc.net/v2/versions/loader/${normVersion}/${loaderVer}/${installerVer}/server/jar`);
      }
    } catch (e) {
      urls.push(`https://meta.fabricmc.net/v2/versions/loader/${normVersion}/0.19.3/1.0.1/server/jar`);
    }
  } else if (normType === "purpur") {
    urls.push(`https://api.purpurmc.org/v2/purpur/${normVersion}/latest/download`);
    if (normVersion === "26.1") {
      urls.push(`https://api.purpurmc.org/v2/purpur/26.1.2/latest/download`);
    }
  } else if (normType === "spigot") {
    urls.push(
      `https://cdn.getbukkit.org/spigot/spigot-${normVersion}.jar`,
      `https://download.getbukkit.org/spigot/spigot-${normVersion}.jar`,
      `https://api.purpurmc.org/v2/purpur/${normVersion}/latest/download`
    );
  }

  // Paper primary lookup via PaperMC Fill v3 API
  if (normType === "paper" || normType === "spigot" || normType === "purpur") {
    try {
      const paperMeta = await axios.get(`https://fill.papermc.io/v3/projects/paper/versions/${normVersion}/builds/latest`, {
        headers: DEFAULT_HEADERS,
        timeout: 8000
      });
      const dlUrl = paperMeta.data?.downloads?.["server:default"]?.url || paperMeta.data?.downloads?.application?.url;
      if (dlUrl && !urls.includes(dlUrl)) {
        if (normType === "paper") {
          urls.unshift(dlUrl);
        } else {
          urls.push(dlUrl);
        }
      }
    } catch (e) {}

    // Paper fallback to Purpur if paper type
    if (normType === "paper") {
      urls.push(`https://api.purpurmc.org/v2/purpur/${normVersion}/latest/download`);
      if (normVersion === "26.1") {
        urls.push(`https://api.purpurmc.org/v2/purpur/26.1.2/latest/download`);
      }
    }
  }

  // Fallback: Mojang official release for normVersion
  try {
    const manifestRes = await axios.get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json", {
      headers: DEFAULT_HEADERS,
      timeout: 8000
    });
    const versionsList = manifestRes.data?.versions;
    if (Array.isArray(versionsList)) {
      const targetEntry = versionsList.find((v: any) => v.id === normVersion) || versionsList.find((v: any) => v.id === "26.2") || versionsList.find((v: any) => v.id === "1.21.1");
      if (targetEntry?.url) {
        const versionPackage = await axios.get(targetEntry.url, { headers: DEFAULT_HEADERS, timeout: 8000 });
        const serverUrl = versionPackage.data?.downloads?.server?.url;
        if (serverUrl && !urls.includes(serverUrl)) {
          urls.push(serverUrl);
        }
      }
    }
  } catch (e) {}

  // If 26.1 or 26 was requested, also try 26.2 on Paper Fill API
  if (normVersion === "26.1" || normVersion === "26.0" || normVersion === "26") {
    try {
      const p262 = await axios.get(`https://fill.papermc.io/v3/projects/paper/versions/26.2/builds/latest`, {
        headers: DEFAULT_HEADERS,
        timeout: 8000
      });
      const dl262 = p262.data?.downloads?.["server:default"]?.url || p262.data?.downloads?.application?.url;
      if (dl262 && !urls.includes(dl262)) {
        urls.push(dl262);
      }
    } catch (e) {}
  }

  // Fallback: list all builds for version and pick the highest build id
  try {
    const buildsList = await axios.get(`https://fill.papermc.io/v3/projects/paper/versions/${normVersion}/builds`, {
      headers: DEFAULT_HEADERS,
      timeout: 8000
    });
    if (Array.isArray(buildsList.data) && buildsList.data.length > 0) {
      const latestBuild = buildsList.data[0];
      const dlUrl = latestBuild?.downloads?.["server:default"]?.url || latestBuild?.downloads?.application?.url;
      if (dlUrl && !urls.includes(dlUrl)) {
        urls.push(dlUrl);
      }
    }
  } catch (e) {}

  // Fallback: Mojang official release for normVersion
  try {
    const manifestRes = await axios.get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json", {
      headers: DEFAULT_HEADERS,
      timeout: 8000
    });
    const versionsList = manifestRes.data?.versions;
    if (Array.isArray(versionsList)) {
      const targetEntry = versionsList.find((v: any) => v.id === normVersion) || versionsList.find((v: any) => v.id === "26.2");
      if (targetEntry?.url) {
        const versionPackage = await axios.get(targetEntry.url, { headers: DEFAULT_HEADERS, timeout: 8000 });
        const serverUrl = versionPackage.data?.downloads?.server?.url;
        if (serverUrl && !urls.includes(serverUrl)) {
          urls.push(serverUrl);
        }
      }
    }
  } catch (e) {}

  // Fallback: 26.2 latest stable build or 1.21.1 if specific version query failed
  try {
    const fallbackMeta26 = await axios.get(`https://fill.papermc.io/v3/projects/paper/versions/26.2/builds/latest`, {
      headers: DEFAULT_HEADERS,
      timeout: 8000
    });
    const dlUrl26 = fallbackMeta26.data?.downloads?.["server:default"]?.url || fallbackMeta26.data?.downloads?.application?.url;
    if (dlUrl26 && !urls.includes(dlUrl26)) {
      urls.push(dlUrl26);
    }
  } catch (e) {}

  if (normVersion !== "1.21.1") {
    try {
      const fallbackMeta = await axios.get(`https://fill.papermc.io/v3/projects/paper/versions/1.21.1/builds/latest`, {
        headers: DEFAULT_HEADERS,
        timeout: 8000
      });
      const dlUrl = fallbackMeta.data?.downloads?.["server:default"]?.url || fallbackMeta.data?.downloads?.application?.url;
      if (dlUrl && !urls.includes(dlUrl)) {
        urls.push(dlUrl);
      }
    } catch (e) {}
  }

  let success = false;
  let lastErr = "";
  for (const candidateUrl of urls) {
    try {
      console.log(`[JarDownloader] Attempting candidate URL: ${candidateUrl}`);
      const ok = await pipeDownloadToFile(candidateUrl, tempPath);
      if (ok) {
        await fs.ensureDir(path.dirname(destPath));
        await fs.move(tempPath, destPath, { overwrite: true });
        await secureExecutablePermissions(destPath);
        const finalStat = await fs.stat(destPath);
        console.log(`[JarDownloader] Successfully downloaded ${normType} (${(finalStat.size / (1024 * 1024)).toFixed(2)} MB)`);
        success = true;
        break;
      }
    } catch (err: any) {
      lastErr = err?.message || String(err);
      console.warn(`[JarDownloader] URL failed: ${candidateUrl} - ${lastErr}`);
    }
  }

  if (!success) {
    await fs.remove(tempPath).catch(() => {});
    throw new Error(`Failed to download server JAR for ${normType} ${normVersion}. ${lastErr || "All download mirrors failed"}`);
  }
};

