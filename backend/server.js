// Backend API Server for RacketRank Rankings
// This keeps Supabase credentials secure on the server

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Supabase client with service role key (server-side only)
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow frontend to call this API
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key, not anon key!

// Debug: Check if env variables are loaded
console.log('🔍 Debug - Checking environment variables:');
console.log('SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ NOT FOUND');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : '❌ NOT FOUND');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file!');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('Make sure .env file is in the backend/ directory');
    process.exit(1);
}

// Validate key format
if (!supabaseServiceKey.startsWith('eyJ')) {
    console.error('⚠️  WARNING: Service role key should start with "eyJ"');
    console.error('Make sure you copied the FULL service_role key, not the anon key');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ Supabase client initialized');

// Normalize country names to handle variants
function normalizeCountryName(countryName) {
    if (!countryName) return null;

    const normalized = countryName.toLowerCase().trim();

    // Turkey variants
    if (['turkey', 'türkiye', 'turkiye', 'tr'].includes(normalized)) {
        return 'Turkey';
    }

    // USA variants
    if (['usa', 'united states', 'united states of america', 'amerika birleşik devletleri',
        'amerika birlesik devletleri', 'us', 'u.s.a.', 'u.s.'].includes(normalized)) {
        return 'United States';
    }

    // UK variants
    if (['uk', 'united kingdom', 'birleşik krallık', 'birlesik krallik',
        'great britain', 'england'].includes(normalized)) {
        return 'United Kingdom';
    }

    // Germany variants
    if (['germany', 'deutschland', 'almanya', 'de'].includes(normalized)) {
        return 'Germany';
    }

    // France variants
    if (['france', 'fransa', 'fr'].includes(normalized)) {
        return 'France';
    }

    // Spain variants
    if (['spain', 'españa', 'ispanya', 'es'].includes(normalized)) {
        return 'Spain';
    }

    // Italy variants
    if (['italy', 'italia', 'italya', 'it'].includes(normalized)) {
        return 'Italy';
    }

    // Netherlands variants
    if (['netherlands', 'holland', 'hollanda', 'nl'].includes(normalized)) {
        return 'Netherlands';
    }

    // Greece variants
    if (['greece', 'yunanistan', 'gr'].includes(normalized)) {
        return 'Greece';
    }

    // Canada variants
    if (['canada', 'kanada', 'ca'].includes(normalized)) {
        return 'Canada';
    }

    // Australia variants
    if (['australia', 'avustralya', 'au'].includes(normalized)) {
        return 'Australia';
    }

    // Brazil variants
    if (['brazil', 'brasil', 'brezilya', 'br'].includes(normalized)) {
        return 'Brazil';
    }

    // If no match found, return capitalized version
    return countryName.charAt(0).toUpperCase() + countryName.slice(1).toLowerCase();
}

// Get country variants for fuzzy matching in database
function getCountryVariants(normalizedCountry) {
    const variantsMap = {
        'Turkey': ['Turkey', 'Türkiye', 'Turkiye', 'turkey', 'türkiye', 'turkiye'],
        'United States': ['United States', 'USA', 'United States of America', 'Amerika Birleşik Devletleri',
            'Amerika Birlesik Devletleri', 'US', 'U.S.A.', 'U.S.'],
        'United Kingdom': ['United Kingdom', 'UK', 'Birleşik Krallık', 'Birlesik Krallik',
            'Great Britain', 'England'],
        'Germany': ['Germany', 'Deutschland', 'Almanya'],
        'France': ['France', 'Fransa'],
        'Spain': ['Spain', 'España', 'Ispanya'],
        'Italy': ['Italy', 'Italia', 'Italya'],
        'Netherlands': ['Netherlands', 'Holland', 'Hollanda'],
        'Greece': ['Greece', 'Yunanistan'],
        'Canada': ['Canada', 'Kanada'],
        'Australia': ['Australia', 'Avustralya'],
        'Brazil': ['Brazil', 'Brasil', 'Brezilya']
    };

    return variantsMap[normalizedCountry] || [normalizedCountry];
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'RacketRank API is running' });
});

// Country Rankings endpoint (with 2-hour cache)
app.get('/api/rankings', async (req, res) => {
    try {
        let { country, lat, lng } = req.query;

        // Validate country parameter
        if (!country || country === 'Unknown') {
            return res.status(400).json({
                error: 'Invalid country parameter',
                message: 'Country is required and cannot be "Unknown"'
            });
        }

        // Normalize country name
        const normalizedCountry = normalizeCountryName(country);
        console.log(`🌍 Normalized country: "${country}" → "${normalizedCountry}"`);

        // Check cache first (2 hours)
        const { data: cachedRankings, error: cacheError } = await supabase
            .from('country_rankings_cache')
            .select('*')
            .eq('country', normalizedCountry)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!cacheError && cachedRankings) {
            console.log(`📦 Cache HIT for country: ${normalizedCountry}`);
            console.log(`   Cache age: ${Math.round((new Date() - new Date(cachedRankings.updated_at)) / 1000)}s`);

            return res.json({
                success: true,
                country: normalizedCountry,
                count: cachedRankings.rankings.length,
                data: cachedRankings.rankings,
                cached: true,
                cache_age_seconds: Math.round((new Date() - new Date(cachedRankings.updated_at)) / 1000)
            });
        }

        console.log(`🔄 Cache MISS for country: ${normalizedCountry} - Fetching from database...`);

        // Get country variants for fuzzy matching
        const countryVariants = getCountryVariants(normalizedCountry);
        console.log(`   Searching for variants: ${countryVariants.join(', ')}`);

        // Build query to find players from this country (using ILIKE for case-insensitive partial match)
        let query = supabase
            .from('profiles')
            .select('id, first_name, last_name, rating, country, avatar_url')
            .not('rating', 'is', null)
            .order('rating', { ascending: false })
            .limit(10); // Top 10 only

        // Use OR condition to match any variant
        const orConditions = countryVariants
            .map(variant => `country.ilike.%${variant}%`)
            .join(',');

        query = query.or(orConditions);

        // Execute query
        let { data, error } = await query;

        if (error) {
            console.error('Supabase error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            return res.status(500).json({
                error: 'Database error',
                message: error.message
            });
        }

        // Log results for debugging
        console.log(`📊 Query returned ${data ? data.length : 0} results for ${normalizedCountry}`);
        if (data && data.length > 0) {
            console.log('📋 Top 3 players:');
            data.slice(0, 3).forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.first_name} ${p.last_name} - rating: ${p.rating}, country: "${p.country}"`);
            });
        } else {
            console.log('❌ No results found. Checking database for sample countries...');
            const { data: sampleData } = await supabase
                .from('profiles')
                .select('country')
                .not('rating', 'is', null)
                .limit(20);

            if (sampleData && sampleData.length > 0) {
                const uniqueCountries = [...new Set(sampleData.map(p => p.country).filter(Boolean))];
                console.log(`📋 Sample countries in database: ${uniqueCountries.slice(0, 10).join(', ')}`);
            }
        }

        // Cache the results (2 hours expiry)
        if (data && data.length > 0) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 2);

            const { error: cacheInsertError } = await supabase
                .from('country_rankings_cache')
                .upsert({
                    country: normalizedCountry,
                    country_variants: countryVariants,
                    rankings: data,
                    player_count: data.length,
                    updated_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString()
                }, {
                    onConflict: 'country'
                });

            if (cacheInsertError) {
                console.error('⚠️  Failed to cache rankings:', cacheInsertError.message);
            } else {
                console.log(`✅ Cached rankings for ${normalizedCountry} (expires in 2 hours)`);
            }
        }

        // Return data
        res.json({
            success: true,
            country: normalizedCountry,
            count: data ? data.length : 0,
            data: data || [],
            cached: false
        });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 RacketRank API server running on http://localhost:${PORT}`);
    console.log(`📊 Rankings endpoint: http://localhost:${PORT}/api/rankings`);
    console.log(`💡 Example: http://localhost:${PORT}/api/rankings?country=Turkey`);
});
