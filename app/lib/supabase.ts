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

// Test the connection using async/await
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
        if (err instanceof Error) {
            console.error('Raw query error:', {
                name: err.name,
                message: err.message,
                stack: err.stack
            });
        } else {
            console.error('Unknown error:', err);
        }
    }
};

// Run the test
testConnection();

// Test if we can list all tables
supabase
    .from('_tables')
    .select('*')
    .then(response => {
        console.log('Tables in database:', response);
    })
    .catch(err => {
        console.error('Error listing tables:', err);
    });

// Test if we can make any query at all
supabase
    .rpc('version')
    .then(response => {
        console.log('Database version:', response);
    })
    .catch(err => {
        console.error('Error getting version:', err);
    }); 