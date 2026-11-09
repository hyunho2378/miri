import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import twConfig from '../client/tailwind.config.js';

// 미리 케이스 스터디.
// index.html: 케이스 스터디 본문. screen.html: 실제 서비스 코드(client/src/App.jsx)를 그대로 띄우는 화면 입구.
// 케이스 본문의 화면 자리는 그림 대신 screen.html을 iframe으로 띄워 실제 화면을 직접 눌러 볼 수 있게 한다.
const here = path.dirname(fileURLToPath(import.meta.url));
const client = path.resolve(here, '../client');
const clientPublic = path.join(client, 'public');
// 서비스 화면 글자 모양(테일윈드)은 client에 깔린 것을 그대로 쓴다
const fromClient = createRequire(path.join(client, 'package.json'));
const tailwind = fromClient('tailwindcss');
const autoprefixer = fromClient('autoprefixer');

// 서비스 화면이 쓰는 공용 파일(/device, /terrain, /images 등)을 케이스 주소에서도 같은 경로로 준다
function clientPublicFiles() {
  return {
    name: 'miri-client-public',
    configureServer(server) {
      // 서비스 경로로 새로고침된 화면은 화면 입구로 보낸다(배포에서는 vercel.json이 같은 일을 함)
      server.middlewares.use((req, res, next) => {
        if (/^\/(console|m|h|f)(\/|$|\?)/.test(req.url || '')) req.url = '/screen.html';
        next();
      });
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || '').split('?')[0]);
        const file = path.join(clientPublic, url);
        if (!file.startsWith(clientPublic) || url === '/' || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        const ext = path.extname(file).toLowerCase();
        const type = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.pdf': 'application/pdf', '.bin': 'application/octet-stream' }[ext];
        if (type) res.setHeader('Content-Type', type);
        fs.createReadStream(file).pipe(res);
      });
    },
    writeBundle(opts) {
      const out = opts.dir || path.join(here, 'dist');
      fs.cpSync(clientPublic, out, { recursive: true, force: false, errorOnExist: false });
    },
  };
}

export default defineConfig({
  plugins: [react(), clientPublicFiles()],
  // 케이스 본문과 서비스 화면이 리액트 한 벌을 같이 쓴다(두 벌이면 훅이 깨진다)
  resolve: {
    alias: [
      { find: /^react$/, replacement: path.join(client, 'node_modules/react/index.js') },
      { find: /^react\/(.*)$/, replacement: path.join(client, 'node_modules/react/$1') },
      { find: /^react-dom$/, replacement: path.join(client, 'node_modules/react-dom/index.js') },
      { find: /^react-dom\/(.*)$/, replacement: path.join(client, 'node_modules/react-dom/$1') },
    ],
  },
  define: {
    'import.meta.env.VITE_USE_MOCK': JSON.stringify('true'),
    'import.meta.env.VITE_ORG_NAME': JSON.stringify('동해시'),
  },
  css: {
    postcss: {
      plugins: [
        tailwind({ ...twConfig, content: [path.join(client, 'index.html'), path.join(client, 'src/**/*.{js,jsx}')] }),
        autoprefixer(),
      ],
    },
  },
  build: {
    rollupOptions: {
      input: { main: path.join(here, 'index.html'), screen: path.join(here, 'screen.html') },
    },
  },
  server: {
    port: 5181,
    fs: { allow: [here, client] },
    // 서비스 화면의 공공데이터 요청은 개발 중 배포된 서버리스 함수로 보낸다(client/vite.config.js와 같은 방식)
    proxy: { '/api': { target: 'https://miri-indol.vercel.app', changeOrigin: true, secure: true } },
  },
});
