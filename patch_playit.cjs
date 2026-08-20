const fs = require('fs');
let code = fs.readFileSync('src/pages/PlayitTunnel.tsx', 'utf8');

code = code.replace(
  '<Globe className="w-5 h-5" /> Local Process Playit (Beta / Coming Soon)',
  '<Globe className="w-5 h-5" /> Local Node (Beta Version)'
);

code = code.replace(
  'Playit / Play Tunnel integration for Local Process servers is currently in Beta and temporarily disabled. \n              The host-side execution path is still under development to ensure it safely routes traffic directly to the host process rather than a Docker container.',
  'Playit Tunnel integration for Local Process servers is currently in beta testing. This feature is under active development.'
);
code = code.replace(
  'Playit / Play Tunnel integration for Local Process servers is currently in Beta and temporarily disabled. \n              The host-side execution path is still under development to ensure it safely routes traffic directly to the host process rather than a Docker container.',
  'Playit Tunnel integration for Local Process servers is currently in beta testing. This feature is under active development.'
);

// If there are space formatting issues
code = code.replace(
  /<p className="text-theme-600\/80 text-sm">[\s\S]*?<\/p>/,
  '<p className="text-theme-600/80 text-sm">Playit Tunnel integration for Local Process servers is currently in beta testing.</p>'
);


fs.writeFileSync('src/pages/PlayitTunnel.tsx', code);
