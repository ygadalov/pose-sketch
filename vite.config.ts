import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pose-sketch/' : '/',
  build: {rollupOptions: {input: {app: 'index.html', designs: 'designs/index.html'}}},
}));
