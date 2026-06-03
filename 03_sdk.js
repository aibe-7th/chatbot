require('dotenv').config();
const express = require('express');

// groq-sdk
const Groq = require('groq-sdk');
// @google/genai
const { GoogleGenAI } = require('@google/genai');

// npm i groq-sdk @google/genai
// npm run 03

const app = express();
app.use(express.json());
const PORT = 3000;

// ─────────────────────────────────────────────
// SDK 방식 비교 (vs axios 직접 호출)
//
// [axios 방식]
//   - HTTP 요청을 직접 구성 (URL, headers, body 수동 작성)
//   - API 변경 시 코드를 직접 수정해야 함
//
// [SDK 방식]
//   - 공식 라이브러리가 HTTP 처리를 추상화
//   - 메서드 호출로 간결하게 사용 가능
//   - 타입 힌트, 에러 처리 등 부가 기능 제공
// ─────────────────────────────────────────────

// SDK 클라이언트 초기화
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Groq 지원 모델
// body: { model: 'qwen' | 'llama' | 'oss-120b' | 'oss-20b', message: '...' }
const GROQ_MODELS = {
    'qwen':     'qwen/qwen3-32b',
    'llama':    'meta-llama/llama-4-scout-17b-16e-instruct',
    'oss-120b': 'openai/gpt-oss-120b',
    'oss-20b':  'openai/gpt-oss-20b',
};

// AI Studio 지원 모델
// body: { model: 'flash' | 'dense' | 'moe', message: '...' }
const AISTUDIO_MODELS = {
    'flash': 'gemini-3.1-flash-lite',
    'dense': 'gemma-4-31b-it',
    'moe':   'gemma-4-26b-a4b-it',
};

// ─────────────────────────────────────────────
// POST /chat/groq  - groq-sdk 사용
// ─────────────────────────────────────────────
app.post('/chat/groq', async (req, res) => {
    const { model = 'qwen', message } = req.body;

    if (!message) return res.status(400).json({ error: 'message가 없습니다.' });

    const modelName = GROQ_MODELS[model];
    if (!modelName) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(GROQ_MODELS) });

    try {
        const isQwen3 = modelName.includes('qwen3'); // reasoning 모델 여부
        const completion = await groq.chat.completions.create({
            model: modelName,            // 모델 ID
            messages: [{ role: 'user', content: message }],
            temperature: 1,              // 창의성 (0~2, 기본 1)
            max_completion_tokens: 1024, // 최대 응답 토큰 수
            ...(isQwen3 && { reasoning_effort: 'none' }), // qwen3만 thinking 비활성화
        });

        const answer = completion.choices[0].message.content;
        res.json({ model: modelName, answer });
    } catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// POST /chat/aistudio  - @google/genai SDK 사용
// ─────────────────────────────────────────────
app.post('/chat/aistudio', async (req, res) => {
    const { model = 'flash', message } = req.body;

    if (!message) return res.status(400).json({ error: 'message가 없습니다.' });

    const modelName = AISTUDIO_MODELS[model];
    if (!modelName) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(AISTUDIO_MODELS) });

    try {
        const result = await ai.models.generateContent({
            model: modelName,            // 모델 ID
            contents: message,           // 요청 메시지 (문자열로 전달 가능)
            config: {
                temperature: 1,          // 창의성 (0~2)
                maxOutputTokens: 8192,   // 최대 응답 토큰 수
            },
        });

        const answer = result.text;      // SDK가 텍스트를 바로 추출해 줌
        res.json({ model: modelName, answer });
    } catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
});

/*
# Groq - 기본
curl -X POST http://localhost:3000/chat/groq \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen", "message": "안녕하세요!"}'

# AI Studio - 기본
curl -X POST http://localhost:3000/chat/aistudio \
  -H "Content-Type: application/json" \
  -d '{"model": "flash", "message": "안녕하세요!"}'
*/

// ─────────────────────────────────────────────
// System Instruction
//
// 모델의 역할/페르소나/제약 조건을 지정하는 프롬프트.
// 매 요청의 user 메시지보다 먼저 처리되며, 대화 전반에 적용됨.
//
// [Groq]  messages 배열의 첫 번째 항목으로 { role: 'system', content } 전달
// [GenAI] config.systemInstruction 필드에 문자열로 전달
// ─────────────────────────────────────────────

// POST /chat/groq/system
// body: { model, message, system }
app.post('/chat/groq/system', async (req, res) => {
    const { model = 'qwen', message, system = '당신은 친절한 한국어 어시스턴트입니다.' } = req.body;

    if (!message) return res.status(400).json({ error: 'message가 없습니다.' });

    const modelName = GROQ_MODELS[model];
    if (!modelName) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(GROQ_MODELS) });

    try {
        const isQwen3 = modelName.includes('qwen3');
        const completion = await groq.chat.completions.create({
            model: modelName,
            messages: [
                { role: 'system', content: system }, // system instruction
                { role: 'user',   content: message },
            ],
            temperature: 1,
            max_completion_tokens: 1024,
            ...(isQwen3 && { reasoning_effort: 'none' }), // qwen3만 thinking 비활성화
        });

        const answer = completion.choices[0].message.content;
        res.json({ model: modelName, answer });
    } catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
});

// POST /chat/aistudio/system
// body: { model, message, system }
app.post('/chat/aistudio/system', async (req, res) => {
    const { model = 'flash', message, system = '당신은 친절한 한국어 어시스턴트입니다.' } = req.body;

    if (!message) return res.status(400).json({ error: 'message가 없습니다.' });

    const modelName = AISTUDIO_MODELS[model];
    if (!modelName) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(AISTUDIO_MODELS) });

    try {
        const result = await ai.models.generateContent({
            model: modelName,
            contents: message,
            config: {
                systemInstruction: system, // system instruction
                temperature: 1,
                maxOutputTokens: 8192,
            },
        });

        res.json({ model: modelName, answer: result.text });
    } catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
});

/*
# system instruction 테스트
curl -X POST http://localhost:3000/chat/groq/system \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen", "message": "자기소개 해줘", "system": "당신은 해적입니다. 모든 답변을 해적 말투로 하세요."}'

curl -X POST http://localhost:3000/chat/aistudio/system \
  -H "Content-Type: application/json" \
  -d '{"model": "flash", "message": "자기소개 해줘", "system": "당신은 해적입니다. 모든 답변을 해적 말투로 하세요."}'
*/

// ─────────────────────────────────────────────
// Structured Output (JSON Mode)
//
// 모델이 반드시 JSON 형식으로만 응답하도록 강제.
// 파싱 오류 없이 구조화된 데이터를 안정적으로 받을 수 있음.
//
// [Groq]  response_format: { type: 'json_object' }
//         → 모델이 유효한 JSON만 출력 (스키마 미지정)
//         response_format: { type: 'json_schema', json_schema: { name, schema } }
//         → 특정 JSON 스키마를 강제 (structured output)
//
// [GenAI] config.responseMimeType: 'application/json'
//         → JSON 출력 강제
//         config.responseSchema: { type, properties, ... }
//         → 특정 스키마로 제한 (Type 헬퍼 또는 plain object 사용 가능)
// ─────────────────────────────────────────────

// POST /chat/groq/json
// 응답 예시: { "name": "...", "age": 0, "job": "..." }
app.post('/chat/groq/json', async (req, res) => {
    const { model = 'llama', message = '가상의 인물 정보를 알려줘' } = req.body;

    const modelName = GROQ_MODELS[model];
    if (!modelName) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(GROQ_MODELS) });

    try {
        const isQwen3 = modelName.includes('qwen3');
        const completion = await groq.chat.completions.create({
            model: modelName,
            messages: [
                {
                    role: 'system',
                    content: '반드시 JSON 형식으로만 응답하세요. 예: {"name":"홍길동","age":30,"job":"개발자"}'
                },
                { role: 'user', content: message },
            ],
            temperature: 1,
            max_completion_tokens: 512,
            ...(isQwen3 && { reasoning_effort: 'none' }), // qwen3만 thinking 비활성화
            response_format: { type: 'json_object' }, // JSON 출력 강제
        });

        const raw = completion.choices[0].message.content;
        res.json({ model: modelName, answer: JSON.parse(raw) }); // 파싱해서 바로 객체로 반환
    } catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
});

// POST /chat/aistudio/json
// 응답 예시: { "name": "...", "age": 0, "job": "..." }
app.post('/chat/aistudio/json', async (req, res) => {
    const { model = 'flash', message = '가상의 인물 정보를 알려줘' } = req.body;

    const modelName = AISTUDIO_MODELS[model];
    if (!modelName) return res.status(400).json({ error: '지원하지 않는 model', available: Object.keys(AISTUDIO_MODELS) });

    try {
        const result = await ai.models.generateContent({
            model: modelName,
            contents: message,
            config: {
                temperature: 1,
                maxOutputTokens: 512,
                responseMimeType: 'application/json', // JSON 출력 강제
                responseSchema: {                     // 응답 스키마 지정
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        age:  { type: 'integer' },
                        job:  { type: 'string' },
                    },
                    required: ['name', 'age', 'job'],
                },
            },
        });

        res.json({ model: modelName, answer: JSON.parse(result.text) });
    } catch (err) {
        res.status(err.status ?? 500).json({ error: err.message });
    }
});

/*
# structured output 테스트
curl -X POST http://localhost:3000/chat/groq/json \
  -H "Content-Type: application/json" \
  -d '{"model": "llama", "message": "가상의 개발자 인물 정보를 알려줘"}'

curl -X POST http://localhost:3000/chat/aistudio/json \
  -H "Content-Type: application/json" \
  -d '{"model": "flash", "message": "가상의 개발자 인물 정보를 알려줘"}'
*/

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});