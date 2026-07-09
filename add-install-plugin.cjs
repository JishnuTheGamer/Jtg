const fs = require('fs');

let controllers = fs.readFileSync('src/server/controllers/servers.ts', 'utf8');

if (!controllers.includes('export const installPlugin')) {
  const code = `
export const installPlugin = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { downloadUrl, filename } = req.body;
  if (!downloadUrl || !filename) {
    return res.status(400).json({ error: "Missing downloadUrl or filename" });
  }

  try {
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    const pluginsDir = path.join(serverDir, "plugins");
    await fs.ensureDir(pluginsDir);
    const filePath = path.join(pluginsDir, filename);

    const axios = require('axios');
    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    res.json({ success: true, message: "Plugin installed successfully" });
  } catch (error: any) {
    console.error("Plugin installation failed:", error);
    res.status(500).json({ error: "Plugin installation failed" });
  }
};
`;
  controllers += code;
  fs.writeFileSync('src/server/controllers/servers.ts', controllers);
}
