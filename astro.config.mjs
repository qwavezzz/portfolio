import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://qwavezzz.github.io',
  base: process.env.SITE_BASE || '/',
  integrations: [react()],
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
