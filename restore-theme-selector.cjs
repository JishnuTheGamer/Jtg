const fs = require('fs');
const path = 'src/pages/SettingsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/50 border border-border-subtle">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Cinematic Login Intro</h3>`;

const insertion = `              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/50 border border-border-subtle">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Theme Preference</h3>
                  <p className="text-xs text-muted-foreground mt-1">Switch between dark and light themes.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setNewTheme("dark");
                      try {
                        await axios.put("/api/system/settings", { theme: "dark" });
                        fetchSettings();
                      } catch (err) {}
                    }}
                    className={\`px-3 py-1 text-xs font-semibold rounded-lg transition-all \${newTheme === "dark" ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}\`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={async () => {
                      setNewTheme("light");
                      try {
                        await axios.put("/api/system/settings", { theme: "light" });
                        fetchSettings();
                      } catch (err) {}
                    }}
                    className={\`px-3 py-1 text-xs font-semibold rounded-lg transition-all \${newTheme === "light" ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}\`}
                  >
                    Light
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/50 border border-border-subtle">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Cinematic Login Intro</h3>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, insertion);
  fs.writeFileSync(path, content);
  console.log('Restored theme selector!');
} else {
  console.log('Target not found!');
}
