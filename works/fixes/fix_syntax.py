import re
content = open('src/pages/SettingsPage.tsx').read()

def wrap(func_name):
    global content
    idx = content.find(f'const {func_name} = () => (\n    {{user.role')
    if idx != -1:
        content = content[:idx] + f'const {func_name} = () => (\n    <>\n    {{user.role' + content[idx + len(f'const {func_name} = () => (\n    {{user.role'):]
        idx2 = content.find('  );\n', idx)
        # Find the last } before idx2
        idx3 = content.rfind('}', idx, idx2)
        content = content[:idx3+1] + '\n    </>' + content[idx3+1:]

wrap('renderBackgroundConfig')
wrap('renderGoogleFirebase')
wrap('renderAdminControls')

open('src/pages/SettingsPage.tsx', 'w').write(content)
