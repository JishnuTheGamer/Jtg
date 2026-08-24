# JTG Panel V2 - Works Workspace

This directory (`works/`) is dedicated to centralizing development work, debugging, testing, temporary investigation, repair scripts, verification scripts, diagnostics, and migration helpers. 

**IMPORTANT**: This folder must NOT contain any actual production or application code. The core application logic must remain in `src/`, `server/`, `scripts/` (for production/deployment), and the root configuration files.

## Structure

- `works/tests/`: Diagnostic tests, port checks, integration tests, and temporary reproduction scripts.
- `works/fixes/`: One-time repair scripts, configuration repair tools, and temporary patches.
- `works/debug/`: Diagnostic scripts, debug helpers, and troubleshooting utilities.
- `works/verify/`: Health checks, environment checks, and installation verification tools.
- `works/scripts/`: Development and maintenance helpers (non-production).
- `works/diagnostics/`: System diagnostics, environment reports.
- `works/migrations/`: Database and infrastructure migration helpers.
- `works/temporary/`: True scratchpad for temporary files (logs, dummy files). **Files here should be deleted when no longer needed.**

## Temporary File Policy
Any file placed in `works/temporary/` is considered strictly temporary. Please delete your temporary files when they are no longer useful to keep the workspace clean.
