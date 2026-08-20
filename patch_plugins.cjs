const fs = require('fs');

let serverCode = fs.readFileSync('src/server/controllers/servers.ts', 'utf8');

// Replace the !downloadUrl block
serverCode = serverCode.replace(
  '    if (!downloadUrl) {\n      return res.status(404).json({ error: `Could not find a valid download URL for ${pluginName}. Please try installing via Modrinth or uploading the JAR manually in File Manager.` });\n    }',
  `    if (!downloadUrl) {
      let extUrl = "";
      if (source === 'spigot') extUrl = \`https://www.spigotmc.org/resources/\${pluginId}\`;
      else if (source === 'modrinth') extUrl = \`https://modrinth.com/project/\${pluginId}\`;
      else if (source === 'hangar') extUrl = \`https://hangar.papermc.io/\${pluginId}\`;
      return res.status(404).json({ error: \`Download URL not found for \${pluginName}. Please download manually.\`, externalLink: extUrl });
    }`
);

// Add try-catch around the download stream
serverCode = serverCode.replace(
  `    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 30000,
      headers: commonHeaders
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    res.json({ success: true, message: \`\${pluginName} installed successfully!\` });
  } catch (e: any) {
    console.error("Plugin installation failed:", e.message || e);
    res.status(500).json({ error: "Failed to install plugin: " + (e.message || "Unknown error") });
  }
};`,
  `    try {
      const response = await axios({
        url: downloadUrl,
        method: 'GET',
        responseType: 'stream',
        maxRedirects: 5,
        timeout: 30000,
        headers: commonHeaders
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      res.json({ success: true, message: \`\${pluginName} installed successfully!\` });
    } catch(dlErr: any) {
      console.error("Plugin stream download failed:", dlErr.message);
      let extUrl = "";
      if (source === 'spigot') extUrl = \`https://www.spigotmc.org/resources/\${pluginId}\`;
      else if (source === 'modrinth') extUrl = \`https://modrinth.com/project/\${pluginId}\`;
      else if (source === 'hangar') extUrl = \`https://hangar.papermc.io/\${pluginId}\`;
      return res.status(404).json({ error: \`Download failed for \${pluginName}. Please download manually.\`, externalLink: extUrl });
    }
  } catch (e: any) {
    console.error("Plugin installation failed:", e.message || e);
    res.status(500).json({ error: "Failed to install plugin: " + (e.message || "Unknown error") });
  }
};`
);

fs.writeFileSync('src/server/controllers/servers.ts', serverCode);

let clientCode = fs.readFileSync('src/components/PluginManager.tsx', 'utf8');

clientCode = clientCode.replace(
  'const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);',
  'const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error"; externalLink?: string } | null>(null);'
);

clientCode = clientCode.replace(
  `    } catch (e: any) {
      setStatusMsg({
        text: e.response?.data?.error || "Failed to install plugin.",
        type: "error"
      });
    } finally {`,
  `    } catch (e: any) {
      setStatusMsg({
        text: e.response?.data?.error || "Failed to install plugin.",
        type: "error",
        externalLink: e.response?.data?.externalLink
      });
    } finally {`
);

clientCode = clientCode.replace(
  `          <div className={\`p-4 rounded-xl border text-sm flex items-center justify-between \${
            statusMsg.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }\`}>
            <div className="flex items-center">
              {statusMsg.type === "success" ? <Check size={16} className="mr-2" /> : <AlertTriangle size={16} className="mr-2" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-xs opacity-70 hover:opacity-100 ml-3">Dismiss</button>
          </div>`,
  `          <div className={\`p-4 rounded-xl border text-sm flex items-center justify-between \${
            statusMsg.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }\`}>
            <div className="flex items-center">
              {statusMsg.type === "success" ? <Check size={16} className="mr-2" /> : <AlertTriangle size={16} className="mr-2" />}
              <span>{statusMsg.text}</span>
              {statusMsg.externalLink && (
                <a href={statusMsg.externalLink} target="_blank" rel="noreferrer" className="ml-3 underline text-rose-300 hover:text-white font-semibold">
                  Download Manually
                </a>
              )}
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-xs opacity-70 hover:opacity-100 ml-3 shrink-0">Dismiss</button>
          </div>`
);

fs.writeFileSync('src/components/PluginManager.tsx', clientCode);
