# .env Dosyası Kontrol Listesi

## ✅ .env Dosyası Nerede Olmalı?

`.env` dosyası **mutlaka `backend/` klasöründe** olmalı:

```
racketrank-legal/
  ├── backend/
  │   ├── .env          ← BURADA OLMALI!
  │   ├── server.js
  │   └── package.json
  └── ...
```

## ✅ .env Dosyası Formatı

`.env` dosyası şu şekilde olmalı (tırnak işareti YOK, boşluk YOK):

```env
SUPABASE_URL=https://bchiwefedtewdwmtrqwt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaGl3ZWZlZHRld2R3bXRycXd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5ODc2ODAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.xxxxxxxxxxxxx
PORT=3000
```

## ❌ Yaygın Hatalar

### 1. Tırnak İşareti Kullanmak
```env
# YANLIŞ ❌
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."

# DOĞRU ✅
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 2. Boşluk Kullanmak
```env
# YANLIŞ ❌
SUPABASE_URL = https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGci...

# DOĞRU ✅
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 3. Yanlış Key Kullanmak
```env
# YANLIŞ ❌ - anon key kullanmak
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (anon key)

# DOĞRU ✅ - service_role key kullanmak
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (service_role key)
```

### 4. Eksik Karakterler
- Key çok uzun olmalı (200+ karakter)
- `eyJ` ile başlamalı
- İçinde nokta (.) karakterleri olmalı

### 5. Yanlış Klasör
```env
# YANLIŞ ❌ - Proje root'unda
racketrank-legal/.env

# DOĞRU ✅ - backend klasöründe
racketrank-legal/backend/.env
```

## 🔍 Kontrol Etme

Backend server'ı başlattığınızda şunu görmelisiniz:

```
🔍 Debug - Checking environment variables:
SUPABASE_URL: https://bchiwefedtewdwmtrqwt...
SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIs...
✅ Supabase client initialized
🚀 RacketRank API server running on http://localhost:3000
```

Eğer "❌ NOT FOUND" görüyorsanız, .env dosyası yanlış yerde veya yanlış formatta.

## 🛠️ Düzeltme Adımları

1. `backend/` klasöründe `.env` dosyası olduğundan emin olun
2. Dosyayı bir text editor ile açın (Notepad++, VS Code, vb.)
3. Formatı kontrol edin (tırnak yok, boşluk yok)
4. Key'in tamamını kopyaladığınızdan emin olun
5. Backend server'ı yeniden başlatın: `npm start`

