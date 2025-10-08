import { createClient } from '@supabase/supabase-js';

// إعداد Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

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
                error: 'خطأ في حفظ التذكرة' 
            });
        }

        // إرسال إيميل تأكيد
        try {
            await sendConfirmationEmail(email, ticketNumber, name);
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
    const emailData = {
        to: email,
        subject: `تأكيد فتح التذكرة #${ticketNumber} - witsUP`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">تم فتح تذكرة الدعم بنجاح</h2>
                <p>مرحباً ${name},</p>
                <p>تم استلام طلب الدعم الخاص بك وسنرد عليك في أقرب وقت ممكن.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3>تفاصيل التذكرة:</h3>
                    <p><strong>رقم التذكرة:</strong> ${ticketNumber}</p>
                    <p><strong>الحالة:</strong> مفتوحة</p>
                    <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-SA')}</p>
                </div>
                
                <p>سنقوم بالرد على طلبك خلال 24 ساعة.</p>
                <p>شكراً لاستخدام witsUP!</p>
            </div>
        `
    };

    // استخدام خدمة إرسال الإيميل (يمكن استخدام SendGrid, Nodemailer, etc.)
    // هنا مثال باستخدام fetch إلى خدمة إرسال إيميل
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_ID,
            user_id: process.env.EMAILJS_USER_ID,
            template_params: {
                to_email: email,
                ticket_number: ticketNumber,
                customer_name: name
            }
        })
    });

    if (!response.ok) {
        throw new Error('Failed to send email');
    }
}
