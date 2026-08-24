import re
files = ['src/server/routes/api-keys.ts', 'src/server/routes/nodes.ts', 'src/server/services/sftp.ts']
for f in files:
    c = open(f).read()
    c = c.replace('_req, res', 'req, res')
    c = c.replace('catch (_err)', 'catch (err)')
    open(f, 'w').write(c)
