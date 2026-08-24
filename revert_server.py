import re

def rep(filename, old, new):
    c = open(filename).read()
    open(filename, 'w').write(c.replace(old, new))

rep('src/server/controllers/auth.ts', '_req, res', 'req, res')
rep('src/server/controllers/auth.ts', '(_name)', '(name)')
rep('src/server/controllers/auth.ts', '_req: Request,', 'req: Request,')

rep('src/server/routes/api-keys.ts', '_req, res', 'req, res')
rep('src/server/routes/api.ts', '_req: Request', 'req: Request')
rep('src/server/routes/nodes.ts', '_req, res', 'req, res')

c = open('src/server/routes/servers.ts').read()
c = c.replace('_err,', 'err,').replace('_err)', 'err)').replace('_stdout, _stderr', 'stdout, stderr')
c = c.replace('_logStderr', 'logStderr')
open('src/server/routes/servers.ts', 'w').write(c)

rep('src/server/routes/system.ts', '_req, res', 'req, res')
rep('src/server/routes/system.ts', '_error)', 'error)')

rep('src/server/services/docker.ts', '_chunk =>', 'chunk =>')

c = open('src/server/services/sftp.ts').read()
c = c.replace('_reject)', 'reject)')
c = c.replace('_userDir,', 'userDir,')
c = c.replace('_filename, _flags, _attrs', 'filename, flags, attrs')
c = c.replace('_handle)', 'handle)')
c = c.replace('_path)', 'path)')
c = c.replace('_err)', 'err)')
open('src/server/services/sftp.ts', 'w').write(c)
