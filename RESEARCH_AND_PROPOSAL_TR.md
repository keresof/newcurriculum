# TYMM 9-10 Matematik · PhET Benzeri İnteraktif Simülasyon Haritası

> Türkiye Yüzyılı Maarif Modeli (TYMM) resmi öğretim programı kaynak alınarak
> hazırlanmış kapsamlı araştırma ve ürün önerisi. Bu belge, `MathLab TR` demosunun
> hangi öğrenme çıktılarını karşıladığını ve hangi simülasyonların geliştirilmesi
> gerektiğini listeler.

---

## 1. Araştırma Metodolojisi

### Birincil Kaynaklar (T.C. Millî Eğitim Bakanlığı)

- TYMM Matematik Dersi Öğretim Programı: <https://tymm.meb.gov.tr/ogretim-programlari/ders/matematik-dersi>
- 9. sınıf program sayfası: <https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11>
- 10. sınıf program sayfası: <https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12>
- 9. sınıf · Sayılar teması detayı: <https://tymm.meb.gov.tr/matematik-dersi/unite/21>
- 9. sınıf · Nicelikler ve Değişimler: <https://tymm.meb.gov.tr/matematik-dersi/unite/23>
- 9. sınıf · Algoritma ve Bilişim: <https://tymm.meb.gov.tr/matematik-dersi/unite/24>
- 9. sınıf · Geometrik Şekiller: <https://tymm.meb.gov.tr/matematik-dersi/unite/25>

### İkincil Kaynaklar

- 9. sınıf öğrenme çıktıları listesi: <https://www.egitimokulu.com/9-sinif-matematik-ogrenme-ciktilari/>
- 10. sınıf yıllık planı (öğrenme çıktı kodlarıyla birlikte): <http://www.dersmateryalleri.com/matematik-yillik-planlari/10-sinif-matematik-yillik-plani>

### Yaklaşım

TYMM programı bilgiden çok **beceri** odaklıdır: matematiksel muhakeme (MAB1),
problem çözme (MAB2), matematiksel temsil (MAB3), veri ile çalışma (MAB4) ve
araç-teknoloji kullanımı (MAB5) öne çıkar. Bu nedenle her simülasyon
**Manipüle → Gözlemle → Tahmin Et → Doğrula** döngüsünü uygular ve birden fazla
temsil (cebirsel, grafiksel, sayısal, sözel) arasında geçiş yaptırır.

---

## 2. Resmi Tema ve Öğrenme Çıktısı Haritası

### 2.0. Hazırlık Sınıfı (TYMM)

| # | Tema | Anahtar Kavramlar (MEB) |
|---|------|-------------------------|
| 1 | Nicelikler ve Değişimler | dik koordinat sistemi, doğrusal ilişki, doğru, eğim, koordinat |
| 2 | Mantıksal Çıkarım | ağaç şeması, mantıksal çıkarım |
| 3 | Algoritma ve Bilişim | anahtar, deşifre etme, sayı örüntüsü, şifreleme, şifre alfabesi, şifreli metin |
| 4 | Geometrik Şekiller | fraktal, geometrik inşa, kaplama, süsleme |
| 5 | İstatistiksel Araştırma Süreci | dağılım, değişebilirlik, evren, örneklem |

Hazırlık sınıfı için önerilen simülasyonlar:

| Kod | Simülasyon | Tema |
|-----|------------|------|
| H1 | **Koordinat Kâşifi** — sürükle-bırak noktalar, eğim/doğru inşası | 1 |
| H2 | **Ağaç Şeması Oluşturucu** — mantıksal dallanma, karar ağacı | 2 |
| H3 | **Şifreleme Stüdyosu** — Caesar, Vigenère, anahtar/şifre alfabesi | 3 |
| H4 | **Sayı Örüntüsü Dedektifi** — örüntü kuralını bul, bir sonraki terimi tahmin et | 3 |
| H5 | **Fraktal Üreteci** — Sierpinski, Koch kar tanesi; özyineleme derinliği kaydırıcısı | 4 |
| H6 | **Kaplama ve Süsleme** — düzenli çokgenlerle düzlem kaplama | 4 |
| H7 | **Örneklem Lab** — evrenden örneklem çek, dağılımı evrenle karşılaştır | 5 |

### 2.1. 9. Sınıf Matematik (TYMM)

| # | Tema | Ders Saati | Öğrenme Çıktıları |
|---|------|-----------:|-------------------|
| 1 | **Sayılar** | 40 | MAT.9.1.1 Üslü/köklü işlemlerde muhakeme · MAT.9.1.2 Gerçek sayı aralıkları + küme sembolleri · MAT.9.1.3 Farklı sayı kümelerinin özellikleri (ℕ⊂ℤ⊂ℚ⊂ℝ) · MAT.9.1.4 Cebirsel özdeşlikler |
| 2 | **Nicelikler ve Değişimler** | 38 | MAT.9.2.1 Doğrusal referans fonksiyon f(x)=x ve g(x)=a·f(x±r)±k · MAT.9.2.2 Mutlak değer fonksiyonu (parçalı gösterim) · MAT.9.2.3 Doğrusal denklem/eşitsizlik problemleri |
| 3 | **Algoritma ve Bilişim** | 30 | MAT.9.3.1 Algoritma temelli problem çözme (akış şeması, sözde kod, çizge) · MAT.9.3.2 Mantık bağlaçları ve niceleyiciler · MAT.9.3.3 Bu yapıların matematiksel ispattaki rolü |
| 4 | **Geometrik Şekiller** | 12 | MAT.9.4.1 Üçgende açı-kenar özellikleri, üçgen eşitsizliği, iç/dış açı toplamı ispatı |
| 5 | **Eşlik ve Benzerlik** | — | MAT.9.5.1 Geometrik dönüşümler · MAT.9.5.2 Eşlik/benzerlik · MAT.9.5.3 Üçgen oluşturma · MAT.9.5.4 Tales, Öklid, Pisagor · MAT.9.5.5 Problem çözme |
| 6 | **İstatistiksel Araştırma Süreci** | — | MAT.9.6.1 Tek nicel değişkenli veri · MAT.9.6.2 Başkalarının istatistiksel yorumlarını değerlendirme |
| 7 | **Veriden Olasılığa** | — | MAT.9.7.1 Deneysel (gözleme dayalı) olasılık · MAT.9.7.2 Teorik olasılık |

### 2.2. 10. Sınıf Matematik (TYMM)

| # | Tema | Öğrenme Çıktıları |
|---|------|-------------------|
| 1 | **Sayılar** | 10.1.1 Asal çarpanlar ve bölenler · 10.1.2 EBOB-EKOK · 10.1.3 Bölünebilme ve modüler kalanlar |
| 2 | **Nicelikler ve Değişimler** | 10.2.1 Fonksiyon olma şartları ve nitel özellikler · 10.2.2 Karesel referans f(x)=x² · 10.2.3 Karekök referans f(x)=√x · 10.2.4 Rasyonel referans f(x)=1/x · 10.2.5 Ters fonksiyonlar · 10.2.6 Karesel/karekök/rasyonel denklem-eşitsizlik |
| 3 | **Sayma, Algoritma ve Bilişim** | 10.3.1 Sayma stratejileri (toplama/çarpma ilkesi) · 10.3.2 Cebirsel/fonksiyonel işlemlerin algoritmik yapısı |
| 4 | **Geometrik Şekiller** | 10.4.1 Dik üçgende trigonometrik oranlar ve özdeşlikler · 10.4.2 Yardımcı elemanlar (açıortay, kenarortay, yükseklik, kenar orta dikme) · 10.4.3 Üçgende alan · 10.4.4 Sinüs ve kosinüs teoremleri |
| 5 | **Analitik İnceleme** | 10.5.1 İki nokta arası uzaklık, doğru parçasını belli oranda bölen nokta · 10.5.2 Doğrunun analitik incelenmesi (eğim açısı, konumlar) |
| 6 | **İstatistiksel Araştırma Süreci** | 10.6.1 İki kategorik değişkenli veri ve ilişkililik · 10.6.2 Başkalarının istatistiksel sonuçlarını tartışma |
| 7 | **Veriden Olasılığa** | 10.7.1 Koşullu olasılık, bağımlı/bağımsız olaylar · 10.7.2 Bayes teoremi |

---

## 3. Ürün Konsepti: "MathLab TR"

PhET (PhET Interactive Simulations, University of Colorado) mantığıyla, her
konuyu bir "sanal laboratuvar" olarak ele alırız. Tasarım döngüsü:

1. **Manipüle et** — kaydırıcı, düğme, sürüklenebilir nokta.
2. **Gözlemle** — eş zamanlı grafik, sayı doğrusu, tablo, animasyon.
3. **Tahmin et** — sistemin vereceği görevi kendi parametrelerinle çöz.
4. **Doğrula** — anında geri bildirim, puan, seri, doğruluk.

### Neden bu yapı?

- **Beceri odaklı TYMM uyumu**: muhakeme, temsil, problem çözme becerilerine
  doğrudan hizmet eder.
- **Çoklu temsil**: Cebirsel ifade ile grafik/sayı doğrusu/tablo arasında
  geçiş, öğrencinin bağ kurmasını sağlar.
- **Ölçülebilir**: Her görev için "ilk denemede doğruluk, süre, ipucu sayısı"
  veri olarak toplanabilir (öğretmen paneli için temel).

---

## 4. Simülasyon Haritası — 9. ve 10. Sınıf

Aşağıdaki 28 simülasyon, TYMM temalarının tamamını kapsar. Her biri için
tek bir mini lab tasarlanmıştır.

### 4.1. 9. Sınıf İçin Simülasyonlar

#### Tema 1 · Sayılar

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **S1** | **Sayı Kümeleri Venn Evreni** — Bir sayıyı sürükle, ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ Venn şemasında otomatik yerleştir. İrrasyonel (√2, π) için tanıkla. | MAT.9.1.3 | Planlanıyor |
| **S2** | **Sayı Doğrusu Aralık Avcısı** — Uçları sürükle, köşeli/yuvarlak parantezle dahil/hariç seç. Küme kesişim/birleşim/tümleme işlemleri sayı doğrusunda. | MAT.9.1.2 | **Modül A · Tamamlandı** |
| **S3** | **Üslü ve Köklü Sayı Laboratuvarı** — Taban ve üssü kaydır, büyüklüğü görsel ölçekle (log skala) karşılaştır. Bilimsel gösterim ↔ ondalık dönüşümü animasyonla. | MAT.9.1.1 | Planlanıyor |
| **S4** | **Cebirsel Özdeşlik Kanıtlayıcı** — (a+b)², a²−b², (a+b)(a−b) için alan modeli. Kareyi parçalara ayır, renklendirilmiş dikdörtgenler. | MAT.9.1.4 | Planlanıyor |

#### Tema 2 · Nicelikler ve Değişimler

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **N1** | **Doğrusal Fonksiyon Makinesi** — a, b kaydırıcıları, y = ax + b canlı grafik. Hedef noktalardan geçecek doğruyu yakala. | MAT.9.2.1 | **Modül B · Tamamlandı** |
| **N2** | **Referans Fonksiyon Transformatörü (9 versiyon)** — f(x) = x üzerinden g(x) = a·f(x±r)±k. a, r, k üç ayrı kaydırıcı, dönüşümü adım adım uygula. | MAT.9.2.1 | Planlanıyor |
| **N3** | **Mutlak Değer Fonksiyonu Stüdyosu** — f(x) = ±\|ax+b\|±c. V şeklinin tepesini sürükle, parçalı gösterim sağ panelde otomatik üret. | MAT.9.2.2 | Planlanıyor |
| **N4** | **Denklem–Eşitsizlik Çözüm Deneyi** — f(x)=g(x), f(x)≤g(x), \|f(x)\|≥k formlarını iki doğrunun kesişimi olarak görselleştir. Çözüm aralığı sayı doğrusunda otomatik. | MAT.9.2.3 | Planlanıyor |

#### Tema 3 · Algoritma ve Bilişim

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **A1** | **Eratosthenes Kalburu** — 1–200 arası sayılarda asalları ele. Her adım animasyonla, niçin eleyişini söyle. | MAT.9.3.1 | Planlanıyor |
| **A2** | **Öklid Algoritması EBOB** — İki sayı seç, mod/kalan adımlarını adım adım görsel oynat. | MAT.9.3.1 | Planlanıyor |
| **A3** | **Königsberg Köprüsü (Çizge)** — Bölgeleri düğüm, köprüleri ayrıt yaparak Euler problemi. Turu tamamlayabilir misin? | MAT.9.3.1 | Planlanıyor |
| **A4** | **Akış Şeması Oluşturucu** — Sürükle-bırak bloklarla basit algoritma (örn. vücut kitle indeksi) kur, çalıştır, sonucu gör. | MAT.9.3.1 | Planlanıyor |
| **A5** | **Mantık Bağlaç Laboratuvarı** — p, q anahtarlarını aç/kapat; ∧ (ve), ∨ (veya), → (ise), ¬ (değil) için doğruluk tablosu yanar. | MAT.9.3.2 / 9.3.3 | Planlanıyor |

#### Tema 4-5 · Geometri

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **G1** | **Üçgen Laboratuvarı** — Köşeleri sürükle; iç açı toplamı = 180°, dış açı = 360°, üçgen eşitsizliği gerçek zamanlı doğrulanır. | MAT.9.4.1 | Planlanıyor |
| **G2** | **Geometrik Dönüşüm Stüdyosu** — Öteleme, yansıma, dönme, homoteti. Şekli ayarla, matris yerine kaydırıcılarla sezgisel. | MAT.9.5.1 | Planlanıyor |
| **G3** | **Pisagor & Öklid & Tales İspat Animasyonu** — Kareleri hareket ettir, alanların eşitliğini gör. Paralel kesen sürüklenir, oran sabit kalır. | MAT.9.5.4 | Planlanıyor |

#### Tema 6-7 · İstatistik ve Olasılık

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **D1** | **Veri Dağılım Kaşifi** — Nokta ekle/çıkar, ortalama, medyan, mod, standart sapma canlı. Histogram ve kutu grafiği otomatik. | MAT.9.6.1 | Planlanıyor |
| **D2** | **Grafik Eleştirmeni** — Hatalı ölçekli, kesik eksenli, eksik başlıklı grafikler sun; öğrenci "bu grafikte ne sorun var?" bulur. | MAT.9.6.2 | Planlanıyor |
| **O1** | **Olasılık Laboratuvarı** — p, deneme sayısı; teorik-deneysel bar grafiği + yakınsama çizgisi (Büyük Sayılar Yasası görsel). | MAT.9.7.1 / 9.7.2 | **Modül C · Tamamlandı** |

### 4.2. 10. Sınıf İçin Simülasyonlar

#### Tema 1 · Sayılar

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **S10-1** | **Bölünebilme Dedektifi** — Sayıyı gir, 2/3/4/5/6/8/9/10 ile bölünebilme kurallarını adım adım test et; kuralın neden işlediğini göster. | 10.1.3 | Planlanıyor |
| **S10-2** | **Asal Çarpan Ağacı** — Sayıyı asal çarpanlarına böl (animasyon); ardından ikinci sayıyla ortak çarpanları vurgulayarak EBOB/EKOK. | 10.1.1 / 10.1.2 | Planlanıyor |

#### Tema 2 · Nicelikler ve Değişimler ⭐

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **F1** | **Fonksiyon Özellikleri Panosu** — Cebirsel ifadeyi yaz, grafik çizilsin; tanım/görüntü, artanlık, max/min, tek/çift, bire birlik otomatik etiketlensin. | 10.2.1 | Planlanıyor |
| **F2** | **Referans Fonksiyon Transformatörü** ⭐ — f ∈ {x, x², √x, 1/x} seçici + a, r, k kaydırıcıları. Dönüşüm g(x) = a·f(x±r)±k adım adım animasyonla. | 10.2.2 / 10.2.3 / 10.2.4 | Planlanıyor |
| **F3** | **Parabol Kâşifi** — y = ax² + bx + c için a, b, c; veya tepe formu y = a(x−h)²+k. Diskriminantla kök sayısı görsel. | 10.2.2 | Planlanıyor |
| **F4** | **Ters Fonksiyon Aynası** — f(x) çiz, y = x doğrusuna yansıt → f⁻¹(x) otomatik. Bire birlik ihlali gösterilir. | 10.2.5 | Planlanıyor |
| **F5** | **Rasyonel Fonksiyon Asimptot Lab** — 1/x ve türevleri; dikey/yatay asimptotları görsel, kritik noktalar. | 10.2.4 | Planlanıyor |

#### Tema 3 · Sayma, Algoritma ve Bilişim

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **SA1** | **Sayma Ağacı** — "3 gömlek × 2 pantolon × 2 ayakkabı" gibi problemler için ağaç otomatik çizilsin; toplama ve çarpma ilkesi ayrımı. | 10.3.1 | Planlanıyor |

#### Tema 4 · Geometrik Şekiller

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **T1** | **Trigonometri Üçgeni** — Dik üçgenin açısını döndür, kenarları değiştir; sin, cos, tan, cot canlı değerler; birim çember karşılık yerleştir. | 10.4.1 | Planlanıyor |
| **T2** | **Pisagor Özdeşliği Kanıtı** — sin²θ + cos²θ = 1 için birim çember üzerinde (x, y) = (cos, sin) ile x² + y² = 1 ilişkisi. | 10.4.1 | Planlanıyor |
| **T3** | **Üçgenin Yardımcı Elemanları** — Bir üçgende açıortay, kenarortay, yükseklik, kenar orta dikme çizimleri; kesişim noktalarının (iç teğet, ağırlık, diklik) nasıl ortaya çıktığını göster. | 10.4.2 | Planlanıyor |
| **T4** | **Üçgende Alan Değişimi** — Taban veya yüksekliği kaydır, S = (1/2)·t·h değerini ve bar grafiğini canlı gör. | 10.4.3 | Planlanıyor |
| **T5** | **Sinüs & Kosinüs Teoremi** — Herhangi üçgende kenarları veya açıları ayarla; a/sinA = b/sinB = c/sinC ilişkisini tabloda gör. | 10.4.4 | Planlanıyor |

#### Tema 5 · Analitik İnceleme

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **AN1** | **Analitik Doğru Lab** — İki nokta sürükle; uzaklık, orta nokta, eğim, eğim açısı canlı. k:m oranında bölen nokta için oran kaydırıcısı. | 10.5.1 | Planlanıyor |
| **AN2** | **Paralel & Dik Doğrular** — İki doğrunun eğim ilişkileri (m₁ = m₂, m₁·m₂ = −1) görsel. | 10.5.2 | Planlanıyor |

#### Tema 6-7 · İstatistik ve Olasılık

| Kod | Simülasyon | TYMM Çıktısı | Durum |
|-----|------------|--------------|-------|
| **İ1** | **İki Kategorik Değişken Tablosu** — Çapraz tablo, yığılmalı yüzde grafiği; sütun bazlı vs satır bazlı oranlar. Bağımsızlık sezgisel. | 10.6.1 | Planlanıyor |
| **K1** | **Koşullu Olasılık Ağacı** — P(A∩B), P(A\|B), çarpma kuralı görsel. Torbadan çekme veya hastalık testi klasiği. | 10.7.1 | Planlanıyor |
| **K2** | **Bayes Laboratuvarı** ⭐ — Hastalık testi: yaygınlık (P(H)), duyarlılık P(+\|H), özgüllük P(−\|¬H) kaydırıcıları → P(H\|+) arka olasılık. Alan modeliyle sezgi. | 10.7.2 | Planlanıyor |

---

## 5. Öncelik Yol Haritası

Tamamlanma sırası önerisi (öğrenme etkisi × geliştirme eforu):

### Sprint 1 · Tamamlandı ✓ (3/28)

- S2 Sayı Doğrusu Aralık Avcısı
- N1 Doğrusal Fonksiyon Makinesi
- O1 Olasılık Laboratuvarı

### Sprint 2 · Yüksek etki, düşük efor (öncelik)

1. **F2** Referans Fonksiyon Transformatörü ⭐ (10. sınıf için anahtar kazanım)
2. **T1** Trigonometri Üçgeni (10.4.1 — program başlangıç teması)
3. **G1** Üçgen Laboratuvarı (9.4.1 — görsel çarpıcı)
4. **N2 / N3** Referans Fonksiyon Transformatörü (9) + Mutlak Değer Stüdyosu
5. **K2** Bayes Laboratuvarı (10. sınıf yılsonu teması)

### Sprint 3 · Tamamlayıcılar

6. **S1** Sayı Kümeleri Venn Evreni
7. **A1 / A2 / A3** Algoritma üçlüsü
8. **AN1** Analitik Doğru Lab
9. **F3** Parabol Kâşifi
10. **D1** Veri Dağılım Kaşifi

---

## 6. Ölçme-Değerlendirme Tasarımı (TYMM uyumu)

Her simülasyon için toplanacak metrikler:

- **Görev sayısı** (tamamlanan tur)
- **İlk denemede doğruluk** (%)
- **Tamamlama süresi** (saniye/görev)
- **İpucu kullanımı**
- **En sık hata türü** (örn. sayı doğrusunda kapsam yanılgısı)

Öğretmen paneli için önerilen görselleştirmeler:

- **Kazanım bazlı ısı haritası** — öğrenci × öğrenme çıktısı kodu matrisi.
- **Zorluk profili** — öğrenci bazında tema eğrisi.
- **Sınıf karşılaştırması** — şube × tema doğruluk ortalaması.

---

## 7. Teknik Mimari (MVP → Ölçek)

| Aşama | İçerik | Teknoloji |
|-------|--------|-----------|
| **MVP (şu an)** | Tek sayfa demo, 3 modül | Vanilla HTML/CSS/JS, SVG, Canvas, LocalStorage |
| **v1** | 10–12 modül, modül yönlendirme, tema bazlı görünüm | Aynı stack + basit modül mimarisi |
| **v2** | Öğretmen paneli, sınıf modu, TYMM çıktı kodu etiketleme | React/Vue + Node/Express API + SQLite/Postgres |
| **v3** | Mobil uygulama, çevrim dışı çalışma, erişilebilirlik | PWA + IndexedDB + WCAG AA |

---

## 8. Sonraki Aksiyonlar

1. Sprint 2 sıralı modüllerinin tasarım taslaklarını çıkar (wireframe).
2. Her simülasyon için bir "öğretmen notu" kartı hazırla (hangi çıktı, öneri, süre).
3. Öğrenci-öğretmen çift paneli için API sözleşmesi yaz.
4. TYMM 11 ve 12. sınıf temaları için benzer harita çıkar (seçmeli uzatma).

---

**Araştırma tarihi:** 21 Nisan 2026  
**Kaynak sürümü:** TYMM güncel resmi program (tymm.meb.gov.tr)
