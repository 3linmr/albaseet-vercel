-- إنشاء جدول التذاكر في Supabase
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    last_question TEXT,
    last_answer TEXT,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_tickets_email ON tickets(email);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

-- تفعيل Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة للسماح بإدراج التذاكر
CREATE POLICY "Allow ticket creation" ON tickets
    FOR INSERT WITH CHECK (true);

-- إنشاء سياسة للسماح بقراءة التذاكر (يمكن تخصيصها حسب الحاجة)
CREATE POLICY "Allow ticket reading" ON tickets
    FOR SELECT USING (true);
