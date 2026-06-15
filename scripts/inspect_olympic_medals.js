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

const supabase = createClient(url, serviceKey);

async function run() {
  console.log('Verificando se a coluna olympic_medals existe na tabela game_states...');
  const { data, error } = await supabase.from('game_states').select('*').limit(1);
  if (error) {
    console.error('Erro ao consultar game_states:', error);
  } else {
    console.log('Colunas de game_states retornadas:', Object.keys(data[0] || {}));
  }
}

run().catch(console.error);
