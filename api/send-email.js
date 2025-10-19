// This is a Vercel Serverless Function for sending emails
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            const { name, email, phone, message, lastQuestion, lastAnswer } = req.body;
            
            console.log('📧 Received email request:', { name, email, phone, message });

            // إعداد البريد الإلكتروني
            const transporter = nodemailer.createTransporter({
                host: 'pro.turbo-smtp.com',
                port: 465,
                secure: true, // استخدام SSL
                auth: {
                    user: 'no-reply@ezmart.app',
                    pass: 'BUjAWNFd'
                }
            });

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

            // إرسال البريد الإلكتروني
            const info = await transporter.sendMail(mailOptions);
            
            console.log('✅ Email sent successfully:', info.messageId);
            
            res.status(200).json({ 
                success: true, 
                message: 'تم إرسال البريد الإلكتروني بنجاح',
                messageId: info.messageId 
            });

        } catch (error) {
            console.error('❌ Error sending email:', error);
            res.status(500).json({ 
                success: false, 
                error: 'فشل في إرسال البريد الإلكتروني: ' + error.message 
            });
        }
    } else {
        res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }
};
