import { $, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";
import { TriGeo } from "./tri-geo.js";

export const TriSimilarityMod = (() => {
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
