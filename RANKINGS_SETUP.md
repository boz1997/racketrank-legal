# Rankings Sayfası Kurulum Rehberi

Rankings sayfası, kullanıcıların konumlarına göre (ilçe, il, ülke) leaderboard görebilmelerini sağlar.

## Özellikler
python -m http.server 8000
- ✅ Konum tabanlı leaderboard (ilçe/il/ülke)
- ✅ Otomatik konum tespiti (Geolocation API)
- ✅ Supabase entegrasyonu
- ✅ Otomatik güncelleme (15 dakikada bir)
- ✅ Responsive tasarım
- ✅ Tasarım diline uygun modern UI

## Kurulum Adımları

### 1. Supabase Yapılandırması

1. `config.example.js` dosyasını `config.js` olarak kopyalayın:
   ```bash
   cp config.example.js config.js
   ```

2. `config.js` dosyasını açın ve Supabase bilgilerinizi ekleyin:
   ```javascript
   window.SUPABASE_URL = 'https://your-project-id.supabase.co';
   window.SUPABASE_ANON_KEY = 'your-anon-key-here';
   ```

3. Supabase bilgilerinizi almak için:
   - Supabase proje dashboard'unuza gidin
   - Settings > API bölümüne gidin
   - "Project URL" ve "anon public" key'i kopyalayın

### 2. Supabase Veritabanı Yapısı

`profiles` tablosunda şu kolonların olması gerekiyor:

- `Oid` (uuid, primary key)
- `first_name` (text)
- `last_name` (text)
- `rating` (numeric) - Ranking/rating değeri
- `district` (text, optional) - İlçe bilgisi
- `city` (text, optional) - Şehir bilgisi
- `country` (text, optional) - Ülke bilgisi

**Not:** Eğer kolon isimleriniz farklıysa, `rankings.js` dosyasındaki sorguyu güncelleyin.

### 3. Konum Bilgisi

Sayfa otomatik olarak:
1. Tarayıcının Geolocation API'sini kullanarak konum alır
2. OpenStreetMap Nominatim API ile reverse geocoding yapar
3. İlçe, şehir ve ülke bilgilerini çıkarır

Eğer kullanıcı konum izni vermezse, IP tabanlı konum tespiti kullanılır.

### 4. Güncelleme Sıklığı

Varsayılan olarak sayfa **15 dakikada bir** otomatik güncellenir.

Güncelleme sıklığını değiştirmek için `rankings.js` dosyasında:
```javascript
const UPDATE_INTERVAL = 15 * 60 * 1000; // 15 dakika
```
satırını değiştirin:
- 15 dakika: `15 * 60 * 1000`
- 1 saat: `60 * 60 * 1000`
- 30 dakika: `30 * 60 * 1000`

## Kullanım

1. Kullanıcı sayfayı açar
2. Tarayıcı konum izni ister (kullanıcı onaylar)
3. Sayfa otomatik olarak kullanıcının konumunu tespit eder
4. İlçe, il veya ülke seviyesinde leaderboard gösterilir
5. Kullanıcı butonlarla farklı seviyeler arasında geçiş yapabilir
6. Sayfa her 15 dakikada bir otomatik güncellenir

## Sorun Giderme

### "Supabase is not configured" hatası
- `config.js` dosyasının oluşturulduğundan ve doğru bilgilerle doldurulduğundan emin olun

### Konum bulunamıyor
- Tarayıcı konum izninin verildiğinden emin olun
- HTTPS kullanıyorsanız (production), Geolocation API çalışır
- HTTP'de (localhost) test ederken izin gerekebilir

### Leaderboard boş görünüyor
- Supabase'de `profiles` tablosunda veri olduğundan emin olun
- `rating` kolonunun null olmadığından emin olun
- Kolon isimlerinin doğru olduğundan emin olun

### Veriler güncellenmiyor
- Supabase RLS (Row Level Security) politikalarını kontrol edin
- `anon` key'inin gerekli izinlere sahip olduğundan emin olun

## Güvenlik Notları

### ⚠️ ÖNEMLİ: Public Repository Güvenliği

Eğer projeniz GitHub Pages gibi **public bir repository**'de ise, `config.js` dosyası herkes tarafından görülebilir!

#### Çözüm 1: Supabase RLS (Row Level Security) - ÖNERİLEN ✅

Supabase'de "anon" key zaten public olması için tasarlanmıştır. Güvenlik için:

1. **Supabase Dashboard** > **Authentication** > **Policies** bölümüne gidin
2. `profiles` tablosu için **Row Level Security (RLS)**'i etkinleştirin
3. Sadece **SELECT (okuma)** izni veren bir policy oluşturun:
   ```sql
   -- Allow public read access to profiles
   CREATE POLICY "Public profiles are viewable by everyone"
   ON profiles FOR SELECT
   USING (true);
   ```
4. **INSERT, UPDATE, DELETE** işlemlerini kısıtlayın

Bu şekilde anon key public olsa bile, sadece okuma yapılabilir ve veriler korunur.

#### Çözüm 2: Backend API (Daha Güvenli) 🔒

Eğer daha fazla güvenlik istiyorsanız:

1. Backend API oluşturun (Node.js, Python, vb.)
2. Supabase **service_role** key'ini backend'de saklayın (asla frontend'e koymayın!)
3. Frontend'den backend API'yi çağırın
4. Backend, Supabase ile iletişim kurar

Örnek backend API için `rankings-api.js` dosyasına bakın.

#### Çözüm 3: Environment Variables (GitHub Pages için)

GitHub Pages'de environment variables kullanamazsınız, ama GitHub Actions ile build sırasında inject edebilirsiniz.

### `.gitignore` Kontrolü

`config.js` dosyasının `.gitignore`'da olduğundan emin olun:
```
config.js
```

**Kontrol edin:** `git status` komutu `config.js` dosyasını göstermemeli!

