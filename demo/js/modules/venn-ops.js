import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const VennOpsMod = (() => {
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
