import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Replaced `process.cwd()` with `''` to work around a TypeScript type definition issue.
  // `loadEnv` correctly resolves an empty path to the current working directory.
  const env = loadEnv(mode, '', '');
  return {
    plugins: [react()],
    define: {
      // This makes the API_KEY from your .env file available as process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})