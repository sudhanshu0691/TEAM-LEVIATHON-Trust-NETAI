import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, cpSync } from 'fs'
import { resolve } from 'path'

// Use a relative base so built asset paths work inside Chrome extension pages
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      apply: 'build',
      enforce: 'post',
      generateBundle() {
        try {
          mkdirSync('dist', { recursive: true })
          
          // Copy main extension files
          copyFileSync('manifest.json', 'dist/manifest.json')
          copyFileSync('background.js', 'dist/background.js')
          console.log('✅ Manifest and background.js copied')
          
          // Copy content scripts
          mkdirSync('dist/src/content', { recursive: true })
          copyFileSync('src/content/detector.js', 'dist/src/content/detector.js')
          console.log('✅ Content script (detector.js) copied')
          
          // Copy public assets (icons)
          try {
            cpSync('public', 'dist/public', { recursive: true })
            console.log('✅ Public assets (icons) copied')
          } catch (e) {
            console.warn('⚠️ Could not copy public folder:', e.message)
          }
        } catch (err) {
          console.error('❌ Error copying extension files:', err)
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  }
})
