// Vercel Serverless Function for Rankings API
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

// Map English country names to Turkish (database uses Turkish)
function mapCountryToTurkish(countryName) {
    const countryMap = {
        'Turkey': 'Turkiye',
        'United States': 'Amerika Birlesik Devletleri',
        'United Kingdom': 'Birlesik Krallik',
        'Germany': 'Almanya',
        'France': 'Fransa',
        'Italy': 'Italya',
        'Spain': 'Ispanya',
        'Netherlands': 'Hollanda',
        'Belgium': 'Belcika',
        'Greece': 'Yunanistan',
        'Bulgaria': 'Bulgaristan',
        'Romania': 'Romanya',
        'Russia': 'Rusya',
        'Ukraine': 'Ukrayna',
        'Poland': 'Polonya',
        'Czech Republic': 'Cek Cumhuriyeti',
        'Austria': 'Avusturya',
        'Switzerland': 'Isvicre',
        'Sweden': 'Isvec',
        'Norway': 'Norvec',
        'Denmark': 'Danimarka',
        'Finland': 'Finlandiya',
        'Portugal': 'Portekiz',
        'Ireland': 'Irlanda',
        'Canada': 'Kanada',
        'Australia': 'Avustralya',
        'New Zealand': 'Yeni Zelanda',
        'Japan': 'Japonya',
        'China': 'Cin',
        'India': 'Hindistan',
        'Brazil': 'Brezilya',
        'Argentina': 'Arjantin',
        'Mexico': 'Meksika',
        'South Africa': 'Guney Afrika',
        'Egypt': 'Misir',
        'Saudi Arabia': 'Suudi Arabistan',
        'United Arab Emirates': 'Birlesik Arap Emirlikleri',
        'Israel': 'Israil',
        'Iran': 'Iran',
        'Iraq': 'Irak',
        'Syria': 'Suriye',
        'Lebanon': 'Lubnan',
        'Jordan': 'Urdun',
        'Cyprus': 'Kibris',
        'Azerbaijan': 'Azerbaycan',
        'Georgia': 'Gurcistan',
        'Armenia': 'Ermenistan'
    };
    
    if (countryMap[countryName]) {
        return countryMap[countryName];
    }
    
    const lowerCountry = countryName.toLowerCase();
    for (const [en, tr] of Object.entries(countryMap)) {
        if (en.toLowerCase() === lowerCountry) {
            return tr;
        }
    }
    
    return countryName;
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
        const { level, district, city, country } = req.query;

        // Validate level parameter
        if (!level || !['district', 'city', 'country'].includes(level)) {
            return res.status(400).json({ 
                error: 'Invalid level parameter. Must be: district, city, or country' 
            });
        }

        // Build query
        let query = supabase
            .from('profiles')
            .select('id, first_name, last_name, rating, region, city, country, avatar_url')
            .not('rating', 'is', null)
            .order('rating', { ascending: false })
            .limit(100);

        // Apply location filter based on level
        let filterApplied = false;
        console.log(`🔍 Filtering by ${level}:`, { district, city, country });
        
        // Map country name to Turkish if needed
        let mappedCountry = country;
        if (country && country !== 'Unknown') {
            mappedCountry = mapCountryToTurkish(country);
            if (mappedCountry !== country) {
                console.log(`🌍 Mapped country: "${country}" → "${mappedCountry}"`);
            }
        }
        
        if (level === 'district' && district && district !== 'Unknown') {
            query = query.ilike('region', `%${district}%`);
            filterApplied = true;
            console.log(`✅ Applied district filter: region ILIKE '%${district}%'`);
        } else if (level === 'city' && city && city !== 'Unknown') {
            query = query.ilike('city', `%${city}%`);
            filterApplied = true;
            console.log(`✅ Applied city filter: city ILIKE '%${city}%'`);
        } else if (level === 'country' && mappedCountry && mappedCountry !== 'Unknown') {
            query = query.ilike('country', `%${mappedCountry}%`);
            filterApplied = true;
            console.log(`✅ Applied country filter: country ILIKE '%${mappedCountry}%'`);
        } else {
            console.log(`⚠️  No filter applied - level: ${level}, district: ${district}, city: ${city}, country: ${country} (mapped: ${mappedCountry})`);
        }

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
        console.log(`📊 Query returned ${data ? data.length : 0} results for ${level}`);
        if (data && data.length > 0) {
            console.log('📋 Sample data (first 3):');
            data.slice(0, 3).forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.first_name} ${p.last_name} - region: "${p.region}", city: "${p.city}", country: "${p.country}"`);
            });
        } else if (filterApplied) {
            console.log('❌ No results found with filter. Checking database values...');
            const checkQuery = supabase
                .from('profiles')
                .select('region, city, country')
                .not('rating', 'is', null)
                .limit(10);
            const { data: sampleData } = await checkQuery;
            if (sampleData && sampleData.length > 0) {
                console.log('📋 Sample database values:');
                const uniqueRegions = [...new Set(sampleData.map(p => p.region).filter(Boolean))];
                const uniqueCities = [...new Set(sampleData.map(p => p.city).filter(Boolean))];
                const uniqueCountries = [...new Set(sampleData.map(p => p.country).filter(Boolean))];
                console.log(`  Regions: ${uniqueRegions.slice(0, 5).join(', ')}`);
                console.log(`  Cities: ${uniqueCities.slice(0, 5).join(', ')}`);
                console.log(`  Countries: ${uniqueCountries.slice(0, 5).join(', ')}`);
            }
        }

        // Return data
        res.json({
            success: true,
            level: level,
            count: data ? data.length : 0,
            data: data || []
        });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message 
        });
    }
};

