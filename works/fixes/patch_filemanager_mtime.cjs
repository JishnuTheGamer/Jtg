const fs = require('fs');

const file = "src/components/FileManager.tsx";
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  /interface FileItem \{\n  name: string;\n  isDirectory: boolean;\n  size: number;\n\}/g,
  `interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  mtime?: string;
}`
);

text = text.replace(
  /\{f\.isDirectory \? "Folder" : \`\$\{\(f\.size \/ 1024\)\.toFixed\(1\)\} KB\`\}/g,
  `{f.isDirectory ? "Folder" : \`\${(f.size / 1024).toFixed(1)} KB\`}
                        <br />
                        <span className="text-[10px] text-slate-500">{f.mtime ? new Date(f.mtime).toLocaleString() : ''}</span>`
);

fs.writeFileSync(file, text);
console.log("Patched FileManager for mtime");
