const fs = require('fs');
let code = fs.readFileSync('src/components/ServerBackups.tsx', 'utf8');

code = code.replace(
  'const [isCreating, setIsCreating] = useState(false);',
  'const [isCreating, setIsCreating] = useState(false);\n  const [backupProgress, setBackupProgress] = useState(0);'
);

code = code.replace(
  `  const handleCreateBackup = async () => {
    setIsCreating(true);
    setStatusMsg(null);
    try {
      await axios.post(\`/api/servers/\${serverId}/backups\`);
      await fetchBackups();
      setStatusMsg({ text: "Backup created successfully.", type: "success" });
    } catch (e: any) {
      setStatusMsg({ text: e.response?.data?.error || "Failed to create backup.", type: "error" });
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };`,
  `  const handleCreateBackup = async () => {
    setIsCreating(true);
    setBackupProgress(0);
    setStatusMsg(null);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 95) return prev;
        return prev + 5;
      });
    }, 1000);
    try {
      await axios.post(\`/api/servers/\${serverId}/backups\`);
      setBackupProgress(100);
      await fetchBackups();
      setStatusMsg({ text: "Backup created successfully.", type: "success" });
    } catch (e: any) {
      setStatusMsg({ text: e.response?.data?.error || "Failed to create backup.", type: "error" });
      console.error(e);
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setIsCreating(false);
        setBackupProgress(0);
      }, 500);
    }
  };`
);

// We want to add the progress bar inside the Create Backup block:
code = code.replace(
  '        <div className="bg-muted-subtle border border-border-subtle p-5 md:p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">',
  `        <div className="bg-muted-subtle border border-border-subtle p-5 md:p-6 rounded-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
          {isCreating && (
            <div className="absolute bottom-0 left-0 h-1 bg-theme-600 transition-all duration-500 ease-out" style={{ width: \`\${backupProgress}%\` }} />
          )}`
);

// Also remove LoadingOverlay for backups so they can see the progress bar, or update it
code = code.replace(
  '          {(isCreating) && <LoadingOverlay />}',
  ''
);

fs.writeFileSync('src/components/ServerBackups.tsx', code);
