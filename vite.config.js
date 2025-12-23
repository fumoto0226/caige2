import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/caige2/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 确保静态资源被正确处理
    rollupOptions: {
      output: {
        // 保持资源路径结构
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  publicDir: 'public',
})
