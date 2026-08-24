import fs from "fs-extra";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

export const readJSON = async (filename: string) => {
  const filePath = path.join(DATA_DIR, filename);
  try {
    return await fs.readJson(filePath);
  } catch (err) {
    return null;
  }
};

export const writeJSON = async (filename: string, data: any) => {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeJson(filePath, data, { spaces: 2 });
};
