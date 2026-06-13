/**
 * FULL SYNC & PASSWORD RESET SCRIPT
 * 
 * Resets all user passwords (both Auth and Public) to 'Alunotemp123!' and 
 * synchronizes all user IDs to their proper Supabase Auth UUIDs.
 * 
 * Usage:
 *   node scripts/sync_reset_all.js
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env file manually
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
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = 'Alunotemp123!';

async function run() {
  console.log('🚀 Starting Full Database Sync & Password Reset...');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env file.');
    process.exit(1);
  }

  // Initialize admin client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Fetch public users
  console.log('📡 Fetching profiles from public.users...');
  const { data: publicUsers, error: fetchError } = await supabase
    .from('users')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching public users:', fetchError.message);
    process.exit(1);
  }
  console.log(`✓ Found ${publicUsers.length} profiles in public.users.`);

  // 2. Fetch auth users
  console.log('📡 Fetching authenticated users from Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error listing auth users:', authError.message);
    process.exit(1);
  }
  const authUsers = authData.users || [];
  console.log(`✓ Found ${authUsers.length} users in Supabase Auth.`);

  for (const u of publicUsers) {
    const username = u.username.trim();
    const email = `${username.toLowerCase()}@auramathquest.local`;
    console.log(`\n--------------------------------------------`);
    console.log(`👤 Processing user: "${username}" (Current ID in public table: "${u.id}")`);

    // Check if Auth user exists
    const existingAuthUser = authUsers.find(au => au.email === email);
    let authId = '';

    if (existingAuthUser) {
      authId = existingAuthUser.id;
      console.log(`✅ Auth record exists (UUID: ${authId}).`);

      // Reset password in auth.users
      console.log(`🔄 Setting Auth password to default: "${DEFAULT_PASSWORD}"...`);
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authId, {
        password: DEFAULT_PASSWORD
      });

      if (updateAuthError) {
        console.error(`  ❌ Failed to reset Auth password:`, updateAuthError.message);
      } else {
        console.log(`  ✓ Auth password reset successfully.`);
      }
    } else {
      // Create user in auth.users
      console.log(`➕ No Auth record found. Creating new account in Supabase Auth...`);
      const { data: newAuthData, error: createAuthError } = await supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          username: username,
          role: u.role
        }
      });

      if (createAuthError) {
        console.error(`  ❌ Failed to create Auth record:`, createAuthError.message);
        continue;
      }

      authId = newAuthData.user.id;
      console.log(`  ✓ Auth record created (UUID: ${authId}) with default password.`);
    }

    // 3. Update public.users.id to match authId (UUID)
    // This will cascade to game_states, pets, and stats if cascading is set up.
    if (u.id !== authId) {
      console.log(`🔄 Sincronizando ID público de "${u.id}" para "${authId}"...`);
      const { error: updateIdError } = await supabase
        .from('users')
        .update({ id: authId, password: DEFAULT_PASSWORD })
        .eq('id', u.id);

      if (updateIdError) {
        console.error(`  ❌ Failed to update ID in public.users:`, updateIdError.message);
        console.error(`  ⚠️ IMPORTANT: Make sure you applied the 'ON UPDATE CASCADE' SQL constraints in the Supabase Editor!`);
      } else {
        console.log(`  ✓ ID and password updated in public.users successfully.`);
      }
    } else {
      // If the ID was already correct, just update the password in public.users
      console.log(`🔄 Updating password in public.users to default...`);
      const { error: updatePwdError } = await supabase
        .from('users')
        .update({ password: DEFAULT_PASSWORD })
        .eq('id', authId);

      if (updatePwdError) {
        console.error(`  ❌ Failed to update password in public.users:`, updatePwdError.message);
      } else {
        console.log(`  ✓ public.users password updated.`);
      }
    }
  }

  console.log(`\n============================================`);
  console.log('🎉 Synchronization & password reset complete!');
  console.log(`All users now have the password: "${DEFAULT_PASSWORD}"`);
  console.log(`============================================`);
}

run().catch(err => console.error('❌ Critical error:', err));
