# AI 챗봇 실습 프로젝트 (SOP & CORS)

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](#)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](#)
[![Gemini](https://img.shields.io/badge/Gemini-8E75C2?style=flat-square&logo=googlegemini&logoColor=white)](#)
[![Groq](https://img.shields.io/badge/Groq-F55000?style=flat-square)](#)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white)](#)

이 프로젝트는 Express 프레임워크와 LLM API(Gemini, Groq)를 연동하여 동일 출처 정책(SOP)과 교차 출처 리소스 공유(CORS) 개념을 학습하고 실습하는 프로젝트입니다.

## 배포 링크
- **프런트엔드 (GitHub Pages):** https://aibe-7th.github.io/chatbot
- **백엔드 API (Render.com):** https://chatbot-labj.onrender.com/

## 파일 구성 및 단계
1. **`01_express.js`**: 기초 Express 웹 서버 구축 및 라우팅 템플릿
2. **`02_axios.js`**: Axios를 활용한 Groq / Gemini API 연동 (Raw HTTP 요청)
3. **`03_sdk.js`**: 공식 SDK (`groq-sdk`, `@google/genai`) 연동 및 프롬프트 조율
4. **`04_sop.js`**: Same-Origin Policy (SOP) 실습 (포트 3000 자체에서 정적 HTML 서빙)
5. **`05_cors.js`**: CORS 정책 활성화, 대화 요약 맥락 주입 및 Render 클라우드 배포 최적화 예제

## 폴더 구조
- `pages/`: SOP 실습용 챗봇 프런트엔드 코드 (`index.html`)
- `public/`: CORS 테스트용 챗봇 프런트엔드 및 스크립트 (`index.html`, `script.js`)

## 시작하기

### 환경변수 설정
`.env.sample` 파일을 참고하여 루트 디렉토리에 `.env` 파일을 생성하고 API 키 및 오리진을 설정합니다.
```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
CORS_ORIGINS=http://127.0.0.1:5500,https://{본인 GitHub Username}.github.io
```

### 터미널 명령어 입력 
```bash
# 패키지 설치
npm i
# 서버를 실행
npm start
```