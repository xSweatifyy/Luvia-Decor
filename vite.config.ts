import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function copyCarrierLogos(): Plugin {
  return {
    name: 'copy-carrier-logos',
    closeBundle() {
      const root = fileURLToPath(new URL('./', import.meta.url));
      const dist = resolve(root, 'dist');
      const legacyDir = resolve(dist, 'loga-dopravci');
      mkdirSync(legacyDir, { recursive: true });
      // Keep root logo files available in the production output.
      copyFileSync(resolve(root, 'zasilkovna-logo.png'), resolve(dist, 'zasilkovna-logo.png'));
      copyFileSync(resolve(root, 'dpd-logo.png'), resolve(dist, 'dpd-logo.png'));
      copyFileSync(resolve(root, 'zasilkovna-logo.png'), resolve(legacyDir, 'zasilkovna.png'));
      copyFileSync(resolve(root, 'dpd-logo.png'), resolve(legacyDir, 'dpd.png'));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyCarrierLogos()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      'motion/react': 'framer-motion',
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
