import axios from 'axios';
import fs from 'fs-extra';

export const getJavaVersionForMinecraft = (version: string, software: string) => {
  // Minecraft 1.16.x: Java 8 or 11
  // Minecraft 1.18.x - 1.20.4: Java 17
  // Minecraft 1.20.5+: Java 21
  if (version.startsWith("1.21") || version.startsWith("1.20.6") || version.startsWith("1.20.5")) {
    return "21";
  }
  if (version.startsWith("1.18") || version.startsWith("1.19") || version.startsWith("1.20")) {
    return "17";
  }
  if (version.startsWith("1.17")) {
    return "16";
  }
  return "11";
};

export const getDockerImageForJava = (javaVersion: string) => {
  if (javaVersion === "21") return "ghcr.io/pterodactyl/yolks:java_21";
  if (javaVersion === "17") return "ghcr.io/pterodactyl/yolks:java_17";
  if (javaVersion === "16") return "ghcr.io/pterodactyl/yolks:java_16";
  if (javaVersion === "11") return "ghcr.io/pterodactyl/yolks:java_11";
  if (javaVersion === "8") return "ghcr.io/pterodactyl/yolks:java_8";
  return "ghcr.io/pterodactyl/yolks:java_17";
};

export const getStartupCommand = (software: string, memory: number, jarName: string) => {
  return `java -Xms128M -Xmx${memory}G -jar ${jarName} --nogui`;
};
