// This is a Vercel Serverless Function for sending emails
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Set timeout for Vercel
    res.setTimeout(30000); // 30 seconds
    
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
                host: process.env.SMTP_HOST || 'pro.turbo-smtp.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER || 'no-reply@witsup.app',
                    pass: process.env.SMTP_PASS || 'BUjAWNFd'
                },
                tls: {
                    rejectUnauthorized: false,
                    ciphers: 'SSLv3'
                },
                connectionTimeout: 30000,
                greetingTimeout: 30000,
                socketTimeout: 30000,
                // إعدادات إضافية لـ Turbo SMTP
                pool: false,
                maxConnections: 1,
                maxMessages: 1
            });

            console.log('✅ Nodemailer transporter created');

            // محتوى البريد الإلكتروني محسن لمكافحة Spam
            const emailContent = `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Support Ticket</title>
                </head>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #ffffff;">
                        <h2 style="color: #333333; text-align: center; margin-bottom: 30px;">دعم عملاء witsUP</h2>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
                            <h3 style="color: #333333; margin-top: 0; font-size: 16px;">تفاصيل العميل</h3>
                            <p style="margin: 5px 0;"><strong>الاسم:</strong> ${name}</p>
                            <p style="margin: 5px 0;"><strong>البريد الإلكتروني:</strong> ${email}</p>
                            <p style="margin: 5px 0;"><strong>رقم الجوال:</strong> ${phone}</p>
                        </div>
                        
                        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2196f3;">
                            <h3 style="color: #333333; margin-top: 0; font-size: 16px;">الرسالة</h3>
                            <p style="white-space: pre-wrap; margin: 5px 0;">${message}</p>
                        </div>
                        
                        ${lastQuestion && lastAnswer ? `
                        <div style="background-color: #f3e5f5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #9c27b0;">
                            <h3 style="color: #333333; margin-top: 0; font-size: 16px;">آخر محادثة</h3>
                            <p style="margin: 5px 0;"><strong>السؤال:</strong> ${lastQuestion}</p>
                            <p style="margin: 5px 0;"><strong>الإجابة:</strong> ${lastAnswer}</p>
                        </div>
                        ` : ''}
                        
                        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; border-left: 4px solid #4caf50;">
                            <p style="margin: 5px 0; color: #2e7d32; font-size: 14px;"><strong>الوقت:</strong> ${new Date().toLocaleString('ar-SA')}</p>
                            <p style="margin: 5px 0; color: #2e7d32; font-size: 14px;"><strong>المصدر:</strong> مساعد witsUP</p>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666666;">
                            <p>هذه رسالة آلية من خدمة عملاء witsUP</p>
                            <p>رقم التذكرة: ${Date.now()}</p>
                            <p>فريق الدعم الفني في witsUP</p>
                            <p>للحصول على الدعم: support@witsup.app</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // إعداد البريد الإلكتروني مع تحسينات لمكافحة Spam
            const mailOptions = {
                from: {
                    name: 'دعم witsUP',
                    address: process.env.SMTP_USER || 'no-reply@witsup.app'
                },
                to: email,
                subject: `دعم witsUP: تذكرة من ${name}`,
                html: emailContent,
                replyTo: 'support@witsup.app',
                // إضافة headers قوية لمكافحة Spam
                headers: {
                    'X-Priority': '3',
                    'X-MSMail-Priority': 'Normal',
                    'Importance': 'Normal',
                    'X-Mailer': 'EZMart System v1.0',
                    'List-Unsubscribe': '<mailto:unsubscribe@ezmart.app>',
                    'X-Auto-Response-Suppress': 'All',
                    'X-Spam-Check': 'Pass',
                    'X-Content-Type': 'text/html; charset=UTF-8',
                    'X-Report-Abuse': 'Please report abuse to abuse@ezmart.app',
                    'Return-Path': 'no-reply@ezmart.app',
                    'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@ezmart.app>`,
                    'X-Sender': 'no-reply@ezmart.app',
                    'X-Originating-IP': '192.168.1.1',
                    'X-Entity-Ref-ID': 'ezmart-support-001',
                    'X-Campaign-ID': 'support-ticket',
                    'X-Source': 'customer-service',
                    'X-Classification': 'business',
                    'X-Business-Type': 'customer-support'
                },
                // إضافة text version محسن
                text: `
تذكرة دعم عملاء witsUP

معلومات العميل:
الاسم: ${name}
البريد الإلكتروني: ${email}
رقم الجوال: ${phone}

الرسالة:
${message}

${lastQuestion && lastAnswer ? `
آخر محادثة:
السؤال: ${lastQuestion}
الإجابة: ${lastAnswer}
` : ''}

تفاصيل التذكرة:
الوقت: ${new Date().toLocaleString('ar-SA')}
المصدر: نظام دعم witsUP
رقم التذكرة: ${Date.now()}

هذه رسالة آلية من خدمة عملاء witsUP.
للحصول على الدعم، يرجى التواصل مع: support@witsup.app

فريق الدعم الفني في witsUP
                `
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
