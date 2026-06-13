/**
 * RESET PASSWORD UTILITY SCRIPT
 * 
 * Run this script to reset the admin and servulo passwords directly in Supabase
 * using your service role key.
 * 
 * Usage:
 *   node scripts/reset_passwords.js
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

async function reset() {
  console.log('🚀 Starting password reset script...');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env file.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Reset targets
  const targets = [
    { username: 'admin', password: 'auraadmin123' },
    { username: 'servulo', password: 'servulo26' }
  ];

  console.log('📡 Fetching all auth users from Supabase Auth...');
  const { data: authData, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing auth users:', listError.message);
    process.exit(1);
  }

  const authUsers = authData.users || [];

  for (const t of targets) {
    const email = `${t.username.toLowerCase()}@auramathquest.local`;
    console.log(`\n🔑 Processing reset for: "${t.username}" (Email: ${email})`);

    const existingAuthUser = authUsers.find(au => au.email === email);
    if (!existingAuthUser) {
      console.error(`⚠️ Auth record not found for ${email}. Make sure to run migrate_users.js first.`);
      continue;
    }

    const authId = existingAuthUser.id;

    // 1. Force update password in auth.users
    console.log(`🔄 Updating password in Supabase Auth to: "${t.password}"...`);
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(authId, {
      password: t.password
    });

    if (authUpdateError) {
      console.error(`❌ Failed to update password in Auth:`, authUpdateError.message);
      continue;
    } else {
      console.log(`✓ Auth password updated successfully.`);
    }

    // 2. Sync to public.users table as well
    console.log(`🔄 Syncing password in public.users table...`);
    const { error: dbUpdateError } = await supabase
      .from('users')
      .update({ password: t.password })
      .eq('id', authId);

    if (dbUpdateError) {
      console.error(`❌ Failed to update public.users table:`, dbUpdateError.message);
    } else {
      console.log(`✓ public.users table updated successfully.`);
    }
  }

  console.log('\n🎉 Password reset completed successfully!');
  console.log('Try logging in now with:');
  console.log('- User: admin / Pass: auraadmin123');
  console.log('- User: servulo / Pass: servulo26');
}

reset().catch(err => {
  console.error('❌ Critical error during reset execution:', err);
});
