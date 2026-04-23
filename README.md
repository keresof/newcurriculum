# MathLab TR · TYMM Matematik Oyun Alanı

> Türkiye Yüzyılı Maarif Modeli (TYMM) **Hazırlık + 9 + 10. sınıf** matematik
> öğretim programıyla birebir uyumlu, PhET benzeri etkileşimli bir matematik
> oyun alanı. Her simülasyon TYMM öğrenme çıktı koduna ve resmi **Anahtar
> Kavramlar**'a bağlanır ve **Manipüle → Gözlemle → Tahmin Et → Doğrula**
> döngüsünü uygular.

---

## İçerik

- `RESEARCH_AND_PROPOSAL_TR.md` — TYMM resmi programı araştırması + simülasyon haritası
- `demo/index.html` — Tek sayfa demo arayüzü
- `demo/styles.css` — Görsel tasarım (modern, gradient, responsive)
- `demo/app.js` — Modül mantığı · skorlama · seri · doğruluk · toast geri bildirim
  (başında **DESIGN PRINCIPLES** kod sözleşmesi)

## Hızlı Başlangıç

```bash
cd newcurriculum
python3 -m http.server 8080
# tarayıcıda: http://localhost:8080/demo/
```

---

## TYMM Resmi Anahtar Kavramları (MEB)

### Hazırlık Sınıfı

| Tema | Anahtar Kavramlar |
|------|-------------------|
| 1 · Nicelikler ve Değişimler | dik koordinat sistemi, doğrusal ilişki, doğru, eğim, koordinat |
| 2 · Mantıksal Çıkarım | ağaç şeması, mantıksal çıkarım |
| 3 · Algoritma ve Bilişim | anahtar, deşifre etme, sayı örüntüsü, şifreleme, şifre alfabesi, şifreli metin |
| 4 · Geometrik Şekiller | fraktal, geometrik inşa, kaplama, süsleme |
| 5 · İstatistiksel Araştırma Süreci | dağılım, değişebilirlik, evren, örneklem |

### 9. Sınıf

| Tema | Anahtar Kavramlar |
|------|-------------------|
| 1 · Sayılar | alt küme, ancak ve ancak, aralık, bazı, bilimsel gösterim, birleşim işlemi, boş küme, eşitsizlik, fark işlemi, her, ise, ispat, kesişim işlemi, köklü gösterim, küme, kümenin elemanı, mutlak değer, önerme, önermenin değili, özdeşlik, tümleme, üslü gösterim, ve, veya, ya da |
| 2 · Nicelikler ve Değişimler | artanlık-azalanlık, bağımlı-bağımsız değişken, bire birlik, doğrusal denklem ve eşitsizlik, doğrusal fonksiyon, doğrusal ilişki, eğim, fonksiyonların parçalı gösterimi, fonksiyonun işareti, fonksiyonun sıfırı, katsayı, kök, maksimum-minimum noktaları, mutlak değer fonksiyonu, sabit fonksiyon, sabit terim |
| 3 · Algoritma ve Bilişim | akış şeması, algoritma, çizge, mantık bağlaçları, niceleyiciler, sözde kod, şifreleme |
| 4 · Geometrik Şekiller | açı, dış açı, iç açı, kenar, üçgen, üçgen eşitsizliği |
| 5 · Eşlik ve Benzerlik | benzerlik, dönme dönüşümü, eşlik, Öklid teoremi, Pisagor teoremi, Tales teoremi |
| 6 · İstatistiksel Araştırma Süreci | çeyrekler açıklığı, değişebilirlik, evren, histogram, kutu grafiği, nicel veri dağılımı, örneklem, standart sapma |
| 7 · Veriden Olasılığa | ayrık olay, ayrık olmayan olay, çıktı, deney, deneysel olasılık, olay, örnek uzay, teorik olasılık |

### 10. Sınıf

| Tema | Anahtar Kavramlar |
|------|-------------------|
| 1 · Sayılar | aralarında asal, asal sayı, bölen, bölme, bölüm, bölünebilme, çarpan, en büyük ortak bölen (EBOB), en küçük ortak kat (EKOK), kalan, kat, ortak bölen, ortak kat |
| 2 · Nicelikler ve Değişimler | artanlık-azalanlık, bire birlik, fonksiyon, fonksiyonun işareti, fonksiyonun sıfırı, karekök fonksiyonu, karesel fonksiyon, kök, maksimum-minimum değer, maksimum-minimum nokta, örtenlik, parabol, rasyonel fonksiyon, simetri doğrusu, teklik-çiftlik, ters fonksiyon |
| 3 · Sayma, Algoritma ve Bilişim | algoritma, faktöriyel, sayma, seçme sayısı, sıralama sayısı |
| 4 · Geometrik Şekiller | ağırlık merkezi, alan, birim çember, çevrel çember, iç açıortay, iç teğet çember, dış açıortay, dış teğet çember, kenar orta dikme, kosinüs teoremi, sinüs teoremi, trigonometrik oranlar, yönlü açı, yükseklik |
| 5 · Analitik İnceleme | çakışma, dik koordinat sistemi, doğru, eğim, eğim açısı, iki nokta arasındaki uzaklık, kesişme, paralellik |
| 6 · İstatistiksel Araştırma Süreci | iki kategorik değişken, iki yönlü tablo, ilişkililik, koşullu göreli sıklıklar, kümeli sütun grafikleri, veri dağılımları |
| 7 · Veriden Olasılığa | bağımlı olay, bağımsız olay, Bayes teoremi, koşullu olasılık |

Kaynak: MEB TYMM "Anahtar Kavramlar" belgesi · <https://tymm.meb.gov.tr/ogretim-programlari/ders/matematik-dersi>

---

## Mevcut Modüller (v0.3 · 7 aktif)

| Kod | Modül | Sınıf · Tema | Çıktı/Kavram |
|-----|-------|--------------|--------------|
| **A** · S2 | Sayı Doğrusu Aralık Avcısı | 9 · Sayılar | MAT.9.1.2 · aralık, dahil, hariç |
| **B** · N1 | Doğrusal Fonksiyon Makinesi | 9-10 · Nicelikler | MAT.9.2.1 · eğim, sabit terim |
| **C** · F2 | Referans Fonksiyon Transformatörü | 10 · Nicelikler | 10.2.2-4 · parabol, karekök, rasyonel |
| **D** · T1 | Trigonometri Laboratuvarı | 10 · Geometri | 10.4.1 · birim çember, sin/cos/tan |
| **E** · G1 | Üçgen Laboratuvarı | 9 · Geometri | MAT.9.4.1 · üçgen eşitsizliği, iç açı |
| **F** · O1 | Olasılık Laboratuvarı | 9-10 · Olasılık | MAT.9.7.1-2 · teorik/deneysel, yakınsama |
| **G** · K2 | Bayes Laboratuvarı | 10 · Olasılık | 10.7.2 · koşullu olasılık |

---

## Tasarım İlkeleri (`demo/app.js` başında kod sözleşmesi)

1. **Cevap kabul kriteri** · Kullanıcı cevabı hedefin matematiksel eşdeğeri olduğu sürece kabul edilir; "spesifik parametreleri bul" mantığı yasak.
2. **Görev şekli** · Tek-cevaplı tam eşleşme, koşul-tabanlı çoklu-cevap veya eşdeğerlik-tabanlı. Uygun değilse keşif modu.
3. **Statik SVG** · Bir kez inşa, sonra sadece attribute güncellenir. innerHTML ile re-render yasak.
4. **Çoklu giriş senkronu** · Slider + select + sayı girişi + sürükleme tek state üzerinden çift yönlü.

---

## Vizyon: Oyunlaştırılmış Öğrenme Platformu

### Üç katmanlı mimari

| Katman | Ne sunar | Hedef kitle |
|--------|----------|-------------|
| **Play** (Oyun) | Seviye yolculuğu, rozet, seri, günlük görev, XP → seviye | Öğrenci bireysel |
| **Playground** (Sandbox) | 7+ modül keşif modu, hedef modu, senaryo paylaşımı | Öğretmen + öğrenci |
| **Learn** (Öğretici) | Kavram kartları, formül açıklaması, "neden" notları | Her ikisi |

### Oyunlaştırma mekaniği (v0.4)

- **Seviye Sistemi**: 5 kademe (Çırak → Usta → Üstat → Bilge → Filozof). Her kademe belirli modül kombinasyonunu bitirince açılır. Anahtar kavram bilme etiketi ile ilerleme.
- **XP & Rozet**: Her doğru cevap +XP. Özel rozetler: "İlk İspat", "Seri 10", "Grafik Yakalayıcı", "Kadran Dedektifi", "Bayes Ustası" …
- **Yolculuk Haritası**: Tema bazlı harita (Sayılar Dünyası, Fonksiyon Kalesi, Geometri Vadisi …). Modüller harita üzerinde "durak".
- **Günlük Görev**: Rastgele 3 mini görev. Tamamlayana bonus seri + XP.
- **Kavram Rozeti**: Resmi anahtar kavramlardan bir havuz; öğrenci modülde o kavramı doğru kullanınca rozet kazanır.
- **Persistence**: `LocalStorage → IndexedDB` (profil, ilerleme, rozet, modül içi skor).

### Öğretici katman (Learn)

Her modülde açılabilir **kavram paneli**:
- **Anahtar Kavramlar** · Resmi MEB listesinden ilgili olanlar, tıklanabilir terim sözlüğü
- **Formül Kartları** · KaTeX render edilmiş temel formüller (y = ax + b, sin²θ+cos²θ=1 …)
- **"Neden?" Kartı** · Geometrik/cebirsel sezgi, mini animasyon
- **Gerçek Hayat Örneği** · Zaman-sıcaklık, taksi ücreti, aile bütçesi tipi bağlamlar

---

## Sürüm Roadmap

| Sürüm | Odak | Durum |
|-------|------|-------|
| **v0.3** | 7 etkileşimli modül + tasarım ilkeleri + form/drag tam senkron + eşdeğerlik kontrolü | **Şu an · tamamlandı** |
| **v0.4** | Oyunlaştırma katmanı: profil, seviye, XP, rozet, yolculuk haritası · Persistence | Sonraki |
| **v0.5** | Öğretici katman: kavram kartları, formül gösterici (KaTeX), "neden" kartları · Kavram rozeti | Sonraki |
| **v0.6** | Hazırlık sınıfı modülleri: Koordinat Kaşifi, Ağaç Şeması, Şifreleme, Fraktal, Örneklem | |
| **v0.7** | 9. sınıf kalan temalar: Eşlik/Benzerlik, İstatistik, Algoritma (Eratosthenes, Öklid, Königsberg) | |
| **v0.8** | 10. sınıf kalan temalar: Sayma, Analitik, Yardımcı Elemanlar, Sinüs/Kosinüs Teoremi | |
| **v0.9** | Öğretmen paneli: sınıf açma, toplu görev, kazanım ısı haritası, CSV raporu | |
| **v1.0** | Tüm TYMM kazanımları için minimum 1 modül · WCAG AA · mobil optimizasyon · PWA | |

### v0.4 görev listesi (sıradaki sprint)

- [ ] `state.js` · profil, XP, seviye, rozet, modül ilerlemesi (localStorage)
- [ ] `levels.js` · seviye eşikleri + hangi modül hangi seviyeye açık
- [ ] `journey.svg` · harita görünümü (tema düğümleri + çizgiler)
- [ ] `badges.js` · rozet tanımları + tetikleme kuralları (her modülden)
- [ ] Modal: "Yeni rozet kazandın!" animasyonu
- [ ] Profil ekranı: XP bar, seviye, rozet galerisi, anahtar kavram sözlüğü
- [ ] Günlük görev motoru (3 rastgele mini görev)

---

## Katkıda Bulunma

Bir yeni modül eklerken aşağıdaki kontrol listesine uyun:

1. İlgili TYMM kazanım kodunu ve anahtar kavramları tanımla (yukarıdaki tablolar)
2. `demo/app.js` içindeki **DESIGN PRINCIPLES** bölümünü tekrar oku
3. Modül state'ini `State.byModule.<key>`'e ekle
4. Kontrol fonksiyonunda **matematiksel eşdeğerlik** kullan (parametre eşleştirmesi DEĞİL)
5. SVG statik DOM · sadece attribute güncelle
6. README'deki modül tablosuna satır ekle

---

## Kaynaklar

- MEB TYMM Matematik: <https://tymm.meb.gov.tr/ogretim-programlari/ders/matematik-dersi>
- PhET Interactive Simulations: <https://phet.colorado.edu/>
