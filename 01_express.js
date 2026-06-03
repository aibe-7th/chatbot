/*
npm init -y
# npm install == npm i
npm i express
*/

const express = require('express');
const app = express();
const PORT = 3000;

// body 파싱 미들웨어
app.use(express.json());

// GET - 단순 텍스트 반환
app.get('/', (req, res) => {
    res.send('안녕하세요! GET 요청을 받았습니다.');
});

// node 01_express.js
// curl http://localhost:3000

// npm i -D nodemon
// npm run 01

// GET - JSON 반환
app.get('/user', (req, res) => {
    res.json({ 이름: '홍길동', 나이: 25 });
});

// curl http://localhost:3000/user

// POST - body 읽기
app.post('/user', (req, res) => {
    const body = req.body;
    console.log('받은 데이터:', body);

    res.json({
        메시지: '데이터를 받았습니다.',
        받은데이터: body
    });
});

/*
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"이름":"홍길동","나이":25}'
*/
// app.use(express.json());

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});

// -c 로 종료