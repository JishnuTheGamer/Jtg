// Utility helpers for Modrinth plugins and mods management

export interface ModrinthHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  categories: string[];
  client_side?: string;
  server_side?: string;
  downloads: number;
  follows?: number;
  icon_url: string | null;
  author?: string;
  versions?: string[];
  latest_version?: string;
}

export interface ModrinthFileVersion {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  version_type: "release" | "beta" | "alpha";
  featured: boolean;
  date_published: string;
  downloads: number;
  files: {
    hashes: { [key: string]: string };
    url: string;
    filename: string;
    primary: boolean;
    size: number;
  }[];
}

export interface InstalledItem {
  filename: string;
  size: number;
  modified: number;
}

// Normalize Minecraft game version from server version string
export const normalizeMinecraftVersion = (rawVersion?: string): string => {
  if (!rawVersion) return "1.21.4";
  const trimmed = String(rawVersion).trim();
  if (trimmed.startsWith("26")) return "1.21.4";
  if (trimmed.toLowerCase() === "latest") return "1.21.4";
  return trimmed;
};

// Format bytes into human-readable string
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

// Check if a Modrinth version is compatible with server software and game version
export const isVersionCompatible = (
  version: ModrinthFileVersion,
  serverType: string,
  serverVersion: string
): boolean => {
  const st = (serverType || "").toUpperCase();
  const normalizedGameVer = normalizeMinecraftVersion(serverVersion);
  const minorGameVer = normalizedGameVer.split(".").slice(0, 2).join(".");

  const isMod = ["FABRIC", "FORGE", "NEOFORGE", "QUILT"].includes(st);
  const compatibleLoaders = isMod
    ? (st === "QUILT" ? ["quilt", "fabric"] : [st.toLowerCase()])
    : ["paper", "spigot", "purpur", "bukkit", "folia"];

  // Check loaders
  const loaderMatch = Array.isArray(version.loaders) &&
    version.loaders.some(l => compatibleLoaders.includes(l.toLowerCase()));

  if (!loaderMatch) return false;

  // Check game version (exact match or minor version match e.g. 1.21)
  const gameMatch = Array.isArray(version.game_versions) &&
    (version.game_versions.includes(normalizedGameVer) ||
     version.game_versions.some(gv => gv.startsWith(minorGameVer)));

  return Boolean(gameMatch);
};
