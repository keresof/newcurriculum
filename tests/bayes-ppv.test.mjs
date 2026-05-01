import { describe, it, expect } from "vitest";

/** Bayes P(H|+) — demo/app.js içindeki BayesMod ile aynı formül (regresyon için ayna). */
function bayesPpv(p, sens, spec) {
  const fpr = 1 - spec;
  const tp = p * sens;
  const fp = (1 - p) * fpr;
  const totPos = tp + fp;
  return totPos > 0 ? tp / totPos : 0;
}

describe("Bayes P(H|+)", () => {
  it("klasik düşük yaygınlık örneği", () => {
    expect(bayesPpv(0.01, 0.95, 0.9)).toBeCloseTo(0.08756, 3);
  });
  it("yaygınlık 1 ise pozitif = hasta", () => {
    expect(bayesPpv(1, 0.9, 0.9)).toBeCloseTo(1, 5);
  });
});
