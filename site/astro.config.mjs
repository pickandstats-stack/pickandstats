// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  fonts: [
    {
      name: 'Barlow',
      cssVariable: '--fuente-texto',
      provider: fontProviders.google(),
      weights: [400, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
    {
      name: 'Barlow Condensed',
      cssVariable: '--fuente-titulo',
      provider: fontProviders.google(),
      weights: [600, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
  ],});
