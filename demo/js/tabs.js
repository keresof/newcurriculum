import { $, $$ } from "./core/dom.js";
import { FunctionMod } from "./modules/function.js";
import { RefFuncMod } from "./modules/ref-func.js";

export function initTabs() {
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
export function initInnerTabs() {
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
