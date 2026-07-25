/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 独立 vitest 配置：避免和 Vite build 耦合
// 单元测试用 jsdom 环境，匹配路径排除 api/（后端 Node 代码另有 Node 运行时）
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.vercel', 'api/**'],
    globals: false,
  },
});
