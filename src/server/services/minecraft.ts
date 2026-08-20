import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import nbt from 'prismarine-nbt';
import { promisify } from 'util';

const parseNbt = promisify(nbt.parse);

export const getDataVersionForMinecraft = (version: string): number => {
  const v = String(version || '').trim().toLowerCase();
  if (v === "latest" || v === "" || v === "default" || v.startsWith("26") || v.startsWith("1.26") || v.startsWith("1.25") || v.startsWith("1.22") || v.startsWith("1.23") || v.startsWith("1.24") || v.startsWith("25") || v.includes("26w") || v.includes("25w")) {
    return 4500;
  }
  if (v === "1.21.4") return 4189;
  if (v === "1.21.2" || v === "1.21.3") return 4082;
  if (v === "1.21.1") return 3955;
  if (v === "1.21") return 3953;
  if (v === "1.20.5" || v === "1.20.6") return 3839;
  if (v === "1.20.3" || v === "1.20.4") return 3700;
  if (v === "1.20.2") return 3578;
  if (v === "1.20" || v === "1.20.1") return 3465;
  if (v.startsWith("1.19.4")) return 3337;
  if (v.startsWith("1.19")) return 3120;
  if (v.startsWith("1.18")) return 2975;
  if (v.startsWith("1.17")) return 2730;
  if (v.startsWith("1.16")) return 2586;
  if (v.startsWith("1.15")) return 2230;
  if (v.startsWith("1.14")) return 1976;
  if (v.startsWith("1.13")) return 1631;
  if (v.startsWith("1.12")) return 1343;
  if (v.startsWith("1.8") || v.startsWith("1.7")) return 500;
  return 3465; // default fallback
};

export const getWorldDataVersion = async (serverDir: string): Promise<number | null> => {
  try {
    const levelDatPath = path.join(serverDir, "world", "level.dat");
    if (!fs.existsSync(levelDatPath)) {
      return null;
    }
    const buffer = await fs.readFile(levelDatPath);
    const { parsed } = (await parseNbt(buffer)) as any;
    if (parsed?.value?.Data?.value?.DataVersion?.value) {
      return parsed.value.Data.value.DataVersion.value;
    }
  } catch (err) {
    console.warn("Could not read world DataVersion:", err);
  }
  return null;
};

export const getJavaVersionForMinecraft = (version: string, software?: string) => {
  // Minecraft 1.16.x: Java 8 or 11
  // Minecraft 1.18.x - 1.20.4: Java 17
  // Minecraft 1.20.5 - 1.21.x: Java 21
  // Minecraft 26.x (26.2, 26.1, etc.), 1.22+, 1.25+, 1.26+, snapshots (26w..), latest: Java 25
  const v = String(version || '').trim().toLowerCase();
  if (
    v === "latest" ||
    v === "" ||
    v === "default" ||
    v.startsWith("26") ||
    v.startsWith("1.26") ||
    v.startsWith("1.25") ||
    v.startsWith("1.22") ||
    v.startsWith("1.23") ||
    v.startsWith("1.24") ||
    v.startsWith("25") ||
    v.includes("26w") ||
    v.includes("25w")
  ) {
    return "25";
  }
  if (v.startsWith("1.21") || v.startsWith("1.20.6") || v.startsWith("1.20.5")) {
    return "21";
  }
  if (v.startsWith("1.18") || v.startsWith("1.19") || v.startsWith("1.20")) {
    return "17";
  }
  if (v.startsWith("1.17")) {
    return "16";
  }
  if (v.startsWith("1.16")) {
    return "11";
  }
  return "8";
};

export const getDockerImageForJava = (javaVersion: string) => {
  if (javaVersion === "25") return "ghcr.io/pterodactyl/yolks:java_25";
  if (javaVersion === "21") return "ghcr.io/pterodactyl/yolks:java_21";
  if (javaVersion === "17") return "ghcr.io/pterodactyl/yolks:java_17";
  if (javaVersion === "16") return "ghcr.io/pterodactyl/yolks:java_16";
  if (javaVersion === "11") return "ghcr.io/pterodactyl/yolks:java_11";
  if (javaVersion === "8") return "ghcr.io/pterodactyl/yolks:java_8";
  return "ghcr.io/pterodactyl/yolks:java_21";
};

export const getStartupCommand = (software: string, memory: number, jarName: string) => {
  return `java -Xms128M -Xmx${memory}G -jar ${jarName} --nogui`;
};
