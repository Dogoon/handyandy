# HandyAndy — Claude 인계 문서

## 프로젝트 개요
영상 제작 AI 프롬프트 관리 툴. Next.js 웹앱 + Python 로컬 에이전트 구조.
로컬에서만 실행되며 Vercel 배포 없이 사용한다.

## 레포지토리
https://github.com/Dogoon/handyandy.git

## 실행 방법
- **Mac**: `start.command` 더블클릭
- **Windows**: `start.bat` 더블클릭
- 수동 실행: `npm run dev` + `python3.11 agent/agent.py` 별도 터미널에서 실행

## 구조

```
handyandy/
├── app/                  Next.js 앱 (App Router)
│   ├── page.tsx          메인 UI (단일 페이지)
│   ├── page.module.css   스타일
│   └── lib/agent.ts      에이전트 API 호출 함수 모음
├── agent/
│   ├── agent.py          Python 로컬 에이전트 (HTTP 서버)
│   └── settings/         설정 파일 (gitignore — API 키 포함)
│       ├── handyandy_settings.json   프로젝트 목록, 모델 설정
│       └── handyandy_private.json    API 키
├── start.command         Mac 실행 스크립트
└── start.bat             Windows 실행 스크립트
```

## 에이전트 동작 방식
- Python `http.server` + `ThreadingMixIn` 멀티스레드
- 포트 3001~3005 순서로 자동 선택 (충돌 방지)
- 웹앱은 ping으로 에이전트 포트 자동 탐색 (app/lib/agent.ts `findAgentUrl`)
- 모든 파일 I/O, 폴더 선택, API 호출은 에이전트를 통해 처리

## 주요 타입 (page.tsx)
```typescript
type Project = { code: string; name: string; root: string; structure: ProjStructure }
type ProjStructure = { ep: boolean; sc: boolean; cut: boolean }
type WorkMode = 'shot' | 'video' | 'asset' | 'design'
type Screen = 'create' | 'search' | 'assets' | 'shots' | 'settings'
```

## 설정 파일 구조 (handyandy_settings.json)
```json
{
  "projects": [{ "code": "PROJ", "name": "프로젝트명", "root": "/path/to/project", "structure": { "ep": true, "sc": true, "cut": true } }],
  "gptModel": "gpt-4o-mini",
  "modelList": [...],
  "imageModel": "gpt-image-1",
  "imageModelList": [...],
  "lastProjCode": "PROJ"
}
```

## 프로젝트 폴더 구조 (자동 생성)
```
[프로젝트루트]/
├── prompts/              샷/영상 프롬프트 JSON
├── images/               생성 이미지
├── presets/              프리셋 (TPL_*.json)
└── _assets/
    ├── prompts/          캐릭터/소품/배경/디자인 프롬프트
    │   ├── characters/
    │   ├── props/
    │   ├── backgrounds/
    │   └── design/
    └── images/           어셋 이미지
```

## 파일 명명 규칙
- 프롬프트: `{프로젝트코드}_{작업유형}_{EP}{SC}{CUT}_{어셋명}_V001.json`
- 버전업: `V001.json` → `V001.0001.json` → `V001.0002.json`
- 이미지: 프롬프트 JSON과 동일 이름, 경로만 `prompts` → `images`, 확장자 `.png`
- 프리셋: `TPL_{파일명}.json` (presets/ 폴더)

## OpenAI API 주의사항
- 프롬프트 생성: GPT 모델 사용 (`/v1/chat/completions`)
- 이미지 생성: `gpt-image-1` 사용 시 base64 응답, `dall-e-3` 사용 시 URL 응답
- `dall-e-3`는 Tier 1 이상 계정 필요
- 이미지 사이즈: `dall-e-3` → `1792x1024`, `gpt-image-*` → `1536x1024`, 기타 → `1024x1024`
- API 키는 ASCII 문자만 허용 (한글 등 비ASCII 자동 제거)

## 남은 작업
- 업데이트 버튼 (GitHub Releases 연동)
- Vercel 배포 (개발 완료 후)
- 설치·이용 매뉴얼
