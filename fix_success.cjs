const fs = require('fs');

const file = "src/components/ServerConsole.tsx";
let text = fs.readFileSync(file, 'utf8');

if (!text.includes("successfully`]);")) {
    text = text.replace(
        "await axios.post(`/api/servers/${server.id}/${action}`);",
        "await axios.post(`/api/servers/${server.id}/${action}`);\n      setLogs((p) => [...p, `[System] Server ${action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarted'} successfully`]);"
    );
    fs.writeFileSync(file, text);
    console.log("Added success log.");
} else {
    console.log("Success log already exists.");
}
