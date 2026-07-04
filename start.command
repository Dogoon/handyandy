#!/bin/bash

# HandyAndy 실행 스크립트
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Next.js 개발 서버 시작
cd "$SCRIPT_DIR"
npm run dev &
NEXT_PID=$!

# 에이전트 시작
python3.11 "$SCRIPT_DIR/agent/agent.py" &
AGENT_PID=$!

# 서버 준비 대기
sleep 3

# 브라우저 열기
open http://localhost:3000

echo "HandyAndy 실행 중..."
echo "종료하려면 이 창을 닫으세요."

# 프로세스 종료 시 둘 다 종료
trap "kill $NEXT_PID $AGENT_PID 2>/dev/null" EXIT

wait
