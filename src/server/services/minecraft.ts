import axios from 'axios';
import fs from 'fs-extra';
export { getJavaVersionForMinecraft } from '../../utils/minecraftJava.js';

export const getDockerImageForJava = (javaVersion: string) => {
  if (javaVersion === "26") return "ghcr.io/pterodactyl/yolks:java_26";
  if (javaVersion === "25") return "ghcr.io/pterodactyl/yolks:java_25";
  if (javaVersion === "21") return "ghcr.io/pterodactyl/yolks:java_21";
  if (javaVersion === "17") return "ghcr.io/pterodactyl/yolks:java_17";
  if (javaVersion === "16") return "ghcr.io/pterodactyl/yolks:java_16";
  if (javaVersion === "11") return "ghcr.io/pterodactyl/yolks:java_11";
  if (javaVersion === "8") return "ghcr.io/pterodactyl/yolks:java_8";
  return "ghcr.io/pterodactyl/yolks:java_25";
};

export const getStartupCommand = (software: string, memory: number, jarName: string) => {
  return `java -Xms128M -Xmx${memory}G -jar ${jarName} --nogui`;
};
