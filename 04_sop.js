require('dotenv').config();
const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');
const { GoogleGenAI } = require('@google/genai');

// npm run 04
// http://localhost:3000 에서 프런트엔드 + 백엔드 동일 출처 → CORS 문제 없음

const app = express();
app.use(express.json());

// ─────────────────────────────────────────────
// SOP (Same-Origin Policy)
//
// 브라우저는 기본적으로 다른 출처(origin)로의 요청을 차단함.
// origin = 프로토콜 + 호스트 + 포트 (셋 중 하나라도 다르면 cross-origin)
//
// 여기서는 Express가 public/ 폴더를 직접 서빙하므로
// 프런트엔드(localhost:3000)와 API(localhost:3000)가 같은 출처
// → 브라우저가 요청을 차단하지 않음 (CORS 설정 불필요)
// ─────────────────────────────────────────────

// public/ 디렉토리를 정적 파일로 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 루트 경로 요청 시 pages/index.html 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 통합 모델 목록
// body: { model: 'qwen' | 'llama' | 'flash' | 'dense', message: '...' }
const MODELS = {
    'qwen':   { provider: 'groq',      id: 'qwen/qwen3-32b' },
    'llama':  { provider: 'groq',      id: 'meta-llama/llama-4-scout-17b-16e-instruct' },
    'flash':  { provider: 'aistudio',  id: 'gemini-3.1-flash-lite' },
    'dense':  { provider: 'aistudio',  id: 'gemma-4-31b-it' },
};

// POST /chat - 프런트엔드에서 호출하는 단일 엔드포인트
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
    console.log(`챗봇 UI:    http://localhost:${PORT}/`);
});
