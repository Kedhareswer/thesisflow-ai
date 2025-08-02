const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyBioFix() {
  console.log('🔍 Verifying bio column fix...');
  
  try {
    // Test inserting a profile with bio
    console.log('\n1. Testing bio insert...');
    const testUserId = '00000000-0000-0000-0000-000000000003';
    const testBio = 'This is a verification test bio';
    const testEmail = 'test-verification@example.com';
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: testUserId,
        email: testEmail,
        display_name: 'Verification Test User',
        bio: testBio,
        location: 'Test Location',
        website: 'https://test.com',
        institution: 'Test Institution',
        position: 'Test Position'
      }, {
        onConflict: 'id'
      })
      .select();

    if (insertError) {
      console.error('❌ Bio column still not working:', insertError);
      console.error('Please run the SQL migration in Supabase SQL Editor');
      console.error('The error suggests the bio column or other fields are missing');
      return;
    }

    console.log('✅ Bio insert successful:', insertData);

    // Verify the bio was saved
    console.log('\n2. Verifying bio was saved...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, bio, location, institution, position')
      .eq('id', testUserId)
      .single();

    if (verifyError) {
      console.error('Error verifying bio:', verifyError);
      return;
    }

    console.log('✅ Bio verification successful:', verifyData);
    console.log('Email:', verifyData.email);
    console.log('Bio content:', verifyData.bio);
    console.log('Display name:', verifyData.display_name);
    console.log('Location:', verifyData.location);
    console.log('Institution:', verifyData.institution);
    console.log('Position:', verifyData.position);

    // Test updating bio
    console.log('\n3. Testing bio update...');
    const updatedBio = 'This is an updated verification test bio';
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ bio: updatedBio })
      .eq('id', testUserId)
      .select();

    if (updateError) {
      console.error('Error updating bio:', updateError);
      return;
    }

    console.log('✅ Bio update successful:', updateData);

    // Clean up test data
    console.log('\n4. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testUserId);

    if (deleteError) {
      console.error('Error cleaning up test data:', deleteError);
      return;
    }

    console.log('✅ Test data cleaned up successfully');

    console.log('\n🎉 Bio column fix verification completed successfully!');
    console.log('The bio column and all profile fields are now working properly.');
    console.log('\nYou can now:');
    console.log('1. Go to the Profile page');
    console.log('2. Add a bio in the text area');
    console.log('3. Fill in other profile fields (location, institution, etc.)');
    console.log('4. Click "Save Profile"');
    console.log('5. The bio and all fields should save without errors');

  } catch (error) {
    console.error('Verification failed:', error);
  }
}

verifyBioFix(); 