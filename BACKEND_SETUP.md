# Backend API Kurulum Rehberi

Bu rehber, RacketRank Rankings sayfası için güvenli backend API kurulumunu açıklar.

## 🎯 Neden Backend API?

- ✅ **Güvenlik**: Supabase service_role key frontend'de görünmez
- ✅ **Kontrol**: Tüm veritabanı işlemleri backend'de kontrol edilir
- ✅ **Esneklik**: İleride authentication, rate limiting vb. eklenebilir

## 📋 Adım Adım Kurulum

### 1. Backend Klasörüne Gidin

```bash
cd backend
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

Bu komut şunları yükler:
- `express` - Web server
- `@supabase/supabase-js` - Supabase client
- `cors` - CORS desteği
- `dotenv` - Environment variables

### 3. Environment Variables Ayarlayın

1. `.env.example` dosyasını `.env` olarak kopyalayın:
   ```bash
   cp .env.example .env
   ```

2. `.env` dosyasını açın ve Supabase bilgilerinizi ekleyin:

   **Supabase Dashboard'dan alacağınız bilgiler:**
   - [Supabase Dashboard](https://app.supabase.com) → Projenizi seçin
   - Sol menüden **Settings** (⚙️) tıklayın
   - **API** sekmesine gidin
   - **Project URL** → `SUPABASE_URL` (üstte görünür)
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (aşağıda, "Service Role" bölümünde)
   
   **Service Role Key'i Bulma:**
   - API Settings sayfasında aşağı kaydırın
   - "Service Role" bölümünü bulun
   - Key genellikle gizlidir, **"Reveal"** veya **"Show"** butonuna tıklayın
   - Key'i kopyalayın (çok uzun bir string olacak, `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` gibi başlar)
   
   ⚠️ **ÖNEMLİ**: `service_role` key'i kullanın, `anon` key değil!
   - `service_role` key: Admin yetkileri var, backend'de güvenli (bizim kullandığımız)
   - `anon` key: Public, frontend'de kullanılır (biz kullanmıyoruz)
   
   **Eğer service_role key göremiyorsanız:**
   - Sayfayı yenileyin
   - "Reveal" butonuna tıklayın
   - Bazen "service_role" yazısının yanında bir göz ikonu veya "Show" butonu olur

   Örnek `.env` dosyası:
   ```env
   SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxx
   PORT=3000
   ```

### 4. Backend Server'ı Başlatın

**Development (otomatik yeniden başlatma):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server `http://localhost:3000` adresinde çalışacak.

### 5. Test Edin

Tarayıcıda şu URL'yi açın:
```
http://localhost:3000/api/health
```

Şunu görmelisiniz:
```json
{"status":"ok","message":"RacketRank API is running"}
```

## 🌐 Frontend'i Güncelleyin

Backend çalıştıktan sonra, frontend otomatik olarak `http://localhost:3000` adresini kullanacak.

Eğer backend'i başka bir yerde deploy ederseniz, `rankings.html` dosyasında şunu güncelleyin:

```javascript
window.API_BASE_URL = 'https://your-backend-url.com';
```

## 🚀 Production Deployment

### Vercel (Önerilen - En Kolay)

1. Vercel CLI yükleyin:
   ```bash
   npm i -g vercel
   ```

2. Backend klasöründe deploy edin:
   ```bash
   cd backend
   vercel
   ```

3. Vercel dashboard'da environment variables ekleyin:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Frontend'de API URL'ini güncelleyin:
   ```javascript
   window.API_BASE_URL = 'https://your-vercel-app.vercel.app';
   ```

### Railway

1. [Railway](https://railway.app) hesabı oluşturun
2. GitHub repo'nuzu bağlayın
3. Environment variables ekleyin
4. Otomatik deploy olur

### Heroku

1. Heroku CLI yükleyin
2. Login olun: `heroku login`
3. App oluşturun: `heroku create your-app-name`
4. Environment variables ekleyin:
   ```bash
   heroku config:set SUPABASE_URL=your-url
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-key
   ```
5. Deploy: `git push heroku main`

## ✅ Kontrol Listesi

- [ ] `npm install` çalıştırıldı
- [ ] `.env` dosyası oluşturuldu
- [ ] Supabase `service_role` key eklendi (anon key değil!)
- [ ] Backend server çalışıyor (`npm start`)
- [ ] `/api/health` endpoint'i çalışıyor
- [ ] Frontend'de `rankings.html` sayfası backend'i çağırıyor
- [ ] Production'da environment variables ayarlandı

## 🔍 Sorun Giderme

### "Missing Supabase credentials" hatası
- `.env` dosyasının `backend` klasöründe olduğundan emin olun
- Dosya adının tam olarak `.env` olduğundan emin (`.env.txt` değil!)

### "Cannot connect to backend" hatası
- Backend server'ın çalıştığından emin olun (`npm start`)
- Port 3000'in başka bir uygulama tarafından kullanılmadığından emin olun
- Frontend'de `API_BASE_URL`'in doğru olduğundan emin olun

### CORS hatası
- Backend'de `cors()` middleware'inin aktif olduğundan emin olun
- Frontend URL'inin backend tarafından izin verilen origin'ler arasında olduğundan emin olun

### Supabase connection hatası
- `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY`'in doğru olduğundan emin olun
- Service role key'in `service_role` ile başladığından emin olun (anon key değil!)

## 📚 Daha Fazla Bilgi

- Backend API detayları için: `backend/README.md`
- API endpoint'leri için: `backend/README.md` dosyasındaki "API Endpoints" bölümüne bakın

