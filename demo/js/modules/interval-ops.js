import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const IntervalOpsMod = (() => {
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
