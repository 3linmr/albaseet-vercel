// Simple test API to check if Vercel functions are working
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        console.log('Test API called successfully');
        
        res.status(200).json({
            success: true,
            message: 'Vercel function is working!',
            timestamp: new Date().toISOString(),
            method: req.method,
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                SMTP_HOST: process.env.SMTP_HOST ? 'Set' : 'Not set',
                SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set'
            }
        });
    } catch (error) {
        console.error('Test API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
