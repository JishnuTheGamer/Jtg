const fs = require('fs');
const path = 'src/pages/Login.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\\\`.layer-\\\$\\{layerNum\\}\\\`/g, '`.layer-${layerNum}`');
content = content.replace(/\\\.layer-\\\$\\{layerNum\\}\\/g, '`.layer-${layerNum}`');
// Actually let's just do a blanket fix
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
fs.writeFileSync(path, content);
