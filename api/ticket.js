import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// إعداد Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    // Set timeout for Vercel
    res.setTimeout(30000); // 30 seconds
    
    console.log('Ticket API called with method:', req.method);
    console.log('Environment variables:', {
        SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set'
    });
    
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
        console.log('Request body:', req.body);
        const { name, email, phone, message, lastQuestion, lastAnswer } = req.body;
        
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'جميع الحقول مطلوبة' 
            });
        }

        // إنشاء رقم التذكرة
        const ticketNumber = 'TKT-' + Date.now().toString().slice(-6);
        
        // حفظ التذكرة في قاعدة البيانات
        console.log('Inserting ticket:', { ticketNumber, name, email, phone, message, lastQuestion, lastAnswer });
        
        const { data, error } = await supabase
            .from('tickets')
            .insert([
                {
                    ticket_number: ticketNumber,
                    name: name,
                    email: email,
                    phone: phone,
                    message: message,
                    last_question: lastQuestion || null,
                    last_answer: lastAnswer || null,
                    status: 'open',
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ 
                success: false, 
                error: `خطأ في حفظ التذكرة: ${error.message}`,
                details: error
            });
        }

        console.log('Ticket inserted successfully:', data);

        // إرسال إيميل تأكيد
        try {
            await sendConfirmationEmail(email, ticketNumber, name, lastQuestion, lastAnswer);
            console.log('Email sent successfully to:', email);
        } catch (emailError) {
            console.error('Email error:', emailError);
            // لا نوقف العملية إذا فشل الإيميل
        }

        res.status(200).json({ 
            success: true, 
            ticketNumber: ticketNumber,
            message: 'تم إرسال التذكرة بنجاح'
        });
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في معالجة الطلب' 
        });
    }
}

// دالة إرسال إيميل التأكيد
async function sendConfirmationEmail(email, ticketNumber, name, lastQuestion, lastAnswer) {
    try {
        // إعداد nodemailer مع Turbo SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'pro.turbo-smtp.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'no-reply@witsup.app',
                pass: process.env.SMTP_PASS || 'BUjAWNFd'
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: {
                name: 'witsUP Support',
                address: process.env.SMTP_USER || 'no-reply@witsup.app'
            },
            to: email,
            subject: `تأكيد فتح التذكرة #${ticketNumber} - witsUP`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">🎫 تم فتح تذكرة الدعم بنجاح</h1>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
                        <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
                            مرحباً <strong>${name}</strong>،
                        </p>
                        
                        <p style="color: #555; line-height: 1.6;">
                            تم استلام طلب الدعم الخاص بك وسنرد عليك في أقرب وقت ممكن.
                        </p>
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;">
                            <h3 style="color: #333; margin-top: 0;">تفاصيل التذكرة:</h3>
                            <p><strong>رقم التذكرة:</strong> #${ticketNumber}</p>
                            <p><strong>الحالة:</strong> مفتوحة</p>
                            <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-SA')}</p>
                        </div>
                        
                        ${lastQuestion && lastAnswer ? `
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #1976d2;">
                            <h3 style="color: #1976d2; margin-top: 0;">آخر سؤال وجواب:</h3>
                            <p><strong>السؤال:</strong> ${lastQuestion}</p>
                            <p><strong>الإجابة:</strong> ${lastAnswer}</p>
                        </div>
                        ` : ''}
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h4 style="color: #1976d2; margin-top: 0;">📋 ما يحدث الآن:</h4>
                            <ul style="color: #555; margin: 0;">
                                <li>تم تسجيل تذكرتك في نظام الدعم الفني</li>
                                <li>سيتم مراجعة طلبك من قبل فريق الدعم</li>
                                <li>ستتلقى إيميل عند الرد على تذكرتك</li>
                            </ul>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666666;">
                            <p>هذه رسالة آلية من خدمة عملاء witsUP</p>
                            <p>رقم التذكرة: ${ticketNumber}</p>
                            <p>فريق الدعم الفني في witsUP</p>
                            <p>للحصول على الدعم: support@witsup.app</p>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 20px;">
                            شكراً لثقتك في خدماتنا. فريق الدعم الفني في witsUP
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
}
