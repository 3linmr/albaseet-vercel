# إعداد قاعدة البيانات لحفظ الدليل

## الخطوات المطلوبة:

### 1. إنشاء جدول في Supabase
قم بتشغيل هذا SQL في Supabase SQL Editor:

```sql
-- Create table for guide content
CREATE TABLE guide_content (
  id SERIAL PRIMARY KEY,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_guide_content_id ON guide_content(id);

-- Enable RLS (Row Level Security)
ALTER TABLE guide_content ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" ON guide_content
FOR SELECT USING (true);
```

### 2. إدراج الدليل في قاعدة البيانات
بعد إنشاء الجدول، قم بتشغيل ملف `insert-guide.sql` في Supabase SQL Editor.

### 3. التحقق من البيانات
```sql
SELECT id, LENGTH(content) as content_length, created_at FROM guide_content;
```

## المميزات:

✅ **لا حدود على حجم الملف**: الدليل الكامل (386KB) بدون مشاكل
✅ **100,000 tokens**: بدون حدود Vercel
✅ **تحميل سريع**: من قاعدة البيانات
✅ **لا حدود Vercel**: حل مشكلة حدود Vercel تماماً

## النتيجة المتوقعة:

- الدليل سيُقرأ كاملاً من قاعدة البيانات
- لا توجد حدود على حجم المحتوى
- إجابات دقيقة بناءً على الدليل الكامل
- لا مزيد من "الاختراع" من الذكاء الاصطناعي
