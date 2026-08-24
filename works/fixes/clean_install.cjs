const fs = require('fs');
let content = fs.readFileSync('install.sh', 'utf-8');

const startIdx = content.indexOf('setup_dev_panel() {');
if (startIdx !== -1) {
    const endStr = '\n}\n\n# Main menu loop';
    const endIdx = content.indexOf(endStr, startIdx);
    if (endIdx !== -1) {
        content = content.slice(0, startIdx) + '# Main menu loop' + content.slice(endIdx + endStr.length - 16); 
    }
}
fs.writeFileSync('install.sh', content);
console.log("Cleaned install.sh");
