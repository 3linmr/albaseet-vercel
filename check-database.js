const { createClient } = require('@supabase/supabase-js');

async function checkDatabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Supabase credentials not found');
        return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
        console.log('🔍 Checking database...');
        
        // Check if table exists
        const { data, error } = await supabase
            .from('guide_content')
            .select('id, LENGTH(content) as content_length, created_at')
            .limit(5);
        
        if (error) {
            console.log('❌ Error:', error.message);
            return;
        }
        
        if (data && data.length > 0) {
            console.log('✅ Database has data:');
            data.forEach(row => {
                console.log(`- ID: ${row.id}, Length: ${row.content_length}, Created: ${row.created_at}`);
            });
        } else {
            console.log('❌ No data found in database');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

checkDatabase();
