const fs = require('fs');
const p = 'src/components/FileManager.tsx';
let content = fs.readFileSync(p, 'utf8');

const target1 = `  const handleDownload = (itemName: string, isDirectory: boolean) => {
    const p = path.endsWith("/") ? path : path + "/";
    const fullPath = p + itemName;
    const token = safeStorage.getItem("jtg_token") || safeStorage.getItem("token");
    setOpenMenuRow(null);

    showToast(\`Downloading \${isDirectory ? itemName + ".zip" : itemName}...\`, "success");
    const downloadUrl = \`/api/servers/\${serverId}/files/download?path=\${encodeURIComponent(fullPath)}\${token ? \`&token=\${encodeURIComponent(token)}\` : ""}\`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = isDirectory ? \`\${itemName}.zip\` : itemName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };`;

const replace1 = `  const handleDownload = async (itemName: string, isDirectory: boolean) => {
    const p = path.endsWith("/") ? path : path + "/";
    const fullPath = p + itemName;
    setOpenMenuRow(null);

    const downloadName = isDirectory ? \`\${itemName}.zip\` : itemName;
    showToast(\`Downloading \${downloadName} (this may take a moment)...\`, "success");
    
    try {
      const response = await axios.get(\`/api/servers/\${serverId}/files/download?path=\${encodeURIComponent(fullPath)}\`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error(err);
      showToast(\`Failed to download: \${err.message}\`, "error");
    }
  };`;

const target2 = `  const handleDownloadSelected = () => {
    if (selectedFiles.size === 0) return;
    const p = path.endsWith("/") ? path : path + "/";
    const selectedList = Array.from(selectedFiles);
    
    if (selectedList.length === 1) {
      const item = files.find(f => f.name === selectedList[0]);
      handleDownload(selectedList[0], item?.isDirectory || false);
      return;
    }

    const token = safeStorage.getItem("jtg_token") || safeStorage.getItem("token");
    showToast(\`Preparing download for \${selectedList.length} items...\`, "success");
    const queryPaths = selectedList.map(name => encodeURIComponent(p + name)).join("&paths=");
    const downloadUrl = \`/api/servers/\${serverId}/files/download?paths=\${queryPaths}\${token ? \`&token=\${encodeURIComponent(token)}\` : ""}\`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = \`files-archive-\${Date.now()}.zip\`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };`;

const replace2 = `  const handleDownloadSelected = async () => {
    if (selectedFiles.size === 0) return;
    const p = path.endsWith("/") ? path : path + "/";
    const selectedList = Array.from(selectedFiles);
    
    if (selectedList.length === 1) {
      const item = files.find(f => f.name === selectedList[0]);
      handleDownload(selectedList[0], item?.isDirectory || false);
      return;
    }

    const downloadName = \`files-archive-\${Date.now()}.zip\`;
    showToast(\`Preparing download for \${selectedList.length} items (this may take a moment)...\`, "success");
    
    try {
      const queryPaths = selectedList.map(name => encodeURIComponent(p + name)).join("&paths=");
      const response = await axios.get(\`/api/servers/\${serverId}/files/download?paths=\${queryPaths}\`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error(err);
      showToast(\`Failed to download: \${err.message}\`, "error");
    }
  };`;

if (content.includes("handleDownload = (itemName: string")) {
  content = content.replace(target1, replace1);
  content = content.replace(target2, replace2);
  fs.writeFileSync(p, content, 'utf8');
  console.log("Successfully patched FileManager.tsx");
} else {
  console.log("Could not find targets in FileManager.tsx");
}
