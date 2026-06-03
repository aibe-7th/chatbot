require('dotenv').config();
const express = require('express');
const axios = require('axios');

// npm i dotenv axios
// npm run 02

const app = express();
app.use(express.json());
const PORT = 3000;

// ─────────────────────────────────────────────
// API 방식 비교
//
// [OpenAI 방식] - Groq 등 OpenAI 호환 API
//   - Authorization: Bearer {API_KEY}  헤더로 인증
//   - body: { model, messages: [{role, content}], temperature, max_completion_tokens }
//   - 응답: choices[0].message.content
//
// [AI Studio 방식] - Google Gemini API
//   - URL 쿼리 파라미터로 인증: ?key={API_KEY}
//   - body: { contents: [{parts: [{text}]}] }
//   - 응답: candidates[0].content.parts[0].text
// ─────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Groq 지원 모델
// body: { model: 'qwen' | 'llama' | 'oss-120b' | 'oss-20b', message: '...' }
const GROQ_MODELS = {
    'qwen': 'qwen/qwen3-32b',
    'llama': 'meta-llama/llama-4-scout-17b-16e-instruct',
    'oss-120b': 'openai/gpt-oss-120b',
    'oss-20b': 'openai/gpt-oss-20b',
};

// AI Studio 지원 모델
// body: { model: 'flash' | 'dense' | 'moe', message: '...' }
const AISTUDIO_MODELS = {
    'flash': 'gemini-3.1-flash-lite',
    'dense': 'gemma-4-31b-it',
    'moe': 'gemma-4-26b-a4b-it',
};

// ─────────────────────────────────────────────
// POST /chat/groq  - OpenAI 호환 방식
// ─────────────────────────────────────────────
app.post('/chat/groq', async (req, res) => {
    const { model = 'qwen', message } = req.body;

    if (!message) return res.status(400).json({ error: 'message가 없습니다.' });

    const modelName = GROQ_MODELS[model];
    if (!modelName) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(GROQ_MODELS) });

    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: modelName,            // 모델 ID (실제 모델명)
                messages: [{ role: 'user', content: message }],
                temperature: 1,              // 창의성 (0~2, 기본 1)
                max_completion_tokens: 1024, // 최대 응답 토큰 수
                reasoning_effort: 'none',    // thinking 비활성화 (qwen3 등 reasoning 모델용)
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`, // Bearer 토큰 인증
                }
            }
        );

        const answer = response.data.choices[0].message.content;
        res.json({ model: modelName, answer });
    } catch (err) {
        const status = err.response?.status ?? 500;
        const data   = err.response?.data   ?? { message: err.message };
        res.status(status).json({ error: data });
    }
});

// ─────────────────────────────────────────────
// POST /chat/aistudio  - Google AI Studio 방식
// ─────────────────────────────────────────────
app.post('/chat/aistudio', async (req, res) => {
    const { model = 'flash', message } = req.body;

    if (!message) return res.status(400).json({ error: 'message가 없습니다.' });

    const modelName = AISTUDIO_MODELS[model];
    if (!modelName) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(AISTUDIO_MODELS) });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: message }] }], // 요청 메시지
            generationConfig: {
                temperature: 1,        // 창의성 (0~2)
                maxOutputTokens: 8192, // 최대 응답 토큰 수
            },
        });

        const answer = response.data.candidates[0].content.parts[0].text;
        res.json({ model: modelName, answer });
    } catch (err) {
        const status = err.response?.status ?? 500;
        const data   = err.response?.data   ?? { message: err.message };
        res.status(status).json({ error: data });
    }
});

/*
# Groq
curl -X POST http://localhost:3000/chat/groq \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen", "message": "안녕하세요!"}'

# AI Studio
curl -X POST http://localhost:3000/chat/aistudio \
  -H "Content-Type: application/json" \
  -d '{"model": "flash", "message": "안녕하세요!"}'
*/

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});

// -c 로 정리