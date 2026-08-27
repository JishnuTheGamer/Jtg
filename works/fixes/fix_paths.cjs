const fs = require('fs');

const file = "src/server/controllers/servers.ts";
let text = fs.readFileSync(file, 'utf8');

text = text.replace(/path\.join\(process\.cwd\(\), "\.data", "servers", id\)/g, 'path.resolve(process.cwd(), ".data", "servers", id)');
text = text.replace(/path\.join\(process\.cwd\(\), "\.data", "backups", id\)/g, 'path.resolve(process.cwd(), ".data", "backups", id)');

// Fix startsWith check to include path.sep or exact match
text = text.replace(/(![\w]+)\.startsWith\(([\w]+)\)/g, (match, notTarget, base) => {
    return `(${notTarget}.startsWith(${base} + path.sep) && ${notTarget.substring(1)} !== ${base})`;
});

// The above regex might be tricky. Let's do it simply by adding a trailing separator to the base path comparison.
// Or just leave it as is if it's acceptable? No, "1234".startsWith("123") is a real vulnerability.
