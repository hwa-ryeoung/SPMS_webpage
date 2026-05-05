# SmartPark — 실시간 주차 현황 웹 페이지

아두이노 모형 주차장과 연동하는 졸업작품 시연용 웹 페이지입니다.  
차량 운전자가 주차장 진입 전 빈자리를 확인할 수 있으며, 아두이노 센서 데이터를 실시간으로 반영합니다.

---

## 파일 구조

```
parking-system/
├── index.html              # 페이지 전체 구조 (대시보드 / 평면도 / 아두이노 연동 / 관리자 패널)
├── style.css               # 레이아웃, 주차 칸 색상, 시리얼 패널 스타일
├── parking-data.js         # 주차 칸 정적 데이터 (PARKING_SPOTS 배열)
├── app.js                  # 상태 관리, 렌더링, 이벤트 처리
├── arduino-serial.js       # 아두이노 연동 (Web Serial API + WebSocket 클라이언트)
├── serial-bridge/
│   ├── server.js           # Node.js WebSocket 브릿지 서버
│   └── package.json
└── arduino/
    └── parking_sensor.ino  # 초음파 센서 아두이노 스케치 (3칸 예제)
```

---

## 실행 방법

### 기본 실행 (브라우저만)

```
parking-system/index.html  →  더블 클릭 또는 브라우저로 드래그
```

관리자 패널의 **시뮬레이션 실행** 버튼과 칸 클릭으로 동작을 확인할 수 있습니다.

> **주의:** Web Serial API 연동은 `file://` 경로에서 동작하지 않습니다.  
> 아두이노와 실제 연결하려면 아래 중 하나를 사용하세요.
>
> - VS Code Live Server 확장으로 `localhost` 실행
> - `npx serve .` 명령으로 로컬 서버 실행

---

## 아두이노 연동 방법

### 방식 1 — Web Serial API (서버 불필요, Chrome / Edge 전용)

1. Chrome 또는 Edge에서 `localhost`로 페이지 접속
2. 아두이노를 USB로 PC에 연결
3. 페이지의 **아두이노 연동** 섹션에서 Baud rate 선택 후 **포트 연결** 클릭
4. 브라우저 팝업에서 아두이노 포트 선택 → 자동으로 데이터 수신 시작

```
아두이노 → USB 시리얼 → Web Serial API → updateSpot() → 화면 반영
```

### 방식 2 — WebSocket 브릿지 (모든 브라우저)

Node.js 서버가 시리얼 포트를 읽어 WebSocket으로 브라우저에 전달합니다.

**1단계: 브릿지 서버 설치 및 실행**

```bash
cd serial-bridge
npm install
node server.js
```

포트 번호는 환경변수로 변경할 수 있습니다.

```bash
# Windows PowerShell
$env:SERIAL_PORT="COM5"; $env:BAUD_RATE="9600"; node server.js

# Mac / Linux
SERIAL_PORT=/dev/ttyUSB0 BAUD_RATE=9600 node server.js
```

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `SERIAL_PORT` | `COM3` | 아두이노 시리얼 포트 |
| `BAUD_RATE` | `9600` | 통신 속도 |
| `WS_PORT` | `8080` | WebSocket 서버 포트 |

**2단계: 브라우저에서 연결**

페이지의 **WebSocket 브릿지** 섹션에 `ws://localhost:8080` 입력 → **연결** 클릭

```
아두이노 → USB 시리얼 → Node.js 브릿지 → WebSocket → 화면 반영
```

---

## 아두이노 전송 포맷

아두이노 스케치에서 아래 형식 중 하나로 시리얼 출력하면 자동으로 파싱됩니다.

| 형식 | 예시 | 의미 |
|---|---|---|
| `ID:occupied` | `P1:occupied` | P1 주차 중 |
| `ID:empty` | `P1:empty` | P1 비어있음 |
| `ID:1` / `ID:0` | `P1:1` | 주차 중 / 비어있음 (단축) |
| JSON | `{"id":"P1","status":"occupied"}` | JSON 포맷 |

**아두이노 시리얼 출력 예시 (C++):**

```cpp
Serial.println("P1:occupied");  // P1 주차 중
Serial.println("P1:empty");     // P1 비어있음
```

`arduino/parking_sensor.ino` 파일에 초음파 센서 3칸 예제가 포함되어 있습니다.  
`NUM_SPOTS`, `THRESHOLD`, 핀 번호를 실제 구성에 맞게 수정하세요.

---

## 브라우저 콘솔에서 직접 호출

F12 → 콘솔 탭에서 `updateSpot()` 함수를 직접 호출해 상태를 변경할 수 있습니다.

```js
updateSpot("P1", "occupied")  // P1 주차 중
updateSpot("P3", "empty")     // P3 비어있음
```

| 매개변수 | 가능한 값 |
|---|---|
| `id` | `"P1"` `"P2"` `"P3"` `"P4"` `"P5"` `"P6"` |
| `status` | `"empty"` `"occupied"` |

---

## 주차 칸 구성 변경

주차 칸 수, 타입, 아이콘, 라벨은 **`parking-data.js`만 수정**하면 자동으로 반영됩니다.

```js
// parking-data.js
const PARKING_SPOTS = [
  { id: "P1", type: "ev",       icon: "⚡", label: "전기차" },
  { id: "P2", type: "compact",  icon: "🚗", label: "경차"   },
  { id: "P3", type: "disabled", icon: "♿", label: "장애인" },
  // 칸을 추가하거나 삭제하면 자동으로 반영됩니다
];
```

| `type` 값 | 색상 |
|---|---|
| `ev` | 보라 |
| `compact` | 노랑 |
| `disabled` | 파랑 |
| `general` | 초록 |
