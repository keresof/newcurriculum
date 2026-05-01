import { $, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";
import { TriGeo } from "./tri-geo.js";

export const TriCongruenceMod = (() => {
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
