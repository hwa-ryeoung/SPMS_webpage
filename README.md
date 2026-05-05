# SmartPark — 실시간 주차 현황 웹 페이지

아두이노 모형 주차장과 연동하는 졸업작품 시연용 웹 페이지입니다. 차량 운전자가 주차장 진입 전 빈자리를 확인할 수 있으며, 순수 HTML/CSS/JavaScript로 구현되어 별도 서버나 설치 없이 브라우저에서 바로 실행됩니다.

---

## 실행 방법

`index.html` 파일을 브라우저로 열기만 하면 즉시 실행됩니다.

```
parking-system/index.html  →  더블 클릭 또는 브라우저로 드래그
```

> 서버, Node.js, 별도 패키지 설치가 필요 없습니다.

---

## 파일 구조

```
parking-system/
├── index.html        # 페이지 뼈대. header / 대시보드 / 평면도 / 관리자 패널 / footer 구성
├── style.css         # 전체 레이아웃 및 주차 칸 상태별 색상 정의
├── parking-data.js   # 주차 칸 정적 데이터 (PARKING_SPOTS 배열). 가장 먼저 로드됨
└── app.js            # 상태 관리, 렌더링, 이벤트 처리, 아두이노 연동 API 구현
```

---

## 아두이노 연동 방법

### 브라우저 콘솔에서 직접 호출

페이지를 열고 **F12 → 콘솔 탭**에서 `updateSpot()` 함수를 직접 입력해 특정 칸의 상태를 바꿀 수 있습니다.

```js
// 특정 칸을 주차 중으로 변경
updateSpot("P1", "occupied")

// 특정 칸을 빈자리로 변경
updateSpot("P3", "empty")
```

| 매개변수 | 가능한 값 |
|---|---|
| id | `"P1"` `"P2"` `"P3"` `"P4"` `"P5"` `"P6"` |
| status | `"empty"` `"occupied"` |

유효하지 않은 값을 입력하면 콘솔에 경고 메시지가 출력됩니다.

### Web Serial API를 이용한 실제 연동 방향

현재 구조에서 **Web Serial API**를 사용하면 아두이노와 실시간으로 통신할 수 있습니다. 아래 흐름으로 발전시킬 수 있습니다.

```
아두이노 → USB 시리얼 → 브라우저 Web Serial API → updateSpot() 호출
```

```js
// 확장 예시 (app.js에 추가)
async function connectArduino() {
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });

  const reader = port.readable.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    // 아두이노에서 "P1,occupied" 형식으로 전송한다고 가정
    const [id, status] = new TextDecoder().decode(value).trim().split(",");
    updateSpot(id, status);
  }
}
```

> Web Serial API는 Chrome/Edge에서만 지원되며, HTTPS 또는 localhost 환경에서 동작합니다.

---

## 주차 칸 구성 변경 방법

주차 칸 수, 타입, 아이콘, 라벨을 바꾸려면 **`parking-data.js`만 수정**하면 됩니다. `app.js`와 `style.css`는 `PARKING_SPOTS` 배열을 그대로 읽어 동작하므로 별도 수정이 필요 없습니다.

```js
// parking-data.js
const PARKING_SPOTS = [
  { id: "P1", type: "ev",       icon: "⚡", label: "전기차" },
  { id: "P2", type: "compact",  icon: "🚗", label: "경차"   },
  // 칸을 추가하거나 삭제하면 자동으로 반영됩니다
];
```

지원하는 `type` 값과 색상:

| type | 색상 |
|---|---|
| `ev` | 보라 |
| `compact` | 노랑 |
| `disabled` | 파랑 |
| `general` | 초록 |
