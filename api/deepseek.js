
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
        console.log('=== DEEPSEEK API CALLED ===');
        console.log('Request method:', req.method);
        console.log('Request body:', req.body);
        
        const { message, conversationHistory = [] } = req.body;
        
        console.log('Message:', message);
        console.log('Conversation history length:', conversationHistory.length);
        
        if (!message) {
            console.log('No message provided');
            return res.status(400).json({ error: 'الرسالة مطلوبة' });
        }

        // استخدام النظام الذكي لتحميل الدليل
        let guideContent = '';
        try {
            const SmartGuideLoader = require('../smart_guide_loader');
            const guideLoader = new SmartGuideLoader();
            
            console.log('Using smart guide loader...');
            guideContent = guideLoader.getGuideContent(message);
            console.log('Smart guide content loaded, length:', guideContent.length);
        } catch (error) {
            console.error('Error loading smart guide:', error);
            // في حالة الخطأ، نستخدم الدليل الأساسي
            guideContent = guideLoader.getBasicParts();
        }

        // التحقق من لغة السؤال
        const isEnglish = /^[a-zA-Z\s.,!?]+$/.test(message.trim());
        
        // رسالة النظام مع الدليل الكامل كما كان في السابق
        let systemMessage = `أنت مساعد خبير لنظام witsUP. مهمتك هي الإجابة على أسئلة المستخدمين بناءً على الدليل الشامل المرفق.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

تذكر: اقرأ الدليل كاملاً بعناية. المعلومات موجودة في الدليل. استخدم الدليل أعلاه فقط للإجابة.

⚠️ تحذير مهم: 
- لا تخترع معلومات غير موجودة في الدليل
- لا تضيف تفاصيل من خارج الدليل
- إذا لم تجد المعلومة في الدليل، قل "هذه المعلومة غير متوفرة في الدليل"
- التزم بالدليل المرفق فقط ولا تلف من عندك
- لا تذكر ميزات أو تقارير غير موجودة في الدليل
- إذا لم تكن متأكداً من معلومة، لا تذكرها

=== تعليمات التنسيق ===
عند الإجابة، يجب أن تنظم النص بشكل واضح ومنظم:

1. استخدم سطر فارغ بين كل فقرة
2. أضف سطر فارغ قبل كل رقم (1. 2. 3.)
3. اجعل كل نقطة في سطر منفصل
4. لا تستخدم رموز markdown مثل * أو # أو **
5. نظم المعلومات في فقرات منفصلة وواضحة

🚨 تذكير مهم:
- اقرأ الدليل بعناية قبل الإجابة
- لا تخترع معلومات غير موجودة
- إذا لم تجد المعلومة، قل "غير متوفرة في الدليل"
- التزم بالدليل فقط ولا تلف من عندك
- لا تذكر ميزات أو تقارير غير موجودة في الدليل`;

        // إضافة تعليمات اللغة
        if (isEnglish) {
            systemMessage += `

=== Language Instructions ===
The user's question is in English. Please respond in English while maintaining the same formatting and accuracy requirements.`;
        }

        console.log('Sending request to DeepSeek API...');
        console.log('API Key exists:', !!process.env.DEEPSEEK_API_KEY);
        console.log('API Key length:', process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.length : 0);
        console.log('Guide content length:', guideContent.length);
        console.log('Is English question:', isEnglish);
        console.log('System message length:', systemMessage.length);
        console.log('Guide contains "المحاسبة":', guideContent.includes('المحاسبة'));
        console.log('Guide contains "المعاملات":', guideContent.includes('المعاملات'));
        console.log('Guide contains "سند قبض":', guideContent.includes('سند قبض'));
        console.log('Guide contains "قيد يومية":', guideContent.includes('قيد يومية'));
        console.log('Guide contains "witsUP":', guideContent.includes('witsUP'));
        console.log('Guide contains "دليل":', guideContent.includes('دليل'));
        console.log('System message contains guide:', systemMessage.includes(guideContent.substring(0, 100)));
        
        // Add longer timeout to allow complete processing
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 minutes timeout
        
        // Check if API key exists
        if (!process.env.DEEPSEEK_API_KEY) {
            console.error('DeepSeek API key is not configured');
            throw new Error('DeepSeek API key is not configured');
        }
        
        console.log('API Key first 10 chars:', process.env.DEEPSEEK_API_KEY.substring(0, 10));

               // Use DeepSeek with full guide content
               const requestBody = {
                   model: 'deepseek-chat',
                   messages: [
                       { role: "system", content: systemMessage },
                       ...conversationHistory,
                       { role: "user", content: message }
                   ],
                   max_tokens: 8192,
                   temperature: 0.3
               };

        console.log('Request body size:', JSON.stringify(requestBody).length);
        console.log('Messages count:', requestBody.messages.length);
        console.log('Max tokens:', requestBody.max_tokens);
        console.log('Temperature:', requestBody.temperature);
        console.log('System message size:', systemMessage.length);
        console.log('Guide content size:', guideContent.length);
        console.log('Request body size in MB:', (JSON.stringify(requestBody).length / 1024 / 1024).toFixed(2));

        try {
            console.log('Making request to DeepSeek API...');
            console.log('Request body size in MB:', (JSON.stringify(requestBody).length / 1024 / 1024).toFixed(2));
            
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('DeepSeek API response status:', response.status);
            
            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = 'Unable to read error response';
                }
                console.error('DeepSeek API error response:', errorText);
                console.error('Response status:', response.status);
                console.error('Response headers:', response.headers);
                throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('DeepSeek API response data:', JSON.stringify(data, null, 2));
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                // تنظيف وتحسين تنسيق الإجابة
                let cleanResponse = data.choices[0].message.content;
                
                // تنظيف بسيط فقط - لا تلاعب بالنص العربي
                cleanResponse = cleanResponse
                    .replace(/\*\*/g, '') // إزالة **
                    .replace(/\*/g, '') // إزالة *
                    .replace(/#{1,6}\s*/g, '') // إزالة # و ## و ###
                    .replace(/```[\s\S]*?```/g, '') // إزالة code blocks
                    .replace(/`[^`]*`/g, ''); // إزالة inline code
                
                res.status(200).json({
                    response: cleanResponse,
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
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage = 'انتهت مهلة الطلب (5 دقائق)، يرجى المحاولة مرة أخرى';
        } else if (error.message.includes('DeepSeek API key is not configured')) {
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
