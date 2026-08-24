import re
content = open('src/pages/SettingsPage.tsx').read()
content = content.replace('users.map((u: any) => (', 'users.map((u: any): React.ReactNode => (')
open('src/pages/SettingsPage.tsx', 'w').write(content)
