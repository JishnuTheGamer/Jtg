module.exports = {
  apps: [
    {
      name: "jtg-main",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: { NODE_ENV: "production", PORT: 6767 }
    },
    {
      name: "jtg-admin",
      script: "npm",
      args: "run dev",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: { NODE_ENV: "development", PORT: 3000 }
    }
  ]
};
