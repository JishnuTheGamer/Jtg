const fs = require('fs');
const p = 'src/components/ServerBackups.tsx';
let content = fs.readFileSync(p, 'utf8');

const target = `  const handleDownload = (filename: string) => {
    const token = safeStorage.getItem("jtg_token") || safeStorage.getItem("token");
    const downloadUrl = \`/api/servers/\${serverId}/backups/\${encodeURIComponent(filename)}\${token ? \`?token=\${encodeURIComponent(token)}\` : ""}\`;
    
    setStatusMsg({ text: \`Downloading \${filename}...\`, type: "success" });

    // Native browser download trigger using hidden anchor element
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };`;

const replacement = `  const handleDownload = async (filename: string) => {
    setStatusMsg({ text: \`Downloading \${filename}... Please wait, this may take a moment.\`, type: "success" });
    try {
      const response = await axios.get(\`/api/servers/\${serverId}/backups/\${encodeURIComponent(filename)}\`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setStatusMsg({ text: \`Download complete: \${filename}\`, type: "success" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: \`Failed to download: \${err.message}\`, type: "error" });
    }
  };`;

content = content.replace(target, replacement);
fs.writeFileSync(p, content, 'utf8');
