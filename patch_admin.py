import re

with open("src/pages/AdminSettingsPage.tsx", "r") as f:
    content = f.read()

# Wrap <section id="runtime" ...> ... </section>
pattern = r'(<section id="runtime".*?</section>)'
replacement = r"""{window.location.port === '3000' && (
\1
)}"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open("src/pages/AdminSettingsPage.tsx", "w") as f:
    f.write(content)
