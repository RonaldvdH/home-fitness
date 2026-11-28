import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { preact } from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

function resolveBasePath(rawBase: string | undefined): string {
  if (!rawBase || rawBase === '/') return '/';
  const withLeading = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function readPackageVersion(): string {
  try {
    const raw = readFileSync(new URL('./package.json', import.meta.url), 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    if (pkg.version) return `v${pkg.version}`;
  } catch {
    // Fallback below
  }
  return 'v0.0.0';
}

function resolveAppVersion(): string {
  const fromEnv = process.env.VITE_APP_VERSION?.trim();
  if (fromEnv) return fromEnv;
  try {
    const tag = execSync('git describe --tags --abbrev=0', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (tag) return tag;
  } catch {
    // Fallback when git metadata is unavailable
  }
  return readPackageVersion();
}

const base = resolveBasePath(process.env.VITE_BASE_PATH);
const appVersion = resolveAppVersion();

export default defineConfig({
  base,
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Home Fitness Studio',
        short_name: 'Home Fitness',
        description:
          'Offline-first home workout trainer with 60 FPS 3D and 2D animated form demonstrations, Workout Spaces, and audio/voice coaching cues.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'any',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
});
