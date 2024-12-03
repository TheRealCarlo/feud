import { createClient } from '@supabase/supabase-js'

// Debug environment variables
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
// Don't log the full key for security, just check if it exists and show first few chars
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 6) + '...');

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

// Combine all tests into a single async function
const testSupabaseConnection = async () => {
    try {
        // Test basic connection
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

        // Test listing tables
        try {
            const { data: tables, error: tablesError } = await supabase
                .from('_tables')
                .select('*');
                
            if (tablesError) {
                console.error('Error listing tables:', tablesError);
            } else {
                console.log('Tables in database:', tables);
            }
        } catch (err) {
            console.error('Error accessing tables:', err);
        }

        // Test database version
        try {
            const { data: version, error: versionError } = await supabase
                .rpc('version');
                
            if (versionError) {
                console.error('Error getting version:', versionError);
            } else {
                console.log('Database version:', version);
            }
        } catch (err) {
            console.error('Error checking version:', err);
        }

    } catch (err) {
        if (err instanceof Error) {
            console.error('Supabase test error:', {
                name: err.name,
                message: err.message,
                stack: err.stack
            });
        } else {
            console.error('Unknown error during Supabase tests:', err);
        }
    }
};

// Run all tests
testSupabaseConnection(); 