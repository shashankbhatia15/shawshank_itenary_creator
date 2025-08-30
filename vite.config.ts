import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // FIX: Removed an unnecessary import of `process`. The global `process` object
  // is available in Node.js environments and its `cwd` method can be used directly.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This makes the API_KEY from your .env file available as process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
