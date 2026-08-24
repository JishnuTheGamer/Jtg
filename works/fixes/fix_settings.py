import re
content = open('src/pages/SettingsPage.tsx').read()
content = content.replace('onChange={(e) => setAdminUserNewPassword(e.target.value)}', 'onChange={(e: any) => setAdminUserNewPassword(e.target.value)}')
open('src/pages/SettingsPage.tsx', 'w').write(content)
