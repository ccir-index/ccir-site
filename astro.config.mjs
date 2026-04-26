import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ccir.io',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
