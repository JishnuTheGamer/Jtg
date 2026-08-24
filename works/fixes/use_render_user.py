import re

content = open('src/pages/SettingsPage.tsx').read()
content = re.sub(r'\{users\.map\(\(u: any\): React\.ReactNode => \((.*?)\)\)\}', '{users.map(renderUser)}', content, flags=re.DOTALL)
open('src/pages/SettingsPage.tsx', 'w').write(content)
