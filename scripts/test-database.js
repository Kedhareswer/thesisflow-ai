const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBioColumn() {
  console.log('Testing bio column in user_profiles table...');
  
  try {
    // 1. Test inserting a profile with bio
    console.log('\n1. Testing bio insert...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const testBio = 'This is a test bio to verify the column works properly';
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: testUserId,
        display_name: 'Test User',
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
      console.error('❌ Error inserting test profile:', insertError);
      console.error('This suggests the bio column might not exist or there are permission issues');
      return;
    }

    console.log('✅ Test profile inserted successfully:', insertData);

    // 2. Verify the bio was saved
    console.log('\n2. Verifying bio was saved...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('id, display_name, bio, location, institution')
      .eq('id', testUserId)
      .single();

    if (verifyError) {
      console.error('Error verifying bio:', verifyError);
      return;
    }

    console.log('✅ Bio verification successful:', verifyData);
    console.log('Bio content:', verifyData.bio);

    // 3. Test updating bio
    console.log('\n3. Testing bio update...');
    const updatedBio = 'This is an updated test bio';
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

    // 4. Clean up test data
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

    // 5. Show existing profiles with bio
    console.log('\n5. Checking existing profiles with bio...');
    const { data: existingProfiles, error: existingError } = await supabase
      .from('user_profiles')
      .select('id, display_name, bio, location, institution')
      .not('bio', 'is', null)
      .limit(5);

    if (existingError) {
      console.error('Error checking existing profiles:', existingError);
      return;
    }

    console.log('Existing profiles with bio:', existingProfiles);

    console.log('\n🎉 Bio column test completed successfully!');
    console.log('The bio column is working properly and can be used in the profile page.');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBioColumn(); 