import fs from "fs-extra";
import path from "path";
import axios from "axios";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*"
};

const pipeDownloadToFile = async (url: string, tempPath: string): Promise<boolean> => {
  try {
    const response = await axios({
      method: "GET",
      url,
      responseType: "stream",
      headers: DEFAULT_HEADERS,
      timeout: 45000,
      maxRedirects: 5
    });

    if (response.status !== 200) {
      return false;
    }

    const writer = fs.createWriteStream(tempPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const stat = await fs.stat(tempPath);
    // Ensure the downloaded jar is actually a real binary (at least 500 KB)
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
    normVersion = "1.21.1";
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
  } else if (normType === "velocity") {
    urls.push(
      "https://api.purpurmc.org/v2/purpur/1.21.1/latest/download",
      "https://ci.md-5.net/job/BungeeCord/lastSuccessfulBuild/artifact/bootstrap/target/BungeeCord.jar"
    );
  } else if (normType === "fabric") {
    try {
      const metaRes = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${normVersion}`, {
        headers: DEFAULT_HEADERS,
        timeout: 10000
      });
      if (Array.isArray(metaRes.data) && metaRes.data.length > 0) {
        const loaderVer = metaRes.data[0].loader?.version || "0.16.10";
        const installerVer = "1.0.1";
        urls.push(`https://meta.fabricmc.net/v2/versions/loader/${normVersion}/${loaderVer}/${installerVer}/server/jar`);
      }
    } catch (e) {
      urls.push(`https://meta.fabricmc.net/v2/versions/loader/${normVersion}/0.16.10/1.0.1/server/jar`);
    }
    // Purpur fallback if fabric metadata fails
    urls.push(`https://api.purpurmc.org/v2/purpur/${normVersion}/latest/download`);
  } else if (normType === "spigot") {
    urls.push(
      `https://download.getbukkit.org/spigot/spigot-${normVersion}.jar`,
      `https://api.purpurmc.org/v2/purpur/${normVersion}/latest/download`
    );
  } else {
    // Default / Paper / Purpur / Forge fallback
    urls.push(
      `https://api.purpurmc.org/v2/purpur/${normVersion}/latest/download`,
      `https://download.getbukkit.org/spigot/spigot-${normVersion}.jar`,
      `https://api.purpurmc.org/v2/purpur/1.21.1/latest/download`
    );
  }

  let success = false;
  for (const candidateUrl of urls) {
    console.log(`[JarDownloader] Attempting candidate URL: ${candidateUrl}`);
    const ok = await pipeDownloadToFile(candidateUrl, tempPath);
    if (ok) {
      await fs.ensureDir(path.dirname(destPath));
      await fs.move(tempPath, destPath, { overwrite: true });
      const finalStat = await fs.stat(destPath);
      console.log(`[JarDownloader] Successfully downloaded ${normType} (${(finalStat.size / (1024 * 1024)).toFixed(2)} MB)`);
      success = true;
      break;
    }
  }

  if (!success) {
    await fs.remove(tempPath).catch(() => {});
    throw new Error(`Failed to download server JAR for ${normType} ${normVersion} from all mirrors.`);
  }
};

