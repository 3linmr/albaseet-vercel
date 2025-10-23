const fs = require('fs');
const path = require('path');

// قراءة الدليل الكامل
const guidePath = path.join(__dirname, 'دليل_المستخدم_الشامل_الثاني_الأصلي.md');
const guideContent = fs.readFileSync(guidePath, 'utf8');

// تقسيم الدليل إلى أجزاء
const sections = guideContent.split(/^# /m);

// إنشاء مجلد للأجزاء
const partsDir = path.join(__dirname, 'guide_parts');
if (!fs.existsSync(partsDir)) {
    fs.mkdirSync(partsDir);
}

// حفظ كل جزء في ملف منفصل
sections.forEach((section, index) => {
    if (section.trim()) {
        const sectionTitle = section.split('\n')[0] || `part_${index}`;
        const fileName = `${index.toString().padStart(2, '0')}_${sectionTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, '_')}.md`;
        const filePath = path.join(partsDir, fileName);
        
        fs.writeFileSync(filePath, `# ${section}`);
        console.log(`تم إنشاء: ${fileName}`);
    }
});

console.log(`تم تقسيم الدليل إلى ${sections.length} جزء`);
