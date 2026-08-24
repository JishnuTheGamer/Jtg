import re
content = open('src/pages/SettingsPage.tsx').read()
content = content.replace('users.map(u => (', 'users.map((u: any) => (')
open('src/pages/SettingsPage.tsx', 'w').write(content)
