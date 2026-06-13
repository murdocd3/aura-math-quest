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
const serviceKey = env.VITE_SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, serviceKey);

async function diagnoseLeaderboard() {
  console.log('=== DIAGNÓSTICO DO RANK DE AURA ===\n');

  // 1. Fetch users
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, username, role');
  
  if (usersErr) {
    console.error('❌ Erro ao buscar users:', usersErr);
    return;
  }
  console.log(`✅ ${users.length} usuários encontrados:`);
  users.forEach(u => console.log(`   - ${u.username} (${u.role}) | id: ${u.id}`));
  
  // 2. Fetch game_states
  const { data: states, error: statesErr } = await supabase
    .from('game_states')
    .select('user_id, aura_level, rebirths, gems, equipped_pet_id, equipped_cosmetic_id, active_class, aura_color, clan_id, clan_contributions, total_play_time_seconds, selected_operation, unlocked_skills, updated_at');
  
  if (statesErr) {
    console.error('❌ Erro ao buscar game_states:', statesErr);
    return;
  }
  console.log(`\n✅ ${states.length} game_states encontrados:`);
  states.forEach(s => {
    const user = users.find(u => u.id === s.user_id);
    console.log(`   - ${user?.username || 'UNKNOWN'} | Lvl: ${s.aura_level} | Rebirths: ${s.rebirths} | Gems: ${s.gems} | Pet: ${s.equipped_pet_id || 'none'} | Class: ${s.active_class || 'none'} | Color: ${s.aura_color} | Updated: ${s.updated_at}`);
  });

  // 3. Check for users WITHOUT game_states
  console.log('\n=== USUÁRIOS SEM GAME_STATE ===');
  const stateUserIds = new Set(states.map(s => s.user_id));
  const usersWithoutState = users.filter(u => !stateUserIds.has(u.id));
  if (usersWithoutState.length === 0) {
    console.log('   ✅ Todos os usuários possuem game_state');
  } else {
    console.log(`   ⚠️ ${usersWithoutState.length} usuários SEM game_state:`);
    usersWithoutState.forEach(u => console.log(`      - ${u.username} (id: ${u.id})`));
  }

  // 4. Check for game_states WITHOUT users (orphans)
  console.log('\n=== GAME_STATES ÓRFÃOS ===');
  const userIds = new Set(users.map(u => u.id));
  const orphanStates = states.filter(s => !userIds.has(s.user_id));
  if (orphanStates.length === 0) {
    console.log('   ✅ Nenhum game_state órfão');
  } else {
    console.log(`   ⚠️ ${orphanStates.length} game_states sem usuário associado:`);
    orphanStates.forEach(s => console.log(`      - user_id: ${s.user_id} | Lvl: ${s.aura_level}`));
  }

  // 5. Simulate the exact leaderboard output
  console.log('\n=== SIMULAÇÃO DO LEADERBOARD (como o app gera) ===');
  const leaderboard = users.map(u => {
    const state = states.find(s => s.user_id === u.id) || {
      aura_level: 1, rebirths: 0, gems: 0, equipped_pet_id: null,
      aura_color: '#00ffcc', active_class: null
    };
    return {
      username: u.username,
      level: state.aura_level ?? 1,
      rebirths: state.rebirths ?? 0,
      gems: state.gems ?? 0,
      class: state.active_class || 'none',
      color: state.aura_color || '#00ffcc',
      hasRealData: states.some(s => s.user_id === u.id)
    };
  }).sort((a, b) => {
    if (b.rebirths !== a.rebirths) return b.rebirths - a.rebirths;
    return b.level - a.level;
  });

  leaderboard.forEach((e, i) => {
    const badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
    const dataTag = e.hasRealData ? '✅ REAL' : '⚠️ DEFAULT';
    console.log(`   ${badge} ${e.username} | Lvl ${e.level} | R${e.rebirths} | 💎${e.gems} | ${e.class} | [${dataTag}]`);
  });

  // 6. Check RLS policies
  console.log('\n=== VERIFICAÇÃO RLS ===');
  // Try reading with anon key
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const anonClient = createClient(url, anonKey);
  
  const { data: anonUsers, error: anonUsersErr } = await anonClient
    .from('users')
    .select('id, username');
  
  const { data: anonStates, error: anonStatesErr } = await anonClient
    .from('game_states')
    .select('user_id, aura_level, rebirths, gems');

  console.log(`   Anon users query: ${anonUsersErr ? '❌ ' + anonUsersErr.message : '✅ ' + (anonUsers?.length || 0) + ' rows'}`);
  console.log(`   Anon game_states query: ${anonStatesErr ? '❌ ' + anonStatesErr.message : '✅ ' + (anonStates?.length || 0) + ' rows'}`);

  if (anonStates && anonStates.length > 0) {
    console.log('\n   Dados via anon key (como o browser vê):');
    anonStates.forEach(s => {
      const user = users.find(u => u.id === s.user_id);
      console.log(`      - ${user?.username || s.user_id} | Lvl: ${s.aura_level} | R: ${s.rebirths} | 💎${s.gems}`);
    });
  }

  if (anonUsers && anonStates) {
    // Check discrepancy
    const anonStateIds = new Set(anonStates.map(s => s.user_id));
    const anonUsersWithout = anonUsers.filter(u => !anonStateIds.has(u.id));
    if (anonUsersWithout.length > 0) {
      console.log(`\n   ⚠️ ${anonUsersWithout.length} usuários visíveis SEM game_state (via anon):`);
      anonUsersWithout.forEach(u => console.log(`      - ${u.username} (id: ${u.id})`));
      console.log('   → Estes usuários aparecerão com dados ZERADOS no rank!');
    }
  }
}

diagnoseLeaderboard().catch(console.error);
