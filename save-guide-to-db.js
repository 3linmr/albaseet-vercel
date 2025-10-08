const fs = require('fs');
const path = require('path');

// قراءة الدليل الكامل
const guidePath = path.join(__dirname, '../host/دليل_المستخدم_الشامل_الثاني_الأصلي.md');
const guideContent = fs.readFileSync(guidePath, 'utf8');

console.log('Guide content length:', guideContent.length);

// إنشاء SQL لحفظ الدليل في قاعدة البيانات
const sqlContent = `
-- إدراج الدليل الكامل في قاعدة البيانات
INSERT INTO guide_content (content) VALUES ('${guideContent.replace(/'/g, "''")}');

-- تحديث الدليل إذا كان موجوداً
UPDATE guide_content SET content = '${guideContent.replace(/'/g, "''")}' WHERE id = 1;
`;

// حفظ SQL في ملف
fs.writeFileSync(path.join(__dirname, 'insert-guide.sql'), sqlContent);

console.log('SQL file created successfully!');
console.log('Guide content size:', (guideContent.length / 1024 / 1024).toFixed(2), 'MB');
