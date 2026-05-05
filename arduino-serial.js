// ===== 아두이노 시리얼 연동 (Web Serial API + WebSocket) =====

const ArduinoSerial = (() => {
  const HAS_WEB_SERIAL = 'serial' in navigator;

  let serialPort   = null;
  let serialReader = null;
  let wsSocket     = null;

  // ── 로그 ──
  function log(msg, type = 'info') {
    const el = document.getElementById('serialLog');
    if (!el) return;
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    line.textContent = `[${new Date().toLocaleTimeString('ko-KR')}] ${msg}`;
    el.prepend(line);
    while (el.children.length > 50) el.removeChild(el.lastChild);
  }

  // ── 상태 UI ──
  function setSerialStatus(connected) {
    const dot    = document.getElementById('serialStatusDot');
    const text   = document.getElementById('serialStatusText');
    const btnCon = document.getElementById('btnSerialConnect');
    const btnDis = document.getElementById('btnSerialDisconnect');
    if (dot)    dot.className      = 'serial-status-dot' + (connected ? ' connected' : '');
    if (text)   text.textContent   = connected ? '시리얼 연결됨' : '연결 안됨';
    if (btnCon) btnCon.disabled    = connected;
    if (btnDis) btnDis.disabled    = !connected;
  }

  function setWsStatus(connected) {
    const btn = document.getElementById('btnWsConnect');
    if (!btn) return;
    btn.textContent = connected ? '연결 해제' : '연결';
    btn.classList.toggle('btn-danger', connected);
  }

  // ── 메시지 파싱 ──
  // 지원 형식:
  //   P1:1 / P1:0 / P1:occupied / P1:empty
  //   {"id":"P1","status":"occupied"}
  function parseMessage(raw) {
    const line = (raw || '').trim();
    if (!line) return;

    // JSON 형식
    try {
      const obj = JSON.parse(line);
      if (obj.id && obj.status !== undefined) {
        const status = (obj.status === 1 || obj.status === '1' || obj.status === 'occupied')
          ? 'occupied' : 'empty';
        updateSpot(obj.id.toUpperCase(), status);
        log(`수신 [JSON] ${obj.id} → ${status}`, 'recv');
        return;
      }
    } catch (e) { /* JSON 아님 */ }

    // 단순 형식: ID:STATUS
    const m = line.match(/^(P\d+):(occupied|empty|1|0)$/i);
    if (m) {
      const id     = m[1].toUpperCase();
      const status = (m[2] === '1' || m[2].toLowerCase() === 'occupied') ? 'occupied' : 'empty';
      updateSpot(id, status);
      log(`수신 ${id} → ${status}`, 'recv');
    } else {
      log(`알 수 없는 데이터: ${line}`, 'warn');
    }
  }

  // ── Web Serial API ──
  class LineBreakTransformer {
    constructor() { this.buf = ''; }
    transform(chunk, ctrl) {
      this.buf += chunk;
      const lines = this.buf.split('\n');
      this.buf = lines.pop();
      lines.forEach(l => ctrl.enqueue(l));
    }
    flush(ctrl) { ctrl.enqueue(this.buf); }
  }

  async function connectSerial() {
    if (!HAS_WEB_SERIAL) {
      log('Web Serial API 미지원 — Chrome 또는 Edge를 사용하세요.', 'error');
      return;
    }
    const baud = parseInt(document.getElementById('baudRate').value);
    try {
      serialPort = await navigator.serial.requestPort();
      await serialPort.open({ baudRate: baud });
      setSerialStatus(true);
      log(`포트 연결됨 (${baud} baud)`, 'success');
      _readLoop();
    } catch (e) {
      if (e.name !== 'NotFoundError') log(`연결 실패: ${e.message}`, 'error');
    }
  }

  async function _readLoop() {
    const decoder    = new TextDecoderStream();
    serialPort.readable.pipeTo(decoder.writable);
    const lineStream = decoder.readable.pipeThrough(
      new TransformStream(new LineBreakTransformer())
    );
    serialReader = lineStream.getReader();
    try {
      for (;;) {
        const { value, done } = await serialReader.read();
        if (done) break;
        parseMessage(value);
      }
    } catch (e) {
      if (e.name !== 'AbortError') log(`읽기 오류: ${e.message}`, 'error');
    }
    setSerialStatus(false);
    log('시리얼 연결 종료');
  }

  async function disconnectSerial() {
    try {
      if (serialReader) { await serialReader.cancel(); serialReader = null; }
      if (serialPort)   { await serialPort.close();    serialPort   = null; }
    } catch (e) { /* ignore */ }
    setSerialStatus(false);
    log('시리얼 연결 해제');
  }

  // ── WebSocket ──
  function toggleWs() {
    if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
      wsSocket.close();
      return;
    }
    const url = (document.getElementById('wsUrl').value || '').trim();
    try {
      wsSocket = new WebSocket(url);
    } catch (e) {
      log(`WebSocket 주소 오류: ${e.message}`, 'error');
      return;
    }
    wsSocket.onopen = () => {
      setWsStatus(true);
      log(`WebSocket 연결됨: ${url}`, 'success');
    };
    wsSocket.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'data')           parseMessage(msg.line);
        else if (msg.type === 'connected') log(msg.message, 'success');
      } catch { parseMessage(data); }
    };
    wsSocket.onclose = () => { setWsStatus(false); log('WebSocket 연결 종료'); };
    wsSocket.onerror = () => log(`WebSocket 오류: ${url} 에 연결할 수 없습니다.`, 'error');
  }

  // ── 초기화 ──
  function init() {
    if (!HAS_WEB_SERIAL) {
      const notice = document.getElementById('webSerialNoSupport');
      if (notice) notice.style.display = 'block';
      const btn = document.getElementById('btnSerialConnect');
      if (btn) btn.disabled = true;
    }
    document.getElementById('btnSerialConnect')  ?.addEventListener('click', connectSerial);
    document.getElementById('btnSerialDisconnect')?.addEventListener('click', disconnectSerial);
    document.getElementById('btnWsConnect')       ?.addEventListener('click', toggleWs);
    log('아두이노 연동 준비됨');
  }

  init();

  return { connectSerial, disconnectSerial, toggleWs, parseMessage };
})();
