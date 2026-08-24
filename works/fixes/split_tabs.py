import re

content = open('src/pages/SettingsPage.tsx').read()

# I will write a function to extract a section based on its comment or start.
def extract_section(name, tab_name):
    # e.g. {activeTab === 'appearance' && ( ... )}
    pattern = r"\{activeTab === '" + tab_name + r"' && \(\s*(<div className=\"space-y-6 lg:space-y-8 animate-fade-in\">.*?</form>\s*</div>)\s*\)\}"
    match = re.search(pattern, content, flags=re.DOTALL)
    if not match:
        print(f"Could not find {tab_name}")
        return None
    return match.group(1)

appearance_section = extract_section('Appearance', 'appearance')
if appearance_section:
    print("Found appearance")

