const fs = require('fs');
let text = fs.readFileSync("src/components/ServerConsole.tsx", "utf8");

// Remove the old uptime hook and replace it with new logic inside the component.
const formatSize = (mb) => {
  if (mb < 1024) return \`\${mb.toFixed(2)} MB\`;
  return \`\${(mb / 1024).toFixed(2)} GB\`;
};

const formatRate = (bytes) => {
  if (bytes < 1024 * 1024) return \`\${(bytes / 1024).toFixed(1)} KB/s\`;
  return \`\${(bytes / 1024 / 1024).toFixed(1)} MB/s\`;
};

// We will inject some code into the main component. 
// We will replace the entire file with a new updated version since there are multiple scattered changes.

