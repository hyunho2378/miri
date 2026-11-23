#!/bin/bash
# 로컬 저장소의 현재 커밋을 네이버 클라우드 서버(miri-api-1)에 올리고 서버에서 빌드한 뒤 다시 시작한다
# 쓰는 법: SSH_KEY=<개인키 경로> server/deploy/ncp/deploy.sh
set -euo pipefail
HOST=${HOST:-root@211.233.205.1}
KEY=${SSH_KEY:?SSH_KEY 가 필요합니다}
cd "$(git rev-parse --show-toplevel)"
REV=$(git rev-parse --short HEAD)
git archive --format=tar.gz -o /tmp/miri-src.tgz HEAD client server tools
scp -i "$KEY" /tmp/miri-src.tgz "$HOST":/root/miri-src.tgz
ssh -i "$KEY" "$HOST" "set -e
  rm -rf /opt/miri.new && mkdir -p /opt/miri.new && tar xzf /root/miri-src.tgz -C /opt/miri.new
  cd /opt/miri.new/client && printf 'VITE_USE_MOCK=true\nVITE_ORG_NAME=동해시\n' > .env.production
  npm ci --no-audit --no-fund >/root/npmci.log 2>&1 && npx vite build >/root/build.log 2>&1
  rm -rf /opt/miri.old && mv /opt/miri /opt/miri.old && mv /opt/miri.new /opt/miri
  echo $REV > /opt/miri/REVISION
  systemctl restart miri && sleep 2 && curl -fsS http://127.0.0.1:8787/api/health"
