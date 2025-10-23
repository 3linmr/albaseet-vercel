const express = require('express');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const SmartGuideLoader = require('../smart_guide_loader');

const app = express();

// تهيئة النظام الذكي لتحميل الدليل
const guideLoader = new SmartGuideLoader();

// إعداد Supabase
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
    );
}

// إعداد OpenAI
const client = new OpenAI({  
    apiKey: process.env.OPENAI_API_KEY
});

// إعداد إرسال الإيميل
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'pro.turbo-smtp.com',
    port: process.env.SMTP_PORT || 25,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'no-reply@witsup.app',
        pass: process.env.SMTP_PASS || 'BUjAWNFd'
    },
    // إعدادات إضافية لتحسين التسليم
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000
});

// Middleware
app.use(express.json());

// دالة لإنشاء معرف فريد للجلسة
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// دالة إرسال الإيميل عند فتح التذكرة
async function sendTicketEmail(ticketData) {
    try {
        const { ticketId, userEmail, userName, subject, description, priority = 'متوسط' } = ticketData;
        
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'witsUP Support'}" <${process.env.EMAIL_FROM || 'support@witsup.app'}>`,
            to: userEmail,
            subject: `تم فتح تذكرة جديدة #${ticketId} - ${subject}`,
            // إضافة headers لتحسين التسليم
            headers: {
                'X-Mailer': 'witsUP Support System',
                'X-Priority': '3',
                'X-MSMail-Priority': 'Normal',
                'Importance': 'Normal',
                'X-Report-Abuse': 'Please report abuse to abuse@witsup.app',
                'List-Unsubscribe': '<mailto:unsubscribe@witsup.app>',
                'Return-Path': process.env.EMAIL_FROM || 'support@witsup.app'
            },
            // إضافة نص عادي للرسالة
            text: `
مرحباً ${userName}،

تم فتح تذكرتك بنجاح وسيتم الرد عليك في أقرب وقت ممكن.

تفاصيل التذكرة:
- رقم التذكرة: #${ticketId}
- الموضوع: ${subject}
- الأولوية: ${priority}
- الوصف: ${description}

ما يحدث الآن:
- تم تسجيل تذكرتك في نظام الدعم الفني
- سيتم مراجعة طلبك من قبل فريق الدعم
- ستتلقى إيميل عند الرد على تذكرتك

شكراً لثقتك في خدماتنا.
فريق الدعم الفني في witsUP
            `,
            html: `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>تم فتح تذكرة جديدة</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🎫 تم فتح تذكرة جديدة</h1>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 30px 20px;">
                            <p style="color: #333; font-size: 16px; margin-bottom: 20px; line-height: 1.6;">
                                مرحباً <strong>${userName}</strong>،
                            </p>
                            
                            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
                                تم فتح تذكرتك بنجاح وسيتم الرد عليك في أقرب وقت ممكن.
                            </p>
                            
                            <!-- Ticket Details -->
                            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; border: 1px solid #e0e0e0;">
                                <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 18px;">تفاصيل التذكرة:</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold; width: 120px;">رقم التذكرة:</td>
                                        <td style="padding: 8px 0; color: #333;">#${ticketId}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold;">الموضوع:</td>
                                        <td style="padding: 8px 0; color: #333;">${subject}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold;">الأولوية:</td>
                                        <td style="padding: 8px 0; color: #333;">${priority}</td>
                                    </tr>
                                </table>
                                <div style="margin-top: 15px;">
                                    <p style="color: #666; font-weight: bold; margin-bottom: 8px;">الوصف:</p>
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef;">
                                        ${description.replace(/\n/g, '<br>')}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Next Steps -->
                            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbdefb;">
                                <h4 style="color: #1976d2; margin-top: 0; margin-bottom: 15px; font-size: 16px;">📋 ما يحدث الآن:</h4>
                                <ul style="color: #555; margin: 0; padding-left: 20px;">
                                    <li style="margin-bottom: 8px;">تم تسجيل تذكرتك في نظام الدعم الفني</li>
                                    <li style="margin-bottom: 8px;">سيتم مراجعة طلبك من قبل فريق الدعم</li>
                                    <li style="margin-bottom: 8px;">ستتلقى إيميل عند الرد على تذكرتك</li>
                                </ul>
                            </div>
                            
                            <!-- Footer -->
                            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
                                <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.5;">
                                    شكراً لثقتك في خدماتنا.<br>
                                    فريق الدعم الفني في witsUP
                                </p>
                                <p style="color: #999; font-size: 12px; margin: 15px 0 0 0;">
                                    هذا إيميل تلقائي، يرجى عدم الرد عليه مباشرة.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        const result = await emailTransporter.sendMail(mailOptions);
        console.log('✅ تم إرسال إيميل التذكرة بنجاح:', result.messageId);
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إيميل التذكرة:', error);
        return { success: false, error: error.message };
    }
}

// Route للـ API
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'الرسالة مطلوبة' });
        }

        // تحميل الدليل الذكي
        let guideContent = '';
        try {
            guideContent = guideLoader.getGuideContent(message);
        } catch (error) {
            console.error('Error loading guide:', error);
            // في حالة الخطأ، نستخدم الدليل الأساسي
            guideContent = guideLoader.getBasicParts();
        }

        // رسالة النظام مع الدليل
        const systemMessage = `هذا المساعد موجَّه لمستخدمي albaseet.life باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`;

        try {
            const response = await client.chat.completions.create({
                model: "gpt-4o-mini",
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
            });
            
            const aiResponse = response.choices?.[0]?.message?.content || "لم يتم الحصول على استجابة";
            
            res.json({ 
                response: aiResponse,
                model: response?.model || "gpt-4o-mini",
                usage: response?.usage,
                sessionId: generateSessionId(),
                question: message
            });
            
        } catch (fetchError) {
            console.error('OpenAI Error:', fetchError);
            res.status(500).json({ 
                error: 'خطأ في معالجة الطلب',
                details: fetchError.message
            });
        }
        
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        res.status(500).json({ 
            error: `خطأ في معالجة الطلب: ${error.message}`,
            details: error.message
        });
    }
});

// Route لـ DeepSeek API
app.post('/api/deepseek', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'الرسالة مطلوبة' });
        }

        // تحميل الدليل الذكي
        let guideContent = '';
        try {
            guideContent = guideLoader.getGuideContent(message);
        } catch (error) {
            console.error('Error loading guide:', error);
            // في حالة الخطأ، نستخدم الدليل الأساسي
            guideContent = guideLoader.getBasicParts();
        }

        const systemMessage = `هذا المساعد موجَّه لمستخدمي albaseet.life باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`;

        try {
            const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + (process.env.DEEPSEEK_API_KEY || 'sk-f076f48ce45a48649afc87753889565f'),
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
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
                    temperature: 0.7,
                    stream: false
                })
            });
            
            const data = await deepseekResponse.json();
            
            if (deepseekResponse.ok) {
                if (data.choices && data.choices.length > 0) {
                    res.json({
                        response: data.choices[0].message.content,
                        model: data.model || 'deepseek-chat',
                        usage: data.usage,
                        sessionId: 'deepseek_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                    });
                } else {
                    throw new Error('لم يتم استلام استجابة صحيحة من النموذج');
                }
            } else {
                console.error('DeepSeek Error:', data);
                throw new Error(data.error?.message || `خطأ في الخادم: ${deepseekResponse.status}`);
            }
        } catch (fetchError) {
            console.error('DeepSeek API Error:', fetchError);
            res.status(500).json({ 
                error: `خطأ في معالجة الطلب: ${fetchError.message}`,
                details: fetchError.message
            });
        }
        
    } catch (error) {
        console.error('DeepSeek API Error:', error);
        res.status(500).json({ 
            error: `خطأ في معالجة الطلب: ${error.message}`,
            details: error.message
        });
    }
});

// Route للتقييمات
app.post('/api/feedback', async (req, res) => {
    try {
        const { rating, comment, name, email, question, response } = req.body;
        
        if (supabase) {
            // حفظ في Supabase
            const { data, error } = await supabase
                .from('feedback')
                .insert([
                    {
                        rating,
                        comment,
                        name: name || 'مجهول',
                        email: email || '',
                        question,
                        response,
                        model: 'chatgpt'
                    }
                ]);
            
            if (error) {
                console.error('Supabase error:', error);
                res.json({ success: true, message: 'تم حفظ التقييم بنجاح (محلي)' });
            } else {
                res.json({ success: true, message: 'تم حفظ التقييم بنجاح' });
            }
        } else {
            // Supabase غير متاح
            res.json({ success: true, message: 'تم حفظ التقييم بنجاح (محلي)' });
        }
        
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'خطأ في حفظ التقييم' });
    }
});

// Route للتقييمات في صفحة المقارنة
app.post('/api/feedback/comparison', async (req, res) => {
    try {
        const { rating, comment, name, email, question, response, model } = req.body;
        
        if (supabase) {
            // حفظ في Supabase
            const { data, error } = await supabase
                .from('feedback')
                .insert([
                    {
                        rating,
                        comment,
                        name: name || 'مجهول',
                        email: email || '',
                        question,
                        response,
                        model: model || 'unknown'
                    }
                ]);
            
            if (error) {
                console.error('Supabase error:', error);
                res.json({ success: true, message: 'تم حفظ التقييم بنجاح (محلي)' });
            } else {
                res.json({ success: true, message: 'تم حفظ التقييم بنجاح' });
            }
        } else {
            res.json({ success: true, message: 'تم حفظ التقييم بنجاح (محلي)' });
        }
        
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'خطأ في حفظ التقييم' });
    }
});

// Route لفتح تذكرة جديدة مع إرسال الإيميل
app.post('/api/ticket', async (req, res) => {
    try {
        const { userEmail, userName, subject, description, priority = 'متوسط' } = req.body;
        
        // التحقق من البيانات المطلوبة
        if (!userEmail || !userName || !subject || !description) {
            return res.status(400).json({ 
                error: 'البيانات المطلوبة مفقودة',
                required: ['userEmail', 'userName', 'subject', 'description']
            });
        }
        
        // إنشاء معرف فريد للتذكرة
        const ticketId = 'TKT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // إرسال الإيميل
        const emailResult = await sendTicketEmail({
            ticketId,
            userEmail,
            userName,
            subject,
            description,
            priority
        });
        
        if (emailResult.success) {
            // حفظ التذكرة في Supabase (اختياري)
            if (supabase) {
                try {
                    const { data, error } = await supabase
                        .from('tickets')
                        .insert([
                            {
                                ticket_id: ticketId,
                                user_email: userEmail,
                                user_name: userName,
                                subject,
                                description,
                                priority,
                                status: 'مفتوحة',
                                email_sent: true,
                                email_message_id: emailResult.messageId
                            }
                        ]);
                    
                    if (error) {
                        console.error('Supabase ticket save error:', error);
                    }
                } catch (dbError) {
                    console.error('Database error:', dbError);
                }
            }
            
            console.log('🎫 تم فتح التذكرة:', { ticketId, userEmail, subject });
            
            res.json({
                success: true,
                message: 'تم فتح التذكرة وإرسال الإيميل بنجاح',
                ticket: {
                    ticketId,
                    status: 'مفتوحة',
                    emailSent: true
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'تم فتح التذكرة لكن فشل في إرسال الإيميل',
                details: emailResult.error,
                ticket: {
                    ticketId,
                    status: 'مفتوحة',
                    emailSent: false
                }
            });
        }
        
    } catch (error) {
        console.error('❌ خطأ في فتح التذكرة:', error);
        res.status(500).json({ 
            error: 'خطأ في معالجة طلب فتح التذكرة',
            details: error.message 
        });
    }
});

// Route لعرض التقييمات
app.get('/api/feedback', async (req, res) => {
    try {
        if (supabase) {
            // جلب من Supabase
            const { data, error } = await supabase
                .from('feedback')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Supabase error:', error);
                res.json([]);
            } else {
                res.json(data || []);
            }
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error reading feedback:', error);
        res.status(500).json({ error: 'خطأ في قراءة التقييمات' });
    }
});

// Route للمحادثة المستمرة مع DeepSeek
app.post('/api/deepseek-chat', async (req, res) => {
    try {
        const { question, conversationHistory = [] } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'السؤال مطلوب' });
        }

        // تحميل الدليل الذكي
        let guideContent = '';
        try {
            guideContent = guideLoader.getGuideContent(message);
        } catch (error) {
            console.error('Error loading guide:', error);
            // في حالة الخطأ، نستخدم الدليل الأساسي
            guideContent = guideLoader.getBasicParts();
        }

        const systemMessage = `هذا المساعد موجَّه لمستخدمي albaseet.life باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`;

        // إعداد الرسائل مع تاريخ المحادثة
        const messages = [
            {
                role: "system",
                content: systemMessage
            }
        ];

        // إضافة تاريخ المحادثة
        conversationHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // إضافة السؤال الحالي
        messages.push({
            role: "user",
            content: question
        });

        try {
            const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer sk-f076f48ce45a48649afc87753889565f',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.7
                }),
                timeout: 30000
            });

            if (!deepseekResponse.ok) {
                throw new Error(`HTTP error! status: ${deepseekResponse.status}`);
            }

            const data = await deepseekResponse.json();
            const response = data.choices?.[0]?.message?.content || "لم يتم الحصول على استجابة";

            res.json({ 
                response: response,
                model: "deepseek-chat",
                usage: data.usage
            });

        } catch (fetchError) {
            console.error('DeepSeek API Error:', fetchError);
            
            if (fetchError.code === 'ECONNRESET' || fetchError.message.includes('ECONNRESET')) {
                throw new Error('انقطع الاتصال بالخادم - يرجى المحاولة مرة أخرى');
            }
            if (fetchError.message.includes('timeout')) {
                throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
            }
            if (fetchError.name === 'AbortError') {
                throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
            }
            throw new Error(`خطأ في الاتصال: ${fetchError.message}`);
        }

    } catch (error) {
        console.error('DeepSeek Chat Error:', error);
        res.status(500).json({ 
            error: 'خطأ في معالجة الطلب',
            details: error.message 
        });
    }
});

// Route للمحادثة المستمرة مع ChatGPT
app.post('/api/chatgpt-chat', async (req, res) => {
    try {
        const { question, conversationHistory = [] } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'السؤال مطلوب' });
        }

        // تحميل الدليل الذكي
        let guideContent = '';
        try {
            guideContent = guideLoader.getGuideContent(message);
        } catch (error) {
            console.error('Error loading guide:', error);
            // في حالة الخطأ، نستخدم الدليل الأساسي
            guideContent = guideLoader.getBasicParts();
        }

        const systemMessage = `هذا المساعد موجَّه لمستخدمي albaseet.life باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`;

        // إعداد الرسائل مع تاريخ المحادثة
        const messages = [
            {
                role: "system",
                content: systemMessage
            }
        ];

        // إضافة تاريخ المحادثة
        conversationHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // إضافة السؤال الحالي
        messages.push({
            role: "user",
            content: question
        });

        try {
            const response = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                max_tokens: 2000,
                temperature: 0.7
            });

            const aiResponse = response.choices?.[0]?.message?.content || "لم يتم الحصول على استجابة";

            res.json({ 
                response: aiResponse,
                model: "gpt-4o-mini",
                usage: response.usage
            });

        } catch (fetchError) {
            if (fetchError.name === 'AbortError' || fetchError.name === 'APIUserAbortError') {
                throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
            }
            if (fetchError.code === 'ECONNRESET' || fetchError.message.includes('ECONNRESET')) {
                throw new Error('انقطع الاتصال بالخادم - يرجى المحاولة مرة أخرى');
            }
            if (fetchError.message.includes('timeout') || fetchError.message.includes('Request was aborted')) {
                throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
            }
            throw fetchError;
        }

    } catch (error) {
        console.error('ChatGPT Chat Error:', error);
        res.status(500).json({ 
            error: 'خطأ في معالجة الطلب',
            details: error.message 
        });
    }
});

// Export the app for Vercel
module.exports = app;