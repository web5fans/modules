
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    federation({
      name: 'keystore',
      filename: 'remoteEntry.js',
      exposes: {
        './KeystoreClient': './src/KeystoreClient.ts',
        './constants': './src/constants.ts',
      },
      shared: []
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
  },
  define: {
    'process.env': {},
  },
  build: {
    target: 'esnext',
  },
})
