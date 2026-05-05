// ===== 아두이노 시리얼 ↔ WebSocket 브릿지 =====
// 사용법: node server.js
// 환경변수로 포트/속도 변경 가능:
//   SERIAL_PORT=COM5 BAUD_RATE=9600 WS_PORT=8080 node server.js

const { SerialPort }      = require('serialport');
const { ReadlineParser }  = require('@serialport/parser-readline');
const { WebSocketServer } = require('ws');

const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';   // Mac/Linux: '/dev/ttyUSB0'
const BAUD_RATE   = parseInt(process.env.BAUD_RATE) || 9600;
const WS_PORT     = parseInt(process.env.WS_PORT)   || 8080;

// ── 시리얼 포트 ──
const serial = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
const parser = serial.pipe(new ReadlineParser({ delimiter: '\n' }));

serial.on('open',  () => console.log(`[Serial] ${SERIAL_PORT} @ ${BAUD_RATE} baud 연결됨`));
serial.on('error', (err) => console.error('[Serial] 오류:', err.message));

// ── WebSocket 서버 ──
const wss     = new WebSocketServer({ port: WS_PORT });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] 클라이언트 연결 (총 ${clients.size}명)`);

  ws.send(JSON.stringify({
    type: 'connected',
    message: `시리얼 포트 ${SERIAL_PORT} @ ${BAUD_RATE} baud 연결됨`,
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] 클라이언트 해제 (총 ${clients.size}명)`);
  });
});

// ── 시리얼 데이터 → 모든 WebSocket 클라이언트로 전달 ──
parser.on('data', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  console.log(`[Serial] ${trimmed}`);
  const payload = JSON.stringify({ type: 'data', line: trimmed });
  for (const ws of clients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(payload);
  }
});

console.log(`WebSocket 브릿지 시작: ws://localhost:${WS_PORT}`);
console.log('브라우저에서 WebSocket 섹션에 위 주소를 입력하고 [연결] 버튼을 누르세요.');
