@echo off
chcp 65001 > nul
title HandyAndy

set SCRIPT_DIR=%~dp0

echo HandyAndy 시작 중...

:: Next.js 개발 서버 시작
start "HandyAndy-Web" /min cmd /c "cd /d %SCRIPT_DIR% && npm run dev"

:: 에이전트 시작
start "HandyAndy-Agent" /min cmd /c "python %SCRIPT_DIR%agent\agent.py"

:: 서버 준비 대기
timeout /t 5 /nobreak > nul

:: 브라우저 열기
start http://localhost:3000

echo HandyAndy 실행 중입니다.
echo 종료하려면 이 창을 닫으세요.
echo.
echo 웹서버와 에이전트 창을 함께 닫아주세요.
pause
