import { createClient } from '@supabase/supabase-js';

// إعداد Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
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
        const { name, email, phone, message } = req.body;
        
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'جميع الحقول مطلوبة' 
            });
        }

        // إنشاء رقم التذكرة
        const ticketNumber = 'TKT-' + Date.now().toString().slice(-6);
        
        // حفظ التذكرة في قاعدة البيانات
        console.log('Inserting ticket:', { ticketNumber, name, email, phone, message });
        
        const { data, error } = await supabase
            .from('tickets')
            .insert([
                {
                    ticket_number: ticketNumber,
                    name: name,
                    email: email,
                    phone: phone,
                    message: message,
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
            await sendConfirmationEmail(email, ticketNumber, name);
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
async function sendConfirmationEmail(email, ticketNumber, name) {
    try {
        // استخدام خدمة Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: email,
                subject: `تأكيد فتح التذكرة #${ticketNumber} - witsUP`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
                        <h2 style="color: #28a745; text-align: center;">تم فتح تذكرة الدعم بنجاح</h2>
                        <p>مرحباً ${name},</p>
                        <p>تم استلام طلب الدعم الخاص بك وسنرد عليك في أقرب وقت ممكن.</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-right: 4px solid #28a745;">
                            <h3 style="color: #28a745; margin-top: 0;">تفاصيل التذكرة:</h3>
                            <p><strong>رقم التذكرة:</strong> ${ticketNumber}</p>
                            <p><strong>الحالة:</strong> مفتوحة</p>
                            <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-SA')}</p>
                        </div>
                        
                        <p>سنقوم بالرد على طلبك خلال 24 ساعة.</p>
                        <p style="color: #666; font-size: 14px;">شكراً لاستخدام witsUP!</p>
                    </div>
                `
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Email service error: ${errorData.message || 'Unknown error'}`);
        }

        const result = await response.json();
        console.log('Email sent successfully:', result);
        
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
}
