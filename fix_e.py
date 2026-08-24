import re
content = open('src/pages/SettingsPage.tsx').read()
content = content.replace('e=>', '(e: any)=>')
open('src/pages/SettingsPage.tsx', 'w').write(content)
