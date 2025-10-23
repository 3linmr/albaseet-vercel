// Health check endpoint
export default async function handler(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        console.log('🏥 Health check called');

        res.status(200).json({
            success: true,
            message: 'API is working!',
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            headers: {
                host: req.headers.host,
                'user-agent': req.headers['user-agent']
            },
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: process.env.VERCEL,
                VERCEL_REGION: process.env.VERCEL_REGION,
                SMTP_HOST: process.env.SMTP_HOST || 'Not set',
                SMTP_PORT: process.env.SMTP_PORT || 'Not set',
                SMTP_USER: process.env.SMTP_USER || 'Not set',
                SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set'
            }
        });

    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}
