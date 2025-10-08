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
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'الرسالة مطلوبة' });
        }

        // قراءة الدليل
        let guideContent = '';
        try {
            const fs = await import('fs');
            const path = await import('path');
            const guidePath = path.join(process.cwd(), 'دليل_المستخدم_الشامل_الثاني_الأصلي.md');
            if (fs.existsSync(guidePath)) {
                guideContent = fs.readFileSync(guidePath, 'utf8');
            }
        } catch (error) {
            console.error('Error reading guide:', error);
        }

        // رسالة النظام مع الدليل
        const systemMessage = `هذا المساعد موجَّه لمستخدمي witsUP باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`;

        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            })
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
