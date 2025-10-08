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

        // إرسال إيميل تأكيد (مؤقتاً معطل)
        console.log('Ticket created successfully:', ticketNumber);

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

// دالة إرسال إيميل التأكيد (مؤقتاً معطل)
async function sendConfirmationEmail(email, ticketNumber, name) {
    console.log('Email would be sent to:', email, 'for ticket:', ticketNumber);
    // TODO: إضافة خدمة إرسال إيميل لاحقاً
}
