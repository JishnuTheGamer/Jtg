# DTG PANEL

DTG PANEL is a modern game-server management panel for Minecraft and other Node.js, Python, and proxy workloads.

## Features

- Docker-first server runtime with optional Local Process runtime.
- Explicit development sandbox mode via `SANDBOX_MODE=true`.
- Minecraft, Paper, Fabric, Forge, Velocity, BungeeCord, Node.js, and Python support.
- Pterodactyl Wings node management with health checks and selectable deployment nodes.
- Live and historical server logs, terminal commands, files, backups, plugins, and mods.
- Deployment expiry dates and unlimited built-in node resources with `0` limits.
- Hyper V1 theme, custom accent colors, gradients, and blueprint background controls.
- Database overview for panel JSON data.
- Firebase Google authentication and optional Discord OAuth.

Internal repository and service identifiers remain compatible with existing installations.

## Quick Setup

The installer checks Node.js, Docker, PM2, dependencies, builds the panel, and starts the production service on port `6767`.

```bash
bash install.sh
```

Other management scripts:

```bash
bash update.sh
bash uninstall.sh
```

---

## Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JishnuTheGamer/Jtg.git
   cd Jtg
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Create an admin user:
   ```bash
   npm run createuser
   ```

5. Start the server on port `6767`:
   ```bash
   npm run start
   ```

## Development

To run the panel in development mode on port 3000:

```bash
npm run dev
```

The development panel is available at `http://127.0.0.1:3000`.

## Runtime Configuration

Docker is selected automatically when the Docker socket is available. To explicitly use sandbox simulation for development only:

```bash
SANDBOX_MODE=true npm run dev
```

Set `ENABLE_DOCKER=false` to disable Docker detection. The default runtime can also be changed from **Admin Settings > Runtime**.

## Optional Authentication

Google login requires Firebase web-app credentials configured in **Admin Settings > Authentication**.

Discord login requires these environment variables on the server:

```bash
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://panel.example.com/api/auth/discord/callback
```

The Discord Client ID and redirect URI are configured in the admin panel. Never store the Discord client secret in frontend settings.

## Ports

| Port | Purpose |
| --- | --- |
| `6767` | Production panel |
| `3000` | Development panel |
| `6868` | SFTP service |

