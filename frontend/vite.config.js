import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// ⬇️ 1. 플러그인 임포트
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    // ⬇️ 2. 플러그인 설정 추가
    viteStaticCopy({
      targets: [
        {
          // @mediapipe/pose 패키지의 .wasm 파일들을
          src: 'node_modules/@mediapipe/pose/*.wasm',
          // 'dist' 폴더의 루트에 복사합니다.
          dest: '.'
        }
      ]
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})