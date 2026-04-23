// MaarifLab · TYMM Matematik Oyun Alanı
// Modüller: NumLine, Venn (Classify + Ops), Function, RefFunc, Analytic, Trig, Triangle, Probability, Bayes
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
    venn:     { task: 1, ok: 0, attempts: 0 },
    function: { task: 1, ok: 0, attempts: 0 },
    reffunc:  { task: 1, ok: 0, attempts: 0 },
    trig:     { task: 1, ok: 0, attempts: 0 },
    // Keşif modülleri (puan ve görev yok): analytic, triangle, prob, bayes
    analytic: {},
    triangle: {},
    prob:     {},
    bayes:    {},
  },
};

function saveState() {
  try { localStorage.setItem("maariflab", JSON.stringify(State)); } catch {}
}
function loadState() {
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

// Modül içi iç sekmeler (ör. B · Kümeler: Sınıflandırma | Küme İşlemleri)
function initInnerTabs() {
  $$(".inner-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest("section");
      if (!section) return;
      const key = btn.dataset.inner;
      section.querySelectorAll(".inner-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      section.querySelectorAll(".inner-panel").forEach((p) => p.classList.remove("active"));
      const panel = section.querySelector(`[data-inner-panel="${key}"]`);
      if (panel) panel.classList.add("active");
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
// Module A2 · Interval operations on the number line · keşif
// -------------
// İki aralık A, B + evrensel küme E = ℝ. İşlem seçilir, sonuç sayı doğrusunda
// renklenir ve hem aralık hem küme gösterimiyle okunur. Küme ↔ aralık köprüsü.
// ============================================================
const IntervalOpsMod = (() => {
  const svg = $("#aops-svg");
  const W = 720, H = 320;
  const padX = 50, padR = 30;
  // Üç satır: A (üst), B (orta), Sonuç (alt)
  const Y_A = 70, Y_B = 140, Y_R = 240;
  const xToPx = (x) => padX + ((x + 10) / 20) * (W - padX - padR);
  const pxToX = (px) => Math.round(((px - padX) / (W - padX - padR)) * 20 - 10);

  const A = { lo: -3, hi: 4, loClosed: true, hiClosed: true };
  const B = { lo: 1, hi: 7, loClosed: true, hiClosed: false };
  let currentOp = "union";
  const refs = {};
  let dragging = null;

  const OPS = {
    union:    { sym: "∪",  label: "A ∪ B",     desc: "<b>Birleşim</b>: A'da <b>veya</b> B'de olan x'ler. A ∪ B = { x | x ∈ A veya x ∈ B }" },
    inter:    { sym: "∩",  label: "A ∩ B",     desc: "<b>Kesişim</b>: A'da <b>ve</b> B'de olan x'ler. A ∩ B = { x | x ∈ A ve x ∈ B }" },
    diff_ab:  { sym: "\\", label: "A \\ B",    desc: "<b>Fark</b>: A'da olup B'de olmayan x'ler. A \\ B = A ∩ B'" },
    diff_ba:  { sym: "\\", label: "B \\ A",    desc: "<b>Fark</b>: B'de olup A'da olmayan x'ler. B \\ A = B ∩ A'" },
    comp_a:   { sym: "′",  label: "A′",        desc: "<b>Tümleme</b>: E \\ A. A'da olmayan tüm gerçek sayılar." },
    comp_b:   { sym: "′",  label: "B′",        desc: "<b>Tümleme</b>: E \\ B." },
    sym:      { sym: "△",  label: "A △ B",     desc: "<b>Simetrik fark</b>: A'da veya B'de olup ikisinde birden olmayan. (A ∪ B) \\ (A ∩ B)" },
  };

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Üç yatay eksen (A, B, Sonuç)
    [Y_A, Y_B, Y_R].forEach((y) => {
      svg.appendChild(svgEl("line", {
        class: "axis", x1: padX, y1: y, x2: W - padR, y2: y,
      }));
      for (let x = -10; x <= 10; x += 1) {
        const px = xToPx(x);
        const big = x % 5 === 0;
        svg.appendChild(svgEl("line", {
          class: "tick",
          x1: px, y1: y - (big ? 6 : 3),
          x2: px, y2: y + (big ? 6 : 3),
        }));
        if (big && y === Y_R) {
          const t = svg.appendChild(svgEl("text", {
            class: "tick-label", x: px, y: y + 22, "text-anchor": "middle",
          }));
          t.textContent = x;
        }
      }
    });

    // Satır etiketleri
    [
      { y: Y_A, text: "A" },
      { y: Y_B, text: "B" },
      { y: Y_R, text: "A ? B" },
    ].forEach((lbl, i) => {
      const el = svg.appendChild(svgEl("text", {
        class: "row-label", x: 14, y: lbl.y + 4,
      }));
      el.textContent = lbl.text;
      if (i === 2) refs.labelRes = el;
    });

    // A band + endpoints
    refs.aBand = svg.appendChild(svgEl("rect", { class: "band-a", y: Y_A - 9, height: 18, rx: 4 }));
    refs.aLo = svg.appendChild(svgEl("circle", {
      class: "endpoint a closed", cy: Y_A, r: 8, "data-side": "A-lo",
    }));
    refs.aHi = svg.appendChild(svgEl("circle", {
      class: "endpoint a closed", cy: Y_A, r: 8, "data-side": "A-hi",
    }));
    refs.aLoLbl = svg.appendChild(svgEl("text", { class: "endpoint-label", y: Y_A - 18, "text-anchor": "middle" }));
    refs.aHiLbl = svg.appendChild(svgEl("text", { class: "endpoint-label", y: Y_A - 18, "text-anchor": "middle" }));

    // B band + endpoints
    refs.bBand = svg.appendChild(svgEl("rect", { class: "band-b", y: Y_B - 9, height: 18, rx: 4 }));
    refs.bLo = svg.appendChild(svgEl("circle", {
      class: "endpoint b closed", cy: Y_B, r: 8, "data-side": "B-lo",
    }));
    refs.bHi = svg.appendChild(svgEl("circle", {
      class: "endpoint b closed", cy: Y_B, r: 8, "data-side": "B-hi",
    }));
    refs.bLoLbl = svg.appendChild(svgEl("text", { class: "endpoint-label", y: Y_B - 18, "text-anchor": "middle" }));
    refs.bHiLbl = svg.appendChild(svgEl("text", { class: "endpoint-label", y: Y_B - 18, "text-anchor": "middle" }));

    // Result bands (bir işlem birden fazla parçalı olabilir — dinamik)
    refs.resGroup = svg.appendChild(svgEl("g", {}));

    // Drag handlers
    [refs.aLo, refs.aHi, refs.bLo, refs.bHi].forEach((n) => {
      n.addEventListener("pointerdown", onDragStart);
      n.addEventListener("click", (e) => {
        if (!dragging || !dragging.moved) toggleClosed(n.dataset.side);
        dragging = null;
      });
    });
  }

  function onDragStart(e) {
    e.preventDefault();
    const n = e.currentTarget;
    n.setPointerCapture?.(e.pointerId);
    dragging = { side: n.dataset.side, moved: false };
    n.addEventListener("pointermove", onDragMove);
    n.addEventListener("pointerup", onDragEnd);
    n.addEventListener("pointercancel", onDragEnd);
  }
  function onDragMove(e) {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    const px = (e.clientX - rect.left) * ratio;
    const x = clamp(pxToX(px), -10, 10);
    if (Math.abs(x - getEnd(dragging.side)) > 0) dragging.moved = true;
    setEnd(dragging.side, x);
    render();
  }
  function onDragEnd(e) {
    const n = e.currentTarget;
    n.removeEventListener("pointermove", onDragMove);
    n.removeEventListener("pointerup", onDragEnd);
    n.removeEventListener("pointercancel", onDragEnd);
    n.releasePointerCapture?.(e.pointerId);
    setTimeout(() => { dragging = null; }, 0);
  }
  function getEnd(side) {
    if (side === "A-lo") return A.lo;
    if (side === "A-hi") return A.hi;
    if (side === "B-lo") return B.lo;
    return B.hi;
  }
  function setEnd(side, v) {
    if (side === "A-lo") A.lo = Math.min(v, A.hi);
    else if (side === "A-hi") A.hi = Math.max(v, A.lo);
    else if (side === "B-lo") B.lo = Math.min(v, B.hi);
    else if (side === "B-hi") B.hi = Math.max(v, B.lo);
  }
  function toggleClosed(side) {
    if (side === "A-lo") A.loClosed = !A.loClosed;
    else if (side === "A-hi") A.hiClosed = !A.hiClosed;
    else if (side === "B-lo") B.loClosed = !B.loClosed;
    else if (side === "B-hi") B.hiClosed = !B.hiClosed;
    render();
  }

  // ===== Aralık cebiri (union / inter / diff / complement) =====
  // Aralık = { lo, hi, loClosed, hiClosed }. Sonuç: aralıkların listesi.
  // Basit algoritma: [-10,10] eksenini yoğun örnekle, her x için A ve B içinde mi
  // olduğunu bul, sonucu bölgelere ayır. Pedagojik görsel için yeterli; kesin
  // sınır davranışını (dahil/hariç) ayrıca hesaplayıp işaretleyeceğiz.
  const EPS = 0.001;
  function inInterval(x, iv) {
    if (iv.lo > x || iv.hi < x) return false;
    if (iv.lo === x && !iv.loClosed) return false;
    if (iv.hi === x && !iv.hiClosed) return false;
    return true;
  }
  function opTest(x, op) {
    const inA = inInterval(x, A);
    const inB = inInterval(x, B);
    switch (op) {
      case "union":   return inA || inB;
      case "inter":   return inA && inB;
      case "diff_ab": return inA && !inB;
      case "diff_ba": return inB && !inA;
      case "comp_a":  return !inA;
      case "comp_b":  return !inB;
      case "sym":     return (inA !== inB);
    }
    return false;
  }
  // Sonucu parçalara ayır — sampling tabanlı
  function computeResultParts(op) {
    const parts = [];
    const xs = [-10];
    // Önemli noktalar: A ve B'nin uçları + -10, 10
    [-10, 10, A.lo, A.hi, B.lo, B.hi].forEach((v) => { if (!xs.includes(v)) xs.push(v); });
    xs.sort((a, b) => a - b);
    // Her bölgeyi ortasından test et
    for (let i = 0; i < xs.length - 1; i++) {
      const lo = xs[i], hi = xs[i + 1];
      const mid = (lo + hi) / 2;
      if (opTest(mid, op)) {
        // Uç noktaları dahil/hariç hesabı
        const loClosed = closedAt(lo, op, true);
        const hiClosed = closedAt(hi, op, false);
        // Önceki parça ile birleşebilir mi?
        const prev = parts[parts.length - 1];
        if (prev && prev.hi === lo && (prev.hiClosed || loClosed)) {
          prev.hi = hi;
          prev.hiClosed = hiClosed;
        } else {
          parts.push({ lo, hi, loClosed, hiClosed });
        }
      }
    }
    return parts;
  }
  function closedAt(x, op, atLowerEnd) {
    // x noktası sonuca dahil mi? Sonuç aralığında ise x'teki dahillik
    return opTest(x, op);
  }

  // ===== Rendering =====
  function render() {
    // A band
    const aLoPx = xToPx(A.lo), aHiPx = xToPx(A.hi);
    setAttrs(refs.aBand, { x: aLoPx, width: aHiPx - aLoPx });
    setAttrs(refs.aLo, { cx: aLoPx, class: "endpoint a " + (A.loClosed ? "closed" : "open") });
    setAttrs(refs.aHi, { cx: aHiPx, class: "endpoint a " + (A.hiClosed ? "closed" : "open") });
    refs.aLoLbl.setAttribute("x", aLoPx);
    refs.aLoLbl.textContent = `${A.loClosed ? "[" : "("}${A.lo}`;
    refs.aHiLbl.setAttribute("x", aHiPx);
    refs.aHiLbl.textContent = `${A.hi}${A.hiClosed ? "]" : ")"}`;

    // B band
    const bLoPx = xToPx(B.lo), bHiPx = xToPx(B.hi);
    setAttrs(refs.bBand, { x: bLoPx, width: bHiPx - bLoPx });
    setAttrs(refs.bLo, { cx: bLoPx, class: "endpoint b " + (B.loClosed ? "closed" : "open") });
    setAttrs(refs.bHi, { cx: bHiPx, class: "endpoint b " + (B.hiClosed ? "closed" : "open") });
    refs.bLoLbl.setAttribute("x", bLoPx);
    refs.bLoLbl.textContent = `${B.loClosed ? "[" : "("}${B.lo}`;
    refs.bHiLbl.setAttribute("x", bHiPx);
    refs.bHiLbl.textContent = `${B.hi}${B.hiClosed ? "]" : ")"}`;

    // Result
    while (refs.resGroup.firstChild) refs.resGroup.removeChild(refs.resGroup.firstChild);
    const parts = computeResultParts(currentOp);
    parts.forEach((p) => {
      const px1 = xToPx(Math.max(-10, p.lo));
      const px2 = xToPx(Math.min(10, p.hi));
      refs.resGroup.appendChild(svgEl("rect", {
        class: "band-res", x: px1, y: Y_R - 9, width: px2 - px1, height: 18, rx: 4,
      }));
      // Uç noktalar (sadece ±10 içinde olanlar işaretli)
      if (p.lo > -10) {
        refs.resGroup.appendChild(svgEl("circle", {
          cx: px1, cy: Y_R, r: 7, "stroke-width": 3,
          stroke: "#b45309", fill: p.loClosed ? "#b45309" : "#fff",
        }));
      }
      if (p.hi < 10) {
        refs.resGroup.appendChild(svgEl("circle", {
          cx: px2, cy: Y_R, r: 7, "stroke-width": 3,
          stroke: "#b45309", fill: p.hiClosed ? "#b45309" : "#fff",
        }));
      }
    });

    // Readout
    const op = OPS[currentOp];
    refs.labelRes.textContent = op.label;
    $("#aops-op-v").textContent = op.sym;
    $("#aops-info").innerHTML = op.desc;

    $("#aops-a").textContent = fmtIv(A);
    $("#aops-b").textContent = fmtIv(B);
    $("#aops-a-set").textContent = fmtSet(A);
    $("#aops-b-set").textContent = fmtSet(B);
    $("#aops-res").textContent = fmtParts(parts);
    $("#aops-res-set").textContent = fmtPartsSet(parts, op.label);
  }

  function fmtIv(iv) {
    if (iv.lo > iv.hi) return "∅";
    return `${iv.loClosed ? "[" : "("}${iv.lo}, ${iv.hi}${iv.hiClosed ? "]" : ")"}`;
  }
  function fmtSet(iv) {
    return `{ x ∈ ℝ : ${iv.lo} ${iv.loClosed ? "≤" : "<"} x ${iv.hiClosed ? "≤" : "<"} ${iv.hi} }`;
  }
  function fmtParts(parts) {
    if (parts.length === 0) return "∅";
    return parts.map((p) => {
      const lo = p.lo <= -10 ? "(−∞" : `${p.loClosed ? "[" : "("}${p.lo}`;
      const hi = p.hi >= 10 ? "∞)" : `${p.hi}${p.hiClosed ? "]" : ")"}`;
      return `${lo}, ${hi}`;
    }).join(" ∪ ");
  }
  function fmtPartsSet(parts) {
    if (parts.length === 0) return "∅";
    if (parts.length === 1) {
      const p = parts[0];
      const loPart = p.lo <= -10 ? "" : `${p.lo} ${p.loClosed ? "≤" : "<"} x`;
      const hiPart = p.hi >= 10 ? "" : `x ${p.hiClosed ? "≤" : "<"} ${p.hi}`;
      const mid = loPart && hiPart ? `${loPart} ${p.hiClosed ? "≤" : "<"} ${p.hi}` : (loPart || hiPart);
      if (!mid) return "ℝ";
      // Güzel düzenleme
      if (loPart && hiPart) {
        return `{ x ∈ ℝ : ${p.lo} ${p.loClosed ? "≤" : "<"} x ${p.hiClosed ? "≤" : "<"} ${p.hi} }`;
      }
      return `{ x ∈ ℝ : ${mid} }`;
    }
    return `{ x ∈ ℝ : ${parts.map((p) => {
      const loPart = p.lo <= -10 ? "" : `${p.lo} ${p.loClosed ? "≤" : "<"} x`;
      const hiPart = p.hi >= 10 ? "" : `x ${p.hiClosed ? "≤" : "<"} ${p.hi}`;
      if (loPart && hiPart) return `(${p.lo} ${p.loClosed ? "≤" : "<"} x ${p.hiClosed ? "≤" : "<"} ${p.hi})`;
      return loPart || hiPart;
    }).join(" veya ")} }`;
  }

  function reset() {
    A.lo = -3; A.hi = 4; A.loClosed = true; A.hiClosed = true;
    B.lo = 1;  B.hi = 7; B.loClosed = true; B.hiClosed = false;
    render();
  }
  function randomize() {
    const r = (min, max) => randomInt(min, max);
    A.lo = r(-9, 2); A.hi = r(A.lo + 2, 8); A.loClosed = Math.random() > 0.5; A.hiClosed = Math.random() > 0.5;
    B.lo = r(-9, 2); B.hi = r(B.lo + 2, 8); B.loClosed = Math.random() > 0.5; B.hiClosed = Math.random() > 0.5;
    render();
  }

  function init() {
    buildSVG();
    $("#aops-op").addEventListener("change", () => {
      currentOp = $("#aops-op").value;
      render();
    });
    $("#aops-reset").addEventListener("click", reset);
    $("#aops-random").addEventListener("click", randomize);
    render();
  }
  return { init };
})();

// ============================================================
// Module B · Number-set Venn universe
// -------------
// Görev-tabanlı (DESIGN #1): kullanıcı verilen sayıyı ait olduğu
// en dar kümenin bölgesine tıklayarak sınıflandırır.
// Kontrol: sayı kategorisi (N/Z/Q/I) ile tıklanan bölgenin id'si.
// ============================================================
const VennMod = (() => {
  const svg = $("#venn-svg");
  const W = 720, H = 420;
  const CX = 310, CY = 210;
  // Konsantrik yarıçaplar (N içte, R dışta)
  const R_R = 190, R_Q = 150, R_Z = 105, R_N = 55;

  // Küçük, kolay okunan havuz
  const POOL = [
    { label: "5", cat: "N" }, { label: "12", cat: "N" }, { label: "0", cat: "N" },
    { label: "-3", cat: "Z" }, { label: "-17", cat: "Z" }, { label: "-1", cat: "Z" },
    { label: "3/4", cat: "Q" }, { label: "-5/2", cat: "Q" }, { label: "0.25", cat: "Q" }, { label: "1.3", cat: "Q" },
    { label: "√2", cat: "I" }, { label: "π", cat: "I" }, { label: "e", cat: "I" }, { label: "√5", cat: "I" },
  ];
  const CAT_LABELS = { N: "ℕ (doğal)", Z: "ℤ (tam)", Q: "ℚ (rasyonel)", I: "ℝ\\ℚ (irrasyonel)" };

  let target = null; // { label, cat }
  const refs = {};

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // R ring (ℝ) — largest. Tıklandığında "I" (irrasyonel) kabul edilir
    // çünkü ℝ içinde ℚ dışında olmak irrasyoneldir.
    refs.R = svg.appendChild(svgEl("circle", {
      class: "set-region I", "data-cat": "I",
      cx: CX, cy: CY, r: R_R,
    }));
    refs.Q = svg.appendChild(svgEl("circle", {
      class: "set-region Q", "data-cat": "Q",
      cx: CX, cy: CY, r: R_Q,
    }));
    refs.Z = svg.appendChild(svgEl("circle", {
      class: "set-region Z", "data-cat": "Z",
      cx: CX, cy: CY, r: R_Z,
    }));
    refs.N = svg.appendChild(svgEl("circle", {
      class: "set-region N", "data-cat": "N",
      cx: CX, cy: CY, r: R_N,
    }));

    // Static labels
    const addLabel = (x, y, text, color) => {
      const t = svg.appendChild(svgEl("text", {
        x, y, class: "set-label", "text-anchor": "middle", fill: color,
      }));
      t.textContent = text;
    };
    addLabel(CX, CY + 6, "ℕ", "#3730a3");
    addLabel(CX, CY - R_N - 14, "ℤ", "#5b21b6");
    addLabel(CX, CY - R_Z - 14, "ℚ", "#86198f");
    addLabel(CX, CY - R_Q - 14, "ℝ", "#991b1b");
    addLabel(CX + R_R - 30, CY + 10, "irrasyonel", "#991b1b");

    // Target chip (right side panel area)
    refs.chipCircle = svg.appendChild(svgEl("circle", {
      class: "number-chip", cx: W - 110, cy: 90, r: 50,
    }));
    refs.chipText = svg.appendChild(svgEl("text", {
      class: "number-text", x: W - 110, y: 98,
    }));
    const hint = svg.appendChild(svgEl("text", {
      x: W - 110, y: 160, "text-anchor": "middle", fill: "#94a3b8",
      "font-size": 11, "font-weight": 700,
    }));
    hint.textContent = "bu sayıyı yerleştir";

    // Event delegation · SVG üzerindeki tıklamadan doğru (en üstteki) bölgeyi bul.
    // İç içe circle olduğu için bubbling yanlış handler'ı tetiklerdi; bu yaklaşım
    // her zaman tıklanan noktanın en iç matching bölgesini kullanır.
    svg.addEventListener("click", (e) => {
      const cat = e.target?.dataset?.cat;
      if (cat) onRegionClick(cat);
    });
  }

  function newTask() {
    target = POOL[randomInt(0, POOL.length - 1)];
    State.byModule.venn.task = (State.byModule.venn.task || 0) + 1;
    refs.chipText.textContent = target.label;
    $("#venn-target").innerHTML =
      `Hedef: <b>${target.label}</b> sayısını ait olduğu <b>en dar kümenin bölgesine</b> tıkla.`;
    $("#venn-fb").textContent = "Venn şemasındaki doğru bölgeye tıkla.";
    $("#venn-fb").className = "feedback";
    renderModuleMini("venn");
  }

  function onRegionClick(clickedCat) {
    if (!target) return;
    const fb = $("#venn-fb");
    const correct = clickedCat === target.cat;
    if (correct) {
      fb.innerHTML = `<b>Doğru!</b> ${target.label} ∈ ${CAT_LABELS[target.cat]}. +10 puan`;
      fb.className = "feedback ok";
      toast(`${target.label} · ${CAT_LABELS[target.cat]}`, "ok");
      recordAttempt("venn", true, 10);
      setTimeout(newTask, 900);
    } else {
      fb.innerHTML = `Değil. ${target.label} ∈ <b>${CAT_LABELS[target.cat]}</b> (sen ${CAT_LABELS[clickedCat]}'a tıkladın). Tekrar dene.`;
      fb.className = "feedback warn";
      recordAttempt("venn", false);
    }
  }

  function hint() {
    if (!target) return;
    toast(`${target.label} için en dar küme: ${CAT_LABELS[target.cat]}`);
  }

  function init() {
    buildSVG();
    $("#venn-new").addEventListener("click", newTask);
    $("#venn-hint").addEventListener("click", hint);
    newTask();
  }
  return { init };
})();

// ============================================================
// Module B2 · Set operations studio (inner tab of B · Kümeler)
// -------------
// Keşif modülü · puan yok (DESIGN #1).
// Evrensel küme E = {1..12}. Her eleman 4 bölgeden birinde:
//   "A"   → A \ B (A'nın tek parçası)
//   "AB"  → A ∩ B
//   "B"   → B \ A
//   "out" → E \ (A ∪ B)
// Elemente tıklama 4 bölge arasında sıralı döner.
// İşlem seçildiğinde sonuç kümesine ait tüm chipler vurgulanır.
// ============================================================
const VennOpsMod = (() => {
  const svg = $("#venn-ops-svg");
  const W = 720, H = 480;
  const UNI = { x: 30, y: 40, w: 660, h: 410, rx: 14 };
  const A = { cx: 260, cy: 250, r: 150 };
  const B = { cx: 460, cy: 250, r: 150 };
  const ELEMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  // Region order for click rotation (drag yoksa fallback)
  const REGIONS = ["A", "AB", "B", "out"];
  const CHIP_R = 17;
  const DRAG_THRESHOLD = 5; // px; altında tıklama kabul edilir

  // Element → region (kategorik); positions[e] = {x, y} (görsel konum)
  const assignment = {};
  const positions = {};
  const refs = { chips: {} };
  let currentOp = "union";
  let drag = null; // { id, startClientX, startClientY, startX, startY, moved, pointerId }

  // Each op: which regions its result contains
  const OPS = {
    union:        { label: "A ∪ B",       sym: "∪",  regions: ["A", "AB", "B"],
                    desc: "A'da <b>veya</b> B'de olan tüm elementler." },
    intersection: { label: "A ∩ B",       sym: "∩",  regions: ["AB"],
                    desc: "A'da <b>ve</b> B'de olan elementler." },
    diff_ab:      { label: "A \\ B",      sym: "\\",  regions: ["A"],
                    desc: "A'da olup B'de olmayan elementler." },
    diff_ba:      { label: "B \\ A",      sym: "\\",  regions: ["B"],
                    desc: "B'de olup A'da olmayan elementler." },
    comp_a:       { label: "A′",          sym: "′",  regions: ["B", "out"],
                    desc: "A'nın tümleyeni: E'de olup A'da olmayan elementler." },
    comp_b:       { label: "B′",          sym: "′",  regions: ["A", "out"],
                    desc: "B'nin tümleyeni: E'de olup B'de olmayan elementler." },
    sym_diff:     { label: "A △ B",       sym: "△",  regions: ["A", "B"],
                    desc: "Simetrik fark: A'da <b>ya da</b> B'de olup ikisinde birden olmayan." },
    union_comp:   { label: "(A ∪ B)′",    sym: "′",  regions: ["out"],
                    desc: "De Morgan: (A ∪ B)′ = A′ ∩ B′ — her ikisinin de dışında kalanlar." },
    inter_comp:   { label: "(A ∩ B)′",    sym: "′",  regions: ["A", "B", "out"],
                    desc: "De Morgan: (A ∩ B)′ = A′ ∪ B′ — ortak olmayan her şey." },
  };

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Universe frame
    svg.appendChild(svgEl("rect", {
      class: "universe-frame",
      x: UNI.x, y: UNI.y, width: UNI.w, height: UNI.h, rx: UNI.rx,
    }));
    const lblE = svg.appendChild(svgEl("text", {
      class: "label-E", x: UNI.x + 14, y: UNI.y + 22,
    }));
    lblE.textContent = "E (evrensel küme)";

    // Two sets
    svg.appendChild(svgEl("circle", { class: "set-A", cx: A.cx, cy: A.cy, r: A.r }));
    svg.appendChild(svgEl("circle", { class: "set-B", cx: B.cx, cy: B.cy, r: B.r }));
    const la = svg.appendChild(svgEl("text", { class: "label-A", x: A.cx - A.r + 14, y: A.cy - A.r + 30 }));
    la.textContent = "A";
    const lb = svg.appendChild(svgEl("text", { class: "label-B", x: B.cx + B.r - 32, y: B.cy - B.r + 30 }));
    lb.textContent = "B";

    // Chips — one <g> per element (sürüklenebilir)
    ELEMENTS.forEach((e) => {
      const g = svg.appendChild(svgEl("g", { class: "chip", "data-el": e }));
      g.appendChild(svgEl("circle", { class: "chip-circle", r: CHIP_R, cx: 0, cy: 0 }));
      const t = g.appendChild(svgEl("text", {
        class: "chip-text", x: 0, y: 0,
        "text-anchor": "middle", "dominant-baseline": "central",
      }));
      t.textContent = String(e);
      g.addEventListener("pointerdown", (ev) => onPointerDown(ev, e));
      refs.chips[e] = g;
    });
  }

  // ===== Drag & drop =====
  function svgPointFromEvent(e) {
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    return {
      x: (e.clientX - rect.left) * ratio,
      y: (e.clientY - rect.top) * ratio,
    };
  }

  function onPointerDown(e, id) {
    e.preventDefault();
    const g = refs.chips[id];
    g.setPointerCapture?.(e.pointerId);
    drag = {
      id,
      pointerId: e.pointerId,
      startClient: { x: e.clientX, y: e.clientY },
      startPos: { x: positions[id].x, y: positions[id].y },
      moved: false,
    };
    g.addEventListener("pointermove", onPointerMove);
    g.addEventListener("pointerup", onPointerUp);
    g.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(e) {
    if (!drag) return;
    const dxClient = e.clientX - drag.startClient.x;
    const dyClient = e.clientY - drag.startClient.y;
    if (Math.hypot(dxClient, dyClient) > DRAG_THRESHOLD) drag.moved = true;
    if (!drag.moved) return;
    const rect = svg.getBoundingClientRect();
    const ratio = W / rect.width;
    let x = drag.startPos.x + dxClient * ratio;
    let y = drag.startPos.y + dyClient * ratio;
    // Universe içinde sıkıştır
    x = clamp(x, UNI.x + CHIP_R + 2, UNI.x + UNI.w - CHIP_R - 2);
    y = clamp(y, UNI.y + CHIP_R + 2, UNI.y + UNI.h - CHIP_R - 2);
    positions[drag.id] = { x, y };
    setAttrs(refs.chips[drag.id], { transform: `translate(${x} ${y})` });
  }

  function onPointerUp(e) {
    if (!drag) return;
    const g = refs.chips[drag.id];
    g.removeEventListener("pointermove", onPointerMove);
    g.removeEventListener("pointerup", onPointerUp);
    g.removeEventListener("pointercancel", onPointerUp);
    g.releasePointerCapture?.(drag.pointerId);

    if (!drag.moved) {
      // Tıklama → sıradaki bölgeye rotate et, o bölgenin merkezine snap
      const id = drag.id;
      const cur = assignment[id];
      const next = REGIONS[(REGIONS.indexOf(cur) + 1) % REGIONS.length];
      assignment[id] = next;
      positions[id] = pickPosInRegion(next, id);
      applyPosition(id);
    } else {
      // Drag → pozisyondan bölgeyi hesapla; overlap varsa hafif itele
      assignment[drag.id] = regionAt(positions[drag.id].x, positions[drag.id].y);
      resolveOverlap(drag.id);
    }
    drag = null;
    update();
  }

  // Bir noktanın hangi bölgeye düştüğü (A\B, A∩B, B\A veya dışarı)
  function regionAt(x, y) {
    const inA = (x - A.cx) ** 2 + (y - A.cy) ** 2 <= A.r ** 2;
    const inB = (x - B.cx) ** 2 + (y - B.cy) ** 2 <= B.r ** 2;
    if (inA && inB) return "AB";
    if (inA) return "A";
    if (inB) return "B";
    return "out";
  }

  // Yeni bir chip için verilen bölgede uygun boş pozisyon bulur
  // (mümkünse mevcut chip'lerle çakışmasın)
  function pickPosInRegion(region, skipId) {
    const anchor = {
      A:   { cx: 180, cy: 250, rx: 50, ry: 120 },
      AB:  { cx: 360, cy: 250, rx: 22, ry: 120 },
      B:   { cx: 540, cy: 250, rx: 50, ry: 120 },
      out: { cx: 360, cy: 100, rx: 280, ry: 30 },
    }[region];
    // Basit: 30 deneme, overlap kontrolü
    for (let i = 0; i < 30; i++) {
      const x = anchor.cx + (Math.random() * 2 - 1) * anchor.rx;
      const y = anchor.cy + (Math.random() * 2 - 1) * anchor.ry;
      let ok = true;
      for (const e of ELEMENTS) {
        if (e === skipId) continue;
        const p = positions[e];
        if (!p) continue;
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < (CHIP_R * 2 + 4) ** 2) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    // Fallback: anchor merkezi
    return { x: anchor.cx, y: anchor.cy };
  }

  // Chip bırakıldığında başka chip ile binişiyorsa, o chip'i küçük bir ofsetle iteler.
  function resolveOverlap(draggedId) {
    const p = positions[draggedId];
    const minD = CHIP_R * 2 + 4;
    for (const e of ELEMENTS) {
      if (e === draggedId) continue;
      const q = positions[e];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < minD) {
        const push = (minD - d) + 1;
        const nx = d > 0 ? dx / d : 1;
        const ny = d > 0 ? dy / d : 0;
        let newX = q.x + nx * push;
        let newY = q.y + ny * push;
        newX = clamp(newX, UNI.x + CHIP_R + 2, UNI.x + UNI.w - CHIP_R - 2);
        newY = clamp(newY, UNI.y + CHIP_R + 2, UNI.y + UNI.h - CHIP_R - 2);
        positions[e] = { x: newX, y: newY };
        assignment[e] = regionAt(newX, newY);
        applyPosition(e);
      }
    }
  }

  function applyPosition(id) {
    const p = positions[id];
    setAttrs(refs.chips[id], { transform: `translate(${p.x} ${p.y})` });
  }

  // Grid-based preset layout (used by preset/randomize/reset)
  function gridLayout() {
    const byR = { A: [], AB: [], B: [], out: [] };
    ELEMENTS.forEach((e) => byR[assignment[e]].push(e));
    const spacing = 42;
    const place = (items, cx, cy, cols) => {
      const n = items.length;
      if (n === 0) return;
      const rows = Math.ceil(n / cols);
      items.forEach((e, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = cx + (col - (cols - 1) / 2) * spacing;
        const y = cy + (row - (rows - 1) / 2) * spacing;
        positions[e] = { x, y };
        applyPosition(e);
      });
    };
    place(byR.A,   185, 250, 2);
    place(byR.AB,  360, 250, 1);
    place(byR.B,   535, 250, 2);
    place(byR.out, 360,  95, 6);
  }

  function setA() {
    return ELEMENTS.filter((e) => assignment[e] === "A" || assignment[e] === "AB");
  }
  function setB() {
    return ELEMENTS.filter((e) => assignment[e] === "B" || assignment[e] === "AB");
  }
  function resultSet() {
    const regs = OPS[currentOp].regions;
    return ELEMENTS.filter((e) => regs.includes(assignment[e]));
  }
  function fmtSet(arr) {
    if (!arr || arr.length === 0) return "∅";
    return "{" + arr.sort((x, y) => x - y).join(", ") + "}";
  }

  function update() {
    const A_set = setA();
    const B_set = setB();
    const res = resultSet();

    // Highlight chips in result; fade others (only if some element exists in any region)
    const anyAssigned = ELEMENTS.some((e) => assignment[e] !== "out");
    ELEMENTS.forEach((e) => {
      const g = refs.chips[e];
      const inR = res.includes(e);
      g.classList.toggle("in-result", inR);
      // Fade only non-result chips, and only if there's *something* to show as result
      g.classList.toggle("faded", !inR && res.length > 0 && anyAssigned);
    });

    // Readout
    $("#venn-set-e").textContent = fmtSet(ELEMENTS);
    $("#venn-set-a").textContent = fmtSet(A_set);
    $("#venn-set-b").textContent = fmtSet(B_set);
    $("#venn-set-result").textContent = fmtSet(res);
    $("#venn-set-size").textContent = res.length;

    const op = OPS[currentOp];
    $("#venn-op-v").textContent = op.sym;
    $("#venn-ops-info").innerHTML = `<b>${op.label}</b> — ${op.desc}`;
    $("#venn-ops-target").innerHTML =
      `İşlem: <b>${op.label} = ${fmtSet(res)}</b> · sonuçtaki elementler sarı çerçeveli.`;
  }

  function reset() {
    ELEMENTS.forEach((e) => (assignment[e] = "out"));
    gridLayout();
    update();
  }
  function randomize() {
    ELEMENTS.forEach((e) => (assignment[e] = REGIONS[randomInt(0, 3)]));
    gridLayout();
    update();
  }
  function preset() {
    // 4 in A-only, 3 in A∩B, 3 in B-only, 2 in outside — pedagogically clean
    const plan = ["A","A","A","A","AB","AB","AB","B","B","B","out","out"];
    ELEMENTS.forEach((e, i) => (assignment[e] = plan[i]));
    gridLayout();
    update();
  }

  function init() {
    // Start with the educational preset so the first look is already meaningful
    ELEMENTS.forEach((e) => (assignment[e] = "out"));
    buildSVG();
    preset();
    $("#venn-op").addEventListener("change", () => {
      currentOp = $("#venn-op").value;
      update();
    });
    $("#venn-ops-reset").addEventListener("click", reset);
    $("#venn-ops-random").addEventListener("click", randomize);
    $("#venn-ops-preset").addEventListener("click", preset);
  }
  return { init };
})();

// ============================================================
// Module C · Function machine (linear y=ax+b)
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
    // Nitel özellikler panelini güncelle
    updateQualities(c);
  }

  // Dönüşüm uygulanmış g(x) = a·f(x−r) + k için nitel özellikleri hesapla.
  // Referans tablo + r,k,a'ya göre dinamik
  function updateQualities(c) {
    const { base, a, r, k } = c;
    const f = BASES[base].f;
    const fmt = (v) => v === 0 ? "0" : (Math.abs(v - Math.round(v)) < 0.01 ? String(Math.round(v)) : v.toFixed(1));
    const rStr = r === 0 ? "" : (r > 0 ? ` + ${fmt(r)}` : ` − ${fmt(-r)}`);
    const kStr = k === 0 ? "" : (k > 0 ? ` + ${fmt(k)}` : ` − ${fmt(-k)}`);

    // Tanım & görüntü, bireysel hesap
    let domain, range, mono, zero, ext, parity, oneToOne, asym;
    const aPos = a > 0;
    const aOne = Math.abs(a) === 1;

    // Ortak: y-kesim f(0)
    let y0 = NaN;
    const fAtNegR = f(-r);
    if (Number.isFinite(fAtNegR)) y0 = a * fAtNegR + k;

    switch (base) {
      case "lin": {
        // g(x) = a(x - r) + k = ax + (k - ar) → her zaman bir doğru
        const intercept = k - a * r;
        domain = "ℝ";
        range = a === 0 ? `{${fmt(k)}}` : "ℝ";
        mono = a === 0 ? "sabit" : (aPos ? "artan (ℝ)" : "azalan (ℝ)");
        // Sıfır: ax + (k-ar) = 0 → x = (ar - k)/a
        zero = a === 0 ? (k === 0 ? "her x" : "yok") : `x = ${fmt((a*r - k)/a)}`;
        ext = "yok";
        parity = (r === 0 && k === 0) ? "tek" : (k === 0 && r === 0 ? "tek" : "ne tek ne çift");
        oneToOne = a === 0 ? "hayır (sabit)" : "evet";
        asym = "yok";
        break;
      }
      case "sq": {
        // g(x) = a(x-r)² + k
        domain = "ℝ";
        range = aPos ? `[${fmt(k)}, ∞)` : `(−∞, ${fmt(k)}]`;
        mono = aPos
          ? `(−∞, ${fmt(r)}] azalan · [${fmt(r)}, ∞) artan`
          : `(−∞, ${fmt(r)}] artan · [${fmt(r)}, ∞) azalan`;
        // Sıfır: a(x-r)² + k = 0 → (x-r)² = -k/a
        const disc = -k / a;
        if (disc < 0) zero = "yok (reel)";
        else if (disc === 0) zero = `x = ${fmt(r)} (çift kök)`;
        else {
          const rootOff = Math.sqrt(disc);
          zero = `x = ${fmt(r - rootOff)}, ${fmt(r + rootOff)}`;
        }
        ext = aPos ? `min (${fmt(r)}, ${fmt(k)})` : `max (${fmt(r)}, ${fmt(k)})`;
        parity = (r === 0) ? "çift" : "ne tek ne çift";
        oneToOne = "hayır (çift fonksiyon)";
        asym = "yok";
        break;
      }
      case "sqrt": {
        // g(x) = a√(x-r) + k, tanım x ≥ r
        domain = `[${fmt(r)}, ∞)`;
        range = aPos ? `[${fmt(k)}, ∞)` : `(−∞, ${fmt(k)}]`;
        mono = aPos ? `artan [${fmt(r)}, ∞)` : `azalan [${fmt(r)}, ∞)`;
        // Sıfır: a√(x-r) + k = 0 → √(x-r) = -k/a → x = r + (k/a)²
        if ((-k / a) < 0) zero = "yok";
        else {
          const rv = (-k / a);
          zero = `x = ${fmt(r + rv * rv)}`;
        }
        ext = aPos ? `min f(${fmt(r)}) = ${fmt(k)}` : `max f(${fmt(r)}) = ${fmt(k)}`;
        parity = "ne tek ne çift";
        oneToOne = "evet";
        asym = "yok";
        break;
      }
      case "abs": {
        // g(x) = a|x-r| + k
        domain = "ℝ";
        range = aPos ? `[${fmt(k)}, ∞)` : `(−∞, ${fmt(k)}]`;
        mono = aPos
          ? `(−∞, ${fmt(r)}] azalan · [${fmt(r)}, ∞) artan`
          : `(−∞, ${fmt(r)}] artan · [${fmt(r)}, ∞) azalan`;
        const disc = -k / a;
        if (disc < 0) zero = "yok";
        else if (disc === 0) zero = `x = ${fmt(r)}`;
        else zero = `x = ${fmt(r - disc)}, ${fmt(r + disc)}`;
        ext = aPos ? `min (${fmt(r)}, ${fmt(k)})` : `max (${fmt(r)}, ${fmt(k)})`;
        parity = (r === 0) ? "çift" : "ne tek ne çift";
        oneToOne = "hayır (çift fonksiyon)";
        asym = "yok";
        break;
      }
      case "rec": {
        // g(x) = a/(x-r) + k, tanım x ≠ r
        domain = `ℝ \\ {${fmt(r)}}`;
        range = `ℝ \\ {${fmt(k)}}`;
        mono = aPos
          ? `(−∞, ${fmt(r)}) azalan · (${fmt(r)}, ∞) azalan`
          : `(−∞, ${fmt(r)}) artan · (${fmt(r)}, ∞) artan`;
        // Sıfır: a/(x-r) + k = 0 → x = r - a/k  (k ≠ 0)
        zero = k === 0 ? "yok" : `x = ${fmt(r - a / k)}`;
        ext = "yok";
        parity = (r === 0 && k === 0) ? "tek" : "ne tek ne çift";
        oneToOne = "evet";
        asym = `dikey x = ${fmt(r)} · yatay y = ${fmt(k)}`;
        break;
      }
      default:
        domain = range = mono = zero = ext = parity = oneToOne = asym = "—";
    }

    $("#rq-dom").textContent = domain;
    $("#rq-range").textContent = range;
    $("#rq-mono").textContent = mono;
    $("#rq-zero").textContent = zero;
    $("#rq-y0").textContent = Number.isFinite(y0) ? fmt(y0) : "tanımsız";
    $("#rq-ext").textContent = ext;
    $("#rq-parity").textContent = parity;
    $("#rq-11").textContent = oneToOne;
    $("#rq-asym").textContent = asym;
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
// Module E · Analytic line laboratory · keşif (puansız)
// -------------
// İki sürüklenebilir nokta A ve B; uzaklık, orta nokta, eğim,
// eğim açısı, doğru denklemi ve belirli oranda bölen nokta P
// canlı hesaplanır. Puan yok, görev yok — sezgi inşa modülü.
// ============================================================
const AnalyticLineMod = (() => {
  const svg = $("#analytic-svg");
  const W = 720, H = 500;
  const padL = 40, padR = 40, padT = 30, padB = 40;
  const xMin = -10, xMax = 10, yMin = -10, yMax = 10;

  const toPx = (x, y) => ({
    x: padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR),
    y: (H - padB) - ((y - yMin) / (yMax - yMin)) * (H - padT - padB),
  });
  const toMath = (px, py) => ({
    x: Math.round(((px - padL) / (W - padL - padR)) * (xMax - xMin) + xMin),
    y: Math.round(((H - padB - py) / (H - padT - padB)) * (yMax - yMin) + yMin),
  });

  const A = { x: -4, y: 2 };
  const B = { x: 4, y: -2 };
  const refs = {};
  let dragging = null;

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Grid
    for (let x = xMin; x <= xMax; x++) {
      const p = toPx(x, 0);
      svg.appendChild(svgEl("line", {
        class: x % 5 === 0 ? "grid-major" : "grid-minor",
        x1: p.x, y1: padT, x2: p.x, y2: H - padB,
      }));
    }
    for (let y = yMin; y <= yMax; y++) {
      const p = toPx(0, y);
      svg.appendChild(svgEl("line", {
        class: y % 5 === 0 ? "grid-major" : "grid-minor",
        x1: padL, y1: p.y, x2: W - padR, y2: p.y,
      }));
    }
    // Axes
    const o = toPx(0, 0);
    svg.appendChild(svgEl("line", { class: "axis", x1: padL, y1: o.y, x2: W - padR, y2: o.y }));
    svg.appendChild(svgEl("line", { class: "axis", x1: o.x, y1: padT, x2: o.x, y2: H - padB }));
    // Tick labels
    [-10, -5, 5, 10].forEach((v) => {
      const px = toPx(v, 0);
      const t = svg.appendChild(svgEl("text", {
        class: "tick-label", x: px.x, y: o.y + 14, "text-anchor": "middle",
      }));
      t.textContent = v;
      const py = toPx(0, v);
      const t2 = svg.appendChild(svgEl("text", {
        class: "tick-label", x: o.x + 6, y: py.y + 3,
      }));
      t2.textContent = v;
    });

    // Line AB
    refs.lineAB = svg.appendChild(svgEl("line", { class: "line-ab" }));
    // Midpoint marker (small cross)
    refs.midMark = svg.appendChild(svgEl("circle", {
      r: 4, fill: "#94a3b8", stroke: "#fff", "stroke-width": 2,
    }));
    // Dividing point P
    refs.pointP = svg.appendChild(svgEl("circle", { class: "point P", r: 9 }));
    // A and B (draggable)
    refs.pointA = svg.appendChild(svgEl("circle", { class: "point A", r: 10, "data-k": "A" }));
    refs.pointB = svg.appendChild(svgEl("circle", { class: "point B", r: 10, "data-k": "B" }));
    // Labels
    refs.lblA = svg.appendChild(svgEl("text", { fill: "#4338ca", "font-size": 14, "font-weight": 700 }));
    refs.lblB = svg.appendChild(svgEl("text", { fill: "#b45309", "font-size": 14, "font-weight": 700 }));
    refs.lblP = svg.appendChild(svgEl("text", { fill: "#065f46", "font-size": 13, "font-weight": 700 }));
    refs.lblM = svg.appendChild(svgEl("text", { fill: "#64748b", "font-size": 11 }));

    refs.pointA.addEventListener("pointerdown", onDragStart);
    refs.pointB.addEventListener("pointerdown", onDragStart);
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
    const m = toMath(px, py);
    m.x = clamp(m.x, xMin, xMax);
    m.y = clamp(m.y, yMin, yMax);
    if (dragging === "A") { A.x = m.x; A.y = m.y; }
    if (dragging === "B") { B.x = m.x; B.y = m.y; }
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

  function render() {
    const pA = toPx(A.x, A.y);
    const pB = toPx(B.x, B.y);
    setAttrs(refs.lineAB, { x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y });
    setAttrs(refs.pointA, { cx: pA.x, cy: pA.y });
    setAttrs(refs.pointB, { cx: pB.x, cy: pB.y });

    // Doğruya dik normal vektör (SVG uzayında): A→B yönü (dx, dy), dik = (dy, -dx)
    // Normal ile label'ları noktadan dışarı iteliriz → çakışma riski düşer
    const dxPx = pB.x - pA.x, dyPx = pB.y - pA.y;
    const len = Math.hypot(dxPx, dyPx) || 1;
    const nx = -dyPx / len, ny = dxPx / len; // unit normal
    // A için negatif, B için pozitif yönde 18 px ofset
    setAttrs(refs.lblA, { x: pA.x - nx * 20, y: pA.y - ny * 20 + 4, "text-anchor": "middle" });
    setAttrs(refs.lblB, { x: pB.x + nx * 20, y: pB.y + ny * 20 + 4, "text-anchor": "middle" });
    refs.lblA.textContent = "A";
    refs.lblB.textContent = "B";

    // Midpoint
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const pMid = toPx(mid.x, mid.y);
    setAttrs(refs.midMark, { cx: pMid.x, cy: pMid.y });
    setAttrs(refs.lblM, { x: pMid.x + nx * 14, y: pMid.y + ny * 14 + 4, "text-anchor": "middle" });
    refs.lblM.textContent = "M";

    // Distance
    const d = Math.hypot(B.x - A.x, B.y - A.y);

    // Slope + angle
    const dx = B.x - A.x, dy = B.y - A.y;
    let slopeStr, angleStr, eqStr;
    if (Math.abs(dx) < 1e-6) {
      slopeStr = "tanımsız";
      angleStr = "90°";
      eqStr = `x = ${A.x}`;
    } else {
      const m = dy / dx;
      slopeStr = m.toFixed(3);
      let ang = Math.atan(m) * 180 / Math.PI;
      if (ang < 0) ang += 180;
      angleStr = ang.toFixed(1) + "°";
      const b = A.y - m * A.x;
      const sign = b >= 0 ? "+" : "−";
      eqStr = `y = ${m.toFixed(2)}·x ${sign} ${Math.abs(b).toFixed(2)}`;
    }

    // Dividing point: P = (m·A + k·B) / (k + m), with m = 1 (normalized)
    // Ratio k: |AP|/|PB|
    const k = Number($("#an-ratio").value);
    const P = {
      x: (A.x + k * B.x) / (1 + k),
      y: (A.y + k * B.y) / (1 + k),
    };
    const pP = toPx(P.x, P.y);
    setAttrs(refs.pointP, { cx: pP.x, cy: pP.y });
    // P label'ını doğrunun dik yönünde 18 px ofset — A ve B label'larının karşı tarafında
    setAttrs(refs.lblP, { x: pP.x + nx * 18, y: pP.y + ny * 18 + 4, "text-anchor": "middle" });
    refs.lblP.textContent = "P";

    // Readout
    $("#an-a").textContent = `(${A.x}, ${A.y})`;
    $("#an-b").textContent = `(${B.x}, ${B.y})`;
    $("#an-d").textContent = d.toFixed(3);
    $("#an-mid").textContent = `(${mid.x.toFixed(1)}, ${mid.y.toFixed(1)})`;
    $("#an-slope").textContent = slopeStr;
    $("#an-angle").textContent = angleStr;
    $("#an-eq").textContent = eqStr;
    $("#an-div").textContent = `(${P.x.toFixed(2)}, ${P.y.toFixed(2)})`;
  }

  function onRatioSlider() {
    $("#an-ratio-num").value = Number($("#an-ratio").value).toFixed(1);
    render();
  }
  function onRatioNum() {
    let v = Number($("#an-ratio-num").value);
    if (!Number.isFinite(v)) return;
    v = clamp(v, 0.1, 5);
    $("#an-ratio").value = v;
    render();
  }

  function init() {
    buildSVG();
    render();
    $("#an-ratio").addEventListener("input", onRatioSlider);
    $("#an-ratio-num").addEventListener("input", onRatioNum);
    $("#an-ratio-num").addEventListener("blur", onRatioNum);
  }
  return { init };
})();

// ============================================================
// Module F · Trigonometry laboratory (full 0-360° · unit circle + sin/cos/tan graphs)
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
    // Gerçek eşkenar üçgen · taban BC, A üstte dengede.
    // Yükseklik = kenar·√3/2
    const baseY = 340;
    const half = 150;            // yarı taban
    const height = half * Math.sqrt(3); // tüm kenar = 2*half; yükseklik = 2·half·√3/2
    verts.A = { x: 360, y: baseY - height };   // ≈ (360, 80.2)
    verts.B = { x: 360 - half, y: baseY };     // (210, 340)
    verts.C = { x: 360 + half, y: baseY };     // (510, 340)
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
// Triangle geometry helpers (G2 + G3 ortak)
// B = (0,0), C = (a, 0) standart yerleşimi kullanıyoruz (a = |BC|).
// Tüm inşa fonksiyonları bir {A, B, C} obj döner veya geçersiz/parametre
// hatasında null.
// ============================================================
const TriGeo = (() => {
  const D2R = Math.PI / 180;

  // KKK (SSS): 3 kenar → tek üçgen (üçgen eşitsizliği sağlanıyorsa)
  function KKK(a, b, c) {
    if (a + b <= c || a + c <= b || b + c <= a) return null;
    // cos B = (a² + c² − b²) / (2ac)
    const cosB = (a * a + c * c - b * b) / (2 * a * c);
    if (Math.abs(cosB) > 1) return null;
    const B = Math.acos(cosB);
    return { A: { x: c * Math.cos(B), y: c * Math.sin(B) }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
  }
  // KAK (SAS): c, açı B, a
  function KAK(c, Bdeg, a) {
    const B = Bdeg * D2R;
    return { A: { x: c * Math.cos(B), y: c * Math.sin(B) }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
  }
  // AKA (ASA): açı B, a, açı C
  function AKA(Bdeg, a, Cdeg) {
    if (Bdeg + Cdeg >= 180 || Bdeg <= 0 || Cdeg <= 0) return null;
    const Adeg = 180 - Bdeg - Cdeg;
    // Sinüs teoremi: c = a · sin C / sin A  (c = |AB|)
    const c = a * Math.sin(Cdeg * D2R) / Math.sin(Adeg * D2R);
    return KAK(c, Bdeg, a);
  }
  // KAA (AAS): açı B, açı C, b (= |AC|, yani B'nin karşısı olmayan bitişik olmayan kenar)
  function KAA(Bdeg, Cdeg, b) {
    if (Bdeg + Cdeg >= 180 || Bdeg <= 0 || Cdeg <= 0) return null;
    const Adeg = 180 - Bdeg - Cdeg;
    // a / sin A = b / sin B  →  a = b · sin A / sin B
    const a = b * Math.sin(Adeg * D2R) / Math.sin(Bdeg * D2R);
    return AKA(Bdeg, a, Cdeg);
  }
  // KKA (SSA) · ambigü: a, b, açı B; döndürülen obj.alt varsa ikinci çözüm
  function KKA(a, b, Bdeg) {
    const B = Bdeg * D2R;
    const sinB = Math.sin(B);
    const sinA = a * sinB / b;
    if (sinA > 1 + 1e-9) return null;            // hiç çözüm yok
    const clampedSinA = Math.min(1, Math.max(-1, sinA));
    const Aa = Math.asin(clampedSinA);            // dar açı çözüm
    const Ao = Math.PI - Aa;                      // geniş açı çözüm
    const build = (Aangle) => {
      const Cangle = Math.PI - B - Aangle;
      if (Cangle <= 0) return null;
      const c = b * Math.sin(Cangle) / sinB;
      return { A: { x: c * Math.cos(B), y: c * Math.sin(B) }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
    };
    const primary = build(Aa);
    const alt = (Aa !== Ao && Math.PI - B - Ao > 0) ? build(Ao) : null;
    if (!primary) return null;
    return { ...primary, alt };
  }
  // HK (RHS/HL): dik üçgen — hipotenüs h, bir kenar a (dik açı C'de)
  function HK(h, a) {
    if (h <= a) return null;
    const other = Math.sqrt(h * h - a * a);
    return { A: { x: a, y: other }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
  }

  // Ölçüm okuma: bir üçgen {A, B, C} için
  function measure(t) {
    if (!t) return null;
    const AB = Math.hypot(t.B.x - t.A.x, t.B.y - t.A.y);
    const BC = Math.hypot(t.C.x - t.B.x, t.C.y - t.B.y);
    const CA = Math.hypot(t.A.x - t.C.x, t.A.y - t.C.y);
    // Açılar
    const angle = (P, Q, R) => {
      const v1x = Q.x - P.x, v1y = Q.y - P.y;
      const v2x = R.x - P.x, v2y = R.y - P.y;
      const dot = v1x * v2x + v1y * v2y;
      const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
      return Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180 / Math.PI;
    };
    return {
      a: BC, b: CA, c: AB,
      A: angle(t.A, t.B, t.C),
      B: angle(t.B, t.A, t.C),
      C: angle(t.C, t.A, t.B),
    };
  }

  // Üçgeni verilen dikdörtgen viewport'un ortasına sığacak şekilde dönüştür.
  // externalScale verilirse sığdırma hesabı atlanır ve o ölçek kullanılır —
  // benzerlik/karşılaştırma modüllerinde iki üçgenin paylaşılan ölçeği için.
  function fitToPort(t, port, paddingPct = 0.12, externalScale = null) {
    if (!t) return null;
    const xs = [t.A.x, t.B.x, t.C.x];
    const ys = [t.A.y, t.B.y, t.C.y];
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    let scale;
    if (externalScale !== null && Number.isFinite(externalScale) && externalScale > 0) {
      scale = externalScale;
    } else {
      const availW = port.w * (1 - 2 * paddingPct);
      const availH = port.h * (1 - 2 * paddingPct);
      scale = Math.min(availW / w, availH / h);
    }
    const cx = port.x + port.w / 2;
    const cy = port.y + port.h / 2;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    // SVG y ters: matematik y+ → svg y- (flipY)
    const xf = (p) => ({ x: cx + (p.x - midX) * scale, y: cy - (p.y - midY) * scale });
    return { A: xf(t.A), B: xf(t.B), C: xf(t.C), scale };
  }

  // İki üçgenin (örn. T₁ ve T₂ = k·T₁) aynı ölçekte çizilebilmesi için
  // paylaşılan ölçek hesaplar. Her ikisinin de kendi port'una sığmasını
  // garanti eder (büyük olanın sığması esas alınır).
  function computeSharedScale(t1, t2, port, paddingPct = 0.12) {
    const bbox = (t) => {
      if (!t) return { w: 1, h: 1 };
      const xs = [t.A.x, t.B.x, t.C.x];
      const ys = [t.A.y, t.B.y, t.C.y];
      return {
        w: Math.max(...xs) - Math.min(...xs) || 1,
        h: Math.max(...ys) - Math.min(...ys) || 1,
      };
    };
    const b1 = bbox(t1), b2 = bbox(t2);
    const maxW = Math.max(b1.w, b2.w);
    const maxH = Math.max(b1.h, b2.h);
    const availW = port.w * (1 - 2 * paddingPct);
    const availH = port.h * (1 - 2 * paddingPct);
    return Math.min(availW / maxW, availH / maxH);
  }

  // Vertex ve karşı kenar renk paleti — Oliver Byrne (Euclid) tarzı:
  // renk fonksiyonel iz, eşleşen parçaları bağlar. A-a kırmızı, B-b mor, C-c yeşil.
  const COLOR = {
    A: "#ef4444", B: "#6366f1", C: "#10b981",
    // Kenar = karşı köşenin rengi
    a: "#ef4444", b: "#6366f1", c: "#10b981",
  };

  // Zengin üçgen çizimi — hem G2 hem G3'te kullanılır.
  //   container: parent SVG <g>
  //   t: matematik koordinatlarında { A, B, C } (y+ up)
  //   port: { x, y, w, h }
  //   externalScale: opsiyonel · iki üçgeni paylaşılan ölçekte çizmek için
  function drawRichTriangle(container, t, port, externalScale = null) {
    while (container.firstChild) container.removeChild(container.firstChild);
    if (!t) {
      const err = container.appendChild(svgEl("text", {
        x: port.x + port.w / 2, y: port.y + port.h / 2,
        "text-anchor": "middle", fill: "#b91c1c", "font-weight": 700, "font-size": 14,
      }));
      err.textContent = "⚠ Geçersiz parametreler";
      return;
    }
    const fit = fitToPort(t, port, 0.12, externalScale);
    const m = measure(t);
    if (!fit || !m) return;

    // 1) Üçgen dolum (hafif)
    const pts = `${fit.A.x},${fit.A.y} ${fit.B.x},${fit.B.y} ${fit.C.x},${fit.C.y}`;
    container.appendChild(svgEl("polygon", {
      points: pts, fill: "rgba(15,23,42,0.035)", stroke: "none",
    }));

    // 2) Renkli kenarlar (karşı köşenin rengi) + tick marks
    const drawEdge = (P, Q, color, labelText, tickCount) => {
      container.appendChild(svgEl("line", {
        x1: P.x, y1: P.y, x2: Q.x, y2: Q.y,
        stroke: color, "stroke-width": 3.2, "stroke-linecap": "round",
      }));
      const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;
      const dx = Q.x - P.x, dy = Q.y - P.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const ux = dx / len,   uy = dy / len;
      // Tick marks — 1 tick = kenar 'a', 2 = 'b', 3 = 'c'
      const tickLen = 6, gap = 4;
      for (let i = 0; i < tickCount; i++) {
        const off = (i - (tickCount - 1) / 2) * gap;
        const cx = mx + ux * off, cy = my + uy * off;
        container.appendChild(svgEl("line", {
          x1: cx - nx * tickLen / 2, y1: cy - ny * tickLen / 2,
          x2: cx + nx * tickLen / 2, y2: cy + ny * tickLen / 2,
          stroke: color, "stroke-width": 2.6, "stroke-linecap": "round",
        }));
      }
      // Kenar etiketi (capsule)
      const lblX = mx + nx * 16;
      const lblY = my + ny * 16;
      const rectW = Math.max(34, labelText.length * 8 + 10);
      container.appendChild(svgEl("rect", {
        x: lblX - rectW / 2, y: lblY - 9, width: rectW, height: 18, rx: 9,
        fill: "#fff", stroke: color, "stroke-width": 1.3,
        filter: "drop-shadow(0 1px 2px rgba(15,23,42,0.08))",
      }));
      container.appendChild(svgEl("text", {
        x: lblX, y: lblY + 4, "text-anchor": "middle", "font-size": 11.5,
        "font-weight": 700, fill: color, "font-family": "JetBrains Mono, monospace",
      })).textContent = labelText;
    };
    drawEdge(fit.B, fit.C, COLOR.a, `a=${m.a.toFixed(1)}`, 1);
    drawEdge(fit.C, fit.A, COLOR.b, `b=${m.b.toFixed(1)}`, 2);
    drawEdge(fit.A, fit.B, COLOR.c, `c=${m.c.toFixed(1)}`, 3);

    // 3) Açı yayları + derece etiketleri (her köşede)
    const drawAngleMark = (vertex, adj1, adj2, degValue, color) => {
      const a1 = Math.atan2(adj1.y - vertex.y, adj1.x - vertex.x);
      const a2 = Math.atan2(adj2.y - vertex.y, adj2.x - vertex.x);
      let delta = a2 - a1;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      const sweep = delta > 0 ? 1 : 0;
      const radius = 26;
      const x1 = vertex.x + radius * Math.cos(a1);
      const y1 = vertex.y + radius * Math.sin(a1);
      const x2 = vertex.x + radius * Math.cos(a2);
      const y2 = vertex.y + radius * Math.sin(a2);
      container.appendChild(svgEl("path", {
        d: `M ${vertex.x} ${vertex.y} L ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweep} ${x2} ${y2} Z`,
        fill: color, "fill-opacity": 0.18,
        stroke: color, "stroke-width": 1.5, "stroke-opacity": 0.7,
      }));
      // Açı değeri · bisector yönünde dışarı
      const midAngle = a1 + delta / 2;
      const lblX = vertex.x + (radius + 14) * Math.cos(midAngle);
      const lblY = vertex.y + (radius + 14) * Math.sin(midAngle) + 4;
      container.appendChild(svgEl("text", {
        x: lblX, y: lblY, "text-anchor": "middle", "font-size": 11,
        "font-weight": 700, fill: color, "font-family": "JetBrains Mono, monospace",
      })).textContent = `${degValue.toFixed(1)}°`;
    };
    drawAngleMark(fit.A, fit.B, fit.C, m.A, COLOR.A);
    drawAngleMark(fit.B, fit.C, fit.A, m.B, COLOR.B);
    drawAngleMark(fit.C, fit.A, fit.B, m.C, COLOR.C);

    // 4) Köşe noktaları: halo + iç disk + beyaz harf
    const drawVertexDot = (p, letter, color) => {
      container.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 16, fill: color, "fill-opacity": 0.16,
      }));
      container.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 11, fill: color,
        stroke: "#fff", "stroke-width": 2.5,
      }));
      container.appendChild(svgEl("text", {
        x: p.x, y: p.y + 4, "text-anchor": "middle",
        fill: "#fff", "font-weight": 800, "font-size": 13,
        "font-family": "Inter, sans-serif",
      })).textContent = letter;
    };
    drawVertexDot(fit.A, "A", COLOR.A);
    drawVertexDot(fit.B, "B", COLOR.B);
    drawVertexDot(fit.C, "C", COLOR.C);
  }

  return { KKK, KAK, AKA, KAA, KKA, HK, measure, fitToPort, computeSharedScale, drawRichTriangle, COLOR };
})();

// ============================================================
// Module G2 · Triangle congruence studio
// -------------
// Kriter seçici (KKK, KAK, AKA, KAA, KKA, HK) + iki üçgen yan yana.
// T₁ ve T₂ aynı kriterden inşa edilir; KKA'da "Alternatif üçgen" butonu
// ile ambigü ikinci çözüme geçilir (eşlik bozulur → kırmızı badge).
// ============================================================
const TriCongruenceMod = (() => {
  const svg = $("#cong-svg");
  const W = 720, H = 440;
  const PAD = 12;
  const portW = (W - 3 * PAD) / 2;
  const port1 = { x: PAD, y: PAD + 20, w: portW, h: H - 2 * PAD - 30 };
  const port2 = { x: 2 * PAD + portW, y: PAD + 20, w: portW, h: H - 2 * PAD - 30 };

  // Kriter tanımları: her biri input spec + build fonksiyonu
  const CRITERIA = {
    kkk: {
      label: "KKK", info: "Üç kenarı eşit olan üçgenler eşittir (Kenar-Kenar-Kenar).",
      inputs: [
        { name: "a", label: "|BC| = a", min: 3, max: 8, step: 0.1, def: 5 },
        { name: "b", label: "|AC| = b", min: 3, max: 8, step: 0.1, def: 6 },
        { name: "c", label: "|AB| = c", min: 3, max: 8, step: 0.1, def: 7 },
      ],
      build: (v) => TriGeo.KKK(v.a, v.b, v.c),
      unique: true,
    },
    kak: {
      label: "KAK", info: "İki kenar ve aralarındaki açı eşit olan üçgenler eşittir.",
      inputs: [
        { name: "c", label: "|AB| = c", min: 3, max: 8, step: 0.1, def: 5 },
        { name: "B", label: "∠B (derece)", min: 30, max: 150, step: 1, def: 60 },
        { name: "a", label: "|BC| = a", min: 3, max: 8, step: 0.1, def: 6 },
      ],
      build: (v) => TriGeo.KAK(v.c, v.B, v.a),
      unique: true,
    },
    aka: {
      label: "AKA", info: "İki açı ve aralarındaki kenar eşit olan üçgenler eşittir.",
      inputs: [
        { name: "B", label: "∠B (derece)", min: 20, max: 100, step: 1, def: 50 },
        { name: "a", label: "|BC| = a", min: 3, max: 8, step: 0.1, def: 6 },
        { name: "C", label: "∠C (derece)", min: 20, max: 100, step: 1, def: 60 },
      ],
      build: (v) => TriGeo.AKA(v.B, v.a, v.C),
      unique: true,
    },
    kaa: {
      label: "KAA", info: "İki açı + bitişik olmayan kenar eşit → eşlik.",
      inputs: [
        { name: "B", label: "∠B (derece)", min: 20, max: 100, step: 1, def: 50 },
        { name: "C", label: "∠C (derece)", min: 20, max: 100, step: 1, def: 60 },
        { name: "b", label: "|AC| = b", min: 3, max: 8, step: 0.1, def: 5 },
      ],
      build: (v) => TriGeo.KAA(v.B, v.C, v.b),
      unique: true,
    },
    kka: {
      label: "KKA", info: "⚠ İki kenar + karşı açı: genellikle iki farklı üçgen olur — eşlik GARANTİ değildir.",
      inputs: [
        { name: "a", label: "|BC| = a", min: 3, max: 7, step: 0.1, def: 5 },
        { name: "b", label: "|AC| = b", min: 4, max: 8, step: 0.1, def: 6.5 },
        { name: "B", label: "∠B (derece)", min: 25, max: 70, step: 1, def: 40 },
      ],
      build: (v) => TriGeo.KKA(v.a, v.b, v.B),
      unique: false,
    },
    hk: {
      label: "HK", info: "Dik üçgende hipotenüs + bir kenar eşit → eşlik.",
      inputs: [
        { name: "h", label: "hipotenüs", min: 5, max: 10, step: 0.1, def: 7 },
        { name: "a", label: "|BC| = a", min: 3, max: 9, step: 0.1, def: 5 },
      ],
      build: (v) => TriGeo.HK(v.h, v.a),
      unique: true,
    },
  };

  let curKey = "kkk";
  let values = {};
  let useAlt = false;         // KKA için alternatif çözüme geç
  let overlayOn = false;      // T₂ → T₁ üzerine animasyonla kayıyor mu
  let animT = 0;              // 0 = port2'de, 1 = port1'in üstünde
  let rafId = null;
  const refs = {};

  function buildSVGShell() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.appendChild(svgEl("rect", { class: "port-bg port-t1", x: port1.x, y: port1.y, width: port1.w, height: port1.h, rx: 12 }));
    refs.port2bg = svg.appendChild(svgEl("rect", { class: "port-bg port-t2", x: port2.x, y: port2.y, width: port2.w, height: port2.h, rx: 12 }));
    const t1 = svg.appendChild(svgEl("text", { class: "port-title port-t1-title", x: port1.x + 18, y: port1.y - 6 })); t1.textContent = "T₁";
    refs.port2title = svg.appendChild(svgEl("text", { class: "port-title port-t2-title", x: port2.x + 18, y: port2.y - 6 })); refs.port2title.textContent = "T₂";
    refs.g1 = svg.appendChild(svgEl("g", {}));
    refs.g2 = svg.appendChild(svgEl("g", {}));
  }

  function renderInputs() {
    const host = $("#cong-inputs");
    host.innerHTML = "";
    const c = CRITERIA[curKey];
    c.inputs.forEach((inp) => {
      if (values[inp.name] === undefined) values[inp.name] = inp.def;
      const row = document.createElement("div");
      row.className = "field";
      row.innerHTML = `
        <span class="lbl">${inp.label}</span>
        <input id="cong-in-${inp.name}" type="range" min="${inp.min}" max="${inp.max}" step="${inp.step}" value="${values[inp.name]}" />
        <input class="val-input" id="cong-in-${inp.name}-num" type="number" step="${inp.step}" min="${inp.min}" max="${inp.max}" value="${values[inp.name]}" />
      `;
      host.appendChild(row);
      const slider = row.querySelector("input[type=range]");
      const num = row.querySelector("input[type=number]");
      const onChange = (src) => () => {
        let v = Number(src.value);
        if (!Number.isFinite(v)) return;
        v = clamp(v, inp.min, inp.max);
        values[inp.name] = v;
        slider.value = v;
        if (document.activeElement !== num) num.value = (inp.step < 1 ? v.toFixed(1) : v);
        update();
      };
      slider.addEventListener("input", onChange(slider));
      num.addEventListener("input", onChange(num));
      num.addEventListener("blur", onChange(num));
    });
  }

  function buildTable(m1, m2) {
    const host = $("#cong-table");
    host.innerHTML = `<div class="cmp-row header"><span>Ölçü</span><span>T₁</span><span>T₂</span><span>eşit?</span></div>`;
    const rows = [
      { k: "|BC| = a", v1: m1?.a, v2: m2?.a, unit: "" },
      { k: "|AC| = b", v1: m1?.b, v2: m2?.b, unit: "" },
      { k: "|AB| = c", v1: m1?.c, v2: m2?.c, unit: "" },
      { k: "∠A", v1: m1?.A, v2: m2?.A, unit: "°" },
      { k: "∠B", v1: m1?.B, v2: m2?.B, unit: "°" },
      { k: "∠C", v1: m1?.C, v2: m2?.C, unit: "°" },
    ];
    rows.forEach((r) => {
      const eq = (r.v1 != null && r.v2 != null && Math.abs(r.v1 - r.v2) < 0.05);
      const row = document.createElement("div");
      row.className = "cmp-row";
      row.innerHTML = `
        <span>${r.k}</span>
        <span>${r.v1 == null ? "—" : r.v1.toFixed(2) + r.unit}</span>
        <span>${r.v2 == null ? "—" : r.v2.toFixed(2) + r.unit}</span>
        <span class="${eq ? "check-ok" : "check-warn"}">${eq ? "✓" : "✗"}</span>`;
      host.appendChild(row);
    });
  }

  function update() {
    const c = CRITERIA[curKey];
    $("#cong-crit-v").textContent = c.label;
    $("#cong-info").innerHTML = `<b>${c.label}</b>: ${c.info}`;

    const t1 = c.build(values);
    let t2 = c.build(values);
    // KKA: eğer alt seçiliyse ikinci olası çözüme geç
    if (curKey === "kka" && useAlt && t1 && t1.alt) t2 = t1.alt;
    else if (curKey === "kka" && t2 && t2.alt && !useAlt) t2 = { A: t2.A, B: t2.B, C: t2.C };

    // Paylaşılan ölçek: hem eşlik durumunda tam çakışma, hem KKA'da farkın görsel
    // olarak kıyaslanabilir olması için iki üçgeni aynı piksel-başına-birimle çiz.
    const t1Clean = t1 ? { A: t1.A, B: t1.B, C: t1.C } : null;
    const t2Clean = t2 ? { A: t2.A, B: t2.B, C: t2.C } : null;
    const sharedScale = (t1Clean && t2Clean) ? TriGeo.computeSharedScale(t1Clean, t2Clean, port1) : null;

    // Overlay animasyonu: T₂ port2'den port1'e doğru kayar (animT: 0 → 1)
    const t2Port = {
      x: port2.x + (port1.x - port2.x) * animT,
      y: port2.y + (port1.y - port2.y) * animT,
      w: port2.w,
      h: port2.h,
    };

    // port2 arka planını overlay'de soluklaştır
    refs.port2bg.setAttribute("fill-opacity", 1 - animT * 0.85);
    refs.port2title.setAttribute("opacity", 1 - animT * 0.85);

    TriGeo.drawRichTriangle(refs.g1, t1Clean, port1, sharedScale);
    TriGeo.drawRichTriangle(refs.g2, t2Clean, t2Port, sharedScale);
    // Overlay durumunda T₂ grubunu hafif saydamlaştır — T₁ altta görünür kalsın
    refs.g2.setAttribute("opacity", 1 - animT * 0.35);

    const m1 = TriGeo.measure(t1 ? { A: t1.A, B: t1.B, C: t1.C } : null);
    const m2 = TriGeo.measure(t2 ? { A: t2.A, B: t2.B, C: t2.C } : null);
    buildTable(m1, m2);

    const v = $("#cong-verdict");
    const altBtn = $("#cong-alt");
    altBtn.style.display = (curKey === "kka" && t1 && t1.alt) ? "" : "none";
    altBtn.textContent = useAlt ? "Birincil çözüme dön" : "Alternatif üçgen (KKA)";

    if (!t1 || !t2) {
      v.className = "verdict verdict-warn";
      v.textContent = "Geçersiz parametreler";
      return;
    }
    const allEqual = m1 && m2 &&
      Math.abs(m1.a - m2.a) < 0.05 &&
      Math.abs(m1.b - m2.b) < 0.05 &&
      Math.abs(m1.c - m2.c) < 0.05;
    if (allEqual) {
      v.className = "verdict verdict-ok";
      v.textContent = "T₁ ≅ T₂ · eşlik sağlanıyor";
    } else {
      v.className = "verdict verdict-warn";
      v.textContent = "T₁ ≇ T₂ · farklı üçgenler (KKA ambigüitesi)";
    }
  }

  function onCritChange() {
    curKey = $("#cong-criterion").value;
    values = {};
    useAlt = false;
    overlayOn = false;
    animT = 0;
    updateOverlayBtn();
    renderInputs();
    update();
  }

  function resetValues() {
    values = {};
    useAlt = false;
    overlayOn = false;
    animT = 0;
    updateOverlayBtn();
    renderInputs();
    update();
  }

  // Overlay animasyonu — requestAnimationFrame ile smooth ease-out cubic
  function animateOverlay(targetOn) {
    if (rafId) cancelAnimationFrame(rafId);
    const start = performance.now();
    const from = animT;
    const to = targetOn ? 1 : 0;
    const duration = 600;
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      animT = from + (to - from) * ease(progress);
      update();
      if (progress < 1) rafId = requestAnimationFrame(step);
      else rafId = null;
    };
    rafId = requestAnimationFrame(step);
  }
  function updateOverlayBtn() {
    const btn = $("#cong-overlay");
    btn.textContent = overlayOn ? "⇔ Ayır" : "⇔ Üst üste bindir";
    btn.classList.toggle("primary", !overlayOn);
    btn.classList.toggle("ghost", overlayOn);
  }

  function init() {
    buildSVGShell();
    renderInputs();
    $("#cong-criterion").addEventListener("change", onCritChange);
    $("#cong-alt").addEventListener("click", () => { useAlt = !useAlt; update(); });
    $("#cong-reset").addEventListener("click", resetValues);
    $("#cong-overlay").addEventListener("click", () => {
      overlayOn = !overlayOn;
      updateOverlayBtn();
      animateOverlay(overlayOn);
    });
    update();
  }
  return { init };
})();

// ============================================================
// Module G3 · Triangle similarity studio
// -------------
// Kriter: AA (iki açı eşit), KKK-oran, KAK-oran
// T₁ kullanıcının parametreleriyle kurulur; T₂ = T₁ × k (ölçek)
// Açılar eşit, kenarlar k oranında olur → benzerlik.
// ============================================================
const TriSimilarityMod = (() => {
  const svg = $("#sim-svg");
  const W = 720, H = 440;
  const PAD = 12;
  const portW = (W - 3 * PAD) / 2;
  const port1 = { x: PAD, y: PAD + 20, w: portW, h: H - 2 * PAD - 30 };
  const port2 = { x: 2 * PAD + portW, y: PAD + 20, w: portW, h: H - 2 * PAD - 30 };

  const CRITERIA = {
    aa: {
      label: "AA", info: "İki açı eşit olan üçgenler benzerdir (üçüncü açı otomatik eşit).",
      inputs: [
        { name: "B", label: "∠B", min: 20, max: 100, step: 1, def: 50 },
        { name: "C", label: "∠C", min: 20, max: 100, step: 1, def: 60 },
        { name: "a", label: "|BC| (T₁)", min: 3, max: 8, step: 0.1, def: 5 },
      ],
      build: (v) => TriGeo.AKA(v.B, v.a, v.C),
    },
    kkk: {
      label: "KKK-oran", info: "Üç kenarın oranları eşit → üçgenler benzer.",
      inputs: [
        { name: "a", label: "|BC| = a", min: 3, max: 7, step: 0.1, def: 4 },
        { name: "b", label: "|AC| = b", min: 3, max: 8, step: 0.1, def: 5 },
        { name: "c", label: "|AB| = c", min: 3, max: 8, step: 0.1, def: 6 },
      ],
      build: (v) => TriGeo.KKK(v.a, v.b, v.c),
    },
    kak: {
      label: "KAK-oran", info: "İki kenar oranı eşit + aralarındaki açı eşit → benzer.",
      inputs: [
        { name: "c", label: "|AB| = c", min: 3, max: 8, step: 0.1, def: 5 },
        { name: "B", label: "∠B", min: 30, max: 120, step: 1, def: 60 },
        { name: "a", label: "|BC| = a", min: 3, max: 8, step: 0.1, def: 6 },
      ],
      build: (v) => TriGeo.KAK(v.c, v.B, v.a),
    },
  };

  let curKey = "aa";
  let values = {};
  const refs = {};

  function buildSVGShell() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.appendChild(svgEl("rect", { class: "port-bg port-t1", x: port1.x, y: port1.y, width: port1.w, height: port1.h, rx: 12 }));
    svg.appendChild(svgEl("rect", { class: "port-bg port-t2-sim", x: port2.x, y: port2.y, width: port2.w, height: port2.h, rx: 12 }));
    const t1 = svg.appendChild(svgEl("text", { class: "port-title port-t1-title", x: port1.x + 18, y: port1.y - 6 })); t1.textContent = "T₁";
    const t2 = svg.appendChild(svgEl("text", { class: "port-title port-t2-sim-title", x: port2.x + 18, y: port2.y - 6 })); t2.textContent = "T₂ = k · T₁";
    refs.g1 = svg.appendChild(svgEl("g", {}));
    refs.g2 = svg.appendChild(svgEl("g", {}));
  }

  function renderInto(container, t, port, externalScale) {
    TriGeo.drawRichTriangle(container, t, port, externalScale);
  }

  // T1'i k ile ölçekle → T2 elde et (aynı şekil, farklı boyut)
  function scaleTriangle(t, k) {
    if (!t) return null;
    return {
      A: { x: t.A.x * k, y: t.A.y * k },
      B: { x: t.B.x * k, y: t.B.y * k },
      C: { x: t.C.x * k, y: t.C.y * k },
    };
  }

  function renderInputs() {
    const host = $("#sim-inputs");
    host.innerHTML = "";
    const c = CRITERIA[curKey];
    c.inputs.forEach((inp) => {
      if (values[inp.name] === undefined) values[inp.name] = inp.def;
      const row = document.createElement("div");
      row.className = "field";
      row.innerHTML = `
        <span class="lbl">${inp.label}</span>
        <input id="sim-in-${inp.name}" type="range" min="${inp.min}" max="${inp.max}" step="${inp.step}" value="${values[inp.name]}" />
        <input class="val-input" id="sim-in-${inp.name}-num" type="number" step="${inp.step}" min="${inp.min}" max="${inp.max}" value="${values[inp.name]}" />
      `;
      host.appendChild(row);
      const slider = row.querySelector("input[type=range]");
      const num = row.querySelector("input[type=number]");
      const onChange = (src) => () => {
        let v = Number(src.value);
        if (!Number.isFinite(v)) return;
        v = clamp(v, inp.min, inp.max);
        values[inp.name] = v;
        slider.value = v;
        if (document.activeElement !== num) num.value = (inp.step < 1 ? v.toFixed(1) : v);
        update();
      };
      slider.addEventListener("input", onChange(slider));
      num.addEventListener("input", onChange(num));
      num.addEventListener("blur", onChange(num));
    });
  }

  function buildTable(m1, m2, k) {
    const host = $("#sim-table");
    host.innerHTML = `<div class="cmp-row header"><span>Ölçü</span><span>T₁</span><span>T₂</span><span>oran T₂/T₁</span></div>`;
    const rows = [
      { k: "|BC| = a", v1: m1?.a, v2: m2?.a, unit: "", isRatio: true },
      { k: "|AC| = b", v1: m1?.b, v2: m2?.b, unit: "", isRatio: true },
      { k: "|AB| = c", v1: m1?.c, v2: m2?.c, unit: "", isRatio: true },
      { k: "∠A", v1: m1?.A, v2: m2?.A, unit: "°", isRatio: false },
      { k: "∠B", v1: m1?.B, v2: m2?.B, unit: "°", isRatio: false },
      { k: "∠C", v1: m1?.C, v2: m2?.C, unit: "°", isRatio: false },
    ];
    rows.forEach((r) => {
      let cmp;
      if (r.isRatio) {
        const ratio = r.v1 && r.v2 ? r.v2 / r.v1 : null;
        const ok = ratio && Math.abs(ratio - k) < 0.02;
        cmp = `<span class="ratio">${ratio ? ratio.toFixed(3) : "—"} ${ok ? "✓" : ""}</span>`;
      } else {
        const eq = (r.v1 != null && r.v2 != null && Math.abs(r.v1 - r.v2) < 0.05);
        cmp = `<span class="${eq ? "check-ok" : "check-warn"}">${eq ? "eşit ✓" : "≠"}</span>`;
      }
      const row = document.createElement("div");
      row.className = "cmp-row";
      row.innerHTML = `
        <span>${r.k}</span>
        <span>${r.v1 == null ? "—" : r.v1.toFixed(2) + r.unit}</span>
        <span>${r.v2 == null ? "—" : r.v2.toFixed(2) + r.unit}</span>
        ${cmp}`;
      host.appendChild(row);
    });
  }

  function update() {
    const c = CRITERIA[curKey];
    $("#sim-crit-v").textContent = c.label;
    $("#sim-info").innerHTML = `<b>${c.label}</b>: ${c.info}`;
    const k = Number($("#sim-k").value);
    $("#sim-k-num").value = k.toFixed(2);

    const t1 = c.build(values);
    const t2 = scaleTriangle(t1, k);
    // Paylaşılan ölçek: iki üçgeni aynı piksel-başına-birim ölçeğinde çiz
    // → k arttıkça T₂ görsel olarak da büyür, k azaldıkça küçülür.
    const sharedScale = (t1 && t2) ? TriGeo.computeSharedScale(t1, t2, port1) : null;
    renderInto(refs.g1, t1, port1, sharedScale);
    renderInto(refs.g2, t2, port2, sharedScale);
    const m1 = TriGeo.measure(t1);
    const m2 = TriGeo.measure(t2);
    buildTable(m1, m2, k);

    const v = $("#sim-verdict");
    if (!t1 || !t2) {
      v.className = "verdict verdict-warn";
      v.textContent = "Geçersiz";
      return;
    }
    const anglesEq = m1 && m2 &&
      Math.abs(m1.A - m2.A) < 0.1 && Math.abs(m1.B - m2.B) < 0.1 && Math.abs(m1.C - m2.C) < 0.1;
    if (anglesEq) {
      v.className = "verdict verdict-ok";
      v.textContent = `T₁ ∼ T₂ · benzer (k = ${k.toFixed(2)})`;
    } else {
      v.className = "verdict verdict-warn";
      v.textContent = "Açılar eşit değil — benzer değil";
    }
  }

  function onCritChange() {
    curKey = $("#sim-criterion").value;
    values = {};
    renderInputs();
    update();
  }

  function onKSlider() {
    $("#sim-k-num").value = Number($("#sim-k").value).toFixed(2);
    update();
  }
  function onKNum() {
    let v = Number($("#sim-k-num").value);
    if (!Number.isFinite(v)) return;
    v = clamp(v, 0.3, 3);
    $("#sim-k").value = v;
    update();
  }

  function init() {
    buildSVGShell();
    renderInputs();
    $("#sim-criterion").addEventListener("change", onCritChange);
    $("#sim-k").addEventListener("input", onKSlider);
    $("#sim-k-num").addEventListener("input", onKNum);
    $("#sim-k-num").addEventListener("blur", onKNum);
    $("#sim-reset").addEventListener("click", () => { values = {}; renderInputs(); update(); });
    update();
  }
  return { init };
})();

// ============================================================
// Module H · Probability lab · dice & coin
// -------------
// Keşif modülü · puan YOK (DESIGN PRINCIPLE #1).
// 3 mod:
//   die1  : tek zar (1d6) — her yüz 1/6 (uniform)
//   die2  : iki zar toplamı (2d6) — 2..12, piramit (üçgen) dağılım
//   coin10: 10 madeni para · tura sayısı — Binom(10, 0.5), çan şekli
// ============================================================
const ProbMod = (() => {
  const svg = $("#prob-hist");
  const refs = { barsTheo: [], barsExp: [], labels: [], freq: [] };
  const W = 720, H = 360;
  const padL = 50, padR = 30, padT = 30, padB = 60;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const MODES = {
    die1: {
      label: "1d6",
      cats: [1, 2, 3, 4, 5, 6],
      theo: () => Array(6).fill(1 / 6),
      run: () => randomInt(1, 6),
      expected: 3.5,
    },
    die2: {
      label: "2d6",
      cats: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      // Triangular distribution for sum of two d6
      theo: () => {
        // weights 1,2,3,4,5,6,5,4,3,2,1 over 36
        const w = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
        return w.map((x) => x / 36);
      },
      run: () => randomInt(1, 6) + randomInt(1, 6),
      expected: 7,
    },
    coin10: {
      label: "10 para · tura",
      cats: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      // Binom(10, 0.5): C(10,k) / 1024
      theo: () => {
        const C = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1];
        return C.map((c) => c / 1024);
      },
      run: () => {
        let heads = 0;
        for (let i = 0; i < 10; i++) if (Math.random() < 0.5) heads++;
        return heads;
      },
      expected: 5,
    },
  };

  // State: counts per category, total rolls, mode
  const state = { mode: "die2", counts: {}, total: 0, lastResult: null };

  function resetCounts() {
    state.counts = {};
    MODES[state.mode].cats.forEach((c) => (state.counts[c] = 0));
    state.total = 0;
    state.lastResult = null;
  }

  function buildSVG() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Axes
    svg.appendChild(svgEl("line", {
      class: "axis", x1: padL, y1: padT, x2: padL, y2: H - padB,
      stroke: "#cbd5e1",
    }));
    svg.appendChild(svgEl("line", {
      class: "axis", x1: padL, y1: H - padB, x2: W - padR, y2: H - padB,
      stroke: "#cbd5e1",
    }));
    // Y-axis title
    const yt = svg.appendChild(svgEl("text", {
      x: padL - 30, y: padT - 8, fill: "#94a3b8", "font-size": 11,
    }));
    yt.textContent = "Oran";

    rebuildBars();
  }

  function rebuildBars() {
    // Remove previous bar nodes (keep axes — first two children)
    while (svg.childNodes.length > 3) svg.removeChild(svg.lastChild);
    refs.barsTheo.length = 0;
    refs.barsExp.length = 0;
    refs.labels.length = 0;
    refs.freq.length = 0;

    const cats = MODES[state.mode].cats;
    const gap = 6;
    const barW = (innerW - gap * (cats.length - 1)) / cats.length;

    cats.forEach((cat, i) => {
      const x = padL + i * (barW + gap);
      // Theoretical bar (background outline)
      const theo = svg.appendChild(svgEl("rect", {
        class: "bar-theo", x, y: H - padB, width: barW, height: 0, rx: 4,
      }));
      // Experimental bar (filled)
      const exp = svg.appendChild(svgEl("rect", {
        class: "bar-exp", x: x + 4, y: H - padB, width: barW - 8, height: 0, rx: 3,
      }));
      // Frequency label (above bar)
      const freq = svg.appendChild(svgEl("text", {
        class: "freq-label", x: x + barW / 2, y: H - padB,
        "text-anchor": "middle",
      }));
      // Category label (below axis)
      const lbl = svg.appendChild(svgEl("text", {
        class: "cat-label", x: x + barW / 2, y: H - padB + 18,
        "text-anchor": "middle",
      }));
      lbl.textContent = cat;

      refs.barsTheo.push(theo);
      refs.barsExp.push(exp);
      refs.labels.push(lbl);
      refs.freq.push(freq);
    });
  }

  function draw() {
    const cats = MODES[state.mode].cats;
    const theo = MODES[state.mode].theo();
    const maxTheo = Math.max(...theo);
    // Scale so that theoretical max fills ~85% of inner height
    const visMax = Math.max(maxTheo, 0.01) * 1.15;

    cats.forEach((cat, i) => {
      const expProb = state.total > 0 ? state.counts[cat] / state.total : 0;
      const theoH = (theo[i] / visMax) * innerH;
      const expH  = (expProb / visMax) * innerH;
      setAttrs(refs.barsTheo[i], {
        y: H - padB - theoH,
        height: theoH,
      });
      setAttrs(refs.barsExp[i], {
        y: H - padB - expH,
        height: expH,
      });
      if (state.total > 0 && state.counts[cat] > 0) {
        refs.freq[i].textContent = state.counts[cat];
        setAttrs(refs.freq[i], { y: H - padB - expH - 4 });
      } else {
        refs.freq[i].textContent = "";
      }
    });
  }

  function updateStats() {
    const cats = MODES[state.mode].cats;
    let sum = 0;
    let modeCat = null, modeCount = 0;
    cats.forEach((cat) => {
      const c = state.counts[cat] || 0;
      sum += cat * c;
      if (c > modeCount) { modeCount = c; modeCat = cat; }
    });
    const mean = state.total > 0 ? (sum / state.total).toFixed(2) : "—";
    const mode = modeCount > 0 ? String(modeCat) : "—";

    $("#prob-mini").querySelector("[data-k='total']").textContent = state.total;
    $("#prob-mini").querySelector("[data-k='mean']").textContent = mean;
    $("#prob-mini").querySelector("[data-k='mode']").textContent = mode;

    const last = state.lastResult;
    $("#prob-last").textContent = last == null ? "Son atış: —" : `Son atış: ${last}`;

    // Pedagogical hint based on mode + sample size
    const fb = $("#prob-fb");
    const modeInfo = MODES[state.mode];
    if (state.total === 0) {
      fb.textContent = "İpucu: Atış sayısı az iken deneysel dağılım düzensiz, arttıkça teorik dağılıma yakınsar.";
    } else if (state.total < 50) {
      fb.textContent = `Az örneklem (${state.total}). Ortalama ${mean}, teorik beklenen ${modeInfo.expected}. Daha çok at.`;
    } else if (state.total < 500) {
      fb.textContent = `${state.total} atış. Gözlenen ortalama ${mean} ↔ teorik ${modeInfo.expected}. Dağılım şekillenmeye başlıyor.`;
    } else {
      fb.textContent = `${state.total} atış · ortalama ${mean} (teorik ${modeInfo.expected}). Deneysel frekanslar teorik dağılıma yaklaştı.`;
    }
  }

  function rollOnce() {
    const r = MODES[state.mode].run();
    state.counts[r] = (state.counts[r] || 0) + 1;
    state.total += 1;
    state.lastResult = r;
  }

  function runN() {
    const n = clamp(Number($("#prob-trials").value) || 500, 10, 10000);
    for (let i = 0; i < n; i++) rollOnce();
    draw();
    updateStats();
  }
  function rollSingle() {
    rollOnce();
    draw();
    updateStats();
  }
  function reset() {
    resetCounts();
    draw();
    updateStats();
  }
  function onModeChange() {
    state.mode = $("#prob-mode").value;
    $("#prob-mode-v").textContent = MODES[state.mode].label;
    resetCounts();
    rebuildBars();
    draw();
    updateStats();
  }
  function onTrialsSlider() {
    $("#prob-trials-num").value = $("#prob-trials").value;
  }
  function onTrialsNum() {
    let v = Number($("#prob-trials-num").value);
    if (!Number.isFinite(v)) return;
    v = clamp(v, 10, 10000);
    $("#prob-trials").value = v;
  }

  function init() {
    resetCounts();
    buildSVG();
    draw();
    updateStats();
    $("#prob-mode").addEventListener("change", onModeChange);
    $("#prob-trials").addEventListener("input", onTrialsSlider);
    $("#prob-trials-num").addEventListener("input", onTrialsNum);
    $("#prob-trials-num").addEventListener("blur", onTrialsNum);
    $("#run-sim").addEventListener("click", runN);
    $("#add-one").addEventListener("click", rollSingle);
    $("#reset-sim").addEventListener("click", reset);
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
  initInnerTabs();
  NumLine.init();       // A1 · Aralık Avı
  IntervalOpsMod.init(); // A2 · Aralık İşlemleri (yeni iç sekme)
  VennMod.init();       // B1 · Sayı Kümeleri Sınıflandırma
  VennOpsMod.init();    // B2 · Küme İşlemleri
  FunctionMod.init();
  RefFuncMod.init();
  AnalyticLineMod.init();
  TrigMod.init();
  TriangleMod.init();
  TriCongruenceMod.init();  // G2
  TriSimilarityMod.init();  // G3
  ProbMod.init();
  BayesMod.init();
  ["numline", "venn", "function", "reffunc", "trig"].forEach(renderModuleMini);
}

document.addEventListener("DOMContentLoaded", bootstrap);
