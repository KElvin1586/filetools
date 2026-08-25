/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { version } from './package.json'

const DEFAULT_DESCRIPTION =
  'FileTools — a private, client-side file utility suite. Resize, compress, convert, crop, and rotate images, inspect metadata, and work with PDFs. Files never leave your device.'

/** Substitutes SEO/OG placeholders in index.html with env values (or safe defaults). */
function htmlEnvPlugin(): Plugin {
  return {
    name: 'filetools-html-env',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const env = loadEnv(ctx.server ? ctx.server.config.mode : 'production', process.cwd(), 'VITE_')
        const appUrl = (env.VITE_APP_URL || 'https://filetools.app').replace(/\/+$/, '')
        const description = env.VITE_META_DESCRIPTION || DEFAULT_DESCRIPTION
        return html
          .replace(/%VITE_APP_URL%/g, appUrl)
          .replace(/%VITE_META_DESCRIPTION%/g, description)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), htmlEnvPlugin()],
  // Deployed to GitHub Pages at https://kelvin1586.github.io/filetools/ — the
  // base must match the repository name. Overridable via BASE_PATH for forks.
  base: process.env.BASE_PATH ?? '/filetools/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  preview: {
    // Static preview host allowlist for the sandbox/work hosts.
    allowedHosts: ['.prod-runtime.all-hands.dev'],
  },
})
