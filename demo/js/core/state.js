import { $ } from "./dom.js";
import { pulse } from "./ui.js";

export const State = {
  score: 0,
  streak: 0,
  attempts: 0,
  correct: 0,
  byModule: {
    numline:  { task: 1, ok: 0, attempts: 0 },
    venn:     { task: 1, ok: 0, attempts: 0 },
    function: { task: 1, ok: 0, attempts: 0 },
    reffunc:  { task: 1, ok: 0, attempts: 0 },
    trig:     { task: 1, ok: 0, attempts: 0 },
    // Keşif modülleri (puan ve görev yok): analytic, triangle, prob, bayes
    analytic: {},
    triangle: {},
    prob:     {},
    bayes:    {},
    arith:    {},
    stats:    {},
    triglaw:  {},
  },
};

export function saveState() {
  try { localStorage.setItem("maariflab", JSON.stringify(State)); } catch {}
}

export function loadState() {
  try {
    // Geriye uyumluluk: önce yeni anahtar, sonra eski (mathlab-tr) denenir
    const raw = localStorage.getItem("maariflab") || localStorage.getItem("mathlab-tr");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    // Güvenli merge · yeni modül anahtarlarını ezmez
    if (parsed.byModule) {
      for (const k in parsed.byModule) {
        if (State.byModule[k]) Object.assign(State.byModule[k], parsed.byModule[k]);
      }
      delete parsed.byModule;
    }
    Object.assign(State, parsed);
  } catch {}
}

export function renderGlobalStats() {
  $("#stat-score").textContent = State.score;
  $("#stat-streak").textContent = State.streak;
  $("#stat-acc").textContent = State.attempts
    ? Math.round((State.correct / State.attempts) * 100) + "%"
    : "—";
}

export function renderModuleMini(modKey) {
  const m = State.byModule[modKey];
  if (!m) return;
  const root = document.getElementById(`${modKey}-mini`);
  if (!root) return;
  root.querySelectorAll(".v").forEach((el) => {
    const k = el.dataset.k;
    if (k === "task") el.textContent = m.task ?? 0;
    else if (k === "run") el.textContent = m.run ?? 0;
    else if (k === "ok") el.textContent = m.ok ?? 0;
    else if (k === "acc") {
      const a = m.attempts || 0;
      el.textContent = a ? Math.round((m.ok / a) * 100) + "%" : "—";
    } else if (k === "diff") {
      el.textContent = m.lastDiff == null ? "—" : m.lastDiff.toFixed(3);
    } else if (k === "pts") el.textContent = m.pts ?? 0;
  });
}

export function recordAttempt(modKey, isOk, pointsIfOk = 10) {
  State.attempts += 1;
  const m = State.byModule[modKey];
  if (m) m.attempts = (m.attempts || 0) + 1;
  if (isOk) {
    State.correct += 1;
    if (m) m.ok = (m.ok || 0) + 1;
    State.score += pointsIfOk;
    State.streak += 1;
    pulse($("#stat-score"));
  } else {
    State.streak = 0;
  }
  renderGlobalStats();
  renderModuleMini(modKey);
  saveState();
}
