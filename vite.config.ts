import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const viteBasePath = process.env.VITE_BASE_PATH || "/";

  return {
    plugins: [react(), tailwindcss()],
    base: viteBasePath,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      'process.env': {}
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: true,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: { usePolling: true },
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});

