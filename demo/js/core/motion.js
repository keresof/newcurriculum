export function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Kısa süreli bağlantılı vurgu (kaydırıcı ↔ denklem / okuma). */
export function flashHighlight(el, cls = "link-hl", ms = 820) {
  if (!el || prefersReducedMotion()) return;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
