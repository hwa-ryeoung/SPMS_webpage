// ===================================================
//  SmartPark 주차 감지 스케치 (초음파 센서 × 다중 칸)
//  전송 형식: P1:occupied / P1:empty (개행 포함)
//  연결 핀은 아래 TRIGGER_PINS / ECHO_PINS 배열로 설정
// ===================================================

#define NUM_SPOTS   3       // 감지할 주차 칸 수
#define THRESHOLD   20      // 이 거리(cm) 이하면 주차 중으로 판정
#define INTERVAL_MS 300     // 센서 측정 주기 (ms)

const int  TRIGGER_PINS[NUM_SPOTS] = { 2, 4, 6 };
const int  ECHO_PINS[NUM_SPOTS]    = { 3, 5, 7 };
const char* SPOT_IDS[NUM_SPOTS]    = { "P1", "P2", "P3" };

String lastStatus[NUM_SPOTS];  // 이전 상태 (변경 시에만 전송)

// ── 초음파 거리 측정 (cm) ──
long measureCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000UL);  // 최대 30ms 대기
  if (duration == 0) return -1;                      // 타임아웃 = 범위 초과
  return duration * 0.034 / 2;
}

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < NUM_SPOTS; i++) {
    pinMode(TRIGGER_PINS[i], OUTPUT);
    pinMode(ECHO_PINS[i], INPUT);
    lastStatus[i] = "";
  }
  Serial.println("SmartPark 센서 초기화 완료");
}

void loop() {
  for (int i = 0; i < NUM_SPOTS; i++) {
    long dist   = measureCm(TRIGGER_PINS[i], ECHO_PINS[i]);
    String stat = (dist > 0 && dist < THRESHOLD) ? "occupied" : "empty";

    // 상태가 바뀔 때만 전송 (불필요한 트래픽 방지)
    if (stat != lastStatus[i]) {
      Serial.print(SPOT_IDS[i]);
      Serial.print(":");
      Serial.println(stat);
      lastStatus[i] = stat;
    }

    delay(INTERVAL_MS / NUM_SPOTS);
  }
}
