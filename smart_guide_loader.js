const fs = require('fs');
const path = require('path');

class SmartGuideLoader {
    constructor() {
        this.partsDir = path.join(__dirname, 'guide_parts');
        this.index = {};
        this.loadGuideParts();
    }

    loadGuideParts() {
        try {
            const files = fs.readdirSync(this.partsDir);
            
            files.forEach(file => {
                if (file.endsWith('.md')) {
                    const content = fs.readFileSync(path.join(this.partsDir, file), 'utf8');
                    const lines = content.split('\n');
                    const title = lines[0]?.replace(/^# /, '') || '';
                    
                    // استخراج الكلمات المفتاحية
                    const keywords = this.extractKeywords(content);
                    
                    this.index[file] = {
                        title,
                        content,
                        keywords,
                        size: content.length
                    };
                }
            });
        } catch (error) {
            console.error('Error loading guide parts:', error);
            this.index = {};
        }
    }

    extractKeywords(content) {
        const keywords = [];
        
        // البحث عن العناوين الرئيسية
        const mainTitles = content.match(/^# (.+)$/gm) || [];
        mainTitles.forEach(title => {
            keywords.push(title.replace(/^# /, '').toLowerCase());
        });

        // البحث عن العناوين الفرعية
        const subTitles = content.match(/^## (.+)$/gm) || [];
        subTitles.forEach(title => {
            keywords.push(title.replace(/^## /, '').toLowerCase());
        });

        // البحث عن الكلمات المفتاحية الشائعة
        const commonKeywords = [
            'فاتورة', 'مبيعات', 'مشتريات', 'محاسبة', 'تقارير', 'مخازن',
            'عملاء', 'موردين', 'أصناف', 'جرد', 'ضريبة', 'دفع', 'قبض',
            'صرف', 'استلام', 'تسليم', 'مرتجع', 'عرض أسعار', 'طلب',
            'اتفاقية', 'بيع', 'شراء', 'نقد', 'آجل', 'حجز', 'تسعير'
        ];

        commonKeywords.forEach(keyword => {
            if (content.toLowerCase().includes(keyword)) {
                keywords.push(keyword);
            }
        });

        return [...new Set(keywords)]; // إزالة التكرار
    }

    findRelevantParts(query, maxSize = 100000) { // 100KB حد أقصى
        const queryLower = query.toLowerCase();
        const relevantParts = [];
        let totalSize = 0;

        // البحث في الكلمات المفتاحية
        for (const [filename, part] of Object.entries(this.index)) {
            if (totalSize + part.size > maxSize) break;

            const relevanceScore = this.calculateRelevance(part, queryLower);
            if (relevanceScore > 0) {
                relevantParts.push({
                    filename,
                    ...part,
                    relevanceScore
                });
                totalSize += part.size;
            }
        }

        // ترتيب حسب الصلة
        relevantParts.sort((a, b) => b.relevanceScore - a.relevanceScore);

        return relevantParts;
    }

    calculateRelevance(part, query) {
        let score = 0;
        
        // مطابقة في العنوان
        if (part.title.toLowerCase().includes(query)) {
            score += 10;
        }

        // مطابقة في الكلمات المفتاحية
        part.keywords.forEach(keyword => {
            if (query.includes(keyword)) {
                score += 5;
            }
            if (keyword.includes(query)) {
                score += 3;
            }
        });

        // مطابقة في المحتوى
        const contentLower = part.content.toLowerCase();
        const queryWords = query.split(' ');
        queryWords.forEach(word => {
            if (contentLower.includes(word)) {
                score += 1;
            }
        });

        return score;
    }

    getGuideContent(query) {
        try {
            const relevantParts = this.findRelevantParts(query);
            const maxSize = 50000; // حدود آمنة للـ tokens
            let currentSize = 0;
            
            if (relevantParts.length === 0) {
                // إذا لم نجد أجزاء ذات صلة، نعيد الأجزاء الأساسية
                return this.getBasicParts();
            }

            let content = '=== دليل المستخدم الشامل لـ witsUP ===\n\n';
            
            // إضافة الأجزاء الأساسية أولاً
            const basicFiles = ['00__witsUP_.md', '01_.md', '02__witsUP.md'];
            basicFiles.forEach(filename => {
                if (this.index[filename] && currentSize < maxSize) {
                    const partSize = this.index[filename].size;
                    if (currentSize + partSize < maxSize) {
                        content += this.index[filename].content + '\n\n';
                        currentSize += partSize;
                    }
                }
            });
            
            // إضافة الأجزاء ذات الصلة
            relevantParts.forEach(part => {
                if (currentSize + part.size < maxSize) {
                    content += part.content + '\n\n';
                    currentSize += part.size;
                }
            });

            return content;
        } catch (error) {
            console.error('Error in getGuideContent:', error);
            return this.getBasicParts();
        }
    }

    getBasicParts() {
        // الأجزاء الأساسية التي يجب أن تكون متاحة دائماً
        const basicFiles = [
            '00__witsUP_.md',
            '01_.md',
            '02__witsUP.md'
        ];

        let content = '=== دليل المستخدم الشامل لـ witsUP ===\n\n';
        
        basicFiles.forEach(filename => {
            if (this.index[filename]) {
                content += this.index[filename].content + '\n\n';
            }
        });

        return content;
    }
}

module.exports = SmartGuideLoader;
