import re
import os

# auth.ts
f = 'src/server/controllers/auth.ts'
c = open(f).read()
c = re.sub(r'async \(req, res\) =>', 'async (_req, res) =>', c)
open(f, 'w').write(c)

# servers.ts
f = 'src/server/controllers/servers.ts'
c = open(f).read()
c = c.replace('let containerId: string = null;', 'let containerId: string | null = null;')
c = c.replace('const nodes = await readJSON("nodes.json") || [];\n  const node = nodes.find(s => s.id === req.body.nodeId);', 'const nodes = await readJSON("nodes.json") || [];\n  const node = nodes.find((s: any) => s.id === req.body.nodeId);')
open(f, 'w').write(c)

# api-keys.ts
f = 'src/server/routes/api-keys.ts'
c = open(f).read()
c = re.sub(r'async \(req, res\) =>', 'async (_req, res) =>', c)
open(f, 'w').write(c)

# api.ts
f = 'src/server/routes/api.ts'
c = open(f).read()
c = c.replace('import jwt from "jsonwebtoken";\n', '')
c = c.replace('req: Request', '_req: Request')
open(f, 'w').write(c)

# nodes.ts
f = 'src/server/routes/nodes.ts'
c = open(f).read()
c = c.replace('import fs from "fs-extra";\nimport path from "path";\n', '')
c = c.replace('async (req, res)', 'async (_req, res)')
open(f, 'w').write(c)

# servers.ts routes
f = 'src/server/routes/servers.ts'
c = open(f).read()
c = c.replace('exec(command, (err, stdout, stderr) => {', 'exec(command, (_err, _stdout, _stderr) => {')
c = c.replace('exec(`tar -czf /var/www/html/backups/${server.id}.tar.gz -C /var/www/html/pterodactyl/volumes/${server.id} .`, (err, stdout, logStderr) => {', 'exec(`tar -czf /var/www/html/backups/${server.id}.tar.gz -C /var/www/html/pterodactyl/volumes/${server.id} .`, (_err, _stdout, _logStderr) => {')
open(f, 'w').write(c)

# system.ts
f = 'src/server/routes/system.ts'
c = open(f).read()
c = c.replace('req: Request', '_req: Request')
c = c.replace('const cpus = os.cpus();\n', '')
c = c.replace('catch (error)', 'catch (_error)')
open(f, 'w').write(c)

# docker.ts
f = 'src/server/services/docker.ts'
c = open(f).read()
c = c.replace('const id = containerId.replace("mock-container-id-", "");\n    // Handled by client local echo', '// Handled by client local echo')
c = c.replace('stream.on("data", (chunk) =>', 'stream.on("data", (_chunk) =>')
open(f, 'w').write(c)

# sftp.ts
f = 'src/server/services/sftp.ts'
c = open(f).read()
c = c.replace('return new Promise((resolve, reject) => {', 'return new Promise((resolve, _reject) => {')
c = c.replace('const userDir = path.join("/var/lib/pterodactyl/volumes", server.id);\n', '')
c = c.replace('open(filename, flags, attrs) {', 'open(_filename, _flags, _attrs) {')
c = c.replace('opendir(path) {', 'opendir(_path) {')
c = c.replace('close(handle) {', 'close(_handle) {')
c = c.replace('lstat(path) {', 'lstat(_path) {')
c = c.replace('stat(path) {', 'stat(_path) {')
c = c.replace('read(handle, buffer, offset, length, position) {', 'read(_handle, _buffer, _offset, _length, _position) {')
c = c.replace('write(handle, buffer, offset, length, position) {', 'write(_handle, _buffer, _offset, _length, _position) {')
c = c.replace('remove(path) {', 'remove(_path) {')
c = c.replace('rename(oldPath, newPath) {', 'rename(_oldPath, _newPath) {')
c = c.replace('mkdir(path, attrs) {', 'mkdir(_path, _attrs) {')
c = c.replace('rmdir(path) {', 'rmdir(_path) {')
c = c.replace('realpath(path) {', 'realpath(_path) {')
c = c.replace('catch (err) {', 'catch (_err) {')
open(f, 'w').write(c)

