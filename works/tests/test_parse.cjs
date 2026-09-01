const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const parser = acorn.Parser.extend(jsx());

const code = fs.readFileSync('src/components/ServerConsole.tsx', 'utf8');

try {
  parser.parse(code, { sourceType: 'module', ecmaVersion: 2020 });
  console.log("Parse OK");
} catch (e) {
  console.error("Parse Error:", e.message);
}
