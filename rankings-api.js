// Alternative: Backend API approach
// Instead of exposing Supabase keys, use a backend API endpoint

// This function calls your backend API instead of Supabase directly
async function loadLeaderboardFromAPI(level, location) {
    try {
        const response = await fetch(`/api/rankings?level=${level}&district=${location.district}&city=${location.city}&country=${location.country}`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

// Backend API endpoint example (Node.js/Express):
/*
app.get('/api/rankings', async (req, res) => {
    const { level, district, city, country } = req.query;
    
    // Supabase client initialized on backend with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let query = supabase
        .from('profiles')
        .select('Oid, first_name, last_name, rating, district, city, country')
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .limit(100);
    
    if (level === 'district' && district) {
        query = query.eq('district', district);
    } else if (level === 'city' && city) {
        query = query.eq('city', city);
    } else if (level === 'country' && country) {
        query = query.eq('country', country);
    }
    
    const { data, error } = await query;
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    res.json(data);
});
*/

