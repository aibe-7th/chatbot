# AI 챗봇 실습 프로젝트 (SOP & CORS)

이 프로젝트는 Express 프레임워크와 LLM API(Gemini, Groq)를 연동하여 동일 출처 정책(SOP)과 교차 출처 리소스 공유(CORS) 개념을 학습하고 실습하는 프로젝트입니다.

## 파일 구성 및 단계
1. **`01_express.js`**: 기초 Express 웹 서버 구축 및 라우팅 템플릿
2. **`02_axios.js`**: Axios를 활용한 Groq / Gemini API 연동 (Raw HTTP 요청)
3. **`03_sdk.js`**: 공식 SDK (`groq-sdk`, `@google/genai`) 연동 및 프롬프트 조율
4. **`04_sop.js`**: Same-Origin Policy (SOP) 실습 (포트 3000 자체에서 정적 HTML 서빙)
5. **`05_cors.js`**: CORS 정책 활성화, 대화 요약 맥락 주입 및 Render 클라우드 배포 최적화 예제

## 폴더 구조
- `pages/`: SOP 실습용 챗봇 프론트엔드 코드 (`index.html`)
- `public/`: CORS 테스트용 챗봇 프론트엔드 및 스크립트 (`index.html`, `script.js`)

## 시작하기

### 1. 환경변수 설정
`.env.sample` 파일을 참고하여 루트 디렉토리에 `.env` 파일을 생성하고 API 키 및 오리진을 설정합니다.
```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
CORS_ORIGINS=http://127.0.0.1:5500
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 실습 실행
각 단계별 서버를 다음 명령어로 실행합니다.
```bash
# SOP 예제 실행 (챗봇 UI: http://localhost:3000/)
npm run 04

# CORS 예제 실행 (Live Server 포트 5500으로 public/index.html 구동 필요)
npm run 05

# 혹은 start 스크립트 실행 (nodemon 05_cors.js)
npm start
```
