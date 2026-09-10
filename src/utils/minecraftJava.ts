// Helper for Minecraft Java Version detection and labels
export const getJavaVersionForMinecraft = (version?: string, software?: string): string => {
  if (!version) return "25";
  const ver = String(version).trim();
  const sw = (software || "PAPER").toUpperCase();

  if (["NODEJS", "NODE", "PYTHON", "PYTHON3"].includes(sw)) {
    return "";
  }

  // Paper 26.x or Minecraft 26.x (Latest Paper Version): Java 25 or 26
  if (ver.startsWith("26")) {
    return "25";
  }

  // Minecraft 1.21.x and 1.20.5+ requires Java 21
  if (
    ver.startsWith("1.21") ||
    ver === "1.20.5" ||
    ver === "1.20.6" ||
    (ver.startsWith("1.20.") && parseInt(ver.split(".")[2] || "0", 10) >= 5)
  ) {
    return "21";
  }

  // Minecraft 1.18.x to 1.20.4 requires Java 17
  if (ver.startsWith("1.18") || ver.startsWith("1.19") || ver.startsWith("1.20")) {
    return "17";
  }

  // Minecraft 1.17.x requires Java 16
  if (ver.startsWith("1.17")) {
    return "16";
  }

  // Minecraft 1.13.x to 1.16.x recommends Java 11 (or 8)
  if (
    ver.startsWith("1.16") ||
    ver.startsWith("1.15") ||
    ver.startsWith("1.14") ||
    ver.startsWith("1.13")
  ) {
    return "11";
  }

  // Minecraft 1.12.2 and older (1.12, 1.11, 1.10, 1.9, 1.8, 1.7) MUST use Java 8
  if (
    ver.startsWith("1.12") ||
    ver.startsWith("1.11") ||
    ver.startsWith("1.10") ||
    ver.startsWith("1.9") ||
    ver.startsWith("1.8") ||
    ver.startsWith("1.7")
  ) {
    return "8";
  }

  // Proxy software
  if (["VELOCITY"].includes(sw)) {
    return "21";
  }
  if (["BUNGEECORD", "WATERFALL"].includes(sw)) {
    return "17";
  }

  return "21";
};

export const JAVA_VERSION_OPTIONS = [
  { value: "", label: "Auto-detect (Recommended)" },
  { value: "26", label: "Java 26 (Latest JDK)" },
  { value: "25", label: "Java 25 (Required for Paper 26.x)" },
  { value: "21", label: "Java 21 (LTS • Recommended for 1.20.5 - 1.21.x)" },
  { value: "17", label: "Java 17 (LTS • Recommended for 1.18 - 1.20.4)" },
  { value: "16", label: "Java 16 (Recommended for 1.17)" },
  { value: "11", label: "Java 11 (Recommended for 1.13 - 1.16)" },
  { value: "8", label: "Java 8 (Legacy • Required for 1.12.2 & below)" }
];
