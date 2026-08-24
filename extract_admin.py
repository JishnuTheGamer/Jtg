import re
content = open('src/pages/SettingsPage.tsx').read()

admin_controls_func = re.search(r'function AdminControls.*?return \(.*?\n  \);\n}', content, flags=re.DOTALL).group(0)

new_content = content.replace(admin_controls_func, '')
open('src/pages/SettingsPage.tsx', 'w').write(new_content)

admin_file = f"""import React from 'react';
import {{ Shield, Trash2 }} from 'lucide-react';

export default {admin_controls_func}
"""
open('src/components/AdminControls.tsx', 'w').write(admin_file)

import_statement = "import AdminControls from '../components/AdminControls';\n"
new_content = import_statement + new_content
open('src/pages/SettingsPage.tsx', 'w').write(new_content)
