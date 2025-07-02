const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables:');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Present' : 'Missing');
    console.error('\nPlease ensure your .env.local file is properly configured.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read the migration file
  const migrationPath = path.join(__dirname, 'fix-team-members-foreign-key.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running database migration...');
  console.log('Supabase URL:', supabaseUrl);

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully!');
    console.log('Result:', data);
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();
