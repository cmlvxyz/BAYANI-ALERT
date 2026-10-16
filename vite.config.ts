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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Bind every interface (not just loopback) so the app is reachable from
      // other devices on the LAN — e.g. a phone opening http://<PC-IP>:4000.
      host: true,
      // Vite's host-check blocklist: accept raw LAN IPs and hostnames so the
      // phone can reach the dev server by IP address.
      allowedHosts: true as const,
    },
    preview: {
      host: true,
      allowedHosts: true as const,
    },
  };
});
