const fs = require('fs-extra');
async function test() {
  const users = await fs.readJson('.data/users.json').catch(() => []);
  const hasOwner = users.some(u => u.role === 'owner');
  console.log("Has Owner?", hasOwner);
}
test();
