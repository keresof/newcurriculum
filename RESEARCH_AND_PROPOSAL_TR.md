# TYMM 9-10 Matematik için PhET Benzeri Oyun Alanı Önerisi

## 1) Hedef
Türkiye Yüzyılı Maarif Modeli (TYMM) 9 ve 10. sınıf matematik temalarıyla uyumlu, etkileşimli, kısa döngülü ve ölçülebilir bir "matematik oyun alanı" tasarlamak.

## 2) Hızlı Araştırma Özeti (Resmi Çerçeve)
Resmi öğretim programı sayfalarında 9 ve 10. sınıf için ortak/benzer tema yapısı görülüyor:

- **9. sınıf Matematik temaları**: Sayılar, Nicelikler ve Değişimler, Algoritma ve Bilişim, Geometrik Şekiller, Eşlik ve Benzerlik, İstatistiksel Araştırma Süreci, Veriden Olasılığa.
- **10. sınıf Matematik temaları**: Sayılar, Nicelikler ve Değişimler, Sayma-Algoritma ve Bilişim, Geometrik Şekiller, Analitik İnceleme, İstatistiksel Araştırma Süreci, Veriden Olasılığa.

Kaynak:
- https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11
- https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12

## 3) Ürün Konsepti: "MathLab TR"
PhET mantığına benzer şekilde her konu için:
1. **Manipüle et** (kaydırıcı, düğme, nokta sürükleme)
2. **Gözlemle** (grafik, sayı doğrusu, frekans)
3. **Tahmin et** (hedef görev)
4. **Doğrula** (anlık geribildirim + puan)

### Neden bu yapı?
- TYMM'nin beceri odaklı yaklaşımıyla uyumlu (muhakeme, temsil, problem çözme).
- Ezber yerine "parametre değiştirip sonuç görme" davranışını teşvik eder.
- Öğretmen sınıfta projeksiyonla, öğrenci bireysel cihazda aynı akışı kullanabilir.

## 4) 9-10. Sınıf İçin Önerilen Oyun Modülleri

### Modül A - Sayı Doğrusu Avı (9. sınıf ağırlıklı)
- Tema eşleşmesi: **Sayılar**
- Öğrenci aralık uçlarını ve dahil/dahil değil durumunu ayarlar.
- Hedef: Verilen aralığı birebir kurmak.
- Ölçtüğü beceri: temsil dönüşümü, sembol-grafik ilişkisi.

### Modül B - Fonksiyon Makinesi (10. sınıf ağırlıklı)
- Tema eşleşmesi: **Nicelikler ve Değişimler + Analitik İnceleme**
- Öğrenci doğrusal fonksiyon parametrelerini (a, b) değiştirir.
- Hedef: Hedef noktalardan geçen doğruyu yakalamak.
- Ölçtüğü beceri: parametrik düşünme, grafik okuma.

### Modül C - Olasılık Simülatörü (9-10 ortak)
- Tema eşleşmesi: **Veriden Olasılığa**
- Öğrenci teorik olasılığı ayarlar ve rastgele deney çalıştırır.
- Hedef: teorik ve deneysel olasılığın yakınsamasını gözlemek.
- Ölçtüğü beceri: veri okuryazarlığı, deneysel yorum.

## 5) Ölçme-Değerlendirme Tasarımı
- Her modülde:
  - Görev sayısı
  - İlk denemede doğruluk
  - Tamamlama süresi
  - İpucu kullanımı
- Öğretmen paneli için önerilen çıktı:
  - "Kazanım bazlı ısı haritası" (Sayılar, Fonksiyon, Olasılık)
  - Öğrenci bazında zorluk profili

## 6) Teknik Mimari (MVP için)
- **Frontend**: Tek sayfa HTML/CSS/JS (kurulumsuz)
- **Render**: SVG/Canvas ile canlı görselleştirme
- **Veri**: LocalStorage ile skor/ilerleme saklama
- **Genişleme**: Sonraki aşamada API + öğretmen rapor ekranı

## 7) Demo Kapsamı (Bu repoda eklenen)
- `demo/index.html`: Oyun alanı arayüzü
- `demo/styles.css`: Görsel tasarım
- `demo/app.js`: 3 mini oyunun etkileşimi ve puanlama

## 8) Sonraki Sürüm Önerisi
1. TYMM öğrenme çıktısı kodlarıyla görev etiketleme
2. Öğretmen sınıf modu (toplu görev başlatma)
3. Bağlam temelli soru kartları (senaryo bazlı)
4. Erişilebilirlik ve mobil optimizasyon
