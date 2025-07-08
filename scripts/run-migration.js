const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('='.repeat(60));
  console.log('API Keys Migration - Manual Setup Required');
  console.log('='.repeat(60));
  
  // Read the migration file
  const migrationPath = path.join(__dirname, 'user-api-keys-migration.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('\nTo update your database to store API keys in plain text:');
  console.log('\n1. Go to your Supabase dashboard');
  console.log('2. Open the SQL Editor');
  console.log('3. Copy and paste the following SQL:');
  console.log('\n' + '='.repeat(60));
  console.log(migrationSQL);
  console.log('='.repeat(60));
  console.log('\n4. Click "Run" to execute the migration');
  console.log('\nThis will:');
  console.log('- Rename the api_key_encrypted column to api_key');
  console.log('- Update all functions to work with plain text keys');
  console.log('- Preserve existing data (you may need to re-enter your API keys)');
  console.log('\nNote: Existing encrypted keys will need to be re-entered as plain text.');
}

runMigration();
