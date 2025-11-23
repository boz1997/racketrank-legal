# Supabase Service Role Key Nasıl Bulunur?

## 📍 Adım Adım

### 1. Supabase Dashboard'a Giriş Yapın
- [https://app.supabase.com](https://app.supabase.com) adresine gidin
- Projenizi seçin

### 2. Settings Bölümüne Gidin
- Sol menüden **Settings** (⚙️ ikonu) tıklayın
- Veya direkt URL: `https://app.supabase.com/project/YOUR_PROJECT_ID/settings/api`

### 3. API Sekmesine Gidin
- Settings sayfasında **API** sekmesine tıklayın

### 4. Service Role Key'i Bulun

API Settings sayfasında şunları göreceksiniz:

#### Üstte:
- **Project URL** - Bu `SUPABASE_URL` olacak
  ```
  https://xxxxxxxxxxxxx.supabase.co
  ```

#### Ortada:
- **Project API keys** bölümü
  - `anon` `public` key (bunu kullanmıyoruz)
  - `service_role` `secret` key (bunu kullanıyoruz!)

#### Service Role Key'i Görmek İçin:
1. "Project API keys" bölümünde **"service_role"** yazısını bulun (anon key'in hemen altında)
2. Key gizlidir: `••••••••••••••••` şeklinde görünür
3. **Key'in yanında veya üzerinde bir göz ikonu (👁️) veya "Reveal" butonu olmalı**
4. Göz ikonuna veya "Reveal" butonuna tıklayın
5. Key görünecek: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxx`
6. Key'in yanındaki **"Copy"** butonuna tıklayarak kopyalayın

**Eğer "Reveal" butonu görünmüyorsa:**
- Key'in üzerine tıklayın (noktalı alan)
- Sağ tarafta bir kopyalama ikonu olabilir
- Veya key alanının sağında küçük bir göz ikonu olabilir

### 5. .env Dosyasına Ekleyin

`backend/.env` dosyasında:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxx
```

## 🔍 Görsel Yerleşim

```
┌─────────────────────────────────────┐
│  Settings > API                     │
├─────────────────────────────────────┤
│                                     │
│  Project URL                        │
│  https://xxx.supabase.co            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Project API keys              │ │
│  │                               │ │
│  │ anon public                   │ │
│  │ eyJhbGciOiJIUzI1NiIs...      │ │ ← Bunu kullanmıyoruz
│  │                               │ │
│  │ service_role secret           │ │
│  │ ••••••••••••••••• [Reveal]   │ │ ← Bunu kullanıyoruz!
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

## ⚠️ Önemli Notlar

1. **service_role key'i asla frontend'de kullanmayın!**
   - Sadece backend'de kullanılmalı
   - Admin yetkileri var, tüm güvenlik politikalarını bypass eder

2. **Key'i kopyalarken dikkat:**
   - Tüm key'i kopyalayın (çok uzun olacak)
   - Başında/sonunda boşluk olmamalı
   - `eyJ` ile başlar

3. **Eğer hala bulamıyorsanız:**
   - Sayfayı yenileyin (F5)
   - Farklı tarayıcı deneyin
   - Supabase dashboard'un güncel versiyonunu kullandığınızdan emin olun

## 🎯 Hızlı Kontrol

Key'i doğru kopyaladığınızdan emin olmak için:
- Key `eyJ` ile başlamalı
- Çok uzun olmalı (200+ karakter)
- İçinde nokta (.) karakterleri olmalı
- `service_role` kelimesi key'in içinde değil, yanında label olarak görünmeli

