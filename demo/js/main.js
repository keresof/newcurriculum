/**
 * MaarifLab · TYMM Matematik Oyun Alanı
 * Modüller: NumLine, Venn, Function, RefFunc, Analytic, Trig, Triangle, Prob, Bayes, EBOB/EKOK, İstatistik I
 *
 * DESIGN PRINCIPLES (zorunlu — her yeni modülde uygulanmalı)
 *
 * 1) CEVAP KABUL KRİTERİ · Bir kullanıcı cevabı, hedefin MATEMATİKSEL
 *    EŞDEĞERİ olduğu sürece kabul edilir. "Benim seçtiğim spesifik
 *    parametreleri bul" mantığı YASAK.
 *    - Fonksiyonlar için: örnekleme ile eşdeğerlik (RMSE)
 *    - Kümeler/aralıklar için: küme eşitliği
 *    - Sayısal hedefler için: tolerans içinde mutlak fark
 *    - ASLA: `user.a === target.a && user.r === target.r && ...` tarzı
 *
 * 2) GÖREVLERİN ŞEKLİ · Bir modül görev üretecekse 3 tip kabul edilir:
 *    a) Tek-cevaplı tam eşleşme (örn. "hedef aralığı inşa et" — aralığın
 *       tek bir [a,b] + kapsam gösterimi var)
 *    b) Koşul-tabanlı çoklu-cevap ("sin θ negatif olsun", "II. kadrana
 *       gir") — koşulu sağlayan her cevap geçerlidir
 *    c) Eşdeğerlik-tabanlı ("bu grafiği yakala" — aynı çıktıyı veren
 *       her parametre kombinasyonu geçerlidir)
 *    Bunlardan hiçbiri uymuyorsa → GÖREV ÜRETME, sadece keşif modu.
 *
 * 3) STATİK SVG · Etkileşimli SVG'ler bir kez `buildSVG()` ile inşa edilir,
 *    sonraki render çağrıları yalnızca attribute günceller. innerHTML ile
 *    re-render YASAK (pointer capture, listener kaybına yol açar).
 *
 * 4) ÇOKLU-GİRİŞ SENKRONU · Aynı state birden fazla kontrolden
 *    güncellenebiliyorsa (slider + select + drag), tek bir state
 *    objesi üzerinden syncFormFromState + syncStateFromForm ile çift
 *    yönlü köprü kurulur.
 */

import { loadState, renderGlobalStats, renderModuleMini } from "./core/state.js";
import { initTabs, initInnerTabs } from "./tabs.js";
import { NumLine } from "./modules/numline.js";
import { IntervalOpsMod } from "./modules/interval-ops.js";
import { VennMod } from "./modules/venn.js";
import { VennOpsMod } from "./modules/venn-ops.js";
import { FunctionMod } from "./modules/function.js";
import { RefFuncMod } from "./modules/ref-func.js";
import { AnalyticLineMod } from "./modules/analytic.js";
import { TrigMod } from "./modules/trig.js";
import { TriangleMod } from "./modules/triangle.js";
import { TriCongruenceMod } from "./modules/tri-congruence.js";
import { TriSimilarityMod } from "./modules/tri-similarity.js";
import { ProbMod } from "./modules/prob.js";
import { BayesMod } from "./modules/bayes.js";
import { ArithLabMod } from "./modules/arith-lab.js";
import { StatsLabMod } from "./modules/stats-lab.js";

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
  ArithLabMod.init();
  StatsLabMod.init();
  ["numline", "venn", "function", "reffunc", "trig"].forEach(renderModuleMini);
}

document.addEventListener("DOMContentLoaded", bootstrap);
