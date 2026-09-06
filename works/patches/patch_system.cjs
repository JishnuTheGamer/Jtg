const fs = require('fs');

let content = fs.readFileSync('src/server/routes/system.ts', 'utf-8');

// POST /users
content = content.replace(
  /router\.post\("\/users", async \(req, res\) => {[\s\S]*?const { username, password, role } = req\.body;/m,
  `router.post("/users", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const { username, password, role } = req.body;
  
  if (role === "owner") return res.status(403).json({ error: "Cannot create owner from panel" });
  if (user.role === "admin" && role === "admin") return res.status(403).json({ error: "Admin cannot create Admin" });`
);

// DELETE /users/:id
content = content.replace(
  /router\.delete\("\/users\/:id", async \(req, res\) => {[\s\S]*?let users = await readJSON\("users\.json"\) \|\| \[\];/m,
  `router.delete("/users/:id", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
    
  let users = await readJSON("users.json") || [];
  const targetUser = users.find((u: any) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: "User not found" });
  if (targetUser.role === "owner") return res.status(403).json({ error: "Cannot delete owner" });
  if (user.role === "admin" && targetUser.role === "admin") return res.status(403).json({ error: "Admin cannot delete Admin" });`
);

// PUT /users/:id/password
content = content.replace(
  /router\.put\("\/users\/:id\/password", async \(req, res\) => {[\s\S]*?const targetIndex = users\.findIndex\(\(u: any\) => u\.id === req\.params\.id\);/m,
  `router.put("/users/:id/password", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
    
  const users = await readJSON("users.json") || [];
  const targetIndex = users.findIndex((u: any) => u.id === req.params.id);
  if (targetIndex === -1) return res.status(404).json({ error: "User not found" });
  if (users[targetIndex].role === "owner") return res.status(403).json({ error: "Cannot modify owner" });
  if (user.role === "admin" && users[targetIndex].role === "admin") return res.status(403).json({ error: "Admin cannot modify Admin" });`
);

fs.writeFileSync('src/server/routes/system.ts', content);
