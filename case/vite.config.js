import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 미리 케이스 스터디. VORTEX presentation-v2 셸을 옮겨 왔다. 포트 5181.
export default defineConfig({
  plugins: [react()],
  server: { port: 5181 },
});
