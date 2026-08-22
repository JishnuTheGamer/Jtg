import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["gtk.qzz.io"],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: true,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: { usePolling: true },
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: ["gtk.qzz.io"],
    },
  };
});
