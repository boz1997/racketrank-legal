# Location Cache Tablosu Kurulumu

## Tablo Oluşturma

Supabase SQL Editor'de şu SQL'i çalıştırın:

```sql
-- Location cache tablosu
CREATE TABLE IF NOT EXISTS location_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL, -- Format: "lat-lng" (örn: "36.8544-28.2742")
    district TEXT,
    city TEXT,
    country TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL -- 2 saat sonra expire olacak
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_cache_key ON location_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_location_cache_expires ON location_cache(expires_at);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_location_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_location_cache_timestamp
    BEFORE UPDATE ON location_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_location_cache_updated_at();

-- Function to clean expired cache entries (optional, can run periodically)
CREATE OR REPLACE FUNCTION clean_expired_location_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM location_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

## Tablo Yapısı

- `cache_key`: Unique key (örn: "36.8544-28.2742" - latitude-longitude)
- `district`: İlçe adı
- `city`: İl adı
- `country`: Ülke adı
- `latitude`: Enlem
- `longitude`: Boylam
- `created_at`: Oluşturulma zamanı
- `updated_at`: Güncellenme zamanı
- `expires_at`: Son kullanma zamanı (2 saat sonra)

## Kullanım

Backend API otomatik olarak:
1. Cache'den kontrol eder
2. Varsa ve expire olmamışsa cache'den döner
3. Yoksa Nominatim API'ye istek atar ve cache'e kaydeder

