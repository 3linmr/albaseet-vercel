const SmartGuideLoader = require('./smart_guide_loader');

// اختبار النظام الذكي
const loader = new SmartGuideLoader();

console.log('=== اختبار النظام الذكي لتحميل الدليل ===\n');

// اختبار 1: البحث عن فواتير المبيعات
console.log('1. اختبار البحث عن "فاتورة مبيعات":');
const salesQuery = 'فاتورة مبيعات';
const salesContent = loader.getGuideContent(salesQuery);
console.log(`حجم المحتوى: ${salesContent.length} حرف`);
console.log(`أول 200 حرف: ${salesContent.substring(0, 200)}...\n`);

// اختبار 2: البحث عن التقارير
console.log('2. اختبار البحث عن "تقارير":');
const reportsQuery = 'تقارير';
const reportsContent = loader.getGuideContent(reportsQuery);
console.log(`حجم المحتوى: ${reportsContent.length} حرف`);
console.log(`أول 200 حرف: ${reportsContent.substring(0, 200)}...\n`);

// اختبار 3: البحث عن المحاسبة
console.log('3. اختبار البحث عن "محاسبة":');
const accountingQuery = 'محاسبة';
const accountingContent = loader.getGuideContent(accountingQuery);
console.log(`حجم المحتوى: ${accountingContent.length} حرف`);
console.log(`أول 200 حرف: ${accountingContent.substring(0, 200)}...\n`);

// اختبار 4: البحث عن كلمة عامة
console.log('4. اختبار البحث عن "من انت":');
const generalQuery = 'من انت';
const generalContent = loader.getGuideContent(generalQuery);
console.log(`حجم المحتوى: ${generalContent.length} حرف`);
console.log(`أول 200 حرف: ${generalContent.substring(0, 200)}...\n`);

console.log('=== انتهى الاختبار ===');
