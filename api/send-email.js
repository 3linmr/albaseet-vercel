// This is a Vercel Serverless Function for sending emails
import { Resend } from 'resend';

export default async function handler(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (req.method === 'POST') {
        try {
            const { name, email, phone, message, lastQuestion, lastAnswer } = req.body;
            
            // التحقق من البيانات المطلوبة
            if (!name || !email || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: name, email, message'
                });
            }
            
            console.log('📧 Received email request:', { name, email, phone, message });

            // إعداد Resend
            const apiKey = process.env.RESEND_API_KEY;
            
            console.log('🔑 Checking API Key...');
            console.log('API Key exists:', !!apiKey);
            console.log('API Key starts with re_:', apiKey?.startsWith('re_'));
            
            if (!apiKey) {
                console.error('❌ RESEND_API_KEY not found in environment variables');
                return res.status(500).json({
                    success: false,
                    error: 'RESEND_API_KEY not configured'
                });
            }
            
            if (!apiKey.startsWith('re_')) {
                console.error('❌ Invalid Resend API Key format');
                return res.status(500).json({
                    success: false,
                    error: 'Invalid Resend API Key format'
                });
            }
            
            const resend = new Resend(apiKey);
            console.log('✅ Resend initialized with API Key:', apiKey.substring(0, 10) + '...');

            // محتوى البريد الإلكتروني
            const emailContent = `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50; text-align: center;">🎫 تذكرة دعم فني جديدة</h2>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #495057; margin-top: 0;">📋 تفاصيل العميل</h3>
                        <p><strong>الاسم:</strong> ${name}</p>
                        <p><strong>البريد الإلكتروني:</strong> ${email}</p>
                        <p><strong>رقم الهاتف:</strong> ${phone}</p>
                    </div>
                    
                    <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1976d2; margin-top: 0;">💬 رسالة العميل</h3>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    
                    ${lastQuestion && lastAnswer ? `
                    <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #7b1fa2; margin-top: 0;">🤖 آخر محادثة مع المساعد</h3>
                        <p><strong>السؤال:</strong> ${lastQuestion}</p>
                        <p><strong>الإجابة:</strong> ${lastAnswer}</p>
                    </div>
                    ` : ''}
                    
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0; color: #2e7d32;"><strong>⏰ وقت الإرسال:</strong> ${new Date().toLocaleString('ar-SA')}</p>
                        <p style="margin: 5px 0 0 0; color: #2e7d32;"><strong>🔗 المصدر:</strong> witsUP Assistant</p>
                    </div>
                </div>
            `;

            // إرسال البريد الإلكتروني باستخدام Resend
            const emailData = {
                from: 'onboarding@resend.dev',
                to: email,
                subject: `🎫 تذكرة دعم فني جديدة - ${name}`,
                html: emailContent
            };

            console.log('📤 Sending email via Resend:', emailData);

            try {
                console.log('📤 Attempting to send email via Resend...');
                const result = await resend.emails.send(emailData);
                
                console.log('✅ Email sent successfully:', result);
                console.log('📧 Email details:', {
                    to: email,
                    subject: emailData.subject,
                    id: result.id
                });
                
                res.status(200).json({ 
                    success: true, 
                    message: 'تم إرسال البريد الإلكتروني بنجاح',
                    emailId: result.id,
                    to: email
                });
            } catch (resendError) {
                console.error('❌ Resend API Error:', resendError);
                console.error('Resend Error details:', {
                    message: resendError.message,
                    name: resendError.name,
                    status: resendError.status,
                    response: resendError.response,
                    stack: resendError.stack
                });
                
                // معالجة أخطاء Resend المختلفة
                let errorMessage = 'فشل في إرسال البريد الإلكتروني';
                if (resendError.message) {
                    errorMessage += ': ' + resendError.message;
                }
                
                res.status(500).json({
                    success: false,
                    error: errorMessage,
                    details: resendError.message,
                    code: resendError.name || 'RESEND_ERROR'
                });
                return;
            }

        } catch (error) {
            console.error('❌ Error sending email:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                response: error.response,
                stack: error.stack
            });
            
            res.status(500).json({ 
                success: false, 
                error: 'فشل في إرسال البريد الإلكتروني',
                details: error.message,
                code: error.code || 'UNKNOWN_ERROR'
            });
        }
        } else {
            res.status(405).json({ success: false, error: 'Method Not Allowed' });
        }
    } catch (outerError) {
        console.error('❌ Outer error in send-email handler:', outerError);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: outerError.message
        });
    }
};
