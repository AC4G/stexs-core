import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5172,
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],
  }
});
