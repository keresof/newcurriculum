const totalScoreEl = document.getElementById("total-score");
let totalScore = 0;

function addScore(points) {
  totalScore += points;
  totalScoreEl.textContent = totalScore.toString();
  localStorage.setItem("mathlab-tr-score", String(totalScore));
}

function restoreScore() {
  const saved = Number(localStorage.getItem("mathlab-tr-score"));
  if (!Number.isNaN(saved) && saved > 0) {
    totalScore = saved;
    totalScoreEl.textContent = String(saved);
  }
}

// --- 1) Interval hunt ---
const intervalTargetEl = document.getElementById("interval-target");
const leftValueEl = document.getElementById("left-value");
const rightValueEl = document.getElementById("right-value");
const leftTypeEl = document.getElementById("left-type");
const rightTypeEl = document.getElementById("right-type");
const intervalFeedbackEl = document.getElementById("interval-feedback");

let intervalTarget = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function newIntervalTask() {
  const a = randomInt(-8, 5);
  const b = randomInt(a + 1, 10);
  const leftClosed = Math.random() > 0.5;
  const rightClosed = Math.random() > 0.5;
  intervalTarget = {
    a,
    b,
    left: leftClosed ? "[" : "(",
    right: rightClosed ? "]" : ")",
  };
  intervalTargetEl.textContent = `Hedef aralik: ${intervalTarget.left}${a}, ${b}${intervalTarget.right}`;
  intervalFeedbackEl.textContent = "";
}

function checkInterval() {
  const user = {
    a: Number(leftValueEl.value),
    b: Number(rightValueEl.value),
    left: leftTypeEl.value,
    right: rightTypeEl.value,
  };

  const ok =
    user.a === intervalTarget.a &&
    user.b === intervalTarget.b &&
    user.left === intervalTarget.left &&
    user.right === intervalTarget.right;

  if (ok) {
    intervalFeedbackEl.textContent = "Dogru! +10 puan";
    intervalFeedbackEl.className = "feedback ok";
    addScore(10);
  } else {
    intervalFeedbackEl.textContent = "Tam olmadi. Araligi tekrar incele.";
    intervalFeedbackEl.className = "feedback warn";
  }
}

// --- 2) Function machine ---
const functionTargetEl = document.getElementById("function-target");
const aSliderEl = document.getElementById("a-slider");
const bSliderEl = document.getElementById("b-slider");
const aValueEl = document.getElementById("a-value");
const bValueEl = document.getElementById("b-value");
const functionFeedbackEl = document.getElementById("function-feedback");
const graphCanvas = document.getElementById("graph");
const graphCtx = graphCanvas.getContext("2d");

let functionTarget = null;

function newFunctionTask() {
  const x1 = randomInt(-4, -1);
  const x2 = randomInt(1, 4);
  const a = randomInt(-3, 3) || 1;
  const b = randomInt(-4, 4);
  functionTarget = {
    x1,
    y1: a * x1 + b,
    x2,
    y2: a * x2 + b,
    a,
    b,
  };
  functionTargetEl.textContent = `Hedef: Dogru (${x1}, ${functionTarget.y1}) ve (${x2}, ${functionTarget.y2}) noktalarindan gecsin.`;
  functionFeedbackEl.textContent = "";
  drawGraph();
}

function readLine() {
  return {
    a: Number(aSliderEl.value),
    b: Number(bSliderEl.value),
  };
}

function toCanvas(x, y) {
  const px = graphCanvas.width / 2 + x * 25;
  const py = graphCanvas.height / 2 - y * 20;
  return { x: px, y: py };
}

function drawAxes() {
  graphCtx.strokeStyle = "#9ca3af";
  graphCtx.lineWidth = 1;
  graphCtx.beginPath();
  graphCtx.moveTo(0, graphCanvas.height / 2);
  graphCtx.lineTo(graphCanvas.width, graphCanvas.height / 2);
  graphCtx.moveTo(graphCanvas.width / 2, 0);
  graphCtx.lineTo(graphCanvas.width / 2, graphCanvas.height);
  graphCtx.stroke();
}

function drawTargetPoints() {
  [ [functionTarget.x1, functionTarget.y1], [functionTarget.x2, functionTarget.y2] ].forEach(([x, y]) => {
    const p = toCanvas(x, y);
    graphCtx.fillStyle = "#ef4444";
    graphCtx.beginPath();
    graphCtx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    graphCtx.fill();
  });
}

function drawLine() {
  const { a, b } = readLine();
  const xMin = -7;
  const xMax = 7;
  const yMin = a * xMin + b;
  const yMax = a * xMax + b;
  const p1 = toCanvas(xMin, yMin);
  const p2 = toCanvas(xMax, yMax);
  graphCtx.strokeStyle = "#22c55e";
  graphCtx.lineWidth = 2;
  graphCtx.beginPath();
  graphCtx.moveTo(p1.x, p1.y);
  graphCtx.lineTo(p2.x, p2.y);
  graphCtx.stroke();
}

function drawGraph() {
  graphCtx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
  drawAxes();
  drawTargetPoints();
  drawLine();
}

function updateLineLabels() {
  aValueEl.textContent = Number(aSliderEl.value).toFixed(1);
  bValueEl.textContent = Number(bSliderEl.value).toFixed(1);
}

function checkFunction() {
  const { a, b } = readLine();
  const error = Math.abs(a - functionTarget.a) + Math.abs(b - functionTarget.b);
  if (error < 0.2) {
    functionFeedbackEl.textContent = "Harika! Hedef dogruyu yakaladin. +15 puan";
    functionFeedbackEl.className = "feedback ok";
    addScore(15);
  } else if (error < 1.2) {
    functionFeedbackEl.textContent = "Cok yaklastin. Kucuk bir ayar daha yap.";
    functionFeedbackEl.className = "feedback warn";
  } else {
    functionFeedbackEl.textContent = "Noktalara gore egim ve kesimi tekrar dusun.";
    functionFeedbackEl.className = "feedback warn";
  }
}

// --- 3) Probability simulation ---
const pSliderEl = document.getElementById("p-slider");
const pValueEl = document.getElementById("p-value");
const trialCountEl = document.getElementById("trial-count");
const probResultEl = document.getElementById("prob-result");

function runSimulation() {
  const p = Number(pSliderEl.value);
  const trials = Number(trialCountEl.value);

  let success = 0;
  for (let i = 0; i < trials; i += 1) {
    if (Math.random() < p) success += 1;
  }
  const exp = success / trials;
  const diff = Math.abs(exp - p);

  probResultEl.textContent = `Teorik: ${p.toFixed(2)} | Deneysel: ${exp.toFixed(2)} | Fark: ${diff.toFixed(2)}`;
  if (diff <= 0.05) {
    probResultEl.className = "feedback ok";
    addScore(8);
  } else {
    probResultEl.className = "feedback warn";
  }
}

function updatePLabel() {
  pValueEl.textContent = Number(pSliderEl.value).toFixed(2);
}

// --- bindings ---
document.getElementById("new-interval").addEventListener("click", newIntervalTask);
document.getElementById("check-interval").addEventListener("click", checkInterval);

document.getElementById("new-function").addEventListener("click", newFunctionTask);
document.getElementById("check-function").addEventListener("click", checkFunction);
aSliderEl.addEventListener("input", () => {
  updateLineLabels();
  drawGraph();
});
bSliderEl.addEventListener("input", () => {
  updateLineLabels();
  drawGraph();
});

document.getElementById("run-sim").addEventListener("click", runSimulation);
pSliderEl.addEventListener("input", updatePLabel);

restoreScore();
newIntervalTask();
newFunctionTask();
updateLineLabels();
updatePLabel();
