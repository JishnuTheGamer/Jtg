const fs = require('fs');
let content = fs.readFileSync('install.sh', 'utf-8');

const regex = /setup_dev_panel\(\) \{[\s\S]*?\n\}\n\n# Main menu loop/;
content = content.replace(regex, '# Main menu loop');

fs.writeFileSync('install.sh', content);
console.log("Regex Cleaned install.sh");
