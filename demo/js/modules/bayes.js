import { $, $$, svgEl, setAttrs } from "../core/dom.js";
import { randomInt, clamp } from "../core/math.js";
import { flashHighlight, prefersReducedMotion } from "../core/motion.js";
import { State, recordAttempt, renderModuleMini } from "../core/state.js";
import { toast } from "../core/ui.js";

export const BayesMod = (() => {
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

  function computePpv(p, sens, spec) {
    const fpr = 1 - spec;
    const tp = p * sens;
    const fp = (1 - p) * fpr;
    const totPos = tp + fp;
    return totPos > 0 ? tp / totPos : 0;
  }

  function renderKaTeX() {
    const host = $("#bayes-katex-host");
    if (!host) return;
    const tex =
      "P(H\\mid \\text{+}) = \\dfrac{P(\\text{+}\\mid H)\\,P(H)}{P(\\text{+})}";
    if (typeof katex !== "undefined") {
      try {
        host.innerHTML = katex.renderToString(tex, { displayMode: true, throwOnError: false });
        return;
      } catch {
        /* fall through */
      }
    }
    host.innerHTML =
      '<p style="margin:0;font-family:JetBrains Mono,ui-monospace,monospace;font-size:.88rem;">P(H|+) = P(+|H)·P(H) / P(+)</p>';
  }

  function comparePredict() {
    const raw = ($("#bayes-predict")?.value || "").trim().replace(",", ".");
    const pred = parseFloat(raw);
    if (!Number.isFinite(pred) || pred < 0 || pred > 100) {
      toast("0 ile 100 arasında bir yüzde tahmini gir.", "warn");
      return;
    }
    const predP = pred / 100;
    const { p, sens, spec } = readControls();
    const actual = computePpv(p, sens, spec);
    const err = Math.abs(predP - actual);
    const fb = $("#bayes-poe-fb");
    if (!fb) return;

    let msg = "";
    let extraClass = "";
    // Taban oranı ihmalı: tahmin duyarlılığa (P(+|H)) yapışmış
    if (Math.abs(predP - sens) < 0.08 && err > 0.12) {
      msg = `Tahminin (%${pred.toFixed(1)}) duyarlılık P(+|H) = ${fmtPct(sens)} değerine çok yakın. Bu tipik bir sezgi yanılgısıdır: P(+|H) ile P(H|+) karıştırılır. Yaygınlık düşükken pozitiflerin çoğu «sağlam ama yanlış pozitif» olabilir; gerçek P(H|+) = ${fmtPct(actual)}.`;
      extraClass = " warn";
    } else if (err <= 0.05) {
      msg = `Çok yakın! Tahminin %${pred.toFixed(1)}, gerçek P(H|+) ≈ ${fmtPct(actual)}.`;
      extraClass = " ok";
    } else if (predP > actual + 0.12) {
      msg = `Tahminin (%${pred.toFixed(1)}) gerçek değerden (${fmtPct(actual)}) yüksek. Düşük yaygınlıkta pozitif testlerin önemli kısmı sağlam popülasyondan gelir; payda P(+) büyüdükçe arka olasılık düşer.`;
      extraClass = " warn";
    } else if (predP + 0.12 < actual) {
      msg = `Tahminin (%${pred.toFixed(1)}) gerçek değerden (${fmtPct(actual)}) düşük. Yaygınlık veya duyarlılık arttıkça P(H|+) da yükselir — alan grafiğinde hasta+pozitif dilimine bak.`;
      extraClass = " warn";
    } else {
      msg = `Tahmin %${pred.toFixed(1)} · Gerçek P(H|+) ≈ ${fmtPct(actual)} · Mutlak fark ≈ ${(err * 100).toFixed(1)} puan.`;
    }
    fb.className = "feedback poe-feedback" + extraClass;
    fb.textContent = msg;
  }

  function render() {
    const { p, sens, spec } = readControls();
    const poeFb = $("#bayes-poe-fb");
    if (poeFb) {
      poeFb.textContent = "";
      poeFb.className = "feedback poe-feedback";
    }
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
    const ppv = computePpv(p, sens, spec);     // P(H | +)
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
    renderKaTeX();
    const cmp = $("#bayes-compare-predict");
    if (cmp) cmp.addEventListener("click", comparePredict);
    ["#bayes-p", "#bayes-sens", "#bayes-spec"].forEach((sel) => {
      $(sel).addEventListener("input", render);
    });
    render();
  }
  return { init };
})();
