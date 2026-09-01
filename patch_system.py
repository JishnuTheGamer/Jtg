import re

with open("src/server/routes/system.ts", "r") as f:
    content = f.read()

pattern = r"  if \(defaultRuntime !== undefined\) \{\n    settings\.defaultRuntime = defaultRuntime;\n  \}"

replacement = r"""  if (defaultRuntime !== undefined) {
    if (process.env.PORT !== "3000") {
      return res.status(403).json({ error: "Runtime switching is only allowed in the Developer Panel (Port 3000)"});
    }
    settings.defaultRuntime = defaultRuntime;
  }"""

content = re.sub(pattern, replacement, content)

with open("src/server/routes/system.ts", "w") as f:
    f.write(content)
