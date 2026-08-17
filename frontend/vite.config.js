import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config: just tells Vite we're using React.
export default defineConfig({
  plugins: [react()],
})
