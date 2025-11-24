# Country Rankings System - Setup Guide

## 🎯 Overview

The rankings system has been updated to show **country-based rankings only** with the following features:

- ✅ **Country-only rankings** (district and city removed)
- ✅ **Smart country name normalization** (handles variants like Türkiye/Turkey, USA/United States)
- ✅ **2-hour cache mechanism** (reduces API calls)
- ✅ **Top 10 players** per country
- ✅ **Automatic cache expiration**

## 📋 Setup Steps

### 1. Create the Cache Table in Supabase

Run the SQL script in Supabase SQL Editor:

```bash
# Open the SQL file
COUNTRY_RANKINGS_CACHE_SETUP.sql
```

**Steps:**
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Copy the entire content of `COUNTRY_RANKINGS_CACHE_SETUP.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)

This will create:
- `country_rankings_cache` table
- `normalize_country_name()` function (handles country variants)
- `clean_expired_country_rankings()` function (cleanup utility)
- Indexes for fast lookups
- Row Level Security (RLS) policies

### 2. Verify Table Creation

Run this query in SQL Editor to verify:

```sql
SELECT * FROM country_rankings_cache;
```

You should see an empty table with these columns:
- `id` (uuid)
- `country` (text)
- `country_variants` (text[])
- `rankings` (jsonb)
- `player_count` (integer)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `expires_at` (timestamptz)

### 3. Deploy to Vercel (Production)

The updated API (`api/rankings.js`) is already configured for Vercel deployment.

**Environment Variables:**
Make sure these are set in Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Deploy:**
```bash
git add .
git commit -m "Update to country-based rankings with 2-hour cache"
git push
```

Vercel will automatically deploy the changes.

### 4. Local Development

**Start the backend server:**

```bash
cd backend
npm install
npm start
```

The server will run on `http://localhost:3000`

**Open the frontend:**

Open `rankings.html` in your browser or use a local server:

```bash
# From project root
python -m http.server 8000
# or
npx serve
```

Then visit: `http://localhost:8000/rankings.html`

## 🌍 Supported Country Variants

The system automatically normalizes these country name variants:

| Normalized Name | Variants |
|----------------|----------|
| **Turkey** | Turkey, Türkiye, Turkiye, TR |
| **United States** | USA, United States, United States of America, Amerika Birleşik Devletleri, US, U.S.A. |
| **United Kingdom** | UK, United Kingdom, Birleşik Krallık, Great Britain, England |
| **Germany** | Germany, Deutschland, Almanya, DE |
| **France** | France, Fransa, FR |
| **Spain** | Spain, España, Ispanya, ES |
| **Italy** | Italy, Italia, Italya, IT |
| **Netherlands** | Netherlands, Holland, Hollanda, NL |
| **Greece** | Greece, Yunanistan, GR |
| **Canada** | Canada, Kanada, CA |
| **Australia** | Australia, Avustralya, AU |
| **Brazil** | Brazil, Brasil, Brezilya, BR |

**Note:** You can add more countries by updating the `normalizeCountryName()` function in:
- `rankings.js` (frontend)
- `api/rankings.js` (Vercel API)
- `backend/server.js` (local development)

## 🔄 How the Cache Works

1. **First Request:**
   - User visits rankings page
   - Frontend detects country (e.g., "Türkiye")
   - Normalizes to "Turkey"
   - Calls API: `/api/rankings?country=Turkey`
   - API checks cache → **MISS**
   - API queries database for top 10 players
   - API saves results to `country_rankings_cache` table
   - Cache expires in 2 hours
   - Returns data to frontend

2. **Subsequent Requests (within 2 hours):**
   - Another user from Turkey visits
   - API checks cache → **HIT**
   - Returns cached data immediately
   - No database query needed ✅

3. **After 2 Hours:**
   - Cache expires automatically
   - Next request triggers fresh database query
   - Cache is updated with new data

## 📊 Testing

### Test the API Directly

**Production (Vercel):**
```bash
curl "https://your-domain.vercel.app/api/rankings?country=Turkey"
```

**Local Development:**
```bash
curl "http://localhost:3000/api/rankings?country=Turkey"
```

**Expected Response:**
```json
{
  "success": true,
  "country": "Turkey",
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "rating": 1500,
      "country": "Turkiye",
      "avatar_url": "https://..."
    },
    ...
  ],
  "cached": false
}
```

### Test Country Variants

All these should return the same results:

```bash
# These all normalize to "Turkey"
curl "http://localhost:3000/api/rankings?country=Turkey"
curl "http://localhost:3000/api/rankings?country=Türkiye"
curl "http://localhost:3000/api/rankings?country=Turkiye"
curl "http://localhost:3000/api/rankings?country=TR"

# These all normalize to "United States"
curl "http://localhost:3000/api/rankings?country=USA"
curl "http://localhost:3000/api/rankings?country=United%20States"
curl "http://localhost:3000/api/rankings?country=Amerika%20Birleşik%20Devletleri"
```

## 🧹 Cache Maintenance

### Clean Expired Cache Entries

Run this in Supabase SQL Editor periodically (or set up a cron job):

```sql
SELECT clean_expired_country_rankings();
```

This will delete all expired cache entries and return the count of deleted rows.

### View Current Cache

```sql
SELECT 
    country,
    player_count,
    updated_at,
    expires_at,
    (expires_at > NOW()) as is_valid
FROM country_rankings_cache
ORDER BY updated_at DESC;
```

### Manually Clear Cache for a Country

```sql
DELETE FROM country_rankings_cache WHERE country = 'Turkey';
```

## 🔍 Troubleshooting

### No Rankings Showing

1. **Check if country is detected:**
   - Open browser console (F12)
   - Look for: `✅ Detected country: Turkey`

2. **Check API response:**
   - Open Network tab in browser
   - Look for `/api/rankings` request
   - Check response data

3. **Check database:**
   ```sql
   SELECT country, COUNT(*) 
   FROM profiles 
   WHERE rating IS NOT NULL 
   GROUP BY country 
   ORDER BY COUNT(*) DESC;
   ```

### Cache Not Working

1. **Verify table exists:**
   ```sql
   SELECT * FROM country_rankings_cache LIMIT 1;
   ```

2. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'country_rankings_cache';
   ```

3. **Check API logs:**
   - Look for `📦 Cache HIT` or `🔄 Cache MISS` messages

### Country Name Not Matching

1. **Check what's in the database:**
   ```sql
   SELECT DISTINCT country FROM profiles WHERE rating IS NOT NULL;
   ```

2. **Add new variant:**
   - Update `normalizeCountryName()` function in all 3 files
   - Redeploy

## 📝 Files Modified

- ✅ `rankings.html` - Removed district/city buttons
- ✅ `rankings.js` - Country-only logic with normalization
- ✅ `api/rankings.js` - Vercel API with cache
- ✅ `backend/server.js` - Local dev server with cache
- ✅ `COUNTRY_RANKINGS_CACHE_SETUP.sql` - Database setup

## 🚀 Next Steps

1. Run the SQL script to create the cache table
2. Test locally with `npm start` in backend folder
3. Deploy to Vercel
4. Monitor cache performance in Supabase

## 💡 Tips

- **Cache Duration:** Currently 2 hours. To change, update `expiresAt.setHours(expiresAt.getHours() + 2)` in API files
- **Top N Players:** Currently 10. To change, update `.limit(10)` in API files
- **Add Countries:** Update `normalizeCountryName()` function to add more country variants
- **Performance:** The cache reduces database queries by ~99% for popular countries!

---

**Questions?** Check the console logs for detailed debugging information.
