// 04_sop.js: Express가 같은 포트(3000)에서 서빙 → 동일 출처
// 05_cors.js: Live Server(5500)에서 열 경우 → cross-origin → 서버에 CORS 설정 필요
// const API_URL = 'http://localhost:3000/chat'; // 로컬 테스트 시
// const API_URL = '/chat'; // SOP 배포 시
const API_URL = 'https://chatbot-labj.onrender.com/chat'; // CORS 배포 시 (Render)
// CORS 상황 시 (GitHub Pages) render 배포된 경로로
const STORAGE_KEY = 'chatHistory'; // localStorage 키

const chatBox = document.querySelector('#chat-box');
const form = document.querySelector('#form');
const input = document.querySelector('#input');
const sendBtn = document.querySelector('#sendBtn');
const modelSelect = document.querySelector('#modelSelect');
const clearBtn = document.querySelector('#clearBtn');

// ─────────────────────────────────────────────
// localStorage 유틸
// ─────────────────────────────────────────────

// 이력 불러오기
function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    } catch {
        return [];
    }
}

// 메시지 한 건 저장
function saveMessage(role, text, meta = '') {
    const history = loadHistory();
    history.push({ role, text, meta });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// 이력 전체 삭제
function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
}

const SUMMARY_KEY = 'chatSummary'; // 요약본 localStorage 키

// 요약본 업데이트
function updateSummary(summary) {
    if (!summary) return;
    localStorage.setItem(SUMMARY_KEY, summary);
    const summaryBox = document.querySelector('#summary-box');
    const summaryText = document.querySelector('#summary-text');
    if (summaryBox && summaryText) {
        summaryText.textContent = summary;
        summaryBox.classList.remove('d-none');
    }
}

// 요약본 불러오기
function loadSummary() {
    const summary = localStorage.getItem(SUMMARY_KEY);
    const summaryBox = document.querySelector('#summary-box');
    const summaryText = document.querySelector('#summary-text');
    if (summary && summaryBox && summaryText) {
        summaryText.textContent = summary;
        summaryBox.classList.remove('d-none');
    }
}

// ─────────────────────────────────────────────
// UI 렌더링
// ─────────────────────────────────────────────

// 메시지 버블 추가 (저장 여부 선택 가능)
function addMessage(role, text, meta = '', save = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `d-flex flex-column ${role === 'user' ? 'align-items-end' : 'align-items-start'}`;

    const bubble = document.createElement('div');
    bubble.className = `bubble-${role} px-3 py-2`;
    bubble.style.maxWidth = '85%';
    bubble.textContent = text;

    wrapper.appendChild(bubble);

    if (meta) {
        const metaEl = document.createElement('div');
        metaEl.className = 'meta mt-1';
        metaEl.textContent = meta;
        wrapper.appendChild(metaEl);
    }

    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (save) saveMessage(role, text, meta);

    return wrapper;
}

// 저장된 이력을 화면에 복원
function renderHistory() {
    loadHistory().forEach(({ role, text, meta }) => addMessage(role, text, meta));
    loadSummary();
}

// ─────────────────────────────────────────────
// 이벤트
// ─────────────────────────────────────────────

// 페이지 로드 시 이력 복원
renderHistory();

// 기억 지우기 버튼
clearBtn.addEventListener('click', () => {
    clearHistory();
    localStorage.removeItem(SUMMARY_KEY);
    chatBox.innerHTML = '';
    const summaryBox = document.querySelector('#summary-box');
    const summaryText = document.querySelector('#summary-text');
    if (summaryBox && summaryText) {
        summaryText.textContent = '';
        summaryBox.classList.add('d-none');
    }
});

// textarea 자동 높이
input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
});

// Shift+Enter: 줄바꿈, Enter: 전송
// e.isComposing: 한국어 IME 조합 중(마지막 글자 확정 전)이면 true
// → 조합 완료 후 Enter 이벤트가 한 번 더 발생하므로 무시해야 이중 전송 방지
input.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
    }
});

// 폼 제출
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const summary = localStorage.getItem(SUMMARY_KEY) || '';
    const message = input.value.trim();
    if (!message) return;

    const model = modelSelect.value;

    addMessage('user', message, '', true); // 저장 O
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    const typingEl = addMessage('ai', '답변 생성 중...'); // 저장 X

    try {
        // axios: JSON 자동 직렬화(body) 및 파싱(응답) 처리
        // fetch와 달리 Content-Type 헤더 자동 설정, res.json() 불필요
        const { data } = await axios.post(API_URL, { model, message, summary });
        chatBox.removeChild(typingEl);

        if (data.error) {
            addMessage('ai', `오류: ${JSON.stringify(data.error)}`, '', true);
        } else {
            addMessage('ai', data.answer, data.model, true); // 저장 O
            if (data.summary) {
                updateSummary(data.summary);
            }
        }
    } catch (err) {
        chatBox.removeChild(typingEl);
        addMessage('ai', `네트워크 오류: ${err.message}`); // 저장 X
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
});
