export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🚀 Zapier API called');
        console.log('Request body:', req.body);
        
        const { name, email, phone, message, lastQuestion, lastAnswer } = req.body;
        
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const zapierData = {
            ticketType: 'Support Ticket',
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            ticketMessage: message,
            lastQuestion: lastQuestion || 'N/A',
            lastAnswer: lastAnswer || 'N/A',
            timestamp: new Date().toISOString(),
            source: 'witsUP Assistant',
            priority: 'Normal',
            status: 'New'
        };

        console.log('📤 Sending to Zapier:', zapierData);

        // اختبار URL Zapier
        const zapierUrl = 'https://hooks.zapier.com/hooks/catch/25043000/urt7rfs/';
        console.log('🔗 Zapier URL:', zapierUrl);
        
        const response = await fetch(zapierUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'witsUP-Assistant/1.0'
            },
            body: JSON.stringify(zapierData)
        });

        console.log('📡 Zapier Response Status:', response.status);
        
        if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Success:', responseData);
            res.status(200).json({ 
                success: true, 
                message: 'Ticket sent to Trello successfully',
                zapierResponse: responseData
            });
        } else {
            const errorText = await response.text();
            console.error('❌ Zapier Error:', errorText);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to send to Zapier',
                details: errorText
            });
        }
        
    } catch (error) {
        console.error('💥 Server Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message
        });
    }
}
