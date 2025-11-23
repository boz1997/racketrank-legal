// Health check endpoint for Vercel
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    res.json({ 
        status: 'ok', 
        message: 'RacketRank API is running',
        timestamp: new Date().toISOString()
    });
};

