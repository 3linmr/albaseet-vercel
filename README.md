# witsUP Assistant Chat

مساعد ذكي لنظام witsUP يوفر الدعم الفني والإجابة على الأسئلة المتعلقة بالنظام.

## المميزات

- 💬 **محادثة ذكية**: تفاعل طبيعي مع المستخدمين
- 🌙 **الوضع الليلي**: تبديل سهل بين الوضع الفاتح والداكن
- 🌐 **دعم اللغات**: العربية والإنجليزية
- 📱 **تصميم متجاوب**: يعمل على جميع الأجهزة
- 🎧 **نظام التذاكر**: إرسال تذاكر الدعم الفني إلى Trello
- 📞 **دعم الواتساب**: إرسال مباشر عبر الواتساب

## التقنيات المستخدمة

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Vercel Serverless Functions
- **AI**: DeepSeek API
- **Integration**: Zapier + Trello
- **Deployment**: Vercel

## التثبيت والتشغيل

### محلياً

```bash
# استنساخ المشروع
git clone <repository-url>
cd witsup-assistant

# تثبيت المتطلبات
npm install

# تشغيل محلياً
python3 -m http.server 3000
```

### على Vercel

```bash
# تثبيت Vercel CLI
npm i -g vercel

# رفع المشروع
vercel --prod
```

## إعداد المتغيرات البيئية

### على Vercel:
1. اذهب إلى Project Settings > Environment Variables
2. أضف المتغيرات التالية:

```
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### محلياً:
أنشئ ملف `.env.local` وأضف:

```
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### إعداد البريد الإلكتروني:
النظام يستخدم nodemailer مع إعدادات SMTP مدمجة.

## الاستخدام

1. افتح التطبيق في المتصفح
2. ابدأ المحادثة مع المساعد
3. استخدم الأزرار للتحكم في الوضع الليلي واللغة
4. أرسل تذاكر الدعم الفني عند الحاجة

## المساهمة

نرحب بالمساهمات! يرجى:

1. عمل Fork للمشروع
2. إنشاء branch جديد
3. إجراء التغييرات
4. إرسال Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT.
# Updated Sun Oct 19 10:22:14 +03 2025
