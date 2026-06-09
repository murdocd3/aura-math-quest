import { createClient } from '@supabase/supabase-js';
import { mockDb, COSMETIC_ITEMS } from './mockDb';
import type { User, GameState, Pet, MathStatistic } from './mockDb';

/**
 * DATABASE SETUP SCHEMA FOR SUPABASE:
 * 
 * -- 1. Table: users
 * CREATE TABLE users (
 *   id TEXT PRIMARY KEY,
 *   username TEXT UNIQUE NOT NULL,
 *   password TEXT NOT NULL,
 *   role TEXT DEFAULT 'player',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 2. Table: game_states
 * CREATE TABLE game_states (
 *   user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 *   campaign_stage INT DEFAULT 1,
 *   gems INT DEFAULT 0,
 *   aura_level INT DEFAULT 1,
 *   aura_xp INT DEFAULT 0,
 *   aura_color TEXT DEFAULT '#00ffcc',
 *   rebirths INT DEFAULT 0,
 *   current_zone TEXT DEFAULT 'forest',
 *   equipped_pet_id TEXT,
 *   active_auras TEXT[] DEFAULT '{}',
 *   total_play_time_seconds INT DEFAULT 0,
 *   purchased_cosmetics TEXT[] DEFAULT '{}',
 *   equipped_cosmetic_id TEXT,
 *   selected_operation TEXT DEFAULT 'multiplication',
 *   quest_wins INT DEFAULT 0,
 *   quest_criticals INT DEFAULT 0,
 *   quest_streak INT DEFAULT 0,
 *   claimed_quests TEXT[] DEFAULT '{}',
 *   active_class TEXT,
 *   skill_points INT DEFAULT 0,
 *   unlocked_skills TEXT[] DEFAULT '{}',
 *   clan_id TEXT,
 *   clan_contributions INT DEFAULT 0,
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 2.5. Table: clans
 * CREATE TABLE clans (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   tag TEXT NOT NULL,
 *   motto TEXT,
 *   badge_emoji TEXT,
 *   members TEXT[] DEFAULT '{}',
 *   level INT DEFAULT 1,
 *   xp INT DEFAULT 0,
 *   leader_id TEXT,
 *   join_requests TEXT[] DEFAULT '{}'
 * );
 * 
 * -- 3. Table: pets
 * CREATE TABLE pets (
 *   id TEXT PRIMARY KEY,
 *   user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
 *   pet_type_id TEXT NOT NULL,
 *   nickname TEXT NOT NULL,
 *   rarity TEXT NOT NULL,
 *   buff_type TEXT NOT NULL,
 *   buff_value REAL NOT NULL,
 *   level INT DEFAULT 1,
 *   stars INT DEFAULT 1,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 4. Table: math_statistics
 * CREATE TABLE math_statistics (
 *   id TEXT PRIMARY KEY,
 *   user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
 *   question_key TEXT NOT NULL,
 *   incorrect_count INT DEFAULT 0,
 *   correct_count INT DEFAULT 0,
 *   total_time_taken_ms INT DEFAULT 0,
 *   UNIQUE(user_id, question_key)
 * );
 */

const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';

const isSupabaseEnabled = SUPABASE_URL.trim() !== '' && SUPABASE_ANON_KEY.trim() !== '';

export const supabase = isSupabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!isSupabaseEnabled) {
  console.warn(
    '🛡️ [BackendService] Supabase VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY not configured.\n' +
    '🛡️ [BackendService] Running in Offline mode, utilizing LocalStorage mockDb.'
  );
}

// Helpers for data mapping
const mapDbToGameState = (row: any): GameState => {
  const rawEquipped = row.equipped_cosmetic_id || null;
  let equippedCosmetics: Record<string, string> = {};
  let equippedCosmeticId: string | null = null;
  
  if (rawEquipped) {
    if (rawEquipped.startsWith('{')) {
      try {
        equippedCosmetics = JSON.parse(rawEquipped);
        const values = Object.values(equippedCosmetics);
        equippedCosmeticId = values.length > 0 ? values[0] : null;
      } catch (e) {
        console.error('Failed to parse equippedCosmetics JSON:', e);
      }
    } else {
      equippedCosmeticId = rawEquipped;
      const item = COSMETIC_ITEMS.find(c => c.id === rawEquipped);
      if (item) {
        equippedCosmetics = { [item.category]: rawEquipped };
      }
    }
  }

  return {
    userId: row.user_id,
    auraLevel: row.aura_level ?? 1,
    auraXp: row.aura_xp ?? 0,
    auraColor: row.aura_color ?? '#00ffcc',
    rebirths: row.rebirths ?? 0,
    gems: row.gems ?? 0,
    currentZone: row.current_zone ?? 'forest',
    equippedPetId: row.equipped_pet_id || null,
    activeAuras: row.active_auras ?? [],
    totalPlayTimeSeconds: row.total_play_time_seconds ?? 0,
    updatedAt: row.updated_at || new Date().toISOString(),
    purchasedCosmetics: row.purchased_cosmetics ?? [],
    equippedCosmetics,
    equippedCosmeticId,
    selectedOperation: row.selected_operation ?? 'multiplication',
    questWins: row.quest_wins ?? 0,
    questCriticals: row.quest_criticals ?? 0,
    questStreak: row.quest_streak ?? 0,
    claimedQuests: row.claimed_quests ?? [],
    classId: row.active_class || null,
    skillPoints: row.skill_points ?? 0,
    unlockedSkills: row.unlocked_skills ?? [],
    clanId: row.clan_id || null,
    clanContributions: row.clan_contributions ?? 0,
    campaignStage: row.campaign_stage ?? 1,
  };
};

const mapGameStateToDb = (state: Partial<GameState>) => {
  const dbRow: any = {};
  if (state.campaignStage !== undefined) dbRow.campaign_stage = state.campaignStage;
  if (state.gems !== undefined) dbRow.gems = state.gems;
  if (state.auraLevel !== undefined) dbRow.aura_level = state.auraLevel;
  if (state.auraXp !== undefined) dbRow.aura_xp = state.auraXp;
  if (state.auraColor !== undefined) dbRow.aura_color = state.auraColor;
  if (state.rebirths !== undefined) dbRow.rebirths = state.rebirths;
  if (state.currentZone !== undefined) dbRow.current_zone = state.currentZone;
  if (state.equippedPetId !== undefined) dbRow.equipped_pet_id = state.equippedPetId;
  if (state.activeAuras !== undefined) dbRow.active_auras = state.activeAuras;
  if (state.totalPlayTimeSeconds !== undefined) dbRow.total_play_time_seconds = state.totalPlayTimeSeconds;
  if (state.purchasedCosmetics !== undefined) dbRow.purchased_cosmetics = state.purchasedCosmetics;
  
  if (state.equippedCosmetics !== undefined) {
    dbRow.equipped_cosmetic_id = JSON.stringify(state.equippedCosmetics);
  } else if (state.equippedCosmeticId !== undefined) {
    dbRow.equipped_cosmetic_id = state.equippedCosmeticId;
  }
  
  if (state.selectedOperation !== undefined) dbRow.selected_operation = state.selectedOperation;
  if (state.questWins !== undefined) dbRow.quest_wins = state.questWins;
  if (state.questCriticals !== undefined) dbRow.quest_criticals = state.questCriticals;
  if (state.questStreak !== undefined) dbRow.quest_streak = state.questStreak;
  if (state.claimedQuests !== undefined) dbRow.claimed_quests = state.claimedQuests;
  if (state.classId !== undefined) dbRow.active_class = state.classId;
  if (state.skillPoints !== undefined) dbRow.skill_points = state.skillPoints;
  if (state.unlockedSkills !== undefined) dbRow.unlocked_skills = state.unlockedSkills;
  if (state.clanId !== undefined) dbRow.clan_id = state.clanId;
  if (state.clanContributions !== undefined) dbRow.clan_contributions = state.clanContributions;
  dbRow.updated_at = new Date().toISOString();
  return dbRow;
};

export const backendService = {
  isCloudConnected(): boolean {
    return isSupabaseEnabled && typeof window !== 'undefined' && window.navigator.onLine;
  },

  async buyCosmetic(userId: string, cosmeticId: string): Promise<GameState | null> {
    const cosmetic = COSMETIC_ITEMS.find(c => c.id === cosmeticId);
    if (!cosmetic) throw new Error('Item cosmético não encontrado.');

    const state = await this.getGameState(userId);
    if (!state) throw new Error('Estado do jogador não encontrado.');

    const purchased = state.purchasedCosmetics || [];
    if (purchased.includes(cosmeticId)) {
      throw new Error('Você já possui este cosmético.');
    }

    if (state.gems < cosmetic.cost) {
      throw new Error('Gemas insuficientes para comprar este cosmético.');
    }

    const updated = await this.updateGameState(userId, {
      gems: state.gems - cosmetic.cost,
      purchasedCosmetics: [...purchased, cosmeticId]
    });

    return updated;
  },

  async claimQuestReward(userId: string, questId: string, rewardGems: number): Promise<GameState | null> {
    const state = await this.getGameState(userId);
    if (!state) throw new Error('Estado do jogador não encontrado.');

    const claimed = state.claimedQuests || [];
    if (claimed.includes(questId)) {
      throw new Error('Recompensa de missão já resgatada.');
    }

    const updated = await this.updateGameState(userId, {
      gems: state.gems + rewardGems,
      claimedQuests: [...claimed, questId]
    });

    return updated;
  },

  // 1. User Queries & Management
  async getUsers(): Promise<User[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log('[BackendService] Fetching users from Supabase...');
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return (data || []).map(u => ({
          id: u.id,
          username: u.username,
          role: u.role as 'admin' | 'player',
          passwordHash: u.password,
          createdAt: u.created_at || new Date().toISOString()
        }));
      } catch (err) {
        console.error('[BackendService] Supabase error in getUsers:', err);
      }
    }
    return mockDb.getUsers();
  },

  async createUser(username: string, passwordPlain: string, role: 'admin' | 'player'): Promise<User | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Creating user: ${username} in Supabase...`);
        const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
        const { error: userError } = await supabase.from('users').insert({
          id: userId,
          username: username.trim(),
          password: passwordPlain,
          role
        });
        if (userError) throw userError;

        if (role === 'player') {
          const defaultDbRow = mapGameStateToDb({
            userId,
            auraLevel: 1,
            auraXp: 0,
            auraColor: '#00ffcc',
            rebirths: 0,
            gems: 0,
            currentZone: 'forest',
            equippedPetId: null,
            activeAuras: [],
            totalPlayTimeSeconds: 0,
            purchasedCosmetics: [],
            equippedCosmeticId: null,
            selectedOperation: 'multiplication',
            questWins: 0,
            questCriticals: 0,
            questStreak: 0,
            claimedQuests: [],
            classId: null,
            skillPoints: 0,
            unlockedSkills: [],
            clanId: null,
            clanContributions: 0,
            campaignStage: 1,
          });
          defaultDbRow.user_id = userId;

          const { error: stateError } = await supabase.from('game_states').insert(defaultDbRow);
          if (stateError) throw stateError;
        }

        const newUser: User = {
          id: userId,
          username: username.trim(),
          role,
          passwordHash: passwordPlain,
          createdAt: new Date().toISOString()
        };

        // Mirror locally just in case
        mockDb.createUser(username, passwordPlain, role);
        return newUser;
      } catch (err) {
        console.error('[BackendService] Supabase error in createUser:', err);
        return null;
      }
    }
    return mockDb.createUser(username, passwordPlain, role);
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Updating user: ${userId} in Supabase...`, updates);
        const dbUpdates: any = {};
        if (updates.username !== undefined) dbUpdates.username = updates.username;
        if (updates.passwordHash !== undefined) dbUpdates.password = updates.passwordHash;
        if (updates.role !== undefined) dbUpdates.role = updates.role;

        const { error } = await supabase.from('users').update(dbUpdates).eq('id', userId);
        if (error) throw error;
        mockDb.updateUser(userId, updates);
        return true;
      } catch (err) {
        console.error('[BackendService] Supabase error in updateUser:', err);
        return false;
      }
    }
    return mockDb.updateUser(userId, updates);
  },

  async deleteUser(userId: string): Promise<boolean> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Deleting user: ${userId} in Supabase...`);
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;
        mockDb.deleteUser(userId);
        return true;
      } catch (err) {
        console.error('[BackendService] Supabase error in deleteUser:', err);
        return false;
      }
    }
    return mockDb.deleteUser(userId);
  },

  // 2. Auth & Session
  async login(username: string, passwordPlain: string): Promise<User | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Logging in user: ${username} from Supabase...`);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .ilike('username', username.trim());
        if (error) throw error;
        if (data && data.length > 0) {
          const u = data[0];
          if (u.password === passwordPlain) {
            return {
              id: u.id,
              username: u.username,
              role: u.role as 'admin' | 'player',
              passwordHash: u.password,
              createdAt: u.created_at || new Date().toISOString()
            };
          }
        }
        return null;
      } catch (err) {
        console.error('[BackendService] Supabase error in login:', err);
      }
    }
    
    // Fallback authentication check
    const user = mockDb.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    if (user && user.passwordHash === passwordPlain) {
      return user;
    }
    return null;
  },

  // 3. Game State
  async getGameState(userId: string): Promise<GameState | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Fetching game state for ${userId} from Supabase...`);
        const { data, error } = await supabase.from('game_states').select('*').eq('user_id', userId);
        if (error) throw error;
        
        const localState = mockDb.getGameState(userId);

        if (data && data.length > 0) {
          const dbState = mapDbToGameState(data[0]);
          if (localState) {
            // Merge local-only properties so they are never lost by cloud-only loads
            dbState.treats = localState.treats ?? 0;
            dbState.activeExpeditions = localState.activeExpeditions ?? [];
            dbState.fedBonusUntil = localState.fedBonusUntil;

            // Resolve conflicts: if local is newer than DB, sync local to DB
            const dbTime = new Date(dbState.updatedAt || 0).getTime();
            const localTime = new Date(localState.updatedAt || 0).getTime();
            if (localTime > dbTime) {
              console.log('🔄 [BackendService] Local state is newer. Syncing to Supabase...');
              const dbUpdates = mapGameStateToDb(localState);
              supabase.from('game_states').update(dbUpdates).eq('user_id', userId).then(({ error }) => {
                if (error) console.error('Error syncing local state to Supabase:', error);
              });
              return localState;
            }
          }
          // Sync to local mockDb
          mockDb.syncGameState(dbState);
          return dbState;
        }
        
        // If not found in Cloud, initialize it
        if (localState) {
          const dbRow = mapGameStateToDb(localState);
          dbRow.user_id = userId;
          await supabase.from('game_states').insert(dbRow);
          return localState;
        }
        return null;
      } catch (err) {
        console.error('[BackendService] Supabase error in getGameState:', err);
      }
    }
    return mockDb.getGameState(userId);
  },

  async updateGameState(userId: string, updates: Partial<GameState>): Promise<GameState | null> {
    const localState = mockDb.updateGameState(userId, updates);
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Updating game state for ${userId} in Supabase...`, updates);
        const dbUpdates = mapGameStateToDb(updates);
        const { data, error } = await supabase
          .from('game_states')
          .update(dbUpdates)
          .eq('user_id', userId)
          .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const dbState = mapDbToGameState(data[0]);
          if (localState) {
            dbState.treats = localState.treats ?? 0;
            dbState.activeExpeditions = localState.activeExpeditions ?? [];
            dbState.fedBonusUntil = localState.fedBonusUntil;
          }
          return dbState;
        }
      } catch (err) {
        console.error('[BackendService] Supabase error in updateGameState:', err);
      }
    }
    return localState;
  },

  // 4. Pets Management
  async getPets(userId: string): Promise<Pet[]> {
    const localPets = mockDb.getPets(userId);
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Fetching pets for ${userId} from Supabase...`);
        const { data, error } = await supabase.from('pets').select('*').eq('user_id', userId);
        if (error) throw error;
        
        const dbPets = (data || []).map(p => ({
          id: p.id,
          userId: p.user_id,
          petTypeId: p.pet_type_id,
          nickname: p.nickname,
          rarity: p.rarity as any,
          buffType: p.buff_type as any,
          buffValue: p.buff_value,
          createdAt: p.created_at || new Date().toISOString(),
          level: p.level ?? 1
        }));

        // Fallback sync: if cloud is empty but local has pets, push local pets to Supabase
        if (dbPets.length === 0 && localPets.length > 0) {
          console.log('🔄 [BackendService] Syncing local pets to Supabase...');
          localPets.forEach(pet => {
            supabase.from('pets').insert({
              id: pet.id,
              user_id: pet.userId,
              pet_type_id: pet.petTypeId,
              nickname: pet.nickname,
              rarity: pet.rarity,
              buff_type: pet.buffType,
              buff_value: pet.buffValue,
              level: pet.level
            }).then(({ error }) => {
              if (error) console.error('Error syncing local pet to Supabase:', error);
            });
          });
          return localPets;
        }

        // Sync to local mockDb
        mockDb.syncPets(userId, dbPets);
        return dbPets;
      } catch (err) {
        console.error('[BackendService] Supabase error in getPets:', err);
      }
    }
    return localPets;
  },

  async createPet(userId: string, petTypeId: string, nickname: string): Promise<Pet | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Creating pet ${petTypeId} for ${userId} in Supabase...`);
        
        // Retrieve details dynamically from mockDb PET_TYPES definition
        const PET_TYPES_LOCAL = [
          { id: 'robot_pup', rarity: 'common', buffType: 'gem_multiplier', buffValue: 1.1 },
          { id: 'cyber_bunny', rarity: 'common', buffType: 'time_bonus', buffValue: 1.0 },
          { id: 'pixel_piggy', rarity: 'common', buffType: 'aura_multiplier', buffValue: 1.05 },
          { id: 'slime_buddy', rarity: 'rare', buffType: 'combined', buffValue: 1.15 },
          { id: 'neon_kitten', rarity: 'rare', buffType: 'time_bonus', buffValue: 2.0 },
          { id: 'vector_fox', rarity: 'rare', buffType: 'gem_multiplier', buffValue: 1.2 },
          { id: 'phoenix_chick', rarity: 'epic', buffType: 'combined', buffValue: 2.0 },
          { id: 'hologram_monkey', rarity: 'epic', buffType: 'aura_multiplier', buffValue: 1.25 },
          { id: 'glitch_raccoon', rarity: 'epic', buffType: 'gem_multiplier', buffValue: 1.3 },
          { id: 'quantum_panda', rarity: 'epic', buffType: 'time_bonus', buffValue: 3.0 },
          { id: 'dragon_kid', rarity: 'legendary', buffType: 'combined', buffValue: 1.4 },
          { id: 'cosmic_owl', rarity: 'legendary', buffType: 'combined', buffValue: 1.5 },
          { id: 'cyber_phoenix', rarity: 'legendary', buffType: 'combined', buffValue: 1.5 },
          { id: 'binary_wolf', rarity: 'legendary', buffType: 'time_bonus', buffValue: 4.0 },
          { id: 'hyper_unicorn', rarity: 'legendary', buffType: 'combined', buffValue: 1.5 },
          // New Cycle 2 pets
          { id: 'neon_lion', rarity: 'rare', buffType: 'combined', buffValue: 1.15 },
          { id: 'cyber_bear', rarity: 'rare', buffType: 'combined', buffValue: 1.2 },
          { id: 'pixel_koala', rarity: 'common', buffType: 'time_bonus', buffValue: 1.0 },
          { id: 'quantum_tiger', rarity: 'epic', buffType: 'combined', buffValue: 1.3 },
          { id: 'holo_giraffe', rarity: 'epic', buffType: 'combined', buffValue: 1.25 },
          { id: 'vector_deer', rarity: 'rare', buffType: 'aura_multiplier', buffValue: 1.2 },
          { id: 'glitch_hedgehog', rarity: 'common', buffType: 'gem_multiplier', buffValue: 1.08 },
          { id: 'binary_bull', rarity: 'rare', buffType: 'gem_multiplier', buffValue: 1.22 },
          { id: 'cyber_shark', rarity: 'legendary', buffType: 'combined', buffValue: 1.45 },
          { id: 'cosmic_whale', rarity: 'legendary', buffType: 'combined', buffValue: 1.5 },
          { id: 'neon_octopus', rarity: 'epic', buffType: 'combined', buffValue: 1.32 },
          { id: 'pixel_penguin', rarity: 'common', buffType: 'aura_multiplier', buffValue: 1.08 },
          { id: 'quantum_elephant', rarity: 'legendary', buffType: 'combined', buffValue: 1.55 },
          { id: 'cyber_hamster', rarity: 'common', buffType: 'time_bonus', buffValue: 1.2 },
          { id: 'holo_sloth', rarity: 'rare', buffType: 'time_bonus', buffValue: 2.5 },
        ];

        const matchedType = PET_TYPES_LOCAL.find(pt => pt.id === petTypeId);

        let rarity: 'common' | 'rare' | 'epic' | 'legendary' = matchedType ? matchedType.rarity as any : 'common';
        let buffType: 'time_bonus' | 'aura_multiplier' | 'gem_multiplier' | 'combined' = matchedType ? matchedType.buffType as any : 'gem_multiplier';
        let buffValue = matchedType ? matchedType.buffValue : 1.1;

        const petId = 'pet_' + Math.random().toString(36).substring(2, 11);
        const newPet: Pet = {
          id: petId,
          userId,
          petTypeId,
          nickname,
          rarity,
          buffType,
          buffValue,
          level: 1,
          createdAt: new Date().toISOString()
        };

        const { error } = await supabase.from('pets').insert({
          id: petId,
          user_id: userId,
          pet_type_id: petTypeId,
          nickname,
          rarity,
          buff_type: buffType,
          buff_value: buffValue,
          level: 1
        });

        if (error) throw error;
        mockDb.createPet(userId, petTypeId, nickname);
        return newPet;
      } catch (err) {
        console.error('[BackendService] Supabase error in createPet:', err);
      }
    }
    return mockDb.createPet(userId, petTypeId, nickname);
  },

  async fusePets(userId: string, parentId1: string, parentId2: string): Promise<GameState | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Fusing pets ${parentId1} and ${parentId2} in Supabase...`);
        
        // 1. Fetch both pets and verify they belong to userId (RPC simulation security validation)
        const { data: petData1 } = await supabase.from('pets').select('*').eq('id', parentId1).eq('user_id', userId);
        const { data: petData2 } = await supabase.from('pets').select('*').eq('id', parentId2).eq('user_id', userId);
        
        if (!petData1 || petData1.length === 0 || !petData2 || petData2.length === 0) {
          throw new Error('Um ou ambos os pets não pertencem ao usuário ou não existem.');
        }

        const pet = petData1[0];
        const currentStars = pet.stars ?? 1;
        const { error: updateError } = await supabase
          .from('pets')
          .update({
            stars: currentStars + 1,
            buff_value: pet.buff_value * 1.5
          })
          .eq('id', parentId1);
        if (updateError) throw updateError;

        const { error: deleteError } = await supabase.from('pets').delete().eq('id', parentId2);
        if (deleteError) throw deleteError;
      } catch (err: any) {
        console.error('[BackendService] Supabase error in fusePets:', err);
        throw err;
      }
    }
    const mockP1 = mockDb.getPets(userId).find(p => p.id === parentId1);
    const mockP2 = mockDb.getPets(userId).find(p => p.id === parentId2);
    if (!mockP1 || !mockP2) {
      throw new Error('Um ou ambos os pets não pertencem ao usuário ou não existem no Banco Local.');
    }
    return mockDb.fusePets(userId, parentId1, parentId2);
  },

  // 5. Statistics & Adaptive Review
  async getMathStats(userId: string): Promise<MathStatistic[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Fetching math stats for ${userId} from Supabase...`);
        const { data, error } = await supabase.from('math_statistics').select('*').eq('user_id', userId);
        if (error) throw error;
        return (data || []).map(s => ({
          userId: s.user_id,
          questionKey: s.question_key,
          correctCount: s.correct_count ?? 0,
          errorCount: s.incorrect_count ?? 0,
          averageTimeMs: s.total_time_taken_ms ?? 0
        }));
      } catch (err) {
        console.error('[BackendService] Supabase error in getMathStats:', err);
      }
    }
    return mockDb.getMathStats(userId);
  },

  async recordMathAnswer(userId: string, questionKey: string, isCorrect: boolean, timeTakenMs: number): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Recording answer for ${userId} in Supabase: ${questionKey}`);
        
        // Fetch existing row to increment
        const { data } = await supabase
          .from('math_statistics')
          .select('*')
          .eq('user_id', userId)
          .eq('question_key', questionKey);
        
        if (data && data.length > 0) {
          const row = data[0];
          const updates = {
            correct_count: (row.correct_count ?? 0) + (isCorrect ? 1 : 0),
            incorrect_count: (row.incorrect_count ?? 0) + (isCorrect ? 0 : 1),
            total_time_taken_ms: (row.total_time_taken_ms ?? 0) + timeTakenMs
          };
          await supabase
            .from('math_statistics')
            .update(updates)
            .eq('user_id', userId)
            .eq('question_key', questionKey);
        } else {
          const statId = 'stat_' + Math.random().toString(36).substring(2, 11);
          await supabase.from('math_statistics').insert({
            id: statId,
            user_id: userId,
            question_key: questionKey,
            correct_count: isCorrect ? 1 : 0,
            incorrect_count: isCorrect ? 0 : 1,
            total_time_taken_ms: timeTakenMs
          });
        }
      } catch (err) {
        console.error('[BackendService] Supabase error in recordMathAnswer:', err);
      }
    }
    mockDb.recordMathAnswer(userId, questionKey, isCorrect, timeTakenMs);
  },

  async forceMathStatsState(userId: string, questionKey: string, targetState: 'mastered' | 'weak'): Promise<void> {
    mockDb.forceMathStatsState(userId, questionKey, targetState);
  },

  async resetMathStats(userId: string): Promise<void> {
    mockDb.resetMathStats(userId);
  },

  async completeCampaignStage(userId: string, stageId: number, overrideXp?: number, overrideGems?: number): Promise<GameState | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        const state = await this.getGameState(userId);
        if (state) {
          const isFirstTime = stageId === state.campaignStage;

          // Cycle math
          const cycle = Math.floor((stageId - 1) / 5) + 1;
          const stageIndexInCycle = (stageId - 1) % 5;

          // Base rewards
          let baseXP = 0;
          let baseGems = 0;
          switch (stageIndexInCycle) {
            case 0: baseXP = 100; baseGems = 15; break;
            case 1: baseXP = 150; baseGems = 20; break;
            case 2: baseXP = 200; baseGems = 25; break;
            case 3: baseXP = 250; baseGems = 30; break;
            case 4: baseXP = 500; baseGems = 50; break;
          }

          let xpReward = overrideXp !== undefined ? overrideXp : 0;
          let gemsReward = overrideGems !== undefined ? overrideGems : 0;

          if (overrideXp === undefined || overrideGems === undefined) {
            if (isFirstTime) {
              xpReward = baseXP * cycle;
              gemsReward = baseGems * cycle;
            } else {
              xpReward = Math.max(10, Math.round((baseXP * cycle) * 0.1));
              gemsReward = Math.max(1, Math.round((baseGems * cycle) * 0.1));
            }
          }

          const nextStage = isFirstTime ? stageId + 1 : state.campaignStage;
          const updates: any = { 
            campaign_stage: nextStage,
            gems: state.gems + gemsReward,
            aura_xp: state.auraXp + xpReward
          };

          // Level up logic calculation
          let level = state.auraLevel;
          let xp = state.auraXp + xpReward;
          const getXpNeeded = (l: number) => Math.round(100 * Math.pow(1.15, l - 1));
          let nextLevelXp = getXpNeeded(level);
          let leveledUp = false;

          while (xp >= nextLevelXp) {
            xp -= nextLevelXp;
            level += 1;
            nextLevelXp = getXpNeeded(level);
            leveledUp = true;
          }

          if (leveledUp) {
            updates.aura_level = level;
            updates.aura_xp = xp;
          }

          const freshState = await this.updateGameState(userId, mapDbToGameState(updates));
          
          if (freshState?.clanId) {
            await this.addClanXp(freshState.clanId, Math.max(1, Math.round(xpReward / 2)));
          }

          if (stageId === 5 && isFirstTime) {
            await this.createPet(userId, 'cosmic_owl', 'Coruja Cósmica');
          }

          return freshState;
        }
      } catch (err) {
        console.error('[BackendService] Supabase error in completeCampaignStage:', err);
      }
    }
    return mockDb.completeCampaignStage(userId, stageId, overrideXp, overrideGems);
  },

  // 7. Real-Time Leaderboard View
  async getLeaderboard(): Promise<{
    username: string;
    level: number;
    rebirths: number;
    gems: number;
    equippedPetEmoji?: string;
    equippedPetName?: string;
    equippedPetLevel?: number;
    equippedTitle?: string;
    classId?: 'warrior' | 'chronomancer' | 'alchemist' | null;
    auraColor?: string;
    equippedCosmetics?: Record<string, string>;
    equippedCosmeticId?: string | null;
    clanName?: string;
    clanContributions?: number;
    totalPlayTimeSeconds?: number;
    selectedOperation?: string;
    unlockedSkillsCount?: number;
  }[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log('[BackendService] Fetching real-time leaderboard from Supabase...');
        // Fetch players, game_states, and pets in parallel
        const [usersRes, statesRes, petsRes, clansRes] = await Promise.all([
          supabase.from('users').select('id, username').eq('role', 'player'),
          supabase.from('game_states').select('user_id, aura_level, rebirths, gems, equipped_pet_id, equipped_cosmetic_id, active_class, aura_color, clan_id, clan_contributions, total_play_time_seconds, selected_operation, unlocked_skills'),
          supabase.from('pets').select('*'),
          supabase.from('clans').select('id, name')
        ]);

        if (usersRes.error) throw usersRes.error;
        if (statesRes.error) throw statesRes.error;
        
        const dbUsers = usersRes.data || [];
        const dbStates = statesRes.data || [];
        const dbPets = petsRes.data || [];
        const dbClans = clansRes.data || [];

        const PET_TYPES = [
          { id: 'robot_pup', emoji: '🤖', name: 'Robô Pup' },
          { id: 'slime_buddy', emoji: '🧪', name: 'Slime' },
          { id: 'phoenix_chick', emoji: '🔥', name: 'Fênix' },
          { id: 'dragon_kid', emoji: '🐉', name: 'Dragão' },
          { id: 'cosmic_owl', emoji: '🦉', name: 'Coruja' },
          { id: 'neon_kitten', emoji: '🐱', name: 'Gato Neon' },
          { id: 'cyber_phoenix', emoji: '🐦', name: 'Cyber Fênix' }
        ];

        return dbUsers
          .map(u => {
            const state = dbStates.find(s => s.user_id === u.id) || {
              aura_level: 1,
              rebirths: 0,
              gems: 0,
              equipped_pet_id: null,
              equipped_cosmetic_id: null,
              active_class: null,
              aura_color: '#00ffcc',
              clan_id: null,
              clan_contributions: 0,
              total_play_time_seconds: 0,
              selected_operation: 'multiplication',
              unlocked_skills: []
            };
            const equippedPet = state.equipped_pet_id ? dbPets.find(p => p.id === state.equipped_pet_id) : null;
            const petType = equippedPet ? PET_TYPES.find(pt => pt.id === equippedPet.pet_type_id) : null;
            const petEmoji = petType?.emoji;
            const petName = equippedPet?.nickname || petType?.name;
            const petLevel = equippedPet?.level ?? 1;

            const rawEquipped = state.equipped_cosmetic_id || null;
            let equippedCosmetics: Record<string, string> = {};
            let equippedCosmeticId: string | null = null;
            if (rawEquipped) {
              if (rawEquipped.startsWith('{')) {
                try {
                  equippedCosmetics = JSON.parse(rawEquipped);
                  const values = Object.values(equippedCosmetics);
                  equippedCosmeticId = values.length > 0 ? values[0] : null;
                } catch (e) {}
              } else {
                equippedCosmeticId = rawEquipped;
                const item = COSMETIC_ITEMS.find(c => c.id === rawEquipped);
                if (item) {
                  equippedCosmetics = { [item.category]: rawEquipped };
                }
              }
            }

            const activeTitleId = equippedCosmetics['title'] || (equippedCosmeticId?.startsWith('title_') ? equippedCosmeticId : null);
            const titleItem = activeTitleId ? COSMETIC_ITEMS.find(c => c.id === activeTitleId) : null;
            const titleText = titleItem ? titleItem.name.replace('Título: ', '') : undefined;

            const clan = state.clan_id ? dbClans.find(c => c.id === state.clan_id) : null;

            return {
              username: u.username,
              level: state.aura_level ?? 1,
              rebirths: state.rebirths ?? 0,
              gems: state.gems ?? 0,
              equippedPetEmoji: petEmoji,
              equippedPetName: petName,
              equippedPetLevel: petLevel,
              equippedTitle: titleText,
              classId: state.active_class || null,
              auraColor: state.aura_color || '#00ffcc',
              equippedCosmetics,
              equippedCosmeticId,
              clanName: clan ? clan.name : undefined,
              clanContributions: state.clan_contributions ?? 0,
              totalPlayTimeSeconds: state.total_play_time_seconds ?? 0,
              selectedOperation: state.selected_operation ?? 'multiplication',
              unlockedSkillsCount: (state.unlocked_skills || []).length
            };
          })
          .sort((a, b) => {
            if (b.rebirths !== a.rebirths) {
              return b.rebirths - a.rebirths;
            }
            return b.level - a.level;
          });
      } catch (err) {
        console.error('[BackendService] Supabase error in getLeaderboard:', err);
      }
    }
    return mockDb.getLeaderboard();
  },

  // 8. Clan APIs
  async getClanLeaderboard(): Promise<any[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log('[BackendService] Fetching clans leaderboard from Supabase...');
        const [clansRes, statesRes] = await Promise.all([
          supabase.from('clans').select('*'),
          supabase.from('game_states').select('user_id, aura_level, rebirths')
        ]);

        if (clansRes.error) throw clansRes.error;
        const dbClans = clansRes.data || [];
        const dbStates = statesRes.data || [];

        return dbClans.map(clan => {
          let totalAuraLevel = 0;
          let totalRebirths = 0;
          const membersList = clan.members || [];
          
          membersList.forEach((memberId: string) => {
            const state = dbStates.find(s => s.user_id === memberId);
            if (state) {
              totalAuraLevel += (state.aura_level ?? 0);
              totalRebirths += (state.rebirths ?? 0);
            }
          });

          return {
            id: clan.id,
            name: clan.name,
            tag: clan.tag,
            motto: clan.motto,
            badgeEmoji: clan.badge_emoji || '🛡️',
            members: membersList,
            totalAuraLevel,
            totalRebirths,
            level: clan.level ?? 1,
            xp: clan.xp ?? 0,
            leaderId: clan.leader_id,
            joinRequests: clan.join_requests || [],
            bossHp: clan.boss_hp ?? 5000,
            bossMaxHp: clan.boss_max_hp ?? 5000,
            bossLevel: clan.boss_level ?? 1
          };
        }).sort((a, b) => {
          if (b.totalRebirths !== a.totalRebirths) {
            return b.totalRebirths - a.totalRebirths;
          }
          return b.totalAuraLevel - a.totalAuraLevel;
        });
      } catch (err) {
        console.error('[BackendService] Supabase error in getClanLeaderboard:', err);
      }
    }
    return mockDb.getClanLeaderboard();
  },

  async joinClan(userId: string, clanId: string): Promise<GameState | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Student ${userId} joining Clan ${clanId}...`);
        
        // 1. Leave current clan first if any
        await this.leaveClan(userId);

        // 2. Fetch target clan to update member list
        const { data: clanData, error: fetchErr } = await supabase.from('clans').select('*').eq('id', clanId);
        if (fetchErr) throw fetchErr;

        if (clanData && clanData.length > 0) {
          const clan = clanData[0];
          const membersList = clan.members || [];
          if (!membersList.includes(userId)) {
            membersList.push(userId);
            const { error: updateClanErr } = await supabase.from('clans').update({ members: membersList }).eq('id', clanId);
            if (updateClanErr) throw updateClanErr;
          }
        }

        // 3. Update student state
        return await this.updateGameState(userId, { clanId });
      } catch (err) {
        console.error('[BackendService] Supabase error in joinClan:', err);
      }
    }
    return mockDb.joinClan(userId, clanId);
  },

  async leaveClan(userId: string): Promise<GameState | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Student ${userId} leaving clan...`);
        const state = await this.getGameState(userId);
        if (state && state.clanId) {
          const { data: clanData } = await supabase.from('clans').select('*').eq('id', state.clanId);
          if (clanData && clanData.length > 0) {
            const clan = clanData[0];
            const membersList = (clan.members || []).filter((id: string) => id !== userId);
            
            if (membersList.length === 0) {
              // Delete clan if empty
              await supabase.from('clans').delete().eq('id', state.clanId);
            } else {
              let updatePayload: any = { members: membersList };
              if (clan.leader_id === userId) {
                updatePayload.leader_id = membersList[0];
              }
              await supabase.from('clans').update(updatePayload).eq('id', state.clanId);
            }
          }
        }
        return await this.updateGameState(userId, { clanId: null });
      } catch (err) {
        console.error('[BackendService] Supabase error in leaveClan:', err);
      }
    }
    return mockDb.leaveClan(userId);
  },

  async createClan(userId: string, name: string, tag: string, motto: string, badgeEmoji: string): Promise<GameState | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Student ${userId} creating Clan ${name}...`);
        
        // 1. Leave current clan first
        await this.leaveClan(userId);

        // 2. Insert new clan row
        const newClanId = 'clan_' + Math.random().toString(36).substring(2, 11);
        const { error: insertErr } = await supabase.from('clans').insert({
          id: newClanId,
          name: name.trim(),
          tag: tag.trim().toUpperCase(),
          motto: motto.trim(),
          badge_emoji: badgeEmoji,
          members: [userId],
          level: 1,
          xp: 0,
          leader_id: userId,
          join_requests: [],
          boss_hp: 5000,
          boss_max_hp: 5000,
          boss_level: 1
        });

        if (insertErr) throw insertErr;

        // 3. Update user's game state with new clan_id
        return await this.updateGameState(userId, { clanId: newClanId });
      } catch (err: any) {
        console.error('[BackendService] Supabase error in createClan:', err);
        alert('Erro no Banco de Dados (Supabase):\n' + (err.message || JSON.stringify(err)) + '\n\nO clã foi salvo apenas no modo Offline/Local.');
      }
    }
    return mockDb.createClan(userId, name, tag, motto, badgeEmoji);
  },

  async damageClanBoss(userId: string, clanId: string, amount: number): Promise<{ bossHp: number; bossMaxHp: number; bossLevel: number; defeated: boolean; rewardGems: number } | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Damaging clan boss of ${clanId} by ${amount}...`);
        const { data, error } = await supabase.from('clans').select('boss_hp, boss_max_hp, boss_level, members, level, xp').eq('id', clanId);
        if (error) throw error;
        if (data && data.length > 0) {
          const row = data[0];
          let bossHp = row.boss_hp ?? 5000;
          let bossMaxHp = row.boss_max_hp ?? 5000;
          let bossLevel = row.boss_level ?? 1;
          let level = row.level ?? 1;
          let xp = row.xp ?? 0;
          const membersList = row.members || [];

          bossHp = Math.max(0, bossHp - amount);
          let defeated = false;
          let rewardGems = 0;

          if (bossHp <= 0) {
            defeated = true;
            bossLevel += 1;
            bossMaxHp = bossLevel * 5000;
            bossHp = bossMaxHp;
            rewardGems = bossLevel * 10;
            xp += 100 * bossLevel;

            let nextLevelXp = level * 500;
            while (xp >= nextLevelXp && level < 10) {
              xp -= nextLevelXp;
              level += 1;
              nextLevelXp = level * 500;
            }
            if (level >= 10) {
              level = 10;
              xp = Math.min(xp, nextLevelXp);
            }

            // Reward all members in Supabase
            const { data: states } = await supabase.from('game_states').select('user_id, gems').in('user_id', membersList);
            if (states) {
              for (const s of states) {
                const nextGems = (s.gems ?? 0) + rewardGems;
                await supabase.from('game_states').update({ gems: nextGems }).eq('user_id', s.user_id);
              }
            }
          }

          // Save clan boss state
          const { error: updateErr } = await supabase.from('clans').update({
            boss_hp: bossHp,
            boss_max_hp: bossMaxHp,
            boss_level: bossLevel,
            level,
            xp
          }).eq('id', clanId);

          if (updateErr) throw updateErr;

          // Sync with local memory
          mockDb.damageClanBoss(userId, clanId, amount);

          return { bossHp, bossMaxHp, bossLevel, defeated, rewardGems };
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in damageClanBoss:', err);
        alert('Erro no Banco de Dados (Supabase - Chefão de Clã):\n' + (err.message || JSON.stringify(err)) + '\n\nO progresso do clã foi salvo apenas offline.');
      }
    }
    return mockDb.damageClanBoss(userId, clanId, amount);
  },

  async applyToClan(userId: string, clanId: string): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data } = await supabase.from('clans').select('join_requests, members').eq('id', clanId);
        if (data && data.length > 0) {
          const clan = data[0];
          if (!(clan.members || []).includes(userId) && !(clan.join_requests || []).includes(userId)) {
            const newReqs = [...(clan.join_requests || []), userId];
            await supabase.from('clans').update({ join_requests: newReqs }).eq('id', clanId);
          }
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in applyToClan:', err);
        alert('Erro no Banco de Dados (Supabase - Candidatar-se ao Clã):\n' + (err.message || JSON.stringify(err)));
      }
    }
    mockDb.applyToClan(userId, clanId);
  },

  async acceptApplication(leaderId: string, clanId: string, candidateId: string): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data } = await supabase.from('clans').select('leader_id, join_requests, members').eq('id', clanId);
        if (data && data.length > 0) {
          const clan = data[0];
          if (clan.leader_id === leaderId) {
            const newReqs = (clan.join_requests || []).filter((id: string) => id !== candidateId);
            const newMembers = [...(clan.members || [])];
            if (!newMembers.includes(candidateId)) newMembers.push(candidateId);
            
            await supabase.from('clans').update({ join_requests: newReqs, members: newMembers }).eq('id', clanId);
            await this.updateGameState(candidateId, { clanId });
          }
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in acceptApplication:', err);
        alert('Erro no Banco de Dados (Supabase - Aceitar Membro):\n' + (err.message || JSON.stringify(err)));
      }
    }
    mockDb.acceptApplication(leaderId, clanId, candidateId);
  },

  async rejectApplication(leaderId: string, clanId: string, candidateId: string): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data } = await supabase.from('clans').select('leader_id, join_requests').eq('id', clanId);
        if (data && data.length > 0 && data[0].leader_id === leaderId) {
          const newReqs = (data[0].join_requests || []).filter((id: string) => id !== candidateId);
          await supabase.from('clans').update({ join_requests: newReqs }).eq('id', clanId);
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in rejectApplication:', err);
        alert('Erro no Banco de Dados (Supabase - Recusar Membro):\n' + (err.message || JSON.stringify(err)));
      }
    }
    mockDb.rejectApplication(leaderId, clanId, candidateId);
  },

  async kickMember(leaderId: string, clanId: string, targetId: string): Promise<void> {
    if (leaderId === targetId) return;
    if (isSupabaseEnabled && supabase) {
      try {
        const { data } = await supabase.from('clans').select('leader_id, members').eq('id', clanId);
        if (data && data.length > 0 && data[0].leader_id === leaderId) {
          const newMembers = (data[0].members || []).filter((id: string) => id !== targetId);
          await supabase.from('clans').update({ members: newMembers }).eq('id', clanId);
          await this.updateGameState(targetId, { clanId: null });
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in kickMember:', err);
        alert('Erro no Banco de Dados (Supabase - Expulsar Membro):\n' + (err.message || JSON.stringify(err)));
      }
    }
    mockDb.kickMember(leaderId, clanId, targetId);
  },

  async transferLeadership(leaderId: string, clanId: string, targetId: string): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data } = await supabase.from('clans').select('leader_id, members').eq('id', clanId);
        if (data && data.length > 0 && data[0].leader_id === leaderId && (data[0].members || []).includes(targetId)) {
          await supabase.from('clans').update({ leader_id: targetId }).eq('id', clanId);
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in transferLeadership:', err);
        alert('Erro no Banco de Dados (Supabase - Promover Líder):\n' + (err.message || JSON.stringify(err)));
      }
    }
    mockDb.transferLeadership(leaderId, clanId, targetId);
  },

  async addClanXp(clanId: string, amount: number): Promise<void> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data } = await supabase.from('clans').select('level, xp').eq('id', clanId);
        if (data && data.length > 0) {
          let { level, xp } = data[0];
          xp += amount;
          let nextLevelXp = level * 500;
          while (xp >= nextLevelXp && level < 10) {
            xp -= nextLevelXp;
            level += 1;
            nextLevelXp = level * 500;
          }
          if (level >= 10) {
            level = 10;
            xp = Math.min(xp, nextLevelXp);
          }
          await supabase.from('clans').update({ level, xp }).eq('id', clanId);
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in addClanXp:', err);
        alert('Erro no Banco de Dados (Supabase - Sincronizar XP do Clã):\n' + (err.message || JSON.stringify(err)));
      }
    }
    mockDb.addClanXp(clanId, amount);
  },

  async getClanBonus(clanId: string): Promise<{ xpMultiplier: number, gemMultiplier: number }> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data } = await supabase.from('clans').select('level').eq('id', clanId);
        if (data && data.length > 0) {
          const level = data[0].level ?? 1;
          const bonus = level * 0.02;
          return { xpMultiplier: 1.0 + bonus, gemMultiplier: 1.0 + bonus };
        }
      } catch (err) {
        console.error('[BackendService] Supabase error in getClanBonus:', err);
      }
    }
    return mockDb.getClanBonus(clanId);
  }
};
