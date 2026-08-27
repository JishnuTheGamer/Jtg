const fs = require('fs');

function fixFile(file) {
    let text = fs.readFileSync(file, 'utf8');
    
    if (file.includes('ServerConsole.tsx')) {
        text = text.replace(
            "await axios.post(`/api/servers/${server.id}/action`, { action });",
            "await axios.post(`/api/servers/${server.id}/${action}`);"
        );
        text = text.replace(
            "setLogs((p) => [...p, `[System Error] Failed to ${action} server`]);",
            "setLogs((p) => [...p, `[System Error] Failed to ${action} server. Reason: ${error.response?.data?.error || error.message}`]);"
        );
    }
    
    if (file.includes('ServerView.tsx')) {
        text = text.replace(
            "await axios.post(`/api/servers/${server.id}/action`, { action });",
            "await axios.post(`/api/servers/${server.id}/${action}`);"
        );
    }
    
    fs.writeFileSync(file, text);
}

fixFile("src/components/ServerConsole.tsx");
fixFile("src/pages/ServerView.tsx");

