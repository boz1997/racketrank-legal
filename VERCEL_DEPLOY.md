# Vercel Deployment Rehberi

## 🚀 Vercel'e Deploy Etme

### Seçenek 1: Vercel CLI ile (Önerilen)

1. **Vercel CLI yükleyin:**
   ```bash
   npm i -g vercel
   ```

2. **Vercel'e login olun:**
   ```bash
   vercel login
   ```

3. **Proje root'unda deploy edin:**
   ```bash
   vercel
   ```

4. **Environment variables ekleyin:**
   - Vercel dashboard'a gidin: https://vercel.com/dashboard
   - Projenizi seçin
   - Settings > Environment Variables
   - Şunları ekleyin:
     - `SUPABASE_URL` = `https://your-project-id.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`
     - `PORT` = `3000` (opsiyonel)

5. **Redeploy edin:**
   ```bash
   vercel --prod
   ```

### Seçenek 2: GitHub ile Otomatik Deploy

1. **GitHub'a push edin:**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Vercel Dashboard'a gidin:**
   - https://vercel.com/new
   - GitHub repo'nuzu import edin

3. **Project Settings:**
   - Framework Preset: "Other"
   - Root Directory: `.` (proje root)
   - Build Command: (boş bırakın)
   - Output Directory: `.` (boş bırakın)

4. **Environment Variables ekleyin:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. **Deploy edin**

## 📝 Önemli Notlar

### Backend API URL'i

Frontend otomatik olarak doğru URL'i kullanacak:
- Local: `http://localhost:3000`
- Production: Aynı domain (Vercel otomatik yönlendirir)

`rankings.html` dosyasında zaten ayarlı, ekstra bir şey yapmanıza gerek yok!

### Vercel Serverless Functions

Backend `vercel.json` ile otomatik olarak serverless function'a dönüşecek:
- `/api/health` → `https://your-app.vercel.app/api/health`
- `/api/rankings` → `https://your-app.vercel.app/api/rankings`

### CORS Ayarları

Vercel'de CORS zaten çalışıyor, ekstra ayar gerekmez.

## ✅ Kontrol Listesi

- [ ] Vercel CLI yüklendi
- [ ] `vercel.json` dosyası oluşturuldu
- [ ] Environment variables eklendi
- [ ] Deploy yapıldı
- [ ] Frontend'de API URL güncellendi
- [ ] Test edildi

## 🔍 Test

Deploy sonrası:
1. `https://your-app.vercel.app/api/health` → "ok" dönmeli
2. `https://your-app.vercel.app/rankings.html` → Rankings sayfası açılmalı
3. Konum izni verin ve leaderboard görünmeli

