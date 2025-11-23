# Supabase Tablo Bilgileri - Nasıl Alınır?

## 📋 İhtiyacımız Olan Bilgiler

Backend'in çalışması için `profiles` tablosundaki kolon isimlerini bilmemiz gerekiyor.

## 🔍 Supabase'den Bilgi Alma Yöntemleri

### Yöntem 1: Table Editor (En Kolay) ✅

1. Supabase Dashboard'a gidin
2. Sol menüden **Table Editor** tıklayın
3. **profiles** tablosunu seçin
4. Tablonun üst kısmında kolon isimlerini göreceksiniz

**Bana şunları gönderin:**
- Primary key kolonu: `Oid` mi, `id` mi, başka bir şey mi?
- Rating kolonu: `rating` mi, `elo` mu, başka bir şey mi?
- İsim kolonları: `first_name`, `last_name` var mı?
- Konum kolonları: `district`, `city`, `country` var mı?

### Yöntem 2: SQL Editor

1. Supabase Dashboard > **SQL Editor**
2. Şu sorguyu çalıştırın:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
```

Bu size tüm kolonları ve tiplerini gösterecek.

### Yöntem 3: API Docs

1. Supabase Dashboard > **API** (Settings değil, üst menüden)
2. Sol menüden **profiles** tablosunu seçin
3. Kolon isimlerini göreceksiniz

## 📝 Örnek Format

Bana şu formatta bilgi verin:

```
profiles tablosu:
- Primary Key: id (uuid)
- İsim: first_name (text), last_name (text)
- Rating: rating (numeric) veya elo (numeric)
- Konum: district (text), city (text), country (text)
```

Veya sadece kolon isimlerini listeleyin:
```
id, first_name, last_name, rating, district, city, country
```

## 🎯 En Hızlı Yol

Table Editor'da profiles tablosunu açın ve ekran görüntüsü alın veya kolon isimlerini yazın!

