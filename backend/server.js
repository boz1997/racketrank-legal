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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'RacketRank API is running' });
});

// Rankings endpoint
app.get('/api/rankings', async (req, res) => {
    try {
        const { level, district, city, country } = req.query;

        // Validate level parameter
        if (!level || !['district', 'city', 'country'].includes(level)) {
            return res.status(400).json({ 
                error: 'Invalid level parameter. Must be: district, city, or country' 
            });
        }

        // Build query
        // Note: profiles table uses 'id' (not 'Oid'), 'region' (not 'district')
        let query = supabase
            .from('profiles')
            .select('id, first_name, last_name, rating, region, city, country, avatar_url')
            .not('rating', 'is', null)
            .order('rating', { ascending: false })
            .limit(100);

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

        // Apply location filter based on level
        // Use case-insensitive partial matching (ilike) for better results
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
            // Use 'region' column instead of 'district'
            // Case-insensitive partial match
            query = query.ilike('region', `%${district}%`);
            filterApplied = true;
            console.log(`✅ Applied district filter: region ILIKE '%${district}%'`);
        } else if (level === 'city' && city && city !== 'Unknown') {
            // Case-insensitive city matching
            query = query.ilike('city', `%${city}%`);
            filterApplied = true;
            console.log(`✅ Applied city filter: city ILIKE '%${city}%'`);
        } else if (level === 'country' && mappedCountry && mappedCountry !== 'Unknown') {
            // Case-insensitive country matching with mapped name
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
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            // More specific error messages
            if (error.message && error.message.includes('Invalid API key')) {
                console.error('⚠️  API Key Error: Check your SUPABASE_SERVICE_ROLE_KEY in .env file');
                console.error('Make sure:');
                console.error('1. You copied the FULL service_role key (not anon key)');
                console.error('2. Key starts with "eyJ"');
                console.error('3. No extra spaces or quotes in .env file');
                console.error('4. .env file is in backend/ directory');
            }
            
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
            // Check if any data exists at all and what values are in the database
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
            
            // Don't show global fallback - show empty instead
            // This helps debug the filtering issue
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
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 RacketRank API server running on http://localhost:${PORT}`);
    console.log(`📊 Rankings endpoint: http://localhost:${PORT}/api/rankings`);
});

