import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import federation from '@originjs/vite-plugin-federation'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const DID_MODULE_URL = env.VITE_DID_MODULE_URL || 'http://localhost:3002/assets/remoteEntry.js';
  const PDS_MODULE_URL = env.VITE_PDS_MODULE_URL || 'http://localhost:3003/assets/remoteEntry.js';
  const KEYSTORE_MODULE_URL = env.VITE_KEYSTORE_MODULE_URL || 'http://localhost:3001/assets/remoteEntry.js';

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: 'daoworld_host',
        remotes: {
          did_module: DID_MODULE_URL,
          pds_module: PDS_MODULE_URL,
          keystore: KEYSTORE_MODULE_URL,
        },
        shared: {
          '@ckb-ccc/ccc': {
            version: '0.0.0-canary-20260109065952'
          },
          'web5-api': {
            version: '0.0.27'
          }
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3004,
      strictPort: true,
    },
    preview: {
      port: 3004,
      strictPort: true,
    },
    build: {
      target: 'esnext'
    }
  }
})
