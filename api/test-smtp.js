// Test SMTP connection
import nodemailer from 'nodemailer';

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
        console.log('🧪 Testing SMTP connection...');
        
        // Test different configurations
        const configs = [
            {
                name: 'Port 587 (TLS)',
                host: 'pro.turbo-smtp.com',
                port: 587,
                secure: false,
                auth: {
                    user: 'no-reply@witsup.app',
                    pass: 'BUjAWNFd'
                }
            },
            {
                name: 'Port 465 (SSL)',
                host: 'pro.turbo-smtp.com',
                port: 465,
                secure: true,
                auth: {
                    user: 'no-reply@witsup.app',
                    pass: 'BUjAWNFd'
                }
            },
            {
                name: 'Port 25 (Plain)',
                host: 'pro.turbo-smtp.com',
                port: 25,
                secure: false,
                auth: {
                    user: 'no-reply@witsup.app',
                    pass: 'BUjAWNFd'
                }
            }
        ];

        const results = [];

        for (const config of configs) {
            try {
                console.log(`Testing ${config.name}...`);
                const transporter = nodemailer.createTransporter({
                    ...config,
                    tls: {
                        rejectUnauthorized: false
                    }
                });

                await transporter.verify();
                results.push({
                    config: config.name,
                    status: 'SUCCESS',
                    message: 'Connection successful'
                });
                console.log(`✅ ${config.name} - SUCCESS`);
            } catch (error) {
                results.push({
                    config: config.name,
                    status: 'FAILED',
                    message: error.message
                });
                console.log(`❌ ${config.name} - FAILED: ${error.message}`);
            }
        }

        res.status(200).json({
            success: true,
            message: 'SMTP connection test completed',
            results: results,
            environment: {
                SMTP_HOST: process.env.SMTP_HOST || 'Not set',
                SMTP_PORT: process.env.SMTP_PORT || 'Not set',
                SMTP_USER: process.env.SMTP_USER || 'Not set',
                SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set'
            }
        });

    } catch (error) {
        console.error('❌ SMTP test error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
