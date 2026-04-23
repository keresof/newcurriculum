// MathLab TR · TYMM 9-10 Demo
// 7 modül: NumLine, Function, RefFunc, Trig, Triangle, Probability, Bayes
//
// =========================================================================
// DESIGN PRINCIPLES (zorunlu — her yeni modülde uygulanmalı)
// =========================================================================
//
// 1) CEVAP KABUL KRİTERİ · Bir kullanıcı cevabı, hedefin MATEMATİKSEL
//    EŞDEĞERİ olduğu sürece kabul edilir. "Benim seçtiğim spesifik
//    parametreleri bul" mantığı YASAK.
//    - Fonksiyonlar için: örnekleme ile eşdeğerlik (RMSE)
//    - Kümeler/aralıklar için: küme eşitliği
//    - Sayısal hedefler için: tolerans içinde mutlak fark
//    - ASLA: `user.a === target.a && user.r === target.r && ...` tarzı
//
// 2) GÖREVLERİN ŞEKLİ · Bir modül görev üretecekse 3 tip kabul edilir:
//    a) Tek-cevaplı tam eşleşme (örn. "hedef aralığı inşa et" — aralığın
//       tek bir [a,b] + kapsam gösterimi var)
//    b) Koşul-tabanlı çoklu-cevap ("sin θ negatif olsun", "II. kadrana
//       gir") — koşulu sağlayan her cevap geçerlidir
//    c) Eşdeğerlik-tabanlı ("bu grafiği yakala" — aynı çıktıyı veren
//       her parametre kombinasyonu geçerlidir)
//    Bunlardan hiçbiri uymuyorsa → GÖREV ÜRETME, sadece keşif modu.
//
// 3) STATİK SVG · Etkileşimli SVG'ler bir kez `buildSVG()` ile inşa edilir,
//    sonraki render çağrıları yalnızca attribute günceller. innerHTML ile
//    re-render YASAK (pointer capture, listener kaybına yol açar).
//
// 4) ÇOKLU-GİRİŞ SENKRONU · Aynı state birden fazla kontrolden
//    güncellenebiliyorsa (slider + select + drag), tek bir state
//    objesi üzerinden syncFormFromState + syncStateFromForm ile çift
//    yönlü köprü kurulur.
// =========================================================================

// ============================================================
// Helpers & shared state
// ============================================================
const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const setAttrs = (el, attrs) => {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
};
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const State = {
  score: 0,
  streak: 0,
  attempts: 0,
  correct: 0,
  byModule: {
    numline:  { task: 1, ok: 0, attempts: 0 },
    function: { task: 1, ok: 0, attempts: 0 },
    reffunc:  { task: 1, ok: 0, attempts: 0 },
    trig:     { task: 1, ok: 0, attempts: 0 },
    prob:     { run: 0, pts: 0, lastDiff: null, attempts: 0, ok: 0 },
  },
};

function saveState() {
  try { localStorage.setItem("mathlab-tr", JSON.stringify(State)); } catch {}
}
function loadState() {
  try {
    const raw = localStorage.getItem("mathlab-tr");
    if (!raw) return;
    Object.assign(State, JSON.parse(raw));
  } catch {}
}
function renderGlobalStats() {
  $("#stat-score").textContent = State.score;
  $("#stat-streak").textContent = State.streak;
  $("#stat-acc").textContent = State.attempts
    ? Math.round((State.correct / State.attempts) * 100) + "%"
    : "—";
}
function renderModuleMini(modKey) {
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
function recordAttempt(modKey, isOk, pointsIfOk = 10) {
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
function pulse(el) {
  if (!el || !el.animate) return;
  el.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
    { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" }
  );
}
function toast(message, kind = "info") {
  const host = $("#toast-host");
  if (!host) return;
  const t = document.createElement("div");
  t.className = `toast ${kind}`;
  t.innerHTML = `<span class="dot"></span><span>${message}</span>`;
  host.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ============================================================
// Tabs
// ============================================================
function initTabs() {
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.dataset.tab;
      $$(".module").forEach((m) => m.classList.remove("active"));
      const mod = document.getElementById(`mod-${key}`);
      if (mod) mod.classList.add("active");
      // Re-render canvases that depend on size when tab opens
      if (key === "function") FunctionMod.resize();
      if (key === "reffunc") RefFuncMod.resize();
    });
  });
}

// ============================================================
// Module A · Number line hunt (statik SVG · tam senkron)
// ============================================================
const NumLine = (() => {
  const svg = $("#numline-svg");
  const W = 720, H = 240, padX = 50;
  const axisY = 150;
  const xToPx = (x) => padX + ((x + 10) / 20) * (W - 2 * padX);
  const pxToX = (px) => Math.round(((px - padX) / (W - 2 * padX)) * 20 - 10);

  const target = { a: -3, b: 4, leftClosed: true, rightClosed: true };
  const user   = { a: -3, b: 4, leftClosed: true, rightClosed: true };

  // Persistent SVG references (created once)
  const refs = {};
  let dragging = null;

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Background label zones
    svg.appendChild(svgEl("text", {
      x: padX, y: axisY - 80, class: "label-zone", "text-anchor": "start",
    })).textContent = "HEDEF";
    svg.appendChild(svgEl("text", {
      x: padX, y: axisY + 88, class: "label-zone", "text-anchor": "start",
    })).textContent = "SEN";

    // Target band + endpoints (above axis)
    refs.targetBand = svg.appendChild(svgEl("rect", {
      class: "interval-band-target", y: axisY - 60, height: 22, rx: 6,
    }));
    refs.targetLeft = svg.appendChild(svgEl("circle", {
      class: "endpoint-target closed", cy: axisY - 49, r: 7,
    }));
    refs.targetRight = svg.appendChild(svgEl("circle", {
      class: "endpoint-target closed", cy: axisY - 49, r: 7,
    }));
    refs.targetLabelL = svg.appendChild(svgEl("text", {
      y: axisY - 70, "text-anchor": "middle", "font-size": 12, fill: "#b45309", "font-weight": 700,
    }));
    refs.targetLabelR = svg.appendChild(svgEl("text", {
      y: axisY - 70, "text-anchor": "middle", "font-size": 12, fill: "#b45309", "font-weight": 700,
    }));

    // Axis
    svg.appendChild(svgEl("line", {
      class: "axis", x1: padX, y1: axisY, x2: W - padX, y2: axisY,
      stroke: "#cbd5e1", "stroke-width": 2,
    }));

    // Ticks
    for (let x = -10; x <= 10; x += 1) {
      const px = xToPx(x);
      const big = x % 5 === 0;
      svg.appendChild(svgEl("line", {
        class: "tick",
        x1: px, y1: axisY - (big ? 8 : 4),
        x2: px, y2: axisY + (big ? 8 : 4),
        stroke: "#cbd5e1",
      }));
      if (big) {
        const t = svg.appendChild(svgEl("text", {
          x: px, y: axisY + 26, "text-anchor": "middle", "font-size": 12, fill: "#94a3b8",
        }));
        t.textContent = x;
      }
    }

    // User band + endpoints (below axis)
    refs.userBand = svg.appendChild(svgEl("rect", {
      class: "interval-band-user", y: axisY + 38, height: 22, rx: 6,
    }));
    refs.userLeft = svg.appendChild(svgEl("circle", {
      class: "endpoint-user closed", cy: axisY + 49, r: 11,
      "data-side": "left",
    }));
    refs.userRight = svg.appendChild(svgEl("circle", {
      class: "endpoint-user closed", cy: axisY + 49, r: 11,
      "data-side": "right",
    }));
    refs.userLabelL = svg.appendChild(svgEl("text", {
      y: axisY + 78, "text-anchor": "middle", "font-size": 13, fill: "#312e81", "font-weight": 700,
    }));
    refs.userLabelR = svg.appendChild(svgEl("text", {
      y: axisY + 78, "text-anchor": "middle", "font-size": 13, fill: "#312e81", "font-weight": 700,
    }));

    // Bind drag handlers ONCE
    [refs.userLeft, refs.userRight].forEach((node) => {
      node.addEventListener("pointerdown", onDragStart);
      node.addEventListener("click", (e) => {
        // click toggles closed (no real movement)
        if (!dragging || !dragging.moved) toggleClosed(node.dataset.side);
        dragging = null;
      });
    });
  }

  function onDragStart(e) {
    e.preventDefault();
    const node = e.currentTarget;
    node.setPointerCapture?.(e.pointerId);
    dragging = { side: node.dataset.side, moved: false, pointerId: e.pointerId };
    node.addEventListener("pointermove", onDragMove);
    node.addEventListener("pointerup", onDragEnd);
    node.addEventListener("pointercancel", onDragEnd);
  }
  function onDragMove(e) {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    const px = (e.clientX - rect.left) * ratio;
    const x = clamp(pxToX(px), -10, 10);
    if (dragging.side === "left")  { user.a = x; }
    if (dragging.side === "right") { user.b = x; }
    dragging.moved = true;
    syncFormFromUser();
    render();
  }
  function onDragEnd(e) {
    const node = e.currentTarget;
    node.removeEventListener("pointermove", onDragMove);
    node.removeEventListener("pointerup", onDragEnd);
    node.removeEventListener("pointercancel", onDragEnd);
    node.releasePointerCapture?.(e.pointerId);
    // Keep dragging.moved info for the click handler that fires after pointerup
    setTimeout(() => { dragging = null; }, 0);
  }

  function toggleClosed(side) {
    if (side === "left") user.leftClosed = !user.leftClosed;
    if (side === "right") user.rightClosed = !user.rightClosed;
    syncFormFromUser();
    render();
  }

  function syncFormFromUser() {
    $("#num-left").value  = user.a;
    $("#num-right").value = user.b;
    $("#num-left-v").textContent  = user.a;
    $("#num-right-v").textContent = user.b;
    $("#num-left-type").value  = user.leftClosed  ? "closed" : "open";
    $("#num-right-type").value = user.rightClosed ? "closed" : "open";
    $("#num-li").textContent = user.leftClosed  ? "[" : "(";
    $("#num-ri").textContent = user.rightClosed ? "]" : ")";
  }

  function syncUserFromForm() {
    user.a = Number($("#num-left").value);
    user.b = Number($("#num-right").value);
    user.leftClosed  = $("#num-left-type").value  === "closed";
    user.rightClosed = $("#num-right-type").value === "closed";
    $("#num-left-v").textContent  = user.a;
    $("#num-right-v").textContent = user.b;
    $("#num-li").textContent = user.leftClosed  ? "[" : "(";
    $("#num-ri").textContent = user.rightClosed ? "]" : ")";
    render();
  }

  function newTask() {
    const a = randomInt(-9, 4);
    const b = randomInt(a + 2, 10);
    target.a = a;
    target.b = b;
    target.leftClosed  = Math.random() > 0.5;
    target.rightClosed = Math.random() > 0.5;

    State.byModule.numline.task = (State.byModule.numline.task || 0) + 1;
    const lc = target.leftClosed  ? "[" : "(";
    const rc = target.rightClosed ? "]" : ")";
    $("#numline-target").innerHTML =
      `Hedef aralık: <b>${lc}${a}, ${b}${rc}</b> — turuncu kesikli aralığa eşitle.`;
    $("#numline-fb").textContent = "";
    $("#numline-fb").className = "feedback";
    renderModuleMini("numline");
    render();
  }

  function render() {
    const tA = Math.min(target.a, target.b);
    const tB = Math.max(target.a, target.b);
    const uA = Math.min(user.a, user.b);
    const uB = Math.max(user.a, user.b);

    // Target
    setAttrs(refs.targetBand, {
      x: xToPx(tA),
      width: xToPx(tB) - xToPx(tA),
    });
    setAttrs(refs.targetLeft, {
      cx: xToPx(target.a),
      class: "endpoint-target " + (target.leftClosed ? "closed" : "open"),
    });
    setAttrs(refs.targetRight, {
      cx: xToPx(target.b),
      class: "endpoint-target " + (target.rightClosed ? "closed" : "open"),
    });
    refs.targetLabelL.setAttribute("x", xToPx(target.a));
    refs.targetLabelL.textContent = `${target.leftClosed ? "[" : "("}${target.a}`;
    refs.targetLabelR.setAttribute("x", xToPx(target.b));
    refs.targetLabelR.textContent = `${target.b}${target.rightClosed ? "]" : ")"}`;

    // User
    setAttrs(refs.userBand, {
      x: xToPx(uA),
      width: xToPx(uB) - xToPx(uA),
    });
    setAttrs(refs.userLeft, {
      cx: xToPx(user.a),
      class: "endpoint-user " + (user.leftClosed ? "closed" : "open"),
    });
    setAttrs(refs.userRight, {
      cx: xToPx(user.b),
      class: "endpoint-user " + (user.rightClosed ? "closed" : "open"),
    });
    refs.userLabelL.setAttribute("x", xToPx(user.a));
    refs.userLabelL.textContent = `${user.leftClosed ? "[" : "("}${user.a}`;
    refs.userLabelR.setAttribute("x", xToPx(user.b));
    refs.userLabelR.textContent = `${user.b}${user.rightClosed ? "]" : ")"}`;
  }

  function check() {
    const ok =
      user.a === target.a &&
      user.b === target.b &&
      user.leftClosed  === target.leftClosed &&
      user.rightClosed === target.rightClosed;
    const fb = $("#numline-fb");
    if (ok) {
      fb.textContent = "Harika! Aralığı tam yakaladın. +10 puan";
      fb.className = "feedback ok";
      toast("Doğru aralık · +10 puan", "ok");
      recordAttempt("numline", true, 10);
      setTimeout(newTask, 700);
    } else {
      const diffs = [];
      if (user.a !== target.a) diffs.push("sol uç");
      if (user.b !== target.b) diffs.push("sağ uç");
      if (user.leftClosed  !== target.leftClosed)  diffs.push("sol kapsam");
      if (user.rightClosed !== target.rightClosed) diffs.push("sağ kapsam");
      fb.textContent = `Eksik: ${diffs.join(", ")}.`;
      fb.className = "feedback warn";
      toast("Tam uymadı, tekrar dene", "warn");
      recordAttempt("numline", false);
    }
  }

  function hint() {
    toast(`Sol uç ${target.a}, sağ uç ${target.b}. Kapsamı kendin bul 😉`);
  }

  function init() {
    buildSVG();
    $("#num-left").addEventListener("input", syncUserFromForm);
    $("#num-right").addEventListener("input", syncUserFromForm);
    $("#num-left-type").addEventListener("change", syncUserFromForm);
    $("#num-right-type").addEventListener("change", syncUserFromForm);
    $("#numline-check").addEventListener("click", check);
    $("#numline-new").addEventListener("click", newTask);
    $("#numline-hint").addEventListener("click", hint);
    syncUserFromForm();
    newTask();
  }

  return { init };
})();

// ============================================================
// Module B · Function machine (linear y=ax+b)
// ============================================================
const FunctionMod = (() => {
  const canvas = $("#graph");
  const ctx = canvas.getContext("2d");
  const xMin = -10, xMax = 10, yMin = -10, yMax = 10;

  let target = null;
  let anim = { a: 1, b: 0 };
  let lastSize = { w: 0, h: 0 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === lastSize.w && h === lastSize.h) return;
    lastSize = { w, h };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function toPx(x, y) {
    const w = lastSize.w, h = lastSize.h;
    return {
      px: ((x - xMin) / (xMax - xMin)) * w,
      py: h - ((y - yMin) / (yMax - yMin)) * h,
    };
  }

  function drawGrid() {
    const w = lastSize.w, h = lastSize.h;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#fbfcff");
    grad.addColorStop(1, "#f1f4fb");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    for (let x = xMin; x <= xMax; x += 1) {
      const { px } = toPx(x, 0);
      ctx.strokeStyle = x % 5 === 0 ? "#cbd5e1" : "#e5e9f3";
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    }
    for (let y = yMin; y <= yMax; y += 1) {
      const { py } = toPx(0, y);
      ctx.strokeStyle = y % 5 === 0 ? "#cbd5e1" : "#e5e9f3";
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    }
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    const ax = toPx(0, 0);
    ctx.beginPath(); ctx.moveTo(0, ax.py); ctx.lineTo(w, ax.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax.px, 0); ctx.lineTo(ax.px, h); ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let x = xMin; x <= xMax; x += 5) {
      if (x === 0) continue;
      const { px, py } = toPx(x, 0);
      ctx.fillText(String(x), px, py + 14);
    }
    ctx.textAlign = "left";
    for (let y = yMin; y <= yMax; y += 5) {
      if (y === 0) continue;
      const { px, py } = toPx(0, y);
      ctx.fillText(String(y), px + 6, py + 3);
    }
  }
  function drawTarget() {
    if (!target) return;
    const t = Date.now() / 400;
    const pulseR = 8 + Math.sin(t) * 2;
    [[target.x1, target.y1], [target.x2, target.y2]].forEach(([x, y]) => {
      const { px, py } = toPx(x, y);
      ctx.beginPath(); ctx.arc(px, py, pulseR + 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245,158,11,0.18)"; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b"; ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "600 11px Inter, system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`(${x}, ${y})`, px + 10, py - 8);
    });
  }
  function drawLine() {
    const p1 = toPx(xMin, anim.a * xMin + anim.b);
    const p2 = toPx(xMax, anim.a * xMax + anim.b);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#6366f1";
    ctx.shadowColor = "rgba(99,102,241,.35)";
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function readSliders() {
    // Slider is the single source of truth; number input mirrors it
    return { a: Number($("#a-slider").value), b: Number($("#b-slider").value) };
  }
  // Çift yönlü senkron: slider ↔ number input
  function syncFromSlider(whichId, numId) {
    return () => {
      const v = Number($("#" + whichId).value);
      $("#" + numId).value = v.toFixed(1);
      updateLabels();
    };
  }
  function syncFromNumber(whichId, sliderId, min, max) {
    return () => {
      let v = Number($("#" + whichId).value);
      if (!Number.isFinite(v)) v = 0;
      v = clamp(v, min, max);
      $("#" + sliderId).value = v;
      updateLabels();
    };
  }
  function loop() {
    resize();
    if (lastSize.w > 0) {
      const { a, b } = readSliders();
      anim.a += (a - anim.a) * 0.2;
      anim.b += (b - anim.b) * 0.2;
      drawGrid();
      drawTarget();
      drawLine();
    }
    requestAnimationFrame(loop);
  }
  function newTask() {
    // DESIGN: Hedef noktaların grid [-10,10]x[-10,10] içinde kalmasını garanti et.
    // Aksi halde öğrenci hedef noktaları göremez, oyun bozulur.
    let x1, x2, a, b, y1, y2, tries = 0;
    do {
      x1 = randomInt(-5, -1);
      x2 = randomInt(1, 5);
      a = randomInt(-3, 3);
      if (a === 0) a = 1;
      b = randomInt(-5, 5);
      y1 = a * x1 + b;
      y2 = a * x2 + b;
      tries++;
    } while (
      (Math.abs(y1) > 9 || Math.abs(y2) > 9) && tries < 50
    );
    target = { x1, y1, x2, y2, a, b };
    State.byModule.function.task = (State.byModule.function.task || 0) + 1;
    $("#function-target").innerHTML =
      `Hedef: Doğru <b>(${x1}, ${y1})</b> ve <b>(${x2}, ${y2})</b> noktalarından geçsin.`;
    $("#function-fb").textContent = "";
    $("#function-fb").className = "feedback";
    renderModuleMini("function");
  }
  function updateLabels() {
    const { a, b } = readSliders();
    // Sync number inputs (keep slider as source of truth; number just mirrors)
    if (document.activeElement?.id !== "a-num") $("#a-num").value = a.toFixed(1);
    if (document.activeElement?.id !== "b-num") $("#b-num").value = b.toFixed(1);
    const sign = b >= 0 ? "+" : "−";
    $("#eq").textContent = `y = ${a.toFixed(1)}·x ${sign} ${Math.abs(b).toFixed(1)}`;
  }
  function check() {
    const { a, b } = readSliders();
    const err = Math.abs(a - target.a) + Math.abs(b - target.b);
    const fb = $("#function-fb");
    if (err < 0.25) {
      fb.textContent = `Mükemmel! a=${target.a}, b=${target.b}. +15 puan`;
      fb.className = "feedback ok";
      toast("Doğruyu yakaladın · +15 puan", "ok");
      recordAttempt("function", true, 15);
      setTimeout(newTask, 800);
    } else if (err < 1.2) {
      fb.textContent = `Çok yaklaştın (fark ≈ ${err.toFixed(2)}). İnce ayar yap.`;
      fb.className = "feedback warn";
      recordAttempt("function", false);
    } else {
      const slope = ((target.y2 - target.y1)/(target.x2 - target.x1)).toFixed(1);
      fb.textContent = `Eğim Δy/Δx = ${slope}. Tekrar dene.`;
      fb.className = "feedback warn";
      recordAttempt("function", false);
    }
  }
  function hint() {
    const slope = (target.y2 - target.y1) / (target.x2 - target.x1);
    toast(`Eğim ≈ ${slope.toFixed(1)}. y(0) = b'yi bul.`);
  }
  function init() {
    $("#a-slider").addEventListener("input", syncFromSlider("a-slider", "a-num"));
    $("#b-slider").addEventListener("input", syncFromSlider("b-slider", "b-num"));
    $("#a-num").addEventListener("input", syncFromNumber("a-num", "a-slider", -5, 5));
    $("#b-num").addEventListener("input", syncFromNumber("b-num", "b-slider", -10, 10));
    $("#function-check").addEventListener("click", check);
    $("#function-new").addEventListener("click", newTask);
    $("#function-hint").addEventListener("click", hint);
    window.addEventListener("resize", resize);
    newTask();
    updateLabels();
    loop();
  }
  return { init, resize };
})();

// ============================================================
// Module C · Reference function transformer
// ============================================================
const RefFuncMod = (() => {
  const canvas = $("#ref-canvas");
  const ctx = canvas.getContext("2d");
  // Geniş görünür düzlem · hedef bu kutunun içinde mutlaka yeterli
  // sayıda görünür noktaya sahip olacak şekilde üretilir (bkz. newTask).
  const xMin = -12, xMax = 12, yMin = -12, yMax = 12;
  let lastSize = { w: 0, h: 0 };
  let target = null;

  const BASES = {
    lin:  { f: (x) => x,                  label: "x" },
    sq:   { f: (x) => x * x,              label: "x²" },
    sqrt: { f: (x) => x >= 0 ? Math.sqrt(x) : NaN, label: "√x" },
    abs:  { f: (x) => Math.abs(x),        label: "|x|" },
    rec:  { f: (x) => x === 0 ? NaN : 1 / x, label: "1/x" },
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === lastSize.w && h === lastSize.h) return;
    lastSize = { w, h };
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function toPx(x, y) {
    const w = lastSize.w, h = lastSize.h;
    return {
      px: ((x - xMin) / (xMax - xMin)) * w,
      py: h - ((y - yMin) / (yMax - yMin)) * h,
    };
  }
  function drawGrid() {
    const w = lastSize.w, h = lastSize.h;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#fbfcff"); grad.addColorStop(1, "#f1f4fb");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let x = xMin; x <= xMax; x += 1) {
      const { px } = toPx(x, 0);
      ctx.strokeStyle = x % 4 === 0 ? "#cbd5e1" : "#eef1fa";
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    }
    for (let y = yMin; y <= yMax; y += 1) {
      const { py } = toPx(0, y);
      ctx.strokeStyle = y % 4 === 0 ? "#cbd5e1" : "#eef1fa";
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    }
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.5;
    const ax = toPx(0, 0);
    ctx.beginPath(); ctx.moveTo(0, ax.py); ctx.lineTo(w, ax.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax.px, 0); ctx.lineTo(ax.px, h); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "11px Inter, system-ui";
    ctx.textAlign = "center";
    // Etiketleri her 4 birimde göster (yeni aralık ±12 olduğu için)
    const tickStep = 4;
    for (let x = Math.ceil(xMin / tickStep) * tickStep; x <= xMax; x += tickStep) {
      if (x === 0) continue;
      const { px, py } = toPx(x, 0);
      ctx.fillText(String(x), px, py + 14);
    }
    ctx.textAlign = "left";
    for (let y = Math.ceil(yMin / tickStep) * tickStep; y <= yMax; y += tickStep) {
      if (y === 0) continue;
      const { px, py } = toPx(0, y);
      ctx.fillText(String(y), px + 6, py + 3);
    }
  }
  function drawCurve(baseKey, a, r, k, color, dashed = false, alpha = 1) {
    const f = BASES[baseKey].f;
    ctx.save();
    if (dashed) ctx.setLineDash([8, 6]);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.beginPath();
    let started = false;
    const steps = 600;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const yBase = f(x - r);
      if (!Number.isFinite(yBase)) { started = false; continue; }
      const y = a * yBase + k;
      if (y < yMin - 5 || y > yMax + 5) { started = false; continue; }
      const { px, py } = toPx(x, y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function readControls() {
    return {
      base: $("#ref-base").value,
      a: Number($("#ref-a").value),
      r: Number($("#ref-r").value),
      k: Number($("#ref-k").value),
    };
  }
  function updateLabels() {
    const c = readControls();
    // Slider → number input senkron (aktif giriş alanını ezmez)
    if (document.activeElement?.id !== "ref-a-num") $("#ref-a-num").value = c.a.toFixed(1);
    if (document.activeElement?.id !== "ref-r-num") $("#ref-r-num").value = c.r.toFixed(1);
    if (document.activeElement?.id !== "ref-k-num") $("#ref-k-num").value = c.k.toFixed(1);
    $("#ref-base-v").textContent = BASES[c.base].label;
    const aStr = c.a === 1 ? "" : c.a === -1 ? "−" : `${c.a.toFixed(1)}·`;
    const rStr = c.r === 0 ? "x" : c.r > 0 ? `(x − ${c.r.toFixed(1)})` : `(x + ${Math.abs(c.r).toFixed(1)})`;
    const kStr = c.k === 0 ? "" : c.k > 0 ? ` + ${c.k.toFixed(1)}` : ` − ${Math.abs(c.k).toFixed(1)}`;
    const baseLabel = BASES[c.base].label.replace("x", rStr);
    $("#ref-eq").textContent = `g(x) = ${aStr}${baseLabel}${kStr}`;
  }
  // Çift yönlü senkron helperları
  function syncRefFromSlider(sliderId, numId) {
    return () => {
      const v = Number($("#" + sliderId).value);
      $("#" + numId).value = v.toFixed(1);
      updateLabels();
    };
  }
  function syncRefFromNumber(numId, sliderId, min, max) {
    return () => {
      let v = Number($("#" + numId).value);
      if (!Number.isFinite(v)) return; // while typing "-" etc.
      v = clamp(v, min, max);
      $("#" + sliderId).value = v;
      updateLabels();
    };
  }

  function loop() {
    resize();
    if (lastSize.w > 0) {
      const c = readControls();
      drawGrid();
      // Reference (faded)
      drawCurve(c.base, 1, 0, 0, "#94a3b8", true, 0.6);
      // Target (if any)
      if (target) drawCurve(target.base, target.a, target.r, target.k, "#f59e0b", false, 0.75);
      // User
      drawCurve(c.base, c.a, c.r, c.k, "#6366f1");
    }
    requestAnimationFrame(loop);
  }

  function newTask() {
    // DESIGN: Hedef eğrinin görünür alanda en az 12 örnek noktası olmalı
    // (aksi halde 1/x gibi baz fonksiyonları dikine gidip görünmez olabiliyor).
    const baseKeys = Object.keys(BASES);
    const aOpts = [-2, -1, 1, 2];
    let base, a, r, k, tries = 0;
    while (tries++ < 80) {
      base = baseKeys[randomInt(0, baseKeys.length - 1)];
      a = aOpts[randomInt(0, aOpts.length - 1)];
      r = randomInt(-4, 4);
      k = randomInt(-4, 4);
      const f = BASES[base].f;
      let inside = 0;
      for (let x = xMin; x <= xMax; x += 0.5) {
        const y = a * f(x - r) + k;
        if (Number.isFinite(y) && y >= yMin + 0.5 && y <= yMax - 0.5) inside++;
      }
      if (inside >= 12) break;
    }
    target = { base, a, r, k };
    State.byModule.reffunc.task = (State.byModule.reffunc.task || 0) + 1;
    $("#ref-base").value = base; // başlangıç olarak hedef bazı seç
    updateLabels();
    $("#ref-target").innerHTML =
      `Hedef (turuncu): <b>${BASES[base].label}</b> referansından türetilen eğriyi,
       <code>a</code>, <code>r</code>, <code>k</code> değerleriyle eşleştir.
       <br><small>Cevabın aynı grafiği verdiği sürece, spesifik parametre değerleri
       birbirini götürebilir — kabul edilir.</small>`;
    $("#ref-fb").textContent = "";
    $("#ref-fb").className = "feedback";
    renderModuleMini("reffunc");
  }

  function check() {
    if (!target) return;
    const c = readControls();
    const fb = $("#ref-fb");
    if (c.base !== target.base) {
      fb.textContent = `Yanlış referans fonksiyon. Hedef: ${BASES[target.base].label}.`;
      fb.className = "feedback warn";
      recordAttempt("reffunc", false);
      return;
    }
    // Sample-based equivalence: iki fonksiyonun grafik üzerindeki değerlerini karşılaştır.
    // Böylece aynı grafiği veren farklı (a,r,k) kombinasyonları (örn. y=x için r ve k
    // birbirini götürürse) doğru kabul edilir. Gerçek matematiksel eşitlik: "her x için f(x)=g(x)".
    const f = BASES[c.base].f;
    const userFn = (x) => c.a * f(x - c.r) + c.k;
    const tgtFn  = (x) => target.a * f(x - target.r) + target.k;
    let sq = 0, n = 0, maxErr = 0;
    for (let x = xMin + 0.1; x <= xMax; x += 0.25) {
      const u = userFn(x), t = tgtFn(x);
      if (!Number.isFinite(u) || !Number.isFinite(t)) continue;
      if (Math.abs(u) > yMax * 3 || Math.abs(t) > yMax * 3) continue;
      const d = Math.abs(u - t);
      sq += d * d; n++;
      if (d > maxErr) maxErr = d;
    }
    if (n < 5) {
      fb.textContent = "Karşılaştırma için yeterli ortak tanım aralığı yok. Parametreleri farklı bir bölgeye getir.";
      fb.className = "feedback warn";
      return;
    }
    const rmse = Math.sqrt(sq / n);
    if (rmse < 0.3 && maxErr < 0.8) {
      fb.innerHTML = `<b>Mükemmel!</b> Grafikler eşdeğer (RMSE=${rmse.toFixed(2)}). +20 puan`;
      fb.className = "feedback ok";
      toast("Eşdeğer grafik · +20 puan", "ok");
      recordAttempt("reffunc", true, 20);
      setTimeout(newTask, 900);
    } else {
      fb.textContent = `Grafikler uyuşmuyor (RMSE=${rmse.toFixed(2)}, max fark=${maxErr.toFixed(2)}). Eğriyi turuncu ile üst üste getir.`;
      fb.className = "feedback warn";
      recordAttempt("reffunc", false);
    }
  }
  function hint() {
    if (!target) return;
    toast(`İpucu: r = ${target.r}, k = ${target.k}.`);
  }

  function init() {
    $("#ref-base").addEventListener("change", updateLabels);
    // Slider'lar
    $("#ref-a").addEventListener("input", syncRefFromSlider("ref-a", "ref-a-num"));
    $("#ref-r").addEventListener("input", syncRefFromSlider("ref-r", "ref-r-num"));
    $("#ref-k").addEventListener("input", syncRefFromSlider("ref-k", "ref-k-num"));
    // Number input'lar (yazarken de canlı senkron)
    $("#ref-a-num").addEventListener("input", syncRefFromNumber("ref-a-num", "ref-a", -3, 3));
    $("#ref-r-num").addEventListener("input", syncRefFromNumber("ref-r-num", "ref-r", -8, 8));
    $("#ref-k-num").addEventListener("input", syncRefFromNumber("ref-k-num", "ref-k", -8, 8));
    // Blur: son değeri sınırlara sıkıştır
    $("#ref-a-num").addEventListener("blur", syncRefFromNumber("ref-a-num", "ref-a", -3, 3));
    $("#ref-r-num").addEventListener("blur", syncRefFromNumber("ref-r-num", "ref-r", -8, 8));
    $("#ref-k-num").addEventListener("blur", syncRefFromNumber("ref-k-num", "ref-k", -8, 8));
    $("#ref-check").addEventListener("click", check);
    $("#ref-new").addEventListener("click", newTask);
    $("#ref-hint").addEventListener("click", hint);
    window.addEventListener("resize", resize);
    newTask();
    loop();
  }
  return { init, resize };
})();

// ============================================================
// Module D · Trigonometry laboratory (full 0-360° · unit circle + sin/cos/tan graphs)
// ============================================================
const TrigMod = (() => {
  const svg = $("#trig-svg");
  const W = 820, H = 480;
  // Left: unit circle (big)
  const cCX = 210, cCY = 220, cR = 170;
  // Right: 3 graphs stacked
  const gX0 = 450, gX1 = 800;                 // x range of graphs
  const gW = gX1 - gX0;
  const graphs = [
    { name: "sin", y: 60,  h: 110, color: "#10b981", yMin: -1.1, yMax: 1.1 },
    { name: "cos", y: 200, h: 110, color: "#6366f1", yMin: -1.1, yMax: 1.1 },
    { name: "tan", y: 340, h: 120, color: "#f59e0b", yMin: -3.5, yMax: 3.5 },
  ];

  const refs = {};
  let targetSin = 0.5;

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // ========== Unit circle (left) ==========
    const lblC = svg.appendChild(svgEl("text", {
      x: cCX, y: 30, "text-anchor": "middle", "font-weight": 700, "font-size": 14,
    }));
    lblC.textContent = "Birim Çember (yarıçap 1)";

    // Axes through origin
    svg.appendChild(svgEl("line", {
      x1: cCX - cR - 24, y1: cCY, x2: cCX + cR + 24, y2: cCY,
      stroke: "#cbd5e1", "stroke-width": 1,
    }));
    svg.appendChild(svgEl("line", {
      x1: cCX, y1: cCY - cR - 24, x2: cCX, y2: cCY + cR + 24,
      stroke: "#cbd5e1", "stroke-width": 1,
    }));
    // Axis labels
    ["1", "-1"].forEach((t, i) => {
      const tx = svg.appendChild(svgEl("text", {
        x: i === 0 ? cCX + cR + 12 : cCX - cR - 18,
        y: cCY - 6, "font-size": 11, fill: "#94a3b8",
      }));
      tx.textContent = t;
    });

    // Circle
    svg.appendChild(svgEl("circle", {
      cx: cCX, cy: cCY, r: cR, class: "unit-circle",
    }));

    // Quadrant labels (I, II, III, IV) — small
    [
      { x: cCX + cR - 16, y: cCY - cR + 18, t: "I" },
      { x: cCX - cR + 6,  y: cCY - cR + 18, t: "II" },
      { x: cCX - cR + 6,  y: cCY + cR - 6,  t: "III" },
      { x: cCX + cR - 22, y: cCY + cR - 6,  t: "IV" },
    ].forEach((q) => {
      const el = svg.appendChild(svgEl("text", {
        x: q.x, y: q.y, "font-size": 11, fill: "#cbd5e1", "font-weight": 700,
      }));
      el.textContent = q.t;
    });

    // Angle arc (filled) from 0 to θ
    refs.angleArc = svg.appendChild(svgEl("path", { class: "angle-fill" }));
    // Radius line
    refs.radius  = svg.appendChild(svgEl("line", { stroke: "#0f172a", "stroke-width": 2 }));
    // sin (vertical) and cos (horizontal) projections
    refs.cosProj = svg.appendChild(svgEl("line", { stroke: "#6366f1", "stroke-width": 4, "stroke-linecap": "round" }));
    refs.sinProj = svg.appendChild(svgEl("line", { stroke: "#10b981", "stroke-width": 4, "stroke-linecap": "round" }));
    // Labels for sin / cos inside the circle
    refs.cosLbl  = svg.appendChild(svgEl("text", { fill: "#4338ca", "font-weight": 700, "font-size": 12, "text-anchor": "middle" }));
    refs.sinLbl  = svg.appendChild(svgEl("text", { fill: "#047857", "font-weight": 700, "font-size": 12 }));
    // Angle label
    refs.angleLbl = svg.appendChild(svgEl("text", { fill: "#b45309", "font-weight": 700, "font-size": 12 }));
    // Point on circle (draggable)
    refs.point   = svg.appendChild(svgEl("circle", { class: "point", r: 10 }));

    refs.point.addEventListener("pointerdown", onCircleDragStart);

    // ========== Graphs (right side) ==========
    graphs.forEach((g, idx) => {
      const yBase = g.y + g.h; // bottom
      const yTop  = g.y;

      // Frame
      svg.appendChild(svgEl("rect", {
        x: gX0, y: yTop, width: gW, height: g.h,
        fill: "#fbfcff", stroke: "#e2e8f0", rx: 8,
      }));
      // Title
      const ttl = svg.appendChild(svgEl("text", {
        x: gX0 + 10, y: yTop + 16, "font-size": 12, "font-weight": 700, fill: "#0f172a",
      }));
      ttl.textContent = `y = ${g.name} θ`;

      // Zero axis
      const midY = yTop + g.h / 2;
      svg.appendChild(svgEl("line", {
        x1: gX0 + 30, y1: midY, x2: gX0 + gW - 10, y2: midY,
        stroke: "#cbd5e1", "stroke-width": 1,
      }));

      // Vertical axis
      svg.appendChild(svgEl("line", {
        x1: gX0 + 30, y1: yTop + 6, x2: gX0 + 30, y2: yBase - 6,
        stroke: "#cbd5e1", "stroke-width": 1,
      }));

      // x-axis ticks (0, 90, 180, 270, 360)
      [0, 90, 180, 270, 360].forEach((deg) => {
        const tx = gX0 + 30 + (deg / 360) * (gW - 40);
        svg.appendChild(svgEl("line", {
          x1: tx, y1: midY - 3, x2: tx, y2: midY + 3, stroke: "#94a3b8",
        }));
        if (idx === 2) { // only label bottom graph to save space
          const lbl = svg.appendChild(svgEl("text", {
            x: tx, y: yBase + 14, "text-anchor": "middle", "font-size": 10, fill: "#94a3b8",
          }));
          lbl.textContent = `${deg}°`;
        }
      });

      // Curve
      const pts = [];
      const n = 240;
      for (let i = 0; i <= n; i++) {
        const deg = (i / n) * 360;
        const rad = deg * Math.PI / 180;
        let v;
        if (g.name === "sin") v = Math.sin(rad);
        if (g.name === "cos") v = Math.cos(rad);
        if (g.name === "tan") v = Math.tan(rad);
        if (!Number.isFinite(v) || v < g.yMin || v > g.yMax) {
          pts.push(null);
          continue;
        }
        const px = gX0 + 30 + (deg / 360) * (gW - 40);
        const py = yTop + ((g.yMax - v) / (g.yMax - g.yMin)) * g.h;
        pts.push({ x: px, y: py });
      }
      // Build path with breaks (for tan asymptotes)
      let d = "";
      let started = false;
      pts.forEach((p) => {
        if (!p) { started = false; return; }
        if (!started) { d += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} `; started = true; }
        else { d += `L ${p.x.toFixed(1)} ${p.y.toFixed(1)} `; }
      });
      svg.appendChild(svgEl("path", {
        d, fill: "none", stroke: g.color, "stroke-width": 2.5,
      }));

      // Asymptotes for tan (90°, 270°)
      if (g.name === "tan") {
        [90, 270].forEach((deg) => {
          const ax = gX0 + 30 + (deg / 360) * (gW - 40);
          svg.appendChild(svgEl("line", {
            x1: ax, y1: yTop + 4, x2: ax, y2: yBase - 4,
            stroke: g.color, "stroke-dasharray": "4 3", opacity: 0.5,
          }));
        });
      }

      // Moving cursor (vertical line) + dot
      refs["cursor_" + g.name] = svg.appendChild(svgEl("line", {
        y1: yTop + 4, y2: yBase - 4, stroke: "#0f172a", "stroke-width": 1.5, "stroke-dasharray": "3 3",
      }));
      refs["dot_" + g.name] = svg.appendChild(svgEl("circle", {
        r: 5, fill: g.color, stroke: "#fff", "stroke-width": 2,
      }));
      refs["val_" + g.name] = svg.appendChild(svgEl("text", {
        "font-size": 11, "font-weight": 700, fill: g.color,
      }));
    });
  }

  function onCircleDragStart(e) {
    e.preventDefault();
    const node = e.currentTarget;
    node.setPointerCapture?.(e.pointerId);
    node.addEventListener("pointermove", onCircleDragMove);
    node.addEventListener("pointerup", onCircleDragEnd);
    node.addEventListener("pointercancel", onCircleDragEnd);
  }
  function onCircleDragMove(e) {
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    const px = (e.clientX - rect.left) * ratio;
    const py = (e.clientY - rect.top) * ratio;
    const dx = px - cCX;
    const dy = cCY - py; // SVG y is inverted
    let theta = Math.atan2(dy, dx) * 180 / Math.PI;
    if (theta < 0) theta += 360;
    theta = clamp(Math.round(theta), 0, 360);
    $("#trig-angle").value = theta;
    updateAll();
  }
  function onCircleDragEnd(e) {
    const node = e.currentTarget;
    node.removeEventListener("pointermove", onCircleDragMove);
    node.removeEventListener("pointerup", onCircleDragEnd);
    node.removeEventListener("pointercancel", onCircleDragEnd);
    node.releasePointerCapture?.(e.pointerId);
  }

  function quadrantOf(deg) {
    const d = ((deg % 360) + 360) % 360;
    if (d >= 0   && d < 90)  return "I";
    if (d >= 90  && d < 180) return "II";
    if (d >= 180 && d < 270) return "III";
    return "IV";
  }
  function referenceOf(deg) {
    const d = ((deg % 360) + 360) % 360;
    if (d <= 90)  return d;
    if (d <= 180) return 180 - d;
    if (d <= 270) return d - 180;
    return 360 - d;
  }
  function radianFmt(deg) {
    // Show pretty π fractions for common angles
    const common = {
      0: "0", 30: "π/6", 45: "π/4", 60: "π/3", 90: "π/2",
      120: "2π/3", 135: "3π/4", 150: "5π/6", 180: "π",
      210: "7π/6", 225: "5π/4", 240: "4π/3", 270: "3π/2",
      300: "5π/3", 315: "7π/4", 330: "11π/6", 360: "2π",
    };
    return common[deg] ?? (deg * Math.PI / 180).toFixed(2);
  }

  function render(angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const t = Math.tan(rad);
    const tBlowup = Math.abs(Math.cos(rad)) < 1e-3;

    // Circle point
    const ux = cCX + cR * c;
    const uy = cCY - cR * s;
    setAttrs(refs.point, { cx: ux, cy: uy });

    // Radius from origin to point
    setAttrs(refs.radius, { x1: cCX, y1: cCY, x2: ux, y2: uy });

    // cos projection: horizontal from (cCX, cCY) to (ux, cCY)
    setAttrs(refs.cosProj, { x1: cCX, y1: cCY, x2: ux, y2: cCY });
    // sin projection: vertical from (ux, cCY) to (ux, uy)
    setAttrs(refs.sinProj, { x1: ux, y1: cCY, x2: ux, y2: uy });

    // Angle arc path (start at (cCX+16, cCY) and sweep to angleDeg)
    const arcR = 22;
    const a0x = cCX + arcR;
    const a0y = cCY;
    const a1x = cCX + arcR * Math.cos(rad);
    const a1y = cCY - arcR * Math.sin(rad);
    const largeArc = angleDeg > 180 ? 1 : 0;
    const sweepFlag = 0; // SVG y-axis inverted → sweep=0 goes counter-clockwise visually (i.e., mathematical positive)
    refs.angleArc.setAttribute(
      "d",
      `M ${cCX} ${cCY} L ${a0x} ${a0y} A ${arcR} ${arcR} 0 ${largeArc} ${sweepFlag} ${a1x} ${a1y} Z`
    );

    // cos label (on cos projection)
    setAttrs(refs.cosLbl, {
      x: (cCX + ux) / 2,
      y: cCY + (s >= 0 ? 18 : -6),
    });
    refs.cosLbl.textContent = `cos=${c.toFixed(2)}`;

    // sin label (on sin projection)
    setAttrs(refs.sinLbl, {
      x: ux + (c >= 0 ? 8 : -62),
      y: (cCY + uy) / 2 + 4,
    });
    refs.sinLbl.textContent = `sin=${s.toFixed(2)}`;

    // Angle label near arc
    setAttrs(refs.angleLbl, {
      x: cCX + (arcR + 8) * Math.cos(rad / 2),
      y: cCY - (arcR + 8) * Math.sin(rad / 2) + 4,
    });
    refs.angleLbl.textContent = `θ=${angleDeg}°`;

    // Update graph cursors
    graphs.forEach((g) => {
      const yTop = g.y;
      const cx = gX0 + 30 + (angleDeg / 360) * (gW - 40);
      let v = g.name === "sin" ? s : g.name === "cos" ? c : t;
      let dotVisible = true;
      if (g.name === "tan" && (!Number.isFinite(v) || v < g.yMin || v > g.yMax)) {
        dotVisible = false;
      }
      setAttrs(refs["cursor_" + g.name], { x1: cx, x2: cx });

      if (dotVisible) {
        const py = yTop + ((g.yMax - v) / (g.yMax - g.yMin)) * g.h;
        setAttrs(refs["dot_" + g.name], { cx, cy: py, r: 5, fill: g.color });
        setAttrs(refs["val_" + g.name], { x: cx + 8, y: Math.max(yTop + 14, py - 6) });
        refs["val_" + g.name].textContent = v.toFixed(2);
      } else {
        setAttrs(refs["dot_" + g.name], { r: 0 });
        refs["val_" + g.name].textContent = "∞";
        setAttrs(refs["val_" + g.name], { x: cx + 8, y: yTop + 16 });
      }
    });

    // Readouts
    $("#trig-sin").textContent = s.toFixed(3);
    $("#trig-cos").textContent = c.toFixed(3);
    $("#trig-tan").textContent = tBlowup ? "∞" : t.toFixed(3);
    $("#trig-cot").textContent = Math.abs(s) < 1e-3 ? "∞" : (c / s).toFixed(3);
    $("#trig-pyt").textContent = (s * s + c * c).toFixed(3);
    $("#trig-angle-v").textContent = `${angleDeg}°`;
    $("#trig-quad").textContent = quadrantOf(angleDeg);
    $("#trig-rad").textContent = radianFmt(angleDeg);
    $("#trig-ref").textContent = `${referenceOf(angleDeg)}°`;
  }

  function updateAll() {
    const a = Number($("#trig-angle").value);
    render(a);
  }

  // Target: rastgele bir trigonometrik koşul (sin, cos veya kadran).
  let task = null; // { kind: "sin"|"cos"|"quad", value, label }
  function newTask() {
    const kind = ["sin", "cos", "quad"][randomInt(0, 2)];
    if (kind === "sin") {
      const v = Math.round((Math.random() * 2 - 1) * 100) / 100; // -1..1
      task = { kind, value: v, label: `sin θ ≈ ${v.toFixed(2)}` };
    } else if (kind === "cos") {
      const v = Math.round((Math.random() * 2 - 1) * 100) / 100;
      task = { kind, value: v, label: `cos θ ≈ ${v.toFixed(2)}` };
    } else {
      const q = ["II", "III", "IV"][randomInt(0, 2)]; // I kadranı kolay, atla
      task = { kind, value: q, label: `θ ${q}. kadranda olsun` };
    }
    State.byModule.trig.task = (State.byModule.trig.task || 0) + 1;
    $("#trig-target").innerHTML = `Hedef: <b>${task.label}</b>. Birim çemberde noktayı sürükle veya kaydırıcıyı kullan.`;
    $("#trig-fb").textContent = "";
    $("#trig-fb").className = "feedback";
    renderModuleMini("trig");
  }
  function check() {
    if (!task) return;
    const a = Number($("#trig-angle").value);
    const s = Math.sin(a * Math.PI / 180);
    const c = Math.cos(a * Math.PI / 180);
    const fb = $("#trig-fb");
    let ok = false, note = "";
    if (task.kind === "sin") {
      const d = Math.abs(s - task.value);
      ok = d <= 0.03;
      note = `sin ${a}° = ${s.toFixed(3)} (fark ${d.toFixed(3)})`;
    } else if (task.kind === "cos") {
      const d = Math.abs(c - task.value);
      ok = d <= 0.03;
      note = `cos ${a}° = ${c.toFixed(3)} (fark ${d.toFixed(3)})`;
    } else {
      const q = quadrantOf(a);
      ok = q === task.value;
      note = `θ = ${a}° → ${q}. kadran`;
    }
    if (ok) {
      fb.innerHTML = `<b>Mükemmel!</b> ${note}. +12 puan`;
      fb.className = "feedback ok";
      toast(`${note} · +12`, "ok");
      recordAttempt("trig", true, 12);
      setTimeout(newTask, 800);
    } else {
      fb.textContent = note;
      fb.className = "feedback warn";
      recordAttempt("trig", false);
    }
  }
  function hint() {
    if (!task) return;
    let deg;
    if (task.kind === "sin") {
      // Primary solution in [-90, 90] and supplementary in [90, 270]
      const a1 = Math.asin(clamp(task.value, -1, 1)) * 180 / Math.PI;
      deg = a1 < 0 ? Math.round(a1 + 360) : Math.round(a1);
      toast(`İpucu: θ ≈ ${deg}° ya da ${(180 - deg + 360) % 360}°`);
    } else if (task.kind === "cos") {
      const a1 = Math.acos(clamp(task.value, -1, 1)) * 180 / Math.PI;
      deg = Math.round(a1);
      toast(`İpucu: θ ≈ ${deg}° ya da ${360 - deg}°`);
    } else {
      const ranges = { I: "0-90", II: "90-180", III: "180-270", IV: "270-360" };
      toast(`İpucu: θ aralığı ${ranges[task.value]}°`);
    }
  }

  function init() {
    buildSVG();
    $("#trig-angle").addEventListener("input", updateAll);
    $("#trig-check").addEventListener("click", check);
    $("#trig-new").addEventListener("click", newTask);
    $("#trig-hint").addEventListener("click", hint);
    newTask();
    updateAll();
  }
  return { init };
})();

// ============================================================
// Module E · Triangle laboratory (drag vertices)
// ============================================================
const TriangleMod = (() => {
  const svg = $("#triangle-svg");
  const W = 720, H = 420;
  const verts = {
    A: { x: 360, y: 90, label: "A" },
    B: { x: 160, y: 340, label: "B" },
    C: { x: 560, y: 340, label: "C" },
  };
  const refs = {};
  let dragging = null;

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    refs.body = svg.appendChild(svgEl("polygon", { class: "body" }));
    refs.angleA = svg.appendChild(svgEl("path", { class: "angle-fill" }));
    refs.angleB = svg.appendChild(svgEl("path", { class: "angle-fill" }));
    refs.angleC = svg.appendChild(svgEl("path", { class: "angle-fill" }));
    refs.angleAtxt = svg.appendChild(svgEl("text", { fill: "#b45309", "font-weight": 700 }));
    refs.angleBtxt = svg.appendChild(svgEl("text", { fill: "#b45309", "font-weight": 700 }));
    refs.angleCtxt = svg.appendChild(svgEl("text", { fill: "#b45309", "font-weight": 700 }));
    ["A", "B", "C"].forEach((k) => {
      refs["v" + k] = svg.appendChild(svgEl("circle", {
        class: "vertex", r: 12, "data-k": k,
      }));
      refs["lbl" + k] = svg.appendChild(svgEl("text", {
        "text-anchor": "middle", "font-size": 14, fill: "#0f172a", "font-weight": 700,
      }));
      refs["v" + k].addEventListener("pointerdown", onDragStart);
    });
  }

  function onDragStart(e) {
    e.preventDefault();
    const node = e.currentTarget;
    node.setPointerCapture?.(e.pointerId);
    dragging = node.dataset.k;
    node.addEventListener("pointermove", onDragMove);
    node.addEventListener("pointerup", onDragEnd);
    node.addEventListener("pointercancel", onDragEnd);
  }
  function onDragMove(e) {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    const px = (e.clientX - rect.left) * ratio;
    const py = (e.clientY - rect.top) * ratio;
    verts[dragging].x = clamp(px, 30, W - 30);
    verts[dragging].y = clamp(py, 60, H - 30);
    render();
  }
  function onDragEnd(e) {
    const node = e.currentTarget;
    node.removeEventListener("pointermove", onDragMove);
    node.removeEventListener("pointerup", onDragEnd);
    node.removeEventListener("pointercancel", onDragEnd);
    node.releasePointerCapture?.(e.pointerId);
    dragging = null;
  }

  function angleAt(p, q, r) {
    // angle at p formed by p->q and p->r vectors
    const v1x = q.x - p.x, v1y = q.y - p.y;
    const v2x = r.x - p.x, v2y = r.y - p.y;
    const dot = v1x * v2x + v1y * v2y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    const cos = clamp(dot / (m1 * m2), -1, 1);
    return Math.acos(cos) * 180 / Math.PI;
  }
  function arcAt(p, q, r, radius = 28) {
    const a1 = Math.atan2(q.y - p.y, q.x - p.x);
    const a2 = Math.atan2(r.y - p.y, r.x - p.x);
    let delta = a2 - a1;
    // normalize to [-PI, PI]
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const sweep = delta > 0 ? 1 : 0;
    const x1 = p.x + radius * Math.cos(a1);
    const y1 = p.y + radius * Math.sin(a1);
    const x2 = p.x + radius * Math.cos(a2);
    const y2 = p.y + radius * Math.sin(a2);
    return `M ${p.x} ${p.y} L ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweep} ${x2} ${y2} Z`;
  }

  function render() {
    const A = verts.A, B = verts.B, C = verts.C;
    refs.body.setAttribute("points", `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`);
    const aDeg = angleAt(A, B, C);
    const bDeg = angleAt(B, A, C);
    const cDeg = angleAt(C, A, B);
    const sum = aDeg + bDeg + cDeg;

    refs.angleA.setAttribute("d", arcAt(A, B, C));
    refs.angleB.setAttribute("d", arcAt(B, A, C));
    refs.angleC.setAttribute("d", arcAt(C, A, B));

    // Place angle texts inside the angles
    placeAngleText(refs.angleAtxt, A, B, C, `${aDeg.toFixed(1)}°`);
    placeAngleText(refs.angleBtxt, B, A, C, `${bDeg.toFixed(1)}°`);
    placeAngleText(refs.angleCtxt, C, A, B, `${cDeg.toFixed(1)}°`);

    ["A", "B", "C"].forEach((k) => {
      const v = verts[k];
      setAttrs(refs["v" + k], { cx: v.x, cy: v.y });
      refs["lbl" + k].setAttribute("x", v.x);
      refs["lbl" + k].setAttribute("y", v.y - 18);
      refs["lbl" + k].textContent = k;
    });

    // Side lengths in pixels (display-friendly: divide by 30 to get "units")
    const la = Math.hypot(B.x - C.x, B.y - C.y) / 30;
    const lb = Math.hypot(A.x - C.x, A.y - C.y) / 30;
    const lc = Math.hypot(A.x - B.x, A.y - B.y) / 30;

    $("#tri-a").textContent = `${aDeg.toFixed(1)}°`;
    $("#tri-b").textContent = `${bDeg.toFixed(1)}°`;
    $("#tri-c").textContent = `${cDeg.toFixed(1)}°`;
    $("#tri-sum").textContent = `${sum.toFixed(1)}°`;
    $("#tri-la").textContent = la.toFixed(2);
    $("#tri-lb").textContent = lb.toFixed(2);
    $("#tri-lc").textContent = lc.toFixed(2);

    const valid = (la + lb > lc) && (la + lc > lb) && (lb + lc > la);
    $("#tri-ineq").textContent = valid ? "✓ sağlanıyor" : "✗ ihlal";
    $("#tri-ineq").style.color = valid ? "var(--ok)" : "var(--warn)";
    refs.body.classList.toggle("invalid", !valid);

    const fb = $("#triangle-fb");
    fb.innerHTML = `İç açılar toplamı: <b>${sum.toFixed(1)}°</b> (her zaman 180°). En uzun kenarın karşısındaki açı en büyüktür.`;
    fb.className = "feedback ok";
  }
  function placeAngleText(el, p, q, r, text) {
    const a1 = Math.atan2(q.y - p.y, q.x - p.x);
    const a2 = Math.atan2(r.y - p.y, r.x - p.x);
    let mid = (a1 + a2) / 2;
    if (Math.abs(a1 - a2) > Math.PI) mid += Math.PI;
    const d = 50;
    el.setAttribute("x", p.x + d * Math.cos(mid));
    el.setAttribute("y", p.y + d * Math.sin(mid) + 5);
    el.setAttribute("text-anchor", "middle");
    el.setAttribute("font-size", "12");
    el.textContent = text;
  }

  function reset() {
    verts.A = { x: 360, y: 90 };
    verts.B = { x: 200, y: 320 };
    verts.C = { x: 520, y: 320 };
    render();
  }
  function rand() {
    verts.A = { x: randomInt(150, 570), y: randomInt(70, 200) };
    verts.B = { x: randomInt(60, 320), y: randomInt(220, 380) };
    verts.C = { x: randomInt(400, 660), y: randomInt(220, 380) };
    render();
  }
  function init() {
    buildSVG();
    $("#triangle-reset").addEventListener("click", reset);
    $("#triangle-rand").addEventListener("click", rand);
    render();
  }
  return { init };
})();

// ============================================================
// Module F · Probability lab
// ============================================================
const ProbMod = (() => {
  const bars = $("#prob-bars");
  const conv = $("#prob-conv");
  let series = [];

  function drawBars(theo, exp) {
    const W = 280, H = 220, pad = 30;
    const barW = 70, gap = 40;
    const baseY = H - pad;
    const maxH = H - pad * 2;
    const theoH = theo * maxH;
    const expH  = exp  * maxH;
    const theoX = (W - (2 * barW + gap)) / 2;
    const expX  = theoX + barW + gap;
    bars.innerHTML = `
      <line x1="${pad}" y1="${baseY}" x2="${W - pad}" y2="${baseY}" stroke="#cbd5e1" />
      <rect class="bar theo" x="${theoX}" y="${baseY - theoH}" width="${barW}" height="${theoH}" rx="6" />
      <rect class="bar exp"  x="${expX}"  y="${baseY - expH}"  width="${barW}" height="${expH}"  rx="6" />
      <text x="${theoX + barW/2}" y="${baseY + 14}" text-anchor="middle">Teorik</text>
      <text x="${expX  + barW/2}" y="${baseY + 14}" text-anchor="middle">Deneysel</text>
      <text x="${theoX + barW/2}" y="${baseY - theoH - 6}" text-anchor="middle" fill="#b45309" font-weight="700">${theo.toFixed(2)}</text>
      <text x="${expX  + barW/2}" y="${baseY - expH  - 6}" text-anchor="middle" fill="#4338ca" font-weight="700">${exp.toFixed(2)}</text>
    `;
  }
  function drawConvergence(p) {
    const W = 280, H = 220, pad = 28;
    if (series.length < 2) {
      conv.innerHTML = `
        <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" class="axis" />
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" class="axis" />
        <text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#94a3b8">Deneyi çalıştır…</text>
      `;
      return;
    }
    const n = series.length;
    const xAt = (i) => pad + (i / (n - 1)) * (W - 2 * pad);
    const yAt = (v) => (H - pad) - v * (H - 2 * pad);
    const path = series.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
    const targetY = yAt(p);
    conv.innerHTML = `
      <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" class="axis" />
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" class="axis" />
      <line x1="${pad}" y1="${targetY}" x2="${W-pad}" y2="${targetY}" class="target-line" />
      <path class="conv-line" d="${path}" />
      <text x="${W-pad}" y="${targetY-4}" text-anchor="end" fill="#b45309" font-weight="700">p = ${p.toFixed(2)}</text>
    `;
  }
  function simulate() {
    const p = Number($("#p-slider").value);
    const trials = clamp(Number($("#trial-count").value) || 500, 20, 5000);
    series = [];
    let success = 0;
    const checkpoints = clamp(Math.floor(trials / 20), 20, 60);
    const step = Math.max(1, Math.floor(trials / checkpoints));
    for (let i = 1; i <= trials; i++) {
      if (Math.random() < p) success++;
      if (i % step === 0 || i === trials) series.push(success / i);
    }
    const exp = success / trials;
    const diff = Math.abs(exp - p);
    drawBars(p, exp);
    drawConvergence(p);
    State.byModule.prob.run = (State.byModule.prob.run || 0) + 1;
    State.byModule.prob.lastDiff = diff;
    const fb = $("#prob-fb");
    let earned = 0;
    if (diff <= 0.03) { earned = 12; fb.textContent = `Mükemmel · |fark|=${diff.toFixed(3)} · +${earned}`; fb.className = "feedback ok"; }
    else if (diff <= 0.06) { earned = 6; fb.textContent = `Güzel · |fark|=${diff.toFixed(3)} · +${earned}`; fb.className = "feedback ok"; }
    else { earned = 0; fb.textContent = `|fark|=${diff.toFixed(3)} büyük. Deneme sayısını artır.`; fb.className = "feedback warn"; }
    if (earned > 0) {
      State.byModule.prob.pts = (State.byModule.prob.pts || 0) + earned;
      toast(`Yakınsama ${diff.toFixed(3)} · +${earned}`, "ok");
      recordAttempt("prob", true, earned);
    } else {
      recordAttempt("prob", false);
    }
    renderModuleMini("prob");
  }
  function reset() {
    series = [];
    drawBars(Number($("#p-slider").value), 0);
    drawConvergence(Number($("#p-slider").value));
    $("#prob-fb").textContent = "";
    $("#prob-fb").className = "feedback";
  }
  function updateLabels() {
    $("#p-value").textContent = Number($("#p-slider").value).toFixed(2);
    $("#trial-info").textContent = $("#trial-count").value;
  }
  function init() {
    $("#p-slider").addEventListener("input", () => {
      updateLabels();
      drawBars(Number($("#p-slider").value), series.length ? series[series.length-1] : 0);
      drawConvergence(Number($("#p-slider").value));
    });
    $("#trial-count").addEventListener("input", updateLabels);
    $("#run-sim").addEventListener("click", simulate);
    $("#reset-sim").addEventListener("click", reset);
    updateLabels();
    drawBars(0.5, 0);
    drawConvergence(0.5);
    renderModuleMini("prob");
  }
  return { init };
})();

// ============================================================
// Module G · Bayes laboratory
// ============================================================
const BayesMod = (() => {
  const svg = $("#bayes-svg");
  const W = 720, H = 380;
  const padX = 60, padY = 60;
  const refs = {};

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Outer frame represents 100% population
    refs.frame = svg.appendChild(svgEl("rect", {
      x: padX, y: padY, width: W - 2 * padX, height: H - 2 * padY,
      fill: "none", stroke: "#0f172a", "stroke-width": 1.5,
    }));
    // 4 quadrants (created in z-order: background to foreground)
    refs.tn = svg.appendChild(svgEl("rect", { fill: "#dbeafe" })); // True Negative (sağlam-)
    refs.fp = svg.appendChild(svgEl("rect", { fill: "#a5b4fc" })); // False Positive (sağlam+)
    refs.fn = svg.appendChild(svgEl("rect", { fill: "#fca5a5" })); // False Negative (hasta-)
    refs.tp = svg.appendChild(svgEl("rect", { fill: "#ef4444" })); // True Positive (hasta+)

    // Top label: P(H)
    refs.lblPop = svg.appendChild(svgEl("text", { x: W / 2, y: 32, "text-anchor": "middle", "font-weight": 700 }));
    // Side labels
    refs.lblHasta  = svg.appendChild(svgEl("text", { y: H / 2 + 4, "text-anchor": "end", "font-size": 12, fill: "#0f172a", "font-weight": 700 }));
    refs.lblSaglam = svg.appendChild(svgEl("text", { y: H / 2 + 4, "text-anchor": "end", "font-size": 12, fill: "#0f172a", "font-weight": 700 }));
    refs.lblTP = svg.appendChild(svgEl("text", { fill: "#fff", "text-anchor": "middle", "font-weight": 700, "font-size": 12 }));
    refs.lblFN = svg.appendChild(svgEl("text", { fill: "#7f1d1d", "text-anchor": "middle", "font-weight": 700, "font-size": 12 }));
    refs.lblFP = svg.appendChild(svgEl("text", { fill: "#312e81", "text-anchor": "middle", "font-weight": 700, "font-size": 12 }));
    refs.lblTN = svg.appendChild(svgEl("text", { fill: "#1e3a8a", "text-anchor": "middle", "font-weight": 700, "font-size": 12 }));
  }

  function readControls() {
    return {
      p: Number($("#bayes-p").value),
      sens: Number($("#bayes-sens").value),
      spec: Number($("#bayes-spec").value),
    };
  }
  function fmtPct(x) {
    if (x < 0.01) return (x * 100).toFixed(3) + "%";
    return (x * 100).toFixed(2) + "%";
  }

  function render() {
    const { p, sens, spec } = readControls();
    const fpr = 1 - spec; // false positive rate
    const fnr = 1 - sens; // false negative rate

    // Areas
    const tp = p * sens;
    const fn = p * fnr;
    const fp = (1 - p) * fpr;
    const tn = (1 - p) * spec;

    // Bayes
    const totPos = tp + fp;
    const totNeg = fn + tn;
    const ppv = totPos > 0 ? tp / totPos : 0;     // P(H | +)
    const npv = totNeg > 0 ? tn / totNeg : 0;     // P(¬H | -)
    const fnr_post = totNeg > 0 ? fn / totNeg : 0; // P(H | -)

    // Layout: width split by p (hasta vs sağlam); height split by test result
    const innerW = W - 2 * padX;
    const innerH = H - 2 * padY;
    // Use a non-linear visual scale so very small p is still visible
    const visP = Math.max(0.05, p);  // visual width floor
    const wHasta = innerW * visP;
    const wSaglam = innerW - wHasta;

    // For hasta column: top = TP (sens), bottom = FN
    const hTP = innerH * sens;
    const hFN = innerH - hTP;
    setAttrs(refs.tp, { x: padX, y: padY, width: wHasta, height: hTP });
    setAttrs(refs.fn, { x: padX, y: padY + hTP, width: wHasta, height: hFN });

    // For saglam column: top = FP (fpr), bottom = TN
    const hFP = innerH * fpr;
    const hTN = innerH - hFP;
    setAttrs(refs.fp, { x: padX + wHasta, y: padY, width: wSaglam, height: hFP });
    setAttrs(refs.tn, { x: padX + wHasta, y: padY + hFP, width: wSaglam, height: hTN });

    // Labels
    refs.lblPop.textContent = `100 kişilik popülasyon · Yaygınlık P(H) = ${fmtPct(p)}`;

    refs.lblHasta.setAttribute("x", padX - 8);
    refs.lblHasta.setAttribute("y", padY + 12);
    refs.lblHasta.textContent = "Hasta";
    refs.lblSaglam.setAttribute("x", W - padX + 60);
    refs.lblSaglam.setAttribute("y", padY + 12);
    refs.lblSaglam.textContent = "";

    // Cell labels (only show if cell large enough)
    const placeLbl = (el, x, y, w, h, text) => {
      if (w < 32 || h < 18) { el.textContent = ""; return; }
      el.setAttribute("x", x + w / 2);
      el.setAttribute("y", y + h / 2 + 4);
      el.textContent = text;
    };
    placeLbl(refs.lblTP, padX, padY, wHasta, hTP, `H+ ${fmtPct(tp)}`);
    placeLbl(refs.lblFN, padX, padY + hTP, wHasta, hFN, `H− ${fmtPct(fn)}`);
    placeLbl(refs.lblFP, padX + wHasta, padY, wSaglam, hFP, `S+ ${fmtPct(fp)}`);
    placeLbl(refs.lblTN, padX + wHasta, padY + hFP, wSaglam, hTN, `S− ${fmtPct(tn)}`);

    // Readout panel
    $("#bayes-p-v").textContent = fmtPct(p);
    $("#bayes-sens-v").textContent = fmtPct(sens);
    $("#bayes-spec-v").textContent = fmtPct(spec);
    $("#bayes-pv").textContent = fmtPct(ppv);
    $("#bayes-npv").textContent = fmtPct(1 - ppv);
    $("#bayes-pnv").textContent = fmtPct(fnr_post);
    $("#bayes-tot").textContent = fmtPct(totPos);

    // Pedagogical feedback
    const fb = $("#bayes-fb");
    if (ppv < 0.2 && p < 0.05) {
      fb.textContent = `Yaygınlık ${fmtPct(p)} olduğunda, %${(sens*100).toFixed(0)} duyarlılığa rağmen pozitif testin gerçek hasta olma olasılığı yalnızca ${fmtPct(ppv)}. Yanlış pozitiflere dikkat!`;
      fb.className = "feedback warn";
    } else if (ppv > 0.7) {
      fb.textContent = `Yüksek yaygınlık + iyi test → P(H|+) = ${fmtPct(ppv)} ile pozitif sonuç güvenilir.`;
      fb.className = "feedback ok";
    } else {
      fb.textContent = `P(H|+) = ${fmtPct(ppv)}. Yaygınlık ve test parametrelerinin etkisini gözlemle.`;
      fb.className = "feedback";
    }
  }

  function init() {
    buildSVG();
    ["#bayes-p", "#bayes-sens", "#bayes-spec"].forEach((sel) => {
      $(sel).addEventListener("input", render);
    });
    render();
  }
  return { init };
})();

// ============================================================
// Bootstrap
// ============================================================
function bootstrap() {
  loadState();
  renderGlobalStats();
  initTabs();
  NumLine.init();
  FunctionMod.init();
  RefFuncMod.init();
  TrigMod.init();
  TriangleMod.init();
  ProbMod.init();
  BayesMod.init();
  ["numline", "function", "reffunc", "trig", "prob"].forEach(renderModuleMini);
}

document.addEventListener("DOMContentLoaded", bootstrap);
