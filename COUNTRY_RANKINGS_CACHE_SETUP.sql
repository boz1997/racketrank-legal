-- Country Rankings Cache Table
-- This table caches country-based rankings for 2 hours to reduce API calls

CREATE TABLE IF NOT EXISTS country_rankings_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country TEXT NOT NULL UNIQUE, -- Normalized country name (e.g., "Turkey", "USA")
    country_variants TEXT[], -- Array of country name variants (e.g., ["Turkey", "Türkiye", "Turkiye"])
    rankings JSONB NOT NULL, -- Top 10 players as JSON array
    player_count INTEGER DEFAULT 0, -- Total number of players in this country
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours')
);

-- Index for fast country lookup
CREATE INDEX IF NOT EXISTS idx_country_rankings_country ON country_rankings_cache(country);

-- Index for expiration check
CREATE INDEX IF NOT EXISTS idx_country_rankings_expires ON country_rankings_cache(expires_at);

-- Function to normalize country names (handles variants)
CREATE OR REPLACE FUNCTION normalize_country_name(input_country TEXT)
RETURNS TEXT AS $$
DECLARE
    normalized TEXT;
BEGIN
    -- Convert to lowercase and trim
    normalized := LOWER(TRIM(input_country));
    
    -- Turkey variants
    IF normalized IN ('turkey', 'türkiye', 'turkiye', 'tr') THEN
        RETURN 'Turkey';
    END IF;
    
    -- USA variants
    IF normalized IN ('usa', 'united states', 'united states of america', 'amerika birleşik devletleri', 'amerika birlesik devletleri', 'us', 'u.s.a.', 'u.s.') THEN
        RETURN 'United States';
    END IF;
    
    -- UK variants
    IF normalized IN ('uk', 'united kingdom', 'birleşik krallık', 'birlesik krallik', 'great britain', 'england') THEN
        RETURN 'United Kingdom';
    END IF;
    
    -- Germany variants
    IF normalized IN ('germany', 'deutschland', 'almanya', 'de') THEN
        RETURN 'Germany';
    END IF;
    
    -- France variants
    IF normalized IN ('france', 'fransa', 'fr') THEN
        RETURN 'France';
    END IF;
    
    -- Spain variants
    IF normalized IN ('spain', 'españa', 'ispanya', 'es') THEN
        RETURN 'Spain';
    END IF;
    
    -- Italy variants
    IF normalized IN ('italy', 'italia', 'italya', 'it') THEN
        RETURN 'Italy';
    END IF;
    
    -- Netherlands variants
    IF normalized IN ('netherlands', 'holland', 'hollanda', 'nl') THEN
        RETURN 'Netherlands';
    END IF;
    
    -- Greece variants
    IF normalized IN ('greece', 'yunanistan', 'gr') THEN
        RETURN 'Greece';
    END IF;
    
    -- Add more countries as needed...
    
    -- If no match found, return capitalized version
    RETURN INITCAP(input_country);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean expired cache entries (run this periodically)
CREATE OR REPLACE FUNCTION clean_expired_country_rankings()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM country_rankings_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE country_rankings_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (for rankings display)
CREATE POLICY "Public country rankings are viewable by everyone"
ON country_rankings_cache FOR SELECT
USING (true);

-- Policy: Only service role can insert/update (backend API only)
CREATE POLICY "Only service role can modify country rankings"
ON country_rankings_cache FOR ALL
USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE country_rankings_cache IS 'Caches country-based rankings for 2 hours to reduce API calls';
COMMENT ON COLUMN country_rankings_cache.country IS 'Normalized country name (e.g., "Turkey", "United States")';
COMMENT ON COLUMN country_rankings_cache.country_variants IS 'Array of country name variants for fuzzy matching';
COMMENT ON COLUMN country_rankings_cache.rankings IS 'Top 10 players as JSON array';
COMMENT ON COLUMN country_rankings_cache.expires_at IS 'Cache expiration time (2 hours from creation)';
