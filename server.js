const express = require('express');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(express.static(path.join(__dirname)));

// إعداد ملف التقييمات
const feedbackFile = path.join(__dirname, 'feedback_evaluations.json');
const notesTrackingFile = path.join(__dirname, 'notes_tracking.json');

// التأكد من وجود ملف التقييمات
if (!fs.existsSync(feedbackFile)) {
    fs.writeFileSync(feedbackFile, JSON.stringify({ evaluations: [] }, null, 2));
}

// التأكد من وجود ملف تتبع الملاحظات
if (!fs.existsSync(notesTrackingFile)) {
    fs.writeFileSync(notesTrackingFile, JSON.stringify({ 
        trackedNotes: [],
        lastUpdate: new Date().toISOString()
    }, null, 2));
}

// دالة لحفظ التقييم
function saveFeedback(data) {
    try {
        const feedbackData = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
        feedbackData.evaluations.push({
            ...data,
            timestamp: new Date().toISOString()
        });
        fs.writeFileSync(feedbackFile, JSON.stringify(feedbackData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving feedback:', error);
        return false;
    }
}

// دالة لإنشاء معرف فريد للجلسة
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// دالة لحفظ تتبع الملاحظات
function saveNoteTracking(noteId, status, action) {
    try {
        const trackingData = JSON.parse(fs.readFileSync(notesTrackingFile, 'utf8'));
        
        // البحث عن الملاحظة الموجودة
        const existingNote = trackingData.trackedNotes.find(note => note.noteId === noteId);
        
        if (existingNote) {
            // تحديث الملاحظة الموجودة
            existingNote.status = status;
            existingNote.lastAction = action;
            existingNote.lastUpdate = new Date().toISOString();
        } else {
            // إضافة ملاحظة جديدة
            trackingData.trackedNotes.push({
                noteId: noteId,
                status: status,
                lastAction: action,
                firstTracked: new Date().toISOString(),
                lastUpdate: new Date().toISOString()
            });
        }
        
        trackingData.lastUpdate = new Date().toISOString();
        fs.writeFileSync(notesTrackingFile, JSON.stringify(trackingData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving note tracking:', error);
        return false;
    }
}

// دالة لقراءة تتبع الملاحظات
function getNoteTracking() {
    try {
        const trackingData = JSON.parse(fs.readFileSync(notesTrackingFile, 'utf8'));
        return trackingData;
    } catch (error) {
        console.error('Error reading note tracking:', error);
        return { trackedNotes: [], lastUpdate: new Date().toISOString() };
    }
}

// دالة لإنشاء معرف فريد للملاحظة
function generateNoteId(note) {
    return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
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

// دالة للبحث عن الصور المناسبة
function findRelevantImages(message) {
    const messageLower = message.toLowerCase();
    const relevantImages = [];
    
    // قاموس للبحث عن الصور المناسبة
    const imageKeywords = {
        // شاشات الدخول والاختيار
        'دخول': ['001_login_screen.png'],
        'تسجيل': ['001_login_screen.png'],
        'login': ['001_login_screen.png'],
        'نشاط': ['002_activity_selection_screen.png'],
        'activity': ['002_activity_selection_screen.png'],
        'موقع': ['003_location_selection_screen.png'],
        'location': ['003_location_selection_screen.png'],
        
        // المحاسبة
        'محاسبة': ['006_accounting_module.png'],
        'accounting': ['006_accounting_module.png'],
        'معاملات': ['007_transactions_module.png'],
        'transactions': ['007_transactions_module.png'],
        'رصيد': ['010_opening_balance_entry.png'],
        'balance': ['010_opening_balance_entry.png'],
        'سند': ['011_payment_voucher.png', '013_receipt_voucher.png'],
        'voucher': ['011_payment_voucher.png', '013_receipt_voucher.png'],
        'دفع': ['011_payment_voucher.png'],
        'payment': ['011_payment_voucher.png'],
        'قبض': ['013_receipt_voucher.png'],
        'receipt': ['013_receipt_voucher.png'],
        'قيد': ['012_journal_entry.png'],
        'journal': ['012_journal_entry.png'],
        
        // الإعدادات
        'إعدادات': ['018_general_settings.png'],
        'settings': ['018_general_settings.png'],
        'عام': ['018_general_settings.png'],
        'general': ['018_general_settings.png'],
        'مستندات': ['014_document_codes_encoding.png'],
        'document': ['014_document_codes_encoding.png'],
        'مراكز': ['015_cost_centers_encoding_settings.png'],
        'cost': ['015_cost_centers_encoding_settings.png'],
        'دليل': ['016_chart_of_accounts_encoding_settings.png'],
        'accounts': ['016_chart_of_accounts_encoding_settings.png'],
        
        // المبيعات
        'مبيعات': ['017_sales_invoice_settings.png'],
        'sales': ['017_sales_invoice_settings.png'],
        'بيع': ['017_sales_invoice_settings.png'],
        'invoice': ['017_sales_invoice_settings.png'],
        'فاتورة': ['017_sales_invoice_settings.png'],
        
        // المشتريات
        'مشتريات': ['019_purchase_invoice_settings.png'],
        'purchases': ['019_purchase_invoice_settings.png'],
        'شراء': ['019_purchase_invoice_settings.png'],
        'purchase': ['019_purchase_invoice_settings.png'],
        
        // الأصناف
        'أصناف': ['021_items_settings.png'],
        'items': ['021_items_settings.png'],
        'صنف': ['021_items_settings.png'],
        'item': ['021_items_settings.png'],
        'تصنيفات': ['022_items_categories_settings.png'],
        'categories': ['022_items_categories_settings.png'],
        
        // التقارير
        'تقرير': ['024_reports_printing_settings.png'],
        'report': ['024_reports_printing_settings.png'],
        'طباعة': ['024_reports_printing_settings.png'],
        'printing': ['024_reports_printing_settings.png'],
        
        // العملاء
        'عملاء': ['025_customer_pricing_display_settings.png'],
        'customers': ['025_customer_pricing_display_settings.png'],
        'عميل': ['025_customer_pricing_display_settings.png'],
        'customer': ['025_customer_pricing_display_settings.png'],
        
        // الفواتير
        'فواتير': ['026_invoices_printing_settings.png'],
        'invoices': ['026_invoices_printing_settings.png'],
        
        // التكلفة
        'تكلفة': ['027_cost_pricing_settings.png'],
        'cost': ['027_cost_pricing_settings.png'],
        
        // البيانات الأساسية
        'بيانات': ['028_basic_data_import.png'],
        'data': ['028_basic_data_import.png'],
        'استيراد': ['028_basic_data_import.png'],
        'import': ['028_basic_data_import.png'],
        
        // مراكز التكلفة
        'مراكز': ['029_cost_centers.png'],
        'centers': ['029_cost_centers.png'],
        
        // المخازن
        'مخازن': ['030_warehouses.png'],
        'warehouses': ['030_warehouses.png'],
        'مخزن': ['030_warehouses.png'],
        'warehouse': ['030_warehouses.png'],
        
        // بيان المخزن
        'بيان': ['033_warehouse_statement.png'],
        'statement': ['033_warehouse_statement.png'],
        
        // نقل البضائع
        'نقل': ['038_goods_transfer.png'],
        'transfer': ['038_goods_transfer.png'],
        'بضائع': ['038_goods_transfer.png'],
        'goods': ['038_goods_transfer.png'],
        
        // حركة المخزون
        'حركة': ['041_inventory_movement.png'],
        'movement': ['041_inventory_movement.png'],
        'مخزون': ['041_inventory_movement.png'],
        'inventory': ['041_inventory_movement.png'],
        
        // المخزون الحالي
        'حالي': ['045_current_inventory.png'],
        'current': ['045_current_inventory.png'],
        
        // التقارير
        'تقرير': ['050_reports.png'],
        'report': ['050_reports.png'],
        
        // المشتريات التقارير
        'مشتريات': ['051_purchases_reports.png'],
        'purchases': ['051_purchases_reports.png'],
        
        // المبيعات التقارير
        'مبيعات': ['052_sales_reports.png'],
        'sales': ['052_sales_reports.png'],
        
        // الأصناف الرئيسية
        'أصناف': ['053_items_main.png'],
        'items': ['053_items_main.png'],
        'صنف': ['053_items_main.png'],
        'item': ['053_items_main.png'],
        
        // التصنيفات
        'تصنيفات': ['065_categories.png'],
        'categories': ['065_categories.png'],
        
        // الأنشطة
        'أنشطة': ['066_activities.png'],
        'activities': ['066_activities.png'],
        
        // الفروع
        'فروع': ['067_branches.png'],
        'branches': ['067_branches.png'],
        
        // المواقع
        'مواقع': ['068_locations.png'],
        'locations': ['068_locations.png'],
        
        // التعريفات
        'تعريفات': ['069_definitions.png'],
        'definitions': ['069_definitions.png'],
        
        // البيانات الأساسية
        'بيانات': ['075_basic_data.png'],
        'data': ['075_basic_data.png'],
        
        // الدول
        'دول': ['076_countries.png'],
        'countries': ['076_countries.png'],
        
        // المدن
        'مدن': ['077_cities.png'],
        'cities': ['077_cities.png'],
        
        // الأحياء
        'أحياء': ['078_districts.png'],
        'districts': ['078_districts.png'],
        
        // العملات
        'عملات': ['080_currencies.png'],
        'currencies': ['080_currencies.png'],
        
        // الأنظمة
        'أنظمة': ['083_systems.png'],
        'systems': ['083_systems.png'],
        
        // الضرائب
        'ضرائب': ['085_taxes.png'],
        'taxes': ['085_taxes.png'],
        
        // الكيانات
        'كيانات': ['087_entities.png'],
        'entities': ['087_entities.png'],
        
        // الموردين
        'موردين': ['088_suppliers.png'],
        'suppliers': ['088_suppliers.png'],
        'مورد': ['088_suppliers.png'],
        'supplier': ['088_suppliers.png'],
        
        // إضافة مورد جديد - التبويبات
        'إضافة مورد': ['اضافة مورد-البيانات الاساسية.png', 'اضافة مورد-العنوان الوطني.png', 'اضافة مورد-بيانات الهوية.png', 'اضافة مورد-اعدادات المشتريات.png', 'اضافة مورد-مسؤولي التواصل.png', 'اضافة مورد-المعرفات.png', 'اضافة مورد-الملاحظات.png'],
        'مورد جديد': ['اضافة مورد-البيانات الاساسية.png', 'اضافة مورد-العنوان الوطني.png', 'اضافة مورد-بيانات الهوية.png', 'اضافة مورد-اعدادات المشتريات.png', 'اضافة مورد-مسؤولي التواصل.png', 'اضافة مورد-المعرفات.png', 'اضافة مورد-الملاحظات.png'],
        'البيانات الأساسية للمورد': ['اضافة مورد-البيانات الاساسية.png'],
        'العنوان الوطني للمورد': ['اضافة مورد-العنوان الوطني.png'],
        'بيانات الهوية للمورد': ['اضافة مورد-بيانات الهوية.png'],
        'إعدادات المشتريات للمورد': ['اضافة مورد-اعدادات المشتريات.png'],
        'مسؤولي التواصل للمورد': ['اضافة مورد-مسؤولي التواصل.png'],
        'المعرفات للمورد': ['اضافة مورد-المعرفات.png'],
        'ملاحظات المورد': ['اضافة مورد-الملاحظات.png'],
        
        // إضافة صنف جديد - التبويبات
        'إضافة': ['218_add_item_basic_data.png', '219_add_item_pricing_policies.png', '220_add_item_barcode_and_bundle.png', '221_add_item_descriptions.png', '222_add_item_notes.png'],
        'صنف جديد': ['218_add_item_basic_data.png', '219_add_item_pricing_policies.png', '220_add_item_barcode_and_bundle.png', '221_add_item_descriptions.png', '222_add_item_notes.png'],
        'بيانات أساسية': ['218_add_item_basic_data.png'],
        'سياسات': ['219_add_item_pricing_policies.png'],
        'تسعير': ['219_add_item_pricing_policies.png'],
        'باركود': ['220_add_item_barcode_and_bundle.png'],
        'شد': ['220_add_item_barcode_and_bundle.png'],
        'وصف': ['221_add_item_descriptions.png'],
        'معرفات': ['222_add_item_notes.png'],
        'ملاحظات': ['222_add_item_notes.png'],
        
        // الطلبات
        'طلبات': ['الطلبات.png'],
        'orders': ['الطلبات.png'],
        'طلب': ['الطلبات.png'],
        'order': ['الطلبات.png'],
        
        // الشاشة الرئيسية
        'الشاشة الرئيسية': ['الشاشة_الرئيسية_الصورة_الرئيسية.png'],
        'main screen': ['الشاشة_الرئيسية_الصورة_الرئيسية.png'],
        'الرئيسية': ['الشاشة_الرئيسية_الصورة_الرئيسية.png'],
        
        // التأسيس
        'تأسيس': ['216_foundation.png'],
        'foundation': ['216_foundation.png'],
        
        // الحسابات
        'حسابات': ['الحسابات_الحسابات__1447-03-05_at_4.26.26 am.png', 'الحسابات_الحسابات__1447-03-05_at_4.27.06 am.png'],
        'accounts': ['الحسابات_الحسابات__1447-03-05_at_4.26.26 am.png', 'الحسابات_الحسابات__1447-03-05_at_4.27.06 am.png'],
        
        // معرفات الملاحظات
        'معرفات الملاحظات': ['معرفات_الملاحظات_معرفات_الملاحظات.png'],
        'note identifiers': ['معرفات_الملاحظات_معرفات_الملاحظات.png'],
        
        // معرفات الأصناف
        'معرفات الأصناف': ['معرفات الاصناف .png'],
        'item identifiers': ['معرفات الاصناف .png'],
        
        // فك الوحدات
        'فك وحدات': ['فك_وحدات_الأصناف_فك_وحدات_الأصناف.png'],
        'فك مباشر': ['فك_وحدات_الأصناف_فك_وحدات_الأصناف.png'],
        'فك تسلسلي': ['فك_وحدات_الأصناف_فك_وحدات_الأصناف.png'],
        'وحدات الأصناف': ['فك_وحدات_الأصناف_فك_وحدات_الأصناف.png'],
        
        // بيان فك وحدات الأصناف
        'بيان فك وحدات الأصناف': ['بيان_فك_وحدات_الأصناف_بيان_فك_وحدات_الأصناف.png'],
        'بيان فك': ['بيان_فك_وحدات_الأصناف_بيان_فك_وحدات_الأصناف.png'],
        
        // الرصيد الافتتاحي
        'رصيد افتتاحي': ['الرصيد_الافتتاحي_الرصيد_الافتتاحي.png'],
        'opening balance': ['الرصيد_الافتتاحي_الرصيد_الافتتاحي.png'],
        
        // الجرد والأرصدة
        'جرد': ['الجرد_والأرصدة_الافتتاحية_الجرد_والأرصدة_الافتتاحية.png', 'الجرد_والأرصدة_الحالية_الجرد_والأرصدة_الحالية.png'],
        'inventory': ['الجرد_والأرصدة_الافتتاحية_الجرد_والأرصدة_الافتتاحية.png', 'الجرد_والأرصدة_الحالية_الجرد_والأرصدة_الحالية.png'],
        
        // الأصناف المختلفة
        'أصناف راكدة': ['الأصناف_الراكدة_الأصناف_الراكدة.png'],
        'أصناف منتهية': ['الأصناف_المنتهية_الأصناف_المنتهية.png'],
        'أصناف أكثر دوران': ['الأصناف_الأكثر_دوران_الأصناف_الأكثر_دوران.png'],
        'أصناف أكثر ربحا': ['الأصناف_الأكثر_ربحا_الأصناف_الأكثر_ربحا.png'],
        
        // العملاء
        'عملاء أكثر ربحية': ['العملاء_الأكثر_ربحية_العملاء_الأكثر_ربحية.png'],
        'عملاء أكثر مبيعا': ['العملاء_الأكثر_مبيعا_عدد_فواتير_العملاء_الأكثر_مبيعا_عدد_فواتير.png', 'العملاء_الأكثر_مبيعا_مبالغ_العملاء_الأكثر_مبيعا_مبالغ.png'],
        
        // التقارير المالية
        'ميزانية عمومية': ['الميزانية_العمومية_الميزانية_العمومية.png'],
        'قائمة الدخل': ['قائمة_الدخل_قائمة_الدخل.png'],
        'ميزان مراجعة': ['ميزان_مراجعة_أساسي_ميزان_مراجعة_أساسي.png', 'ميزان_مراجعة_فرعي_ميزان_مراجعة_فرعي.png'],
        
        // التقارير الضريبية
        'تقرير ضريبي': ['التقرير_الضريبي_النموذجي_التقرير_الضريبي_النموذجي.png', 'تقرير_ضريبي_تفصيلي_تقرير_ضريبي_تفصيلي.png'],
        'ضرائب': ['التقرير_الضريبي_النموذجي_التقرير_الضريبي_النموذجي.png', 'تقرير_ضريبي_تفصيلي_تقرير_ضريبي_تفصيلي.png'],
        
        // الفواتير
        'فاتورة بيع آجل': ['فاتورة_بيع_آجل_فاتورة_بيع_آجل.png'],
        'فاتورة شراء آجل': ['فاتورة_شراء_آجل_فاتورة_شراء_آجل.png'],
        'فاتورة شراء نقدا': ['فاتورة_شراء_نقدًا_فاتورة_شراء_نقدًا.png'],
        'فاتورة مشتريات مرحلية': ['فاتورة_مشتريات_مرحلية_فاتورة_مشتريات_مرحلية.png'],
        
        // المرتجعات
        'مرتجع بيع آجل': ['مرتجع_بيع_آجل_مرتجع_بيع_آجل.png'],
        'مرتجع فاتورة شراء آجل': ['مرتجع_فاتورة_شراء_آجل_مرتجع_فاتورة_شراء_آجل.png'],
        'مرتجع فاتورة شراء نقدا': ['مرتجع_فاتورة_شراء_نقدًا_مرتجع_فاتورة_شراء_نقدًا.png'],
        
        // الدورة المالية
        'دورة البيع المباشر': ['دورة_البيع_المباشر_دورة_البيع_المباشر.png'],
        'دورة العقود والاتفاقيات': ['دورة_العقود_والاتفاقيات_دورة_العقود_والاتفاقيات.png'],
        'دورة حجز المبيعات': ['دورة_حجز_المبيعات_دورة_حجز_المبيعات.png'],
        
        // المبيعات
        'ما قبل البيع': ['ما_قبل_البيع_ماقبل_البيع.png'],
        'ما بعد البيع': ['ما_بعد_البيع_مابعد_البيع.png'],
        'مرتجع ما بعد البيع': ['مرتجع_ما_بعد_البيع_مرتجع_مابعد_البيع.png'],
        
        // المخزون
        'جرد البضاعة': ['جرد_البضاعة_جرد_البضاعة.png'],
        'حركة الأصناف': ['حركة_الأصناف_حركة_الأصناف.png'],
        'حركة صنف تفصيليا': ['حركة_صنف_تفصيليا_حركة_صنف_تفصيليا.png'],
        'قيمة البضاعة': ['قيمة_البضاعة_قيمة_البضاعة.png'],
        
        // النقل
        'نقل بضاعة داخلي': ['نقل_بضاعة_داخلي_نقل_بضاعة_داخلي.png'],
        'استلام بضاعة داخلي': ['استلام_بضاعة_داخلي_استلام_بضاعة_داخلي.png'],
        
        // البضاعة بالطريق
        'بضاعة بالطريق': ['فاتورة_مشتريات_بضاعة_بالطريق_آجل_فاتورة_مشتريات_بضاعة_بالطريق_آجل.png', 'فاتورة_مشتريات_بضاعة_بالطريق_نقدًا_فاتورة_مشتريات_بضاعة_بالطريق_نقدًا.png'],
        'فاتورة مشتريات بضاعة بالطريق': ['فاتورة_مشتريات_بضاعة_بالطريق_آجل_فاتورة_مشتريات_بضاعة_بالطريق_آجل.png', 'فاتورة_مشتريات_بضاعة_بالطريق_نقدًا_فاتورة_مشتريات_بضاعة_بالطريق_نقدًا.png'],
        
        // الاستلام والتسليم
        'بيان استلام': ['بيان_استلام_بيان_استلام.png'],
        'سند استلام': ['سند_استلام_سند_استلام.png'],
        'سند تسليم': ['سند_تسليم_سند_تسليم.png'],
        
        // العقود والاتفاقيات
        'اتفاقية شراء': ['اتفاقية_شراء_اتفاقية_شراء.png'],
        'عقود': ['اتفاقية_شراء_اتفاقية_شراء.png'],
        'اتفاقيات': ['اتفاقية_شراء_اتفاقية_شراء.png'],
        
        // العروض
        'عرض أسعار': ['عرض_أسعار_عرض_اسعار.png'],
        'عروض': ['عرض_أسعار_عرض_اسعار.png'],
        
        // المندوبين
        'مندوبو المبيعات': ['مندوبو_المبيعات_مندوبو_المبيعات.png'],
        'شرائح عمولات مندوبي المبيعات': ['شرائح_عمولات_مندوبي_المبيعات_شرائح_عمولات_مندوبي_المبيعات.png'],
        
        // الشحن
        'طرق الشحن': ['طرق_الشحن_طرق_الشحن.png'],
        'أنواع حالات الشحن': ['أنواع_حالات_الشحن_أنواع_حالات_الشحن.png'],
        
        // طرق الدفع
        'طرق القبض والدفع': ['طرق_القبض_الدفع_طرق_القبض_الدفع.png'],
        
        // الشركات المصنعة
        'الشركات المصنعة': ['الشركات_المصنعة_الشركات_المصنعة.png'],
        'شركات مصنعة': ['الشركات_المصنعة_الشركات_المصنعة.png'],
        
        // تقسيمات الأصناف
        'تقسيمات الأصناف': ['تقسيمات_الأصناف_scr-20250828-dcfq.png'],
        'تصنيفات الأصناف': ['تقسيمات_الأصناف_scr-20250828-dcfq.png'],
        
        // سمات الأصناف
        'سمات الأصناف': ['سمات_الأصناف_سمات_الأصناف.png'],
        'وحدات الأصناف': ['وحدات_الأصناف_وحدات_الأصناف.png'],
        
        // المناطق الإدارية
        'المناطق الإدارية': ['المناطق_الإدارية_المناطق_الإدارية.png'],
        'مناطق إدارية': ['المناطق_الإدارية_المناطق_الإدارية.png'],
        
        // الإشعارات
        'إشعار العملاء': ['إشعار_العملاء_اشعار_العملاء.png'],
        'إشعار دائن للعميل': ['إشعار_دائن_للعميل_إشعار_دائن_للعميل.png'],
        'إشعار دائن للمورد': ['إشعار_دائن_للمورد_إشعار_دائن_للمورد.png'],
        'إشعار مدين للعميل': ['إشعار_مدين_للعميل_إشعار_مدين_للعميل.png'],
        'إشعار مدين للمورد': ['إشعار_مدين_للمورد_إشعار_مدين_للمورد.png'],
        
        // الحد الائتماني
        'حد الائتمان': ['عملاء_تجاوز_رصيدهم_حد_الائتمان_عملاء_تجاوز_رصيدهم_حد_الائتمان.png', 'موردين_تجاوز_رصيدهم_حد_الائتمان_موردين_تجاوز_رصيدهم_حد_الائتمان.png'],
        'تجاوز حد الائتمان': ['عملاء_تجاوز_رصيدهم_حد_الائتمان_عملاء_تجاوز_رصيدهم_حد_الائتمان.png', 'موردين_تجاوز_رصيدهم_حد_الائتمان_موردين_تجاوز_رصيدهم_حد_الائتمان.png'],
        
        // الأصناف المنتهية
        'أصناف ستنتتهي قريبا': ['الأصناف_التي_ستنتهي_قريبا_الأصناف_التي_ستنتهي_قريبا.png'],
        'أصناف وصلت لحد إعادة الطلب': ['الأصناف_التي_وصلت_لحد_إعادة_الطلب_الأصناف_التي_وصلت_لحد_إعادة_الطلب.png'],
        
        // التقارير الضريبية المتقدمة
        'تقرير الضريبة الأخرى': ['تقرير_الضريبة_الأخرى_تقرير_الضريبة_الأخرى.png'],
        'تقرير تفصيلي للضرائب الأخرى': ['تقرير_تفصيلي_للضرائب_الأخرى_تقرير_تفصيلي_للضرائب_الأخرى.png'],
        'تقرير طرق التحصيلات النقدية': ['تقرير_طرق_التحصيلات_النقدية_تقرير_طرق_التحصيلات_النقدية.png'],
        
        // التقارير المالية المتقدمة
        'تقرير إجمالي الدخل للموقع': ['تقرير_إجمالي_الدخل_للموقع_تقرير_إجمالي_الدخل_للموقع.png'],
        'تقرير النشاط التجاري': ['تقرير_النشاط_التجاري_تقرير_النشاط_التجاري.png'],
        'تقرير النشاط التجاري لفواتير الشراء': ['تقرير_النشاط_التجاري_لفواتير_الشراء_تقرير_النشاط_التجاري_لفواتير_الشراء.png'],
        
        // الفواتير المتقدمة
        'فواتير البيع المسددة والغير مسددة': ['فواتير_البيع_المسددة_والغير_مسددة_فواتير_البيع_المسددة_والغير_مسددة.png'],
        'فواتير البيع المعمرة': ['فواتير_البيع_المعمرة_فواتير_البيع_المعمرة.png'],
        'فواتير الشراء المسددة والغير مسددة': ['فواتير_الشراء_المسددة_والغير_مسددة_فواتير_الشراء_المسددة_والغير_مسددة.png'],
        'فواتير الشراء المعمرة': ['فواتير_الشراء_المعمرة_فواتير_الشراء_المعمرة.png'],
        'فواتير الكميات المرجعة': ['فواتير_الكميات_المرجعة_فواتير_الكميات_المرجعة.png'],
        
        // الفواتير المالية
        'فواتير بيع سجل موعد سدادها خلال فترة': ['فواتير_بيع_سجل_موعد_سدادها_خلال_فترة_فواتير_بيع_سجل_موعد_سدادها_خلال_فترة.png'],
        'فواتير شراء سجل موعد سدادها خلال فترة': ['فواتير_شراء_سجل_موعد_سدادها_خلال_فترة_فواتير_شراء_سجل_موعد_سدادها_خلال_فترة.png'],
        
        // فواتير المبيعات المتقدمة
        'فواتير مبيعات نسبة الخصم فيها أكبر من': ['فواتير_مبيعات_نسبة_الخصم_فيها_أكبر_من_فواتير_مبيعات_نسبة_الخصم_فيها_أكبر_من.png'],
        'فواتير مبيعات نسبة الربح فيها أقل من': ['فواتير_مبيعات_نسبة_الربح_فيها_أقل_من_فواتير_مبيعات_نسبة_الربح_فيها_أقل_من.png'],
        
        // الحسابات المتقدمة
        'حسابات مركز التكلفة': ['حسابات_مركز_التكلفة_حسابات_مركز_التكلفة.png'],
        'قيود مركز تكلفة': ['قيود_مركز_تكلفة_قيود_مركز_تكلفة.png'],
        'ملخص مراكز التكلفة أساسي': ['ملخص_مراكز_التكلفة_أساسي_ملخص_مراكز_التكلفة_أساسي.png'],
        'ملخص مراكز التكلفة جزئي': ['ملخص_مراكز_التكلفة_جزئي_ملخص_مراكز_التكلفة_جزئي.png'],
        
        // الدفاتر المحاسبية
        'دفتر قيود اليومية': ['دفتر_قيود_اليومية_دفتر_قيود_اليومية.png'],
        'مجمع القيود': ['مجمع_القيود_مجمع_القيود.png'],
        
        // كشوف الحسابات
        'كشف حساب لمجموعة حسابات': ['كشف_حساب_لمجموعة_حسابات_كشف_حساب_لمجموعة_حسابات.png', 'كشف_حساب_لمجموعة_حسابات_كشف_حساب_لمجموعة_حسابات_1.png'],
        'كشف حساب مفصل': ['كشف_حساب_مفصل_كشف_حساب_مفصل.png'],
        'بيانات الحسابات الجزئية': ['بيانات_الحسابات_الجزئية_بيانات_الحسابات_الجزئية.png'],
        
        // الأرصدة
        'أرصدة الحسابات': ['أرصدة_الحسابات_أرصدة_الحسابات.png'],
        'أرقام السندات المفقودة': ['أرقام_السندات_المفقودة_أرقام_السندات_المفقودة.png'],
        
        // أسعار العملات
        'أسعار العملات': ['أسعار_العملات_أسعار_العملات.png'],
        'أسعار التكلفة': ['أسعار_التكلفة_أسعار_التكلفة.png'],
        
        // أسماء شرائح عمولة المندوب
        'أسماء شرائح عمولة المندوب': ['أسماء_شرائح_عمولة_المندوب_أسماء_شرائح_عمولة_المندوب.png'],
        
        // أنواع مصاريف الفاتورة
        'أنواع مصاريف الفاتورة': ['أنواع_مصاريف_الفاتورة_أنواع_مصاريف_الفاتورة.png'],
        
        // اعتماد الجرد
        'اعتماد الجرد كرصيد افتتاحي': ['اعتماد_الجرد_كرصيد_افتتاحي_اعتماد_الجرد_كرصيد_افتتاحي.png'],
        'اعتماد الجرد كرصيد حالي': ['اعتماد_الجرد_كرصيد_حالي_اعتماد_الجرد_كرصيد_حالي.png'],
        
        // اعتماد عرض الأسعار
        'اعتماد عرض الأسعار': ['اعتماد_عرض_الأسعار_اعتماد_عرض_الاسعار.png'],
        
        // المرتجعات المتقدمة
        'مرتجع كميات من فاتورة': ['مرتجع_كميات_من_فاتورة_مرتجع_كميات_من_فاتورة.png'],
        'مرتجع من بيان استلام': ['مرتجع_من_بيان_استلام_مرتجع_من_بيان_استلام.png'],
        'مرتجع من استلام فاتورة بضاعة بالطريق': ['مرتجع_من_استلام_فاتورة_بضاعة_بالطريق_مرتجع_من_استلام_فاتورة_بضاعة_بالطريق.png'],
        
        // البضاعة بالطريق المتقدمة
        'استلام من فاتورة بضاعة بالطريق': ['استلام_من_فاتورة_بضاعة_بالطريق_استلام_من_فاتورة_بضاعة_بالطريق.png'],
        'فاتورة مرتجع بضاعة بالطريق': ['فاتورة_مرتجع_بضاعة_بالطريق_فاتورة_مرتجع_بضاعة_بالطريق.png'],
        
        // الحجز
        'فاتورة حجز آجل': ['فاتورة_حجز_آجل_فاتورة_حجز_آجل.png'],
        'حجز': ['فاتورة_حجز_آجل_فاتورة_حجز_آجل.png'],
        
        // العقود والاتفاقيات المتقدمة
        'عقد': ['اتفاقية_شراء_اتفاقية_شراء.png'],
        'اتفاقية': ['اتفاقية_شراء_اتفاقية_شراء.png'],
        
        // المبيعات المتقدمة
        'مبيعات': ['125_sales_main.png'],
        'sales': ['125_sales_main.png'],
        'بيع': ['125_sales_main.png'],
        
        // المشتريات المتقدمة
        'مشتريات': ['095_purchases_main.png'],
        'purchases': ['095_purchases_main.png'],
        'شراء': ['095_purchases_main.png'],
        
        // ما بعد البيع
        'ما بعد البيع': ['096_post_purchase.png', '097_post_purchase_return.png'],
        'post purchase': ['096_post_purchase.png', '097_post_purchase_return.png'],
        
        // ما قبل البيع
        'ما قبل البيع': ['120_pre_purchase.png'],
        'pre purchase': ['120_pre_purchase.png'],
        
        // طلبات البضائع
        'طلبات البضائع': ['121_goods_requests.png'],
        'goods requests': ['121_goods_requests.png'],
        
        // دورات الشراء
        'دورات الشراء': ['103_purchase_cycles.png'],
        'purchase cycles': ['103_purchase_cycles.png'],
        
        // دورة الشراء المباشر
        'دورة الشراء المباشر': ['104_direct_purchase_cycle.png'],
        'direct purchase cycle': ['104_direct_purchase_cycle.png'],
        
        // دورة البضاعة بالطريق
        'دورة البضاعة بالطريق': ['109_goods_in_transit_cycle.png'],
        'goods in transit cycle': ['109_goods_in_transit_cycle.png'],
        
        // دورات المبيعات
        'دورات المبيعات': ['126_sales_cycles.png'],
        'sales cycles': ['126_sales_cycles.png'],
        
        // دورة حجز المبيعات
        'دورة حجز المبيعات': ['133_contracts_agreements_cycle.png'],
        'contracts agreements cycle': ['133_contracts_agreements_cycle.png'],
        
        // اتفاقية المبيعات
        'اتفاقية المبيعات': ['134_sales_agreement.png'],
        'sales agreement': ['134_sales_agreement.png'],
        
        // فاتورة التقسيط
        'فاتورة التقسيط': ['135_installment_invoice.png'],
        'installment invoice': ['135_installment_invoice.png'],
        
        // بيان التسليم
        'بيان التسليم': ['136_delivery_statement.png'],
        'delivery statement': ['136_delivery_statement.png'],
        
        // مرتجع من بيان التسليم
        'مرتجع من بيان التسليم': ['137_return_from_delivery_statement.png'],
        'return from delivery statement': ['137_return_from_delivery_statement.png'],
        
        // فاتورة البيع النقدي
        'فاتورة البيع النقدي': ['139_cash_sales_invoice.png'],
        'cash sales invoice': ['139_cash_sales_invoice.png'],
        
        // مرتجع البيع النقدي
        'مرتجع البيع النقدي': ['142_cash_sales_return.png'],
        'cash sales return': ['142_cash_sales_return.png'],
        
        // العروض
        'العروض': ['144_offers.png'],
        'offers': ['144_offers.png'],
        
        // طلب التسعير
        'طلب التسعير': ['145_pricing_request.png'],
        'pricing request': ['145_pricing_request.png'],
        
        // فواتير الكميات المرجعة
        'فواتير الكميات المرجعة': ['150_returned_quantities_invoices.png'],
        'returned quantities invoices': ['150_returned_quantities_invoices.png'],
        
        // مرتجع الكميات من الفاتورة
        'مرتجع الكميات من الفاتورة': ['151_quantities_return_from_invoice.png'],
        'quantities return from invoice': ['151_quantities_return_from_invoice.png'],
        
        // تعريف الموافقات ومراحلها
        'تعريف الموافقات ومراحلها': ['155_approvals_definition_and_stages.png'],
        'approvals definition and stages': ['155_approvals_definition_and_stages.png'],
        
        // موافقة المستندات
        'موافقة المستندات': ['156_documents_approval.png'],
        'documents approval': ['156_documents_approval.png'],
        
        // التقارير المحاسبية
        'التقارير المحاسبية': ['158_accounting_reports.png'],
        'accounting reports': ['158_accounting_reports.png'],
        
        // التقارير الضريبية
        'التقارير الضريبية': ['157_tax_reports.png'],
        'tax reports': ['157_tax_reports.png'],
        
        // المتابعة المتقدمة
        'متابعة بيان التسليم': ['183_delivery_statement_follow_up.png'],
        'delivery statement follow up': ['183_delivery_statement_follow_up.png'],
        
        'متابعة موافقات عروض أسعار العملاء': ['184_customer_price_offers_approvals_follow_up.png'],
        'customer price offers approvals follow up': ['184_customer_price_offers_approvals_follow_up.png'],
        
        'متابعة مرتجع كميات فاتورة التقسيط': ['185_installment_invoice_quantities_return_follow_up.png'],
        'installment invoice quantities return follow up': ['185_installment_invoice_quantities_return_follow_up.png'],
        
        'متابعة عروض أسعار العملاء': ['186_customer_price_offers_follow_up.png'],
        'customer price offers follow up': ['186_customer_price_offers_follow_up.png'],
        
        'متابعة مرتجع بيان التسليم': ['187_delivery_statement_return_follow_up.png'],
        'delivery statement return follow up': ['187_delivery_statement_return_follow_up.png'],
        
        'متابعة البضائع المحجوزة': ['188_reserved_goods_follow_up.png'],
        'reserved goods follow up': ['188_reserved_goods_follow_up.png'],
        
        'متابعة فاتورة مبيعات التقسيط': ['189_installment_sales_invoice_follow_up.png'],
        'installment sales invoice follow up': ['189_installment_sales_invoice_follow_up.png'],
        
        'متابعة اتفاقيات المبيعات': ['190_sales_agreements_follow_up.png'],
        'sales agreements follow up': ['190_sales_agreements_follow_up.png'],
        
        'متابعة طلبات تسعير العملاء': ['191_customer_pricing_requests_follow_up.png'],
        'customer pricing requests follow up': ['191_customer_pricing_requests_follow_up.png'],
        
        'عمولات مندوبي المبيعات': ['192_sales_representatives_commissions.png'],
        'sales representatives commissions': ['192_sales_representatives_commissions.png'],
        
        'متابعة طلبات تسعير الموردين': ['193_suppliers_pricing_requests_follow_up.png'],
        'suppliers pricing requests follow up': ['193_suppliers_pricing_requests_follow_up.png'],
        
        'متابعة اتفاقيات الشراء': ['194_purchase_agreements_follow_up.png'],
        'purchase agreements follow up': ['194_purchase_agreements_follow_up.png'],
        
        'متابعة بيانات الاستلام': ['195_receipt_data_follow_up.png'],
        'receipt data follow up': ['195_receipt_data_follow_up.png'],
        
        'متابعة طلبات البضائع': ['196_goods_requests_follow_up.png'],
        'goods requests follow up': ['196_goods_requests_follow_up.png'],
        
        'متابعة مرتجع بيانات الاستلام': ['197_receipt_data_return_follow_up.png'],
        'receipt data return follow up': ['197_receipt_data_return_follow_up.png'],
        
        'متابعة مرتجع كميات فاتورة شراء التقسيط': ['198_installment_purchase_invoice_quantities_return_follow_up.png'],
        'installment purchase invoice quantities return follow up': ['198_installment_purchase_invoice_quantities_return_follow_up.png'],
        
        'متابعة عروض أسعار الموردين': ['199_suppliers_price_offers_follow_up.png'],
        'suppliers price offers follow up': ['199_suppliers_price_offers_follow_up.png'],
        
        'متابعة فاتورة شراء التقسيط': ['200_installment_purchase_invoice_follow_up.png'],
        'installment purchase invoice follow up': ['200_installment_purchase_invoice_follow_up.png'],
        
        'متابعة البضاعة بالطريق': ['201_goods_in_transit_follow_up.png'],
        'goods in transit follow up': ['201_goods_in_transit_follow_up.png'],
        
        // الإشعارات المتقدمة
        'إشعار الموردين': ['100_suppliers_notification.png'],
        'suppliers notification': ['100_suppliers_notification.png'],
        
        // الاتصالات
        'الاتصالات': ['048_connections.png'],
        'connections': ['048_connections.png'],
        
        // الطلبات
        'الطلبات': ['049_orders.png'],
        'orders': ['049_orders.png'],
        
        // التقارير
        'التقارير': ['050_reports.png'],
        'reports': ['050_reports.png'],
        
        // تقارير المشتريات
        'تقارير المشتريات': ['051_purchases_reports.png'],
        'purchases reports': ['051_purchases_reports.png'],
        
        // تقارير المبيعات
        'تقارير المبيعات': ['052_sales_reports.png'],
        'sales reports': ['052_sales_reports.png'],
        
        // الأصناف الرئيسية
        'الأصناف الرئيسية': ['053_items_main.png'],
        'items main': ['053_items_main.png'],
        
        // التصنيفات
        'التصنيفات': ['065_categories.png'],
        'categories': ['065_categories.png'],
        
        // الأنشطة
        'الأنشطة': ['066_activities.png'],
        'activities': ['066_activities.png'],
        
        // الفروع
        'الفروع': ['067_branches.png'],
        'branches': ['067_branches.png'],
        
        // المواقع
        'المواقع': ['068_locations.png'],
        'locations': ['068_locations.png'],
        
        // التعريفات
        'التعريفات': ['069_definitions.png'],
        'definitions': ['069_definitions.png'],
        
        // البيانات الأساسية
        'البيانات الأساسية': ['075_basic_data.png'],
        'basic data': ['075_basic_data.png'],
        
        // الدول
        'الدول': ['076_countries.png'],
        'countries': ['076_countries.png'],
        
        // المدن
        'المدن': ['077_cities.png'],
        'cities': ['077_cities.png'],
        
        // الأحياء
        'الأحياء': ['078_districts.png'],
        'districts': ['078_districts.png'],
        
        // العملات
        'العملات': ['080_currencies.png'],
        'currencies': ['080_currencies.png'],
        
        // الأنظمة
        'الأنظمة': ['083_systems.png'],
        'systems': ['083_systems.png'],
        
        // الضرائب
        'الضرائب': ['085_taxes.png'],
        'taxes': ['085_taxes.png'],
        
        // الكيانات
        'الكيانات': ['087_entities.png'],
        'entities': ['087_entities.png'],
        
        // الموردين
        'الموردين': ['088_suppliers.png'],
        'suppliers': ['088_suppliers.png'],
        
        // العملاء
        'العملاء': ['089_customers.png'],
        'customers': ['089_customers.png'],
        
        // البنوك
        'البنوك': ['093_banks.png'],
        'banks': ['093_banks.png']
    };
    
    // البحث عن الكلمات المفتاحية
    for (const [keyword, images] of Object.entries(imageKeywords)) {
        if (messageLower.includes(keyword)) {
            relevantImages.push(...images);
        }
    }
    
    // إزالة التكرار
    return [...new Set(relevantImages)];
}

// إعداد الرسالة مع المحتوى المطلوب
const systemMessage = `هذا المساعد موجَّه لمستخدمي albaseet.life باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.`;

// Route للصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route للصفحة الإدارية
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Route لصفحة DeepSeek
app.get('/deepseek', (req, res) => {
    res.sendFile(path.join(__dirname, 'deepseek.html'));
});

// Route لصفحة المقارنة
app.get('/comparison', (req, res) => {
    res.sendFile(path.join(__dirname, 'comparison.html'));
});

// Route لصفحة المحادثة
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// Route لإدارة تتبع الملاحظات
app.get('/api/notes-tracking', (req, res) => {
    try {
        const trackingData = getNoteTracking();
        res.json(trackingData);
    } catch (error) {
        console.error('Error getting notes tracking:', error);
        res.status(500).json({ error: 'خطأ في قراءة تتبع الملاحظات' });
    }
});

// Route لتحديث حالة الملاحظة
app.post('/api/notes-tracking/:noteId', (req, res) => {
    try {
        const { noteId } = req.params;
        const { status, action } = req.body;
        
        if (!status || !action) {
            return res.status(400).json({ error: 'البيانات المطلوبة مفقودة' });
        }
        
        const success = saveNoteTracking(noteId, status, action);
        
        if (success) {
            res.json({ message: 'تم تحديث حالة الملاحظة بنجاح' });
        } else {
            res.status(500).json({ error: 'خطأ في تحديث حالة الملاحظة' });
        }
    } catch (error) {
        console.error('Error updating note tracking:', error);
        res.status(500).json({ error: 'خطأ في تحديث حالة الملاحظة' });
    }
});

// Route لإضافة ملاحظة جديدة للتتبع
app.post('/api/notes-tracking', (req, res) => {
    try {
        const { note, status, action } = req.body;
        
        if (!note || !status || !action) {
            return res.status(400).json({ error: 'البيانات المطلوبة مفقودة' });
        }
        
        const noteId = generateNoteId(note);
        const success = saveNoteTracking(noteId, status, action);
        
        if (success) {
            res.json({ 
                message: 'تم إضافة الملاحظة للتتبع بنجاح',
                noteId: noteId
            });
        } else {
            res.status(500).json({ error: 'خطأ في إضافة الملاحظة للتتبع' });
        }
    } catch (error) {
        console.error('Error adding note tracking:', error);
        res.status(500).json({ error: 'خطأ في إضافة الملاحظة للتتبع' });
    }
});

// Route لعرض الملاحظات غير المتابعة
app.get('/api/notes-tracking/pending', (req, res) => {
    try {
        const feedbackData = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
        const trackingData = getNoteTracking();
        
        // الحصول على الملاحظات السلبية فقط
        const negativeNotes = feedbackData.evaluations.filter(eval => 
            eval.rating === 'negative' && eval.note && eval.note.trim() !== ''
        );
        
        // الحصول على الملاحظات المتابعة
        const trackedNoteIds = trackingData.trackedNotes.map(note => note.noteId);
        
        // تصفية الملاحظات غير المتابعة
        const pendingNotes = negativeNotes.filter(note => {
            // إنشاء معرف فريد للملاحظة بناءً على المحتوى
            const noteContent = note.note.trim();
            const noteId = 'note_' + noteContent.substring(0, 20).replace(/\s+/g, '_');
            return !trackedNoteIds.includes(noteId);
        });
        
        res.json({
            pendingNotes: pendingNotes,
            totalPending: pendingNotes.length,
            lastUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting pending notes:', error);
        res.status(500).json({ error: 'خطأ في قراءة الملاحظات غير المتابعة' });
    }
});

// API endpoint جديد لجلب الملاحظات المكتملة مع المحتوى الكامل
app.get('/api/notes-tracking/completed', (req, res) => {
    try {
        const feedbackData = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
        const trackingData = getNoteTracking();
        
        // الحصول على الملاحظات السلبية فقط
        const negativeNotes = feedbackData.evaluations.filter(eval => 
            eval.rating === 'negative' && eval.note && eval.note.trim() !== ''
        );
        
        // الحصول على الملاحظات المكتملة (reviewed أو implemented)
        const completedNotes = trackingData.trackedNotes.filter(note => 
            note.status === 'reviewed' || note.status === 'implemented'
        );
        
        // ربط الملاحظات المكتملة مع المحتوى الكامل
        const completedNotesWithContent = completedNotes.map(trackedNote => {
            // البحث عن الملاحظة المقابلة في feedback_evaluations
            const matchingNote = negativeNotes.find(note => {
                const noteContent = note.note.trim();
                const noteId = 'note_' + noteContent.substring(0, 20).replace(/\s+/g, '_');
                return noteId === trackedNote.noteId;
            });
            
            if (matchingNote) {
                return {
                    ...trackedNote,
                    question: matchingNote.question,
                    note: matchingNote.note,
                    userName: matchingNote.userName || '',
                    userPhone: matchingNote.userPhone || '',
                    userEmail: matchingNote.userEmail || '',
                    timestamp: matchingNote.timestamp
                };
            }
            return trackedNote;
        });
        
        res.json({
            completedNotes: completedNotesWithContent,
            totalCompleted: completedNotesWithContent.length,
            lastUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting completed notes:', error);
        res.status(500).json({ error: 'خطأ في قراءة الملاحظات المكتملة' });
    }
});

// API endpoint جديد لجلب جميع الملاحظات مع المحتوى الكامل
app.get('/api/notes-tracking/all', (req, res) => {
    try {
        const feedbackData = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
        const trackingData = getNoteTracking();
        
        // الحصول على الملاحظات السلبية فقط
        const negativeNotes = feedbackData.evaluations.filter(eval => 
            eval.rating === 'negative' && eval.note && eval.note.trim() !== ''
        );
        
        // ربط جميع الملاحظات المتابعة مع المحتوى الكامل
        const allNotesWithContent = trackingData.trackedNotes.map(trackedNote => {
            // البحث عن الملاحظة المقابلة في feedback_evaluations
            const matchingNote = negativeNotes.find(note => {
                const noteContent = note.note.trim();
                const noteId = 'note_' + noteContent.substring(0, 20).replace(/\s+/g, '_');
                return noteId === trackedNote.noteId;
            });
            
            if (matchingNote) {
                return {
                    ...trackedNote,
                    question: matchingNote.question,
                    note: matchingNote.note,
                    userName: matchingNote.userName || '',
                    userPhone: matchingNote.userPhone || '',
                    userEmail: matchingNote.userEmail || '',
                    timestamp: matchingNote.timestamp
                };
            }
            return trackedNote;
        });
        
        res.json({
            allNotes: allNotesWithContent,
            totalNotes: allNotesWithContent.length,
            lastUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting all notes:', error);
        res.status(500).json({ error: 'خطأ في قراءة جميع الملاحظات' });
    }
});

// Route لخدمة الصور
app.get('/images/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, 'images_accurate_english', filename);
    
    // التحقق من وجود الملف
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).json({ error: 'الصورة غير موجودة' });
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
            // حفظ التذكرة في قاعدة البيانات (اختياري)
            const ticketData = {
                ticketId,
                userEmail,
                userName,
                subject,
                description,
                priority,
                status: 'مفتوحة',
                createdAt: new Date().toISOString(),
                emailSent: true,
                emailMessageId: emailResult.messageId
            };
            
            console.log('🎫 تم فتح التذكرة:', ticketData);
            
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

// Route لـ DeepSeek API
app.post('/api/deepseek', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'الرسالة مطلوبة' });
        }

        // قراءة الدليل الأصلي
        let guideContent = '';
        try {
            guideContent = fs.readFileSync(path.join(__dirname, 'دليل_المستخدم_الشامل_الثاني_الأصلي.md'), 'utf8');
        } catch (error) {
            console.error('Error reading guide:', error);
        }

            // إضافة timeout للاتصال
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 ثانية

            try {
                // استخدام DeepSeek API مباشرة مع إعدادات محسنة
                const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer sk-f076f48ce45a48649afc87753889565f',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            {
                                role: "system",
                                content: `هذا المساعد موجَّه لمستخدمي albaseet.life باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`
                            },
                            {
                                role: "user",
                                content: message
                            }
                        ],
                        max_tokens: 2000,
                        temperature: 0.7,
                        stream: false
                    }),
                    signal: controller.signal,
                    timeout: 60000
                });
                
                clearTimeout(timeoutId);

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
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
                }
                if (fetchError.message.includes('Request was aborted')) {
                    throw new Error('انقطع الاتصال - يرجى المحاولة مرة أخرى');
                }
                if (fetchError.message.includes('timeout')) {
                    throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
                }
                if (fetchError.code === 'ECONNRESET' || fetchError.message.includes('ECONNRESET')) {
                    throw new Error('انقطع الاتصال بالخادم - يرجى المحاولة مرة أخرى');
                }
                if (fetchError.message.includes('APIUserAbortError')) {
                    throw new Error('انقطع الاتصال بالخادم - يرجى المحاولة مرة أخرى');
                }
                console.error('ChatGPT Connection Error:', fetchError);
                throw new Error(`خطأ في الاتصال: ${fetchError.message}`);
            }
        
    } catch (error) {
        console.error('DeepSeek API Error:', error);
        res.status(500).json({ 
            error: 'خطأ في معالجة الطلب',
            details: error.message 
        });
    }
});

// Route للتعليقات والتقييم (صفحة المقارنة)
app.post('/api/feedback/comparison', async (req, res) => {
    try {
        const { model, feedback, name, email, comment, timestamp, question } = req.body;
        
        const feedbackData = {
            model,
            feedback,
            name,
            email,
            comment,
            timestamp,
            question,
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
        
        // حفظ التعليق في ملف
        const feedbackFile = path.join(__dirname, 'comparison_feedback.json');
        let feedbacks = [];
        
        try {
            const data = fs.readFileSync(feedbackFile, 'utf8');
            feedbacks = JSON.parse(data);
        } catch (error) {
            // الملف غير موجود، إنشاء جديد
        }
        
        feedbacks.push(feedbackData);
        fs.writeFileSync(feedbackFile, JSON.stringify(feedbacks, null, 2));
        
        res.json({ 
            success: true, 
            message: 'تم حفظ التعليق بنجاح',
            id: feedbackData.id
        });
        
    } catch (error) {
        console.error('Feedback API Error:', error);
        res.status(500).json({ 
            error: 'خطأ في معالجة التعليق',
            details: error.message 
        });
    }
});

// Route للـ API
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'الرسالة مطلوبة' });
        }

        let response, aiResponse;

        // قراءة الدليل الأصلي وتحليله
        try {
            // قراءة الدليل الأصلي
            const guideContent = fs.readFileSync(path.join(__dirname, 'دليل_المستخدم_الشامل_الثاني_الأصلي.md'), 'utf8');
            
            // استخدام الدليل الأصلي
            const compressedGuide = guideContent;
            
            const enhancedSystemMessage = systemMessage + `

=== دليل المستخدم الشامل لـ witsUP ===

${compressedGuide}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`;
            
            try {
                response = await client.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: enhancedSystemMessage
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.7
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
                console.error('ChatGPT Connection Error:', fetchError);
                throw new Error(`خطأ في الاتصال: ${fetchError.message}`);
            }
            
            // معالجة الاستجابة
            console.log("Full response structure:", JSON.stringify(response, null, 2));
            aiResponse = response.choices?.[0]?.message?.content || "لم يتم الحصول على استجابة";
            
            console.log("GPT-5 Response:", aiResponse);
            
        } catch (error) {
            console.error("Error calling OpenAI:", error.message);
            console.error("Full error:", error);
            aiResponse = `عذراً، حدث خطأ في معالجة طلبك. التفاصيل: ${error.message}. يرجى المحاولة مرة أخرى.`;
        }
        
        // إنشاء معرف فريد للجلسة
        const sessionId = generateSessionId();
        
        // البحث عن الصور المناسبة
        const relevantImages = findRelevantImages(message);
        
        console.log("Relevant Images:", relevantImages.length, "images found");
        
        res.json({ 
            response: aiResponse,
            model: response?.model || "gpt-5-2025-08-07",
            usage: response?.usage,
            sessionId: sessionId,
            question: message,
            images: relevantImages || []
        });
        
    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ 
            error: 'خطأ: مفتاح API غير صحيح',
            details: error.message 
        });
    }
});

// Route لحفظ التقييم
app.post('/api/feedback', async (req, res) => {
    try {
        const { sessionId, question, answer, rating, note, userName, userPhone, userEmail } = req.body;
        
        if (!sessionId || !rating) {
            return res.status(400).json({ error: 'معرف الجلسة والتقييم مطلوبان' });
        }

        const feedbackData = {
            sessionId,
            question: question || '',
            answer: answer || '',
            rating, // 'positive' أو 'negative'
            note: note || '', // الملاحظة في حالة التقييم السلبي
            userName: userName || '', // الاسم (اختياري)
            userPhone: userPhone || '', // رقم الجوال (اختياري)
            userEmail: userEmail || '', // البريد الإلكتروني (اختياري)
            userAgent: req.headers['user-agent'] || '',
            ip: req.ip || req.connection.remoteAddress
        };

        const saved = saveFeedback(feedbackData);
        
        if (saved) {
            console.log(`📊 تم حفظ التقييم: ${rating} - الجلسة: ${sessionId}`);
            res.json({ 
                success: true,
                message: 'تم حفظ التقييم بنجاح'
            });
        } else {
            res.status(500).json({ 
                error: 'فشل في حفظ التقييم'
            });
        }
        
    } catch (error) {
        console.error('Feedback API Error:', error);
        res.status(500).json({ 
            error: 'خطأ في حفظ التقييم',
            details: error.message 
        });
    }
});

// Route لعرض احصائيات التقييم (اختياري للمطور)
app.get('/api/feedback/stats', (req, res) => {
    try {
        const feedbackData = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
        const evaluations = feedbackData.evaluations;
        
        const stats = {
            total: evaluations.length,
            positive: evaluations.filter(e => e.rating === 'positive').length,
            negative: evaluations.filter(e => e.rating === 'negative').length,
            withNotes: evaluations.filter(e => e.note && e.note.trim() !== '').length,
            recent: evaluations.slice(-10) // آخر 10 تقييمات
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
    }
});

// Route للمحادثة المستمرة مع DeepSeek
app.post('/api/deepseek-chat', async (req, res) => {
    try {
        const { question, conversationHistory = [] } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'السؤال مطلوب' });
        }

        // قراءة الدليل
        let guideContent = '';
        try {
            guideContent = fs.readFileSync(path.join(__dirname, 'دليل_المستخدم_الشامل_الثاني_الأصلي.md'), 'utf8');
        } catch (error) {
            console.error('Error reading guide:', error);
        }

        // إعداد الرسائل مع تاريخ المحادثة
        const messages = [
            {
                role: "system",
                content: `هذا المساعد موجَّه لمستخدمي albaseet.life باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`
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
                timeout: 30000 // 30 ثانية timeout
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

        // قراءة الدليل
        let guideContent = '';
        try {
            guideContent = fs.readFileSync(path.join(__dirname, 'دليل_المستخدم_الشامل_الثاني_الأصلي.md'), 'utf8');
        } catch (error) {
            console.error('Error reading guide:', error);
        }

        // إعداد الرسائل مع تاريخ المحادثة
        const messages = [
            {
                role: "system",
                content: `هذا المساعد موجَّه لمستخدمي albaseet.life باللغة العربية لإرشادهم للوصول لأي جزء من الموقع خطوة بخطوة، مع الالتزام التام بما هو موجود في الملفات المرفوعة فقط.

الإرشاد على الموقع:
- راجع الترتيب الشجري للأقسام دائمًا واشرح طريق الوصول بدقة (قائمة > قسم > صفحة...).
- عند وجود أكثر من خيار مناسب، اسأل المستخدم عن الأنسب قبل المتابعة.
- امتنع عن تقديم معلومات غير موجودة في الملفات المرفوعة.

=== دليل المستخدم الشامل لـ witsUP ===

${guideContent}

استخدم المعلومات من الدليل فقط للإجابة على الأسئلة. عند الإجابة راجع الترتيب الشجري لكل أقسام الموقع واشرح للمستخدم آلية الوصول للجزء المطلوب خطوة بخطوة.`
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`📱 يمكن الوصول للتطبيق محلياً على: http://localhost:${PORT}`);
    console.log(`🌐 يمكن الوصول للتطبيق من الإنترنت على: http://195.26.255.117:${PORT}`);
});