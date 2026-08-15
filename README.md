# JTG Panel 🚀

Welcome to **JTG Panel**, a game server management & container orchestration platform built for Minecraft and generic game servers.

**Created & Maintained by [Jishnu](https://github.com/)**  
**Version:** `v3.0.0`

---

## ✨ Features
- ⚡ **Dual Runtime Modes**: Run servers natively via host processes or isolated Docker containers (`itzg/minecraft-server`, generic node/python images).
- ☕ **Multi-Version Java Engine**: Built-in support for Java 8, 11, 16, 17, and 21 with automatic version detection.
- 📡 **Telemetry & Nodes**: Live CPU, RAM, and Disk telemetry graphs and support for Pterodactyl Wings daemons.
- 🌐 **Built-in Playit.gg Tunnels**: Allocate public IPs and custom hostnames without opening router ports.
- 💻 **Real-Time Web Terminal**: WebSocket console stream with color-coded log parsing and live command execution.
- 📁 **Complete File Manager**: Web-based file explorer, syntax-highlighted code editor, zip/unzip, and SFTP support.
- 🔄 **One-Click Updates**: Automated background self-updating script (`update.sh`).

---

## 📦 Quick Installation

Run the automated installer on your VPS / Linux machine:
```bash
bash install.sh
```
This opens an interactive menu that sets up all dependencies (Node.js, Docker, Java runtimes, firewall rules) and creates your initial Administrator credentials.

---

## 🔄 Updating
To pull the latest changes and update the panel, simply run:
```bash
bash update.sh
```

---

## 🗑️ Uninstallation
To uninstall the panel while safely preserving your game server worlds and files in `.data/`:
```bash
bash uninstall.sh
```

---

## 📄 License & Attribution

This project is licensed under the **MIT License** with attribution requirements.

> **Important**: You are free to use, modify, host, and distribute this project, but you **MUST give proper attribution and credit to the original author (Jishnu / JTG Panel)** in all copies or derivative works.

See the [LICENSE](./LICENSE) file for complete license terms.

