import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true
        }
    }
)

// Simple connection test
const testConnection = async () => {
    try {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Supabase connection test failed:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
        } else {
            console.log('Supabase connection test succeeded:', data);
        }
    } catch (err) {
        console.error('Unexpected error during connection test:', err);
    }
};

testConnection(); 