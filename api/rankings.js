// Vercel Serverless Function for Country Rankings API
// This file will be deployed as a serverless function on Vercel

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in environment variables!');
}

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

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

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!supabase) {
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
        });
    }

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
};
