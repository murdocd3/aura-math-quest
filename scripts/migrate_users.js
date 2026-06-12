/**
 * SUPABASE USERS MIGRATION SCRIPT
 * 
 * This script runs one-off on the developer's machine to normalize
 * all public user records and synchronize them with Supabase Auth.
 * 
 * Usage:
 *   node scripts/migrate_users.js
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env file manually to avoid dependency issues
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const vars = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          vars[key] = val;
        }
      }
    });
  }
  return vars;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  console.log('🚀 Starting Supabase Users Migration...');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env file.');
    console.log('\nMake sure your .env has:');
    console.log('VITE_SUPABASE_URL=https://your-project.supabase.co');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key');
    process.exit(1);
  }

  // Initialize Supabase admin client using the service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 1. Fetch all public users
  console.log('📡 Fetching public profiles from public.users...');
  const { data: publicUsers, error: fetchError } = await supabase
    .from('users')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching public users:', fetchError);
    process.exit(1);
  }

  console.log(`🔍 Found ${publicUsers.length} profiles in public.users.`);

  // 2. Fetch all auth users
  console.log('📡 Fetching authenticated users from Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error listing auth users:', authError);
    process.exit(1);
  }

  const authUsers = authData.users || [];
  console.log(`🔍 Found ${authUsers.length} users in Supabase Auth.`);

  let createdCount = 0;
  let updatedCount = 0;
  let syncedCount = 0;

  for (const u of publicUsers) {
    const username = u.username.trim();
    const email = `${username.toLowerCase()}@auramathquest.local`;
    
    // We expect the password to be either a plain text password or a hash.
    // If it's a mockhash, we use a fallback password 'Alunotemp123!' so the user can login
    // and let them know. If it's plain text, we use that directly.
    const isMockHashed = u.password.startsWith('mockhash_');
    const targetPassword = isMockHashed ? 'Alunotemp123!' : u.password;

    console.log(`\n--------------------------------------------`);
    console.log(`👤 Processing user: "${username}" (ID: ${u.id})`);

    // Check if auth user exists
    const existingAuthUser = authUsers.find(au => au.email === email);
    let authId = '';

    if (existingAuthUser) {
      authId = existingAuthUser.id;
      console.log(`✅ Auth record exists (UUID: ${authId}).`);
      
      // Update password in auth.users to match current value
      console.log(`🔄 Syncing password to Supabase Auth...`);
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authId, {
        password: targetPassword
      });

      if (updateAuthError) {
        console.error(`⚠️ Failed to sync password for ${username}:`, updateAuthError.message);
      } else {
        console.log(`✓ Password synchronized successfully.`);
        updatedCount++;
      }
    } else {
      // Create new user in auth.users
      console.log(`➕ No Auth record found. Creating new user in Supabase Auth...`);
      const { data: newAuthData, error: createAuthError } = await supabase.auth.admin.createUser({
        email,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          username: username,
          role: u.role
        }
      });

      if (createAuthError) {
        console.error(`❌ Failed to create auth record for ${username}:`, createAuthError.message);
        continue;
      }

      authId = newAuthData.user.id;
      console.log(`✓ Auth record created (UUID: ${authId}).`);
      createdCount++;
    }

    // 3. Propagate UUID to public tables if they differ
    if (u.id !== authId) {
      console.log(`🔄 Cascading ID update from "${u.id}" to "${authId}"...`);

      // Update public.users
      const { error: err1 } = await supabase.from('users').update({ id: authId }).eq('id', u.id);
      if (err1) console.error(`  ⚠️ Failed to update users table:`, err1.message);

      // Update game_states
      const { error: err2 } = await supabase.from('game_states').update({ user_id: authId }).eq('user_id', u.id);
      if (err2) console.error(`  ⚠️ Failed to update game_states table:`, err2.message);

      // Update pets
      const { error: err3 } = await supabase.from('pets').update({ user_id: authId }).eq('user_id', u.id);
      if (err3) console.error(`  ⚠️ Failed to update pets table:`, err3.message);

      // Update math_statistics
      const { error: err4 } = await supabase.from('math_statistics').update({ user_id: authId }).eq('user_id', u.id);
      if (err4) console.error(`  ⚠️ Failed to update math_statistics table:`, err4.message);

      console.log(`✓ Cascading completed.`);
      syncedCount++;
    } else {
      console.log(`✓ ID references are already in sync.`);
    }

    // Optional: Update public.users.password to the plain text password for audit triggers,
    // or keep it consistent.
    if (isMockHashed) {
      console.log(`⚠️ Note: Password was hashed (${u.password}). Reset to: "Alunotemp123!"`);
      await supabase.from('users').update({ password: 'Alunotemp123!' }).eq('id', authId);
    }
  }

  console.log(`\n============================================`);
  console.log('🎉 Migration Completed successfully!');
  console.log(`- Created Auth records: ${createdCount}`);
  console.log(`- Updated Auth passwords: ${updatedCount}`);
  console.log(`- Cascaded ID references: ${syncedCount}`);
  console.log(`============================================`);
}

run().catch(err => {
  console.error('❌ Critical error during script execution:', err);
});
