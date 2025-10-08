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
                console.log('Guide contains "إضافة دولة جديدة":', guideContent.includes('إضافة دولة جديدة'));
                console.log('Guide contains "إضافة حي جديد":', guideContent.includes('إضافة حي جديد'));
                console.log('Guide contains "قيد يومية":', guideContent.includes('قيد يومية'));
                console.log('Guide contains "المحاسبة":', guideContent.includes('المحاسبة'));
                console.log('Guide contains "المعاملات":', guideContent.includes('المعاملات'));
                
                // Check if guide content is being truncated
                if (guideContent.length < 100000) {
                    console.log('WARNING: Guide content seems too short, might be truncated');
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
        const systemMessage = `أنت مساعد خبير لنظام witsUP. مهمتك هي الإجابة على أسئلة المستخدمين بناءً على الدليل الشامل المرفق.

قواعد مهمة:
1. اقرأ الدليل كاملاً بعناية - المعلومات موجودة في الدليل
2. استخدم الهيكل الشجري في بداية الدليل لتحديد طريق الوصول الصحيح
3. استخدم المعلومات من الدليل فقط - لا تخترع معلومات
4. إذا لم تجد المعلومات في الدليل، قل "هذه المعلومة غير متوفرة في الدليل"
5. كن دقيقاً في الإرشادات واذكر الأقسام بالضبط
6. لا تخترع معلومات غير موجودة في الدليل
7. اقرأ الدليل كاملاً بعناية - المعلومات موجودة في الدليل

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

تذكر: اقرأ الدليل كاملاً بعناية. المعلومات موجودة في الدليل. استخدم الدليل أعلاه فقط للإجابة.`;

        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: "system", content: systemMessage },
                    ...conversationHistory,
                    { role: "user", content: message }
                ],
                max_tokens: 3000,
                temperature: 0.3
            }),
            timeout: 60000 // 60 seconds timeout
        });
        
        const data = await deepseekResponse.json();
        
        if (deepseekResponse.ok) {
            res.status(200).json({
                response: data.choices[0].message.content,
                model: 'deepseek-chat'
            });
        } else {
            throw new Error(data.error?.message || 'خطأ في DeepSeek');
        }
        
    } catch (error) {
        console.error('DeepSeek Error:', error);
        res.status(500).json({ 
            error: 'خطأ في معالجة الطلب',
            details: error.message
        });
    }
}
