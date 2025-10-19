// This is a Vercel Serverless Function for sending emails
import nodemailer from 'nodemailer';

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

            // إعداد nodemailer مع إعدادات محسنة لـ Vercel
            const transporter = nodemailer.createTransport({
                host: 'pro.turbo-smtp.com',
                port: 587,
                secure: false,
                auth: {
                    user: 'no-reply@ezmart.app',
                    pass: 'BUjAWNFd'
                },
                tls: {
                    rejectUnauthorized: false
                },
                connectionTimeout: 30000,
                greetingTimeout: 30000,
                socketTimeout: 30000
            });

            console.log('✅ Nodemailer transporter created');

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

            // إعداد البريد الإلكتروني
            const mailOptions = {
                from: {
                    name: 'EZMart - witsUP Assistant',
                    address: 'no-reply@ezmart.app'
                },
                to: email,
                subject: `🎫 تذكرة دعم فني جديدة - ${name}`,
                html: emailContent,
                replyTo: 'support@ezmart.app'
            };

            console.log('📤 Sending email via nodemailer:', mailOptions);

            try {
                console.log('📤 Attempting to send email via nodemailer...');
                const info = await transporter.sendMail(mailOptions);
                
                console.log('✅ Email sent successfully:', info.messageId);
                console.log('📧 Email details:', {
                    to: email,
                    subject: mailOptions.subject,
                    messageId: info.messageId
                });
                
                res.status(200).json({ 
                    success: true, 
                    message: 'تم إرسال البريد الإلكتروني بنجاح',
                    emailId: info.messageId,
                    to: email
                });
            } catch (nodemailerError) {
                console.error('❌ Nodemailer Error:', nodemailerError);
                console.error('Nodemailer Error details:', {
                    message: nodemailerError.message,
                    code: nodemailerError.code,
                    response: nodemailerError.response,
                    stack: nodemailerError.stack
                });
                
                // معالجة أخطاء nodemailer المختلفة
                let errorMessage = 'فشل في إرسال البريد الإلكتروني';
                if (nodemailerError.message) {
                    errorMessage += ': ' + nodemailerError.message;
                }
                
                res.status(500).json({
                    success: false,
                    error: errorMessage,
                    details: nodemailerError.message,
                    code: nodemailerError.code || 'NODEMAILER_ERROR'
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
