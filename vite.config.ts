import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './',
  // canvg 仅在 jsPDF 的 SVG→PDF 路径被动态 import；本应用只用 PNG 栅格导出，
  // 故用替身剔除它及其沉重的 core-js 依赖，让 PDF chunk 保持精简。
  resolve: {
    alias: {
      canvg: fileURLToPath(new URL('./src/lib/canvg-stub.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
});
