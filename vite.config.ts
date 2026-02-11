import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load biến môi trường (nếu chạy local có file .env)
  // Use (process as any).cwd() to avoid TS error about missing cwd on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Lấy API_KEY từ biến môi trường của hệ thống (Vercel), file .env, 
      // hoặc sử dụng key cứng bạn vừa cung cấp làm mặc định (fallback).
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || "AIzaSyBIhTxrjPj5Ip8uh9I7olKhhxtzX8qbDTY")
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: './index.html'
        },
        // Giữ lại external vì bạn đang dùng importmap trong index.html
        external: [
          '@google/genai',
          'firebase/app',
          'firebase/database',
          'firebase/analytics'
        ]
      }
    },
    server: {
      port: 3000
    }
  };
});