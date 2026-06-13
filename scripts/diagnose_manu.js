import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const vars = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      vars[key] = value;
    }
  }
  return vars;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY não está definido no arquivo .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('=== DIAGNÓSTICO DO USUÁRIO MANU ===\n');

  const targetUsername = 'manu';
  const targetEmail = `${targetUsername}@auramathquest.local`;

  // 1. Check in public.users table
  console.log('1. Verificando na tabela public.users...');
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('*')
    .eq('username', targetUsername);
  
  if (publicError) {
    console.error('Erro ao consultar public.users:', publicError);
  } else {
    console.log(`Resultado em public.users:`, publicUsers);
  }

  // 2. Check in Supabase Auth via Admin API (listUsers)
  console.log('\n2. Verificando no Supabase Auth (auth.users)...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Erro ao listar usuários do Supabase Auth:', authError);
  } else {
    console.log('\n--- TODOS OS USUÁRIOS NO AUTH ---');
    authUsers.users.forEach(u => {
      console.log(`   - ID: ${u.id} | Email: ${u.email} | UserMetadata:`, u.user_metadata);
    });

    const foundAuth = authUsers.users.filter(u => 
      u.email?.toLowerCase().includes(targetUsername) || 
      (u.user_metadata?.username)?.toLowerCase().includes(targetUsername)
    );
    console.log(`\nEncontrado no Auth (contém 'manu') (${foundAuth.length}):`, foundAuth.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      user_metadata: u.user_metadata
    })));

    // Also get all public.users
    const { data: allPublic, error: allPublicErr } = await supabase.from('users').select('id, username, role');
    console.log('\n--- TODOS OS USUÁRIOS NO PUBLIC.USERS ---');
    if (allPublicErr) {
      console.error('Erro ao buscar todos em public.users:', allPublicErr);
    } else {
      allPublic.forEach(u => {
        console.log(`   - ID: ${u.id} | Username: ${u.username} | Role: ${u.role}`);
      });
    }

    // Let's also check if they are in the auth list but not in public
    if (foundAuth.length > 0 && publicUsers.length === 0) {
      console.log('\n⚠️ INCONSISTÊNCIA DETECTADA: O usuário existe no Supabase Auth, mas NÃO existe na tabela public.users!');
      console.log('Isso explica por que informa "usuário já existe" ao tentar registrar, mas ele não consta na lista de usuários.');
      
      console.log('\nTentando sincronizar / corrigir a inconsistência recriando a linha em public.users...');
      const targetUser = foundAuth[0];
      const { error: insertErr } = await supabase.from('users').insert({
        id: targetUser.id,
        username: targetUsername,
        password: 'manu', // fallback / seeded password
        role: 'player'
      });
      if (insertErr) {
        console.error('❌ Erro ao inserir na tabela public.users:', insertErr);
      } else {
        console.log('✅ Inconsistência corrigida! Usuário inserido com sucesso em public.users.');
        
        // Also check if game state exists
        const { data: states, error: stateErr } = await supabase.from('game_states').select('*').eq('user_id', targetUser.id);
        if (!stateErr && states.length === 0) {
          console.log('Criando game_state padrão para o usuário...');
          const { error: insertStateErr } = await supabase.from('game_states').insert({
            user_id: targetUser.id,
            campaign_stage: 1,
            gems: 0,
            aura_level: 1,
            aura_xp: 0,
            aura_color: '#00ffcc',
            rebirths: 0,
            current_zone: 'forest',
            equipped_pet_id: null,
            active_auras: [],
            total_play_time_seconds: 0,
            purchased_cosmetics: [],
            equipped_cosmetic_id: null,
            selected_operation: 'multiplication',
            quest_wins: 0,
            quest_criticals: 0,
            quest_streak: 0,
            claimed_quests: [],
            active_class: null,
            skill_points: 0,
            unlocked_skills: [],
            clan_id: null,
            clan_contributions: 0
          });
          if (insertStateErr) console.error('Erro ao criar game_state:', insertStateErr);
          else console.log('✅ game_state criado com sucesso!');
        }
      }
    }
  }
}

run().catch(console.error);
