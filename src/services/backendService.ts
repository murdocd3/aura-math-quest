import { createClient } from '@supabase/supabase-js';
import { mockDb } from './mockDb';
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
const mapDbToGameState = (row: any): GameState => ({
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
  equippedCosmeticId: row.equipped_cosmetic_id || null,
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
});

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
  if (state.equippedCosmeticId !== undefined) dbRow.equipped_cosmetic_id = state.equippedCosmeticId;
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
    return isSupabaseEnabled;
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
        if (data && data.length > 0) {
          return mapDbToGameState(data[0]);
        }
        
        // If not found in Cloud, initialize it
        const localState = mockDb.getGameState(userId);
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
        mockDb.updateGameState(userId, updates);

        if (data && data.length > 0) {
          return mapDbToGameState(data[0]);
        }
      } catch (err) {
        console.error('[BackendService] Supabase error in updateGameState:', err);
      }
    }
    return mockDb.updateGameState(userId, updates);
  },

  // 4. Pets Management
  async getPets(userId: string): Promise<Pet[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log(`[BackendService] Fetching pets for ${userId} from Supabase...`);
        const { data, error } = await supabase.from('pets').select('*').eq('user_id', userId);
        if (error) throw error;
        return (data || []).map(p => ({
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
      } catch (err) {
        console.error('[BackendService] Supabase error in getPets:', err);
      }
    }
    return mockDb.getPets(userId);
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
          { id: 'slime_buddy', rarity: 'rare', buffType: 'aura_multiplier', buffValue: 1.15 },
          { id: 'neon_kitten', rarity: 'rare', buffType: 'time_bonus', buffValue: 2.0 },
          { id: 'vector_fox', rarity: 'rare', buffType: 'gem_multiplier', buffValue: 1.2 },
          { id: 'phoenix_chick', rarity: 'epic', buffType: 'time_bonus', buffValue: 2.0 },
          { id: 'hologram_monkey', rarity: 'epic', buffType: 'aura_multiplier', buffValue: 1.25 },
          { id: 'glitch_raccoon', rarity: 'epic', buffType: 'gem_multiplier', buffValue: 1.3 },
          { id: 'quantum_panda', rarity: 'epic', buffType: 'time_bonus', buffValue: 3.0 },
          { id: 'dragon_kid', rarity: 'legendary', buffType: 'gem_multiplier', buffValue: 1.4 },
          { id: 'cosmic_owl', rarity: 'legendary', buffType: 'gem_multiplier', buffValue: 1.5 },
          { id: 'cyber_phoenix', rarity: 'legendary', buffType: 'gem_multiplier', buffValue: 1.5 },
          { id: 'binary_wolf', rarity: 'legendary', buffType: 'time_bonus', buffValue: 4.0 },
          { id: 'hyper_unicorn', rarity: 'legendary', buffType: 'aura_multiplier', buffValue: 1.5 }
        ];

        const matchedType = PET_TYPES_LOCAL.find(pt => pt.id === petTypeId);

        let rarity: 'common' | 'rare' | 'epic' | 'legendary' = matchedType ? matchedType.rarity as any : 'common';
        let buffType: 'time_bonus' | 'aura_multiplier' | 'gem_multiplier' = matchedType ? matchedType.buffType as any : 'gem_multiplier';
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
        
        // In Supabase, delete parentId2, and upgrade parentId1 stars/level
        const { data: petData } = await supabase.from('pets').select('*').eq('id', parentId1);
        if (petData && petData.length > 0) {
          const pet = petData[0];
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
        }
      } catch (err) {
        console.error('[BackendService] Supabase error in fusePets:', err);
      }
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

  // 6. Campaign Unlocks
  async completeCampaignStage(userId: string, stageId: number): Promise<GameState | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        const state = await this.getGameState(userId);
        if (state && stageId >= state.campaignStage) {
          const nextStage = stageId + 1;
          const updates = { campaignStage: nextStage };
          
          // Give gems/XP bonus if completing stage
          if (stageId === 5) {
            updates.campaignStage = 5; // max stage
            // Reward legendary pet Cosmic Owl
            await this.createPet(userId, 'cosmic_owl', 'Coruja Cósmica');
          }
          return await this.updateGameState(userId, updates);
        }
      } catch (err) {
        console.error('[BackendService] Supabase error in completeCampaignStage:', err);
      }
    }
    return mockDb.completeCampaignStage(userId, stageId);
  },

  // 7. Real-Time Leaderboard View
  async getLeaderboard(): Promise<{ username: string; level: number; rebirths: number; gems: number; equippedPetEmoji?: string }[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        console.log('[BackendService] Fetching real-time leaderboard from Supabase...');
        // Fetch players, game_states, and pets in parallel
        const [usersRes, statesRes, petsRes] = await Promise.all([
          supabase.from('users').select('id, username').eq('role', 'player'),
          supabase.from('game_states').select('user_id, aura_level, rebirths, gems, equipped_pet_id'),
          supabase.from('pets').select('id, pet_type_id')
        ]);

        if (usersRes.error) throw usersRes.error;
        if (statesRes.error) throw statesRes.error;
        
        const dbUsers = usersRes.data || [];
        const dbStates = statesRes.data || [];
        const dbPets = petsRes.data || [];

        const fictitiousUserIds = ['player-lucas', 'player-sofia', 'player-gabriel', 'player-beatriz'];
        const PET_TYPES = [
          { id: 'robot_pup', emoji: '🤖' },
          { id: 'slime_buddy', emoji: '🧪' },
          { id: 'phoenix_chick', emoji: '🔥' },
          { id: 'dragon_kid', emoji: '🐉' },
          { id: 'cosmic_owl', emoji: '🦉' },
          { id: 'neon_kitten', emoji: '🐱' },
          { id: 'cyber_phoenix', emoji: '🐦' }
        ];

        return dbUsers
          .filter(u => !fictitiousUserIds.includes(u.id))
          .map(u => {
            const state = dbStates.find(s => s.user_id === u.id) || {
              aura_level: 1,
              rebirths: 0,
              gems: 0,
              equipped_pet_id: null
            };
            const equippedPet = state.equipped_pet_id ? dbPets.find(p => p.id === state.equipped_pet_id) : null;
            const petEmoji = equippedPet ? PET_TYPES.find(pt => pt.id === equippedPet.pet_type_id)?.emoji : undefined;

            return {
              username: u.username,
              level: state.aura_level ?? 1,
              rebirths: state.rebirths ?? 0,
              gems: state.gems ?? 0,
              equippedPetEmoji: petEmoji
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
  }
};
