const STORAGE_KEY = "smartpark_state";

// ===== 상태 관리 =====

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);

  const initial = {};
  PARKING_SPOTS.forEach((spot) => {
    initial[spot.id] = "empty";
  });
  return initial;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// ===== 렌더링 =====

function render() {
  const grid = document.getElementById("spotsGrid");
  grid.innerHTML = "";

  PARKING_SPOTS.forEach((spot) => {
    const status = state[spot.id] ?? "empty";
    const isOccupied = status === "occupied";

    const div = document.createElement("div");
    div.className = `spot ${status} type-${spot.type}`;

    const icon = document.createElement("span");
    icon.className = "spot-icon";
    icon.textContent = isOccupied ? "🚘" : spot.icon;

    const id = document.createElement("span");
    id.className = "spot-id";
    id.textContent = spot.id;

    const label = document.createElement("span");
    label.className = "spot-label";
    label.textContent = isOccupied ? "주차 중" : spot.label;

    div.appendChild(icon);
    div.appendChild(id);
    div.appendChild(label);

    div.addEventListener("click", () => toggleSpot(spot.id));
    grid.appendChild(div);
  });

  updateDashboard();
}

// ===== 대시보드 업데이트 =====

function updateDashboard() {
  const total = PARKING_SPOTS.length;
  const used = PARKING_SPOTS.filter((s) => state[s.id] === "occupied").length;
  const empty = total - used;
  const rate = Math.round((used / total) * 100);

  document.getElementById("total").textContent = total;
  document.getElementById("empty").textContent = empty;
  document.getElementById("used").textContent = used;
  document.getElementById("rate").textContent = rate + "%";
  document.getElementById("progressBar").style.width = rate + "%";
}

// ===== 칸 토글 =====

function toggleSpot(id) {
  state[id] = state[id] === "occupied" ? "empty" : "occupied";
  saveState(state);
  render();
}

// ===== 아두이노 연동용 외부 API =====

/**
 * 아두이노 또는 외부에서 특정 칸의 상태를 변경할 때 호출
 * 브라우저 콘솔 사용 예:
 *   updateSpot("P1", "occupied")
 *   updateSpot("P3", "empty")
 */
function updateSpot(id, status) {
  const validIds = PARKING_SPOTS.map((s) => s.id);
  const validStatuses = ["empty", "occupied"];

  if (!validIds.includes(id)) {
    console.warn(`[SmartPark] 유효하지 않은 주차 칸 id: "${id}". 가능한 값: ${validIds.join(", ")}`);
    return;
  }
  if (!validStatuses.includes(status)) {
    console.warn(`[SmartPark] 유효하지 않은 status: "${status}". 가능한 값: empty, occupied`);
    return;
  }

  state[id] = status;
  saveState(state);
  render();
  console.log(`[SmartPark] ${id} → ${status}`);
}

window.updateSpot = updateSpot;

// ===== 버튼 이벤트 =====

document.getElementById("btnSim").addEventListener("click", () => {
  PARKING_SPOTS.forEach((spot) => {
    state[spot.id] = Math.random() < 0.5 ? "occupied" : "empty";
  });
  saveState(state);
  render();
});

document.getElementById("btnReset").addEventListener("click", () => {
  if (!confirm("전체 주차 칸을 초기화하시겠습니까?")) return;
  PARKING_SPOTS.forEach((spot) => {
    state[spot.id] = "empty";
  });
  saveState(state);
  render();
});

// ===== 초기 실행 =====

render();
