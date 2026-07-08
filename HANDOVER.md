# HandyAndy — 인수인계 문서

## 프로젝트 현황 (2026-07-08 기준)
기본 기능 완성 단계. 실사용 가능한 수준.

## 완성된 기능
- 프롬프트 생성 (GPT API)
- 이미지 생성 (gpt-image-1 / dall-e-3)
- 프롬프트 저장 / 버전 관리 (V001 → V001.0001)
- 프리셋 저장/불러오기 (TPL_*.json, 파일 브라우저)
- 프로젝트 관리 (추가/수정/삭제, 경로 설정, EP/SC/CUT 구조 선택)
- 프롬프트 검색 (전체/프로젝트별, 썸네일 표시)
- 이미지 열기 / 폴더 열기
- 마지막 선택 프로젝트 자동 복원
- Mac/Windows 실행 스크립트

## 남은 작업
1. **업데이트 버튼**: 사이드바에 GitHub 새 버전 확인 버튼. GitHub Releases API 사용 예정.
2. **Vercel 배포**: 개발 완료 후 배포 예정. 현재는 로컬 전용.
3. **설치·이용 매뉴얼**: Mac/Windows 각각 작성 필요.

## 알려진 이슈 / 주의사항

### OpenAI 이미지 모델
- `dall-e-2`, `dall-e-3`: 계정 Tier에 따라 사용 불가일 수 있음
- `gpt-image-1`: 신규 계정 기본 모델. base64 응답 방식
- 모델 목록 갱신 시 `dall-e-2`, `dall-e-3`는 API에서 반환 안 되더라도 항상 목록에 포함되도록 처리됨

### Windows 실행
- Python 명령어가 `python`이 아닐 경우 `start.bat`에서 `py`로 수정 필요
- 창 종료 시 웹서버·에이전트 자동 종료 안 됨 — 각 창을 수동으로 닫아야 함

### API 키
- API 키에 한글 등 비ASCII 문자 포함 시 자동 제거됨 (에이전트에서 처리)
- `handyandy_private.json`은 gitignore 처리됨 — PC 이전 시 수동 설정 필요

## 개발 환경 세팅
```bash
git clone https://github.com/Dogoon/handyandy.git
cd handyandy
npm install
# agent/settings/ 폴더는 gitignore — 최초 실행 시 자동 생성됨
```

## 코드 수정 후 배포 흐름
```bash
# Mac에서 수정 후
git add .
git commit -m "수정 내용"
git push

# Windows에서 업데이트
git pull
# start.bat 재실행
```

## 핵심 파일
| 파일 | 역할 |
|---|---|
| `app/page.tsx` | 전체 UI 로직 |
| `app/lib/agent.ts` | 에이전트 API 함수 |
| `agent/agent.py` | 로컬 에이전트 서버 |
| `agent/settings/handyandy_settings.json` | 프로젝트 목록, 모델 설정 |
| `agent/settings/handyandy_private.json` | API 키 |
