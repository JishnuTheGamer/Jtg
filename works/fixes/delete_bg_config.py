import re
content = open('src/pages/SettingsPage.tsx').read()
content = re.sub(r'const renderBackgroundConfig = \(\) => \(\s*\);', '', content)
content = content.replace('{renderBackgroundConfig()}', '')
open('src/pages/SettingsPage.tsx', 'w').write(content)
