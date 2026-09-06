import re

with open("src/server/controllers/servers.ts", "r") as f:
    content = f.read()

pattern = r"  const \{ name, ram, port, version, theme, cpu, disk, owner, ownerId, ipAlias, type, nodeId, runtimeType \} = req\.body;"
replacement = r"""  let { name, ram, port, version, theme, cpu, disk, owner, ownerId, ipAlias, type, nodeId, runtimeType } = req.body;
  const settings = await readJSON("settings.json") || {};
  if (process.env.PORT !== "3000") {
    // If running on Main Panel, enforce the locked default runtime
    runtimeType = settings.defaultRuntime || "docker";
  }"""

content = re.sub(pattern, replacement, content)

with open("src/server/controllers/servers.ts", "w") as f:
    f.write(content)
