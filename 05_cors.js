require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const Groq = require('groq-sdk');
const { GoogleGenAI } = require('@google/genai');

// ─────────────────────────────────────────────
// 환경변수(Environment Variables) 설명
//
// 1. GEMINI_API_KEY: Google Gemini API 사용을 위한 인증 키
// 2. GROQ_API_KEY: Groq API 사용을 위한 인증 키
// 3. CORS_ORIGINS: CORS를 허용할 단일 Origin 주소 (예: http://127.0.0.1:5500)
// 4. RENDER: Render.com 환경 여부 (서버 배포 시 'true'로 지정되며 포트가 10000으로 설정됨)
// 5. RENDER_EXTERNAL_URL: Render.com 배포 시 앱의 외부 접속 URL (예: https://myapp.onrender.com)
// ─────────────────────────────────────────────

// npm i cors
// npm run 05
// public/index.html 을 VS Code Live Server(포트 5500)로 열고 테스트

const app = express();
const PORT = process.env.RENDER === 'true' ? 10000 : 3000;

// ─────────────────────────────────────────────
// CORS (Cross-Origin Resource Sharing)
//
// 브라우저가 cross-origin 요청을 보낼 때, 서버가
// Access-Control-Allow-Origin 헤더를 응답에 포함해야 허용됨.
//
// Live Server가 프론트를 http://127.0.0.1:5500 에서 서빙하고
// API는 http://localhost:3000 이므로 포트가 달라 cross-origin 발생.
//
// cors() 미들웨어가 응답 헤더에 자동으로 추가:
//   Access-Control-Allow-Origin: http://127.0.0.1:5500
// ─────────────────────────────────────────────

// CORS Whitelist 설정 (쉼표로 구분하여 여러 개 지정 가능)
// - 예: CORS_ORIGINS=http://127.0.0.1:5500,https://aibe-7th.github.io
const whitelist = (process.env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);

// 모든 Origin을 조건 없이 허용하려면 단순히 다음과 같이 선언합니다:
// app.use(cors());

app.use(cors({
    origin: (origin, callback) => {
        // 1. origin이 없는 경우 (curl, Postman 등 non-browser) 허용
        // 2. whitelist에 포함된 경우 허용
        // 3. 서버 자체의 origin (same-origin)인 경우 허용
        const sameOriginLocalhost = `http://localhost:${PORT}`;
        const sameOriginIP = `http://127.0.0.1:${PORT}`;
        const sameOriginRender = process.env.RENDER_EXTERNAL_URL;

        if (
            !origin ||
            whitelist.includes(origin) ||
            origin === sameOriginLocalhost ||
            origin === sameOriginIP ||
            (sameOriginRender && origin === sameOriginRender)
        ) {
            callback(null, true);
        } else {
            callback(new Error(`CORS 차단: ${origin}`));
        }
    },
}));
app.use(express.json());

// public/ 디렉토리를 정적 파일로 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 루트 경로 요청 시 pages/index.html 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 통합 모델 목록 (04_sop.js 와 동일)
const MODELS = {
    'qwen': { provider: 'groq', id: 'qwen/qwen3-32b' },
    'llama': { provider: 'groq', id: 'meta-llama/llama-4-scout-17b-16e-instruct' },
    'flash': { provider: 'aistudio', id: 'gemini-3.1-flash-lite' },
    'dense': { provider: 'aistudio', id: 'gemma-4-31b-it' },
};

// POST /chat
app.post('/chat', async (req, res) => {
    const { model = 'flash', message, summary = '' } = req.body;

    if (!message) return res.status(400).json({ error: 'message가 없습니다.' });

    const modelInfo = MODELS[model];
    if (!modelInfo) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(MODELS) });

    try {
        let answer;

        if (modelInfo.provider === 'groq') {
            const isQwen3 = modelInfo.id.includes('qwen3');
            const messages = [];
            if (summary) {
                messages.push({
                    role: 'system',
                    content: `이전 대화 요약 정보: "${summary}". 이 내용을 참고하여 대화를 이어가세요.`
                });
            }
            messages.push({ role: 'user', content: message });

            const completion = await groq.chat.completions.create({
                model: modelInfo.id,
                messages: messages,
                temperature: 1,
                max_completion_tokens: 1024,
                ...(isQwen3 && { reasoning_effort: 'none' }),
            });
            answer = completion.choices[0].message.content;

        } else {
            const systemInstruction = summary ? `이전 대화 요약 정보: "${summary}". 이 내용을 참고하여 대화를 이어가세요.` : undefined;
            const result = await ai.models.generateContent({
                model: modelInfo.id,
                contents: message,
                config: {
                    temperature: 1,
                    maxOutputTokens: 2048,
                    ...(systemInstruction && { systemInstruction })
                },
            });
            answer = result.text;
        }

        // 대화 압축 (요약) 생성
        const summaryPrompt = `이전 대화 요약: ${summary || '없음'}\n현재 사용자 질문: ${message}\n현재 AI 답변: ${answer}\n\n위 대화 내용을 한글로 2-3문장 이내로 아주 간결하게 핵심만 새롭게 요약(압축)해 주세요.`;

        let newSummary = '';
        if (modelInfo.provider === 'groq') {
            const isQwen3 = modelInfo.id.includes('qwen3');
            const summaryCompletion = await groq.chat.completions.create({
                model: modelInfo.id,
                messages: [{ role: 'user', content: summaryPrompt }],
                temperature: 0.5,
                max_completion_tokens: 256,
                ...(isQwen3 && { reasoning_effort: 'none' }),
            });
            newSummary = summaryCompletion.choices[0].message.content.trim();
        } else {
            const summaryResult = await ai.models.generateContent({
                model: modelInfo.id,
                contents: summaryPrompt,
                config: { temperature: 0.5, maxOutputTokens: 512 },
            });
            newSummary = summaryResult.text.trim();
        }

        res.json({ model: modelInfo.id, answer, summary: newSummary });
    } catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
});

/*
CORS 동작 확인:
- 04_sop.js 에서 브라우저 개발자도구 → Network 탭 확인 시 CORS 에러 없음
- 05_cors.js 없이 5500에서 요청 시: "has been blocked by CORS policy" 에러 발생
- 05_cors.js 실행 후 5500에서 요청 시: 응답 헤더에 Access-Control-Allow-Origin 확인 가능
*/

// ─────────────────────────────────────────────
// 서버 실행
// ─────────────────────────────────────────────
app.listen(PORT, () => {
    if (process.env.RENDER === 'true') {
        console.log(`서버 실행 중 (Render): ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
    } else {
        console.log(`서버 실행 중: http://localhost:${PORT}`);
        console.log(`챗봇 UI:    http://localhost:${PORT}/`);
        console.log(`Live Server (포트 5500) 테스트 가능`);
    }
});

// npm start 에 node 05_cors.js 를 매핑하여 구동