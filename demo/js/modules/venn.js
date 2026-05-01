import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const VennMod = (() => {
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
      const order = ["N", "Z", "Q", "I"];
      const ti = order.indexOf(target.cat);
      const ci = order.indexOf(clickedCat);
      let extra = "";
      if (ci > ti) extra = " Daha geniş bir kümenin bölgesine tıkladın — hedef «en dar» kümedir; iç halkalara yaklaş.";
      else if (ci < ti) extra = " Daha dar bir bölge seçtin; sayı seçilen kümede değilse dış halkalara genişle.";
      if (target.cat === "I" && clickedCat === "Q")
        extra = " √2, π gibi sayılar rasyonel görünse de rasyonel değildir; irrasyoneller ℝ içinde ℚ dışındadır (dış halkadaki irrasyonel bölge).";
      if (target.cat === "N" && clickedCat === "Z")
        extra = " Doğal sayılar tam sayıların içindedir; bu sayı için en dar etiket ℕ — en içteki halka.";
      fb.innerHTML = `Değil. ${target.label} ∈ <b>${CAT_LABELS[target.cat]}</b> (sen ${CAT_LABELS[clickedCat]} seçtin).${extra}`;
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
