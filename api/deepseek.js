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
        const { message, conversationHistory = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'الرسالة مطلوبة' });
        }

        // قراءة الدليل
        let guideContent = '';
        try {
            const fs = await import('fs');
            const path = await import('path');
            const guidePath = path.join(process.cwd(), 'دليل_المستخدم_الشامل_الثاني_الأصلي.md');
            console.log('Attempting to read guide from:', guidePath);
            
            if (fs.existsSync(guidePath)) {
                console.log('Guide file exists, reading...');
                guideContent = fs.readFileSync(guidePath, 'utf8');
                console.log('Guide loaded successfully, length:', guideContent.length);
                
                // Check if guide content is being truncated
                if (guideContent.length < 100000) {
                    console.log('WARNING: Guide content seems too short, might be truncated');
                }
                
                // If guide is too large, truncate it to avoid API limits
                if (guideContent.length > 500000) {
                    console.log('Guide is very large, truncating to avoid API limits');
                    guideContent = guideContent.substring(0, 500000);
                }
            } else {
                console.log('Guide file not found at:', guidePath);
                console.log('Current working directory:', process.cwd());
                console.log('Files in current directory:', fs.readdirSync(process.cwd()));
            }
        } catch (error) {
            console.error('Error reading guide:', error);
            console.error('Error details:', error.message);
        }

        // رسالة النظام مع الدليل
        const systemMessage = `أنت مساعد خبير لنظام witsUP. اقرأ الدليل كاملاً وأجب بناءً على المعلومات الموجودة فيه فقط.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

تذكر: اقرأ الدليل كاملاً وأجب بناءً على المعلومات الموجودة فيه فقط.`;

        console.log('Sending request to DeepSeek API...');
        console.log('API Key exists:', !!process.env.DEEPSEEK_API_KEY);
        console.log('API Key length:', process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.length : 0);
        
        // Remove timeout to allow unlimited processing time
        // const controller = new AbortController();
        // const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
        
        // Check if API key exists
        if (!process.env.DEEPSEEK_API_KEY) {
            console.error('DeepSeek API key is not configured');
            throw new Error('DeepSeek API key is not configured');
        }
        
        console.log('API Key first 10 chars:', process.env.DEEPSEEK_API_KEY.substring(0, 10));

        const requestBody = {
            model: 'deepseek-chat',
            messages: [
                { role: "system", content: systemMessage },
                ...conversationHistory,
                { role: "user", content: message }
            ],
            max_tokens: 100000,
            temperature: 0.3
        };

        console.log('Request body size:', JSON.stringify(requestBody).length);
        console.log('Messages count:', requestBody.messages.length);
        console.log('Max tokens:', requestBody.max_tokens);
        console.log('Temperature:', requestBody.temperature);

        try {
            console.log('Making request to DeepSeek API...');
            const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('DeepSeek API response status:', deepseekResponse.status);
            
            if (!deepseekResponse.ok) {
                let errorText;
                try {
                    errorText = await deepseekResponse.text();
                } catch (e) {
                    errorText = 'Unable to read error response';
                }
                console.error('DeepSeek API error response:', errorText);
                console.error('Response status:', deepseekResponse.status);
                console.error('Response headers:', deepseekResponse.headers);
                throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorText}`);
            }
            
            const data = await deepseekResponse.json();
            console.log('DeepSeek API response data:', JSON.stringify(data, null, 2));
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                res.status(200).json({
                    response: data.choices[0].message.content,
                    model: 'deepseek-chat'
                });
            } else {
                console.error('Invalid response structure:', data);
                throw new Error('استجابة غير صحيحة من DeepSeek API');
            }
        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            console.error('Fetch error name:', fetchError.name);
            console.error('Fetch error message:', fetchError.message);
            console.error('Fetch error stack:', fetchError.stack);
            throw fetchError;
        }
        
    } catch (error) {
        console.error('DeepSeek Error:', error);
        console.error('Error stack:', error.stack);
        
        let errorMessage = 'خطأ في معالجة الطلب';
        if (error.message.includes('DeepSeek API key is not configured')) {
            errorMessage = 'خطأ في إعدادات API، يرجى التحقق من الإعدادات';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'خطأ في الشبكة، يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('API') || error.message.includes('DeepSeek')) {
            errorMessage = 'خطأ في API، يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'خطأ في معالجة البيانات، يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('401')) {
            errorMessage = 'خطأ في API Key، يرجى التحقق من الإعدادات';
        } else if (error.message.includes('429')) {
            errorMessage = 'تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً';
        } else if (error.message.includes('500')) {
            errorMessage = 'خطأ في الخادم، يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('413')) {
            errorMessage = 'الطلب كبير جداً، يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('400')) {
            errorMessage = 'خطأ في البيانات المرسلة، يرجى المحاولة مرة أخرى';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.message 
        });
    }
}
