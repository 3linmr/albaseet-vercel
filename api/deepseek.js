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

               // قراءة الدليل من الملف مع تقسيم ذكي
               let guideContent = '';
               try {
                   const fs = await import('fs');
                   const path = await import('path');
                   const guidePath = path.join(process.cwd(), 'دليل_المستخدم_الشامل_الثاني_الأصلي.md');
                   
                   console.log('Reading guide from file:', guidePath);
                   
                   if (fs.existsSync(guidePath)) {
                       const fullGuide = fs.readFileSync(guidePath, 'utf8');
                       console.log('Full guide loaded, length:', fullGuide.length);
                       
                       // Extract relevant section based on question
                       const question = message.toLowerCase();
                       
                       if (question.includes('سند') || question.includes('قبض') || question.includes('صرف')) {
                           // Extract accounting section
                           const accountingStart = fullGuide.indexOf('## قيد يومية');
                           const accountingEnd = fullGuide.indexOf('## ', accountingStart + 1);
                           if (accountingStart > 0) {
                               guideContent = fullGuide.substring(accountingStart, accountingEnd > 0 ? accountingEnd : accountingStart + 15000);
                               console.log('Using accounting section, length:', guideContent.length);
                           } else {
                               guideContent = fullGuide.substring(0, 15000);
                               console.log('Using first 15000 chars, length:', guideContent.length);
                           }
                       } else if (question.includes('فاتورة') || question.includes('بيع')) {
                           // Extract sales section
                           const salesStart = fullGuide.indexOf('## فاتورة بيع');
                           const salesEnd = fullGuide.indexOf('## ', salesStart + 1);
                           if (salesStart > 0) {
                               guideContent = fullGuide.substring(salesStart, salesEnd > 0 ? salesEnd : salesStart + 15000);
                               console.log('Using sales section, length:', guideContent.length);
                           } else {
                               guideContent = fullGuide.substring(0, 15000);
                               console.log('Using first 15000 chars, length:', guideContent.length);
                           }
                       } else {
                           // Use tree structure for general questions
                           const treeEnd = fullGuide.indexOf('──────────────────────────────────────────────────');
                           if (treeEnd > 0 && treeEnd < 20000) {
                               guideContent = fullGuide.substring(0, treeEnd);
                               console.log('Using tree structure, length:', guideContent.length);
                           } else {
                               guideContent = fullGuide.substring(0, 15000);
                               console.log('Using first 15000 chars, length:', guideContent.length);
                           }
                       }
                   } else {
                       console.log('Guide file not found at:', guidePath);
                       console.log('Current working directory:', process.cwd());
                       console.log('Files in current directory:', fs.readdirSync(process.cwd()));
                   }
               } catch (error) {
                   console.error('Error reading guide from file:', error);
                   console.error('Error details:', error.message);
               }

        // رسالة النظام مع الدليل - بدون قواعد عامة
        const systemMessage = `أنت مساعد خبير لنظام witsUP. مهمتك هي الإجابة على أسئلة المستخدمين بناءً على الدليل الشامل المرفق.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

تذكر: اقرأ الدليل كاملاً بعناية. المعلومات موجودة في الدليل. استخدم الدليل أعلاه فقط للإجابة.`;

        console.log('Sending request to DeepSeek API...');
        console.log('API Key exists:', !!process.env.DEEPSEEK_API_KEY);
        console.log('API Key length:', process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.length : 0);
        console.log('Guide content length:', guideContent.length);
        console.log('System message length:', systemMessage.length);
        console.log('Guide contains "المحاسبة":', guideContent.includes('المحاسبة'));
        console.log('Guide contains "المعاملات":', guideContent.includes('المعاملات'));
        console.log('Guide contains "سند قبض":', guideContent.includes('سند قبض'));
        console.log('Guide contains "قيد يومية":', guideContent.includes('قيد يومية'));
        
        // Add longer timeout to allow complete processing
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 minutes timeout
        
        // Check if API key exists
        if (!process.env.DEEPSEEK_API_KEY) {
            console.error('DeepSeek API key is not configured');
            throw new Error('DeepSeek API key is not configured');
        }
        
        console.log('API Key first 10 chars:', process.env.DEEPSEEK_API_KEY.substring(0, 10));

               // Use DeepSeek with 100,000 tokens (DeepSeek supports 128K)
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
