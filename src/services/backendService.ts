import { createClient } from '@supabase/supabase-js';
import { mockDb, COSMETIC_ITEMS } from './mockDb';
import type { User, GameState, Pet, MathStatistic, TimelineEntry, Clan } from './mockDb';
import type {
  SupabaseUserRow,
  SupabaseGameStateRow,
  SupabasePetRow,
  SupabaseMathStatisticRow,
  SupabaseClanRow
} from './db/dbConfig';
import {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem
} from './db/dbConfig';
import { logger } from './logger';

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
const mapDbToGameState = (row: SupabaseGameStateRow): GameState => {
  const rawEquipped = row.equipped_cosmetic_id || null;
  let equippedCosmetics: Record<string, string> = {};
  let equippedCosmeticId: string | null = null;
  let hasElitePass = false;
  let auraPassXp = 0;
  let claimedPassTiers: number[] = [];
  
  if (rawEquipped) {
    if (rawEquipped.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawEquipped) as Record<string, any>;
        hasElitePass = (parsed.hasElitePass as boolean | undefined) ?? false;
        auraPassXp = (parsed.auraPassXp as number | undefined) ?? 0;
        claimedPassTiers = (parsed.claimedPassTiers as number[] | undefined) ?? [];
        
        equippedCosmetics = { ...parsed };
        delete equippedCosmetics.hasElitePass;
        delete equippedCosmetics.auraPassXp;
        delete equippedCosmetics.claimedPassTiers;
        
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

  const parseStringArray = (val: string[] | string | undefined): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (val.startsWith('{')) {
      try {
        return val.replace(/[{}]/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      } catch {
        return [];
      }
    }
    return [val];
  };

  return {
    userId: row.user_id,
    campaignStage: row.campaign_stage ?? 1,
    gems: row.gems ?? 0,
    auraLevel: row.aura_level ?? 1,
    auraXp: row.aura_xp ?? 0,
    auraColor: row.aura_color ?? '#00ffcc',
    rebirths: row.rebirths ?? 0,
    currentZone: row.current_zone ?? 'forest',
    equippedPetId: row.equipped_pet_id || null,
    activeAuras: parseStringArray(row.active_auras),
    totalPlayTimeSeconds: row.total_play_time_seconds ?? 0,
    purchasedCosmetics: parseStringArray(row.purchased_cosmetics),
    equippedCosmetics,
    equippedCosmeticId,
    selectedOperation: row.selected_operation ?? 'multiplication',
    questWins: row.quest_wins ?? 0,
    questCriticals: row.quest_criticals ?? 0,
    questStreak: row.quest_streak ?? 0,
    claimedQuests: parseStringArray(row.claimed_quests),
    classId: row.active_class || null,
    skillPoints: row.skill_points ?? 0,
    unlockedSkills: parseStringArray(row.unlocked_skills),
    clanId: row.clan_id || null,
    clanContributions: row.clan_contributions ?? 0,
    updatedAt: row.updated_at || new Date().toISOString(),
    hasElitePass,
    auraPassXp,
    claimedPassTiers,
  };
};

const mapGameStateToDb = (state: Partial<GameState>): Partial<SupabaseGameStateRow> => {
  const dbRow: Partial<SupabaseGameStateRow> = {};
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
  
  // Serialize equippedCosmetics and Aura Pass fields together
  const equippedJsonObj: Record<string, any> = { ...(state.equippedCosmetics || {}) };
  if (state.hasElitePass !== undefined) equippedJsonObj.hasElitePass = state.hasElitePass;
  if (state.auraPassXp !== undefined) equippedJsonObj.auraPassXp = state.auraPassXp;
  if (state.claimedPassTiers !== undefined) equippedJsonObj.claimedPassTiers = state.claimedPassTiers;
  
  dbRow.equipped_cosmetic_id = JSON.stringify(equippedJsonObj);
  
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

  async syncCloudAndLocalState(userId: string): Promise<void> {
    if (!this.isCloudConnected()) {
      return;
    }
    try {
      logger.log('🔄 Sincronizando dados do Supabase para o armazenamento local...');
      const state = await this.getGameState(userId);
      const pets = await this.getPets(userId);
      const stats = await this.getMathStats(userId);

      if (state) {
        const localStatesRaw = localStorage.getItem('amq_game_states');
        const localStates = localStatesRaw
          ? JSON.parse(localStatesRaw) as GameState[]
          : [];
        const filteredStates = localStates.filter((s) => s.userId !== userId);
        filteredStates.push(state);
        localStorage.setItem('amq_game_states', JSON.stringify(filteredStates));
      }

      if (pets) {
        const localPetsRaw = localStorage.getItem('amq_pets');
        const localPets = localPetsRaw
          ? JSON.parse(localPetsRaw) as Pet[]
          : [];
        const filteredPets = localPets.filter((p) => p.userId !== userId);
        filteredPets.push(...pets);
        localStorage.setItem('amq_pets', JSON.stringify(filteredPets));
      }

      if (stats) {
        const localStatsRaw = localStorage.getItem('amq_stats');
        const localStats = localStatsRaw
          ? JSON.parse(localStatsRaw) as MathStatistic[]
          : [];
        const filteredStats = localStats.filter((s) => s.userId !== userId);
        filteredStats.push(...stats);
        localStorage.setItem('amq_stats', JSON.stringify(filteredStats));
      }
    } catch (err) {
      logger.error('❌ Falha ao sincronizar dados com o Supabase:', err);
      throw err;
    }
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
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log('[BackendService] Fetching users from Supabase...');
        const { data, error } = await Promise.race([
          client.from('users').select('*').returns<SupabaseUserRow[]>(),
          new Promise<{ data: SupabaseUserRow[] | null; error: any }>((_, reject) => 
            setTimeout(() => reject(new Error('Supabase request timed out')), 2500)
          )
        ]);
        if (error) throw error;
        return (data || []).map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          passwordHash: u.password ?? 'secured',
          createdAt: new Date().toISOString()
        }));
      } catch (err) {
        console.error('[BackendService] Supabase error in getUsers:', err);
      }
    }
    return mockDb.getUsers();
  },

  async createUser(username: string, passwordPlain: string, role: 'admin' | 'player', isActive: boolean = true): Promise<User | null> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Creating user: ${username} via Supabase Auth (tempClient)...`);
        const email = `${username.toLowerCase().trim()}@auramathquest.local`;

        // Create a temporary client so it doesn't overwrite/hijack the admin session
        const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        // 1. Sign up the user in Supabase Auth via the temp client
        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email,
          password: passwordPlain,
          options: {
            data: {
              username: username.trim(),
              role: role
            }
          }
        });
        if (authError) throw authError;

        if (authData && authData.user) {
          const userId = authData.user.id;
          console.log(`[BackendService] Inserting public profile for user: ${username} with ID: ${userId}...`);

          // 2. Insert user profile via PRIMARY client (preserves logged-in admin session and executes with admin RLS permissions)
          const { error: userError } = await client.from('users').insert({
            id: userId,
            username: username.trim(),
            password: passwordPlain, // Keep plain text in users table so password trigger can update auth.users
            role,
            is_active: isActive
          }).returns<SupabaseUserRow[]>();
          if (userError) throw userError;

          if (role === 'player') {
            const defaultDbRow = mapGameStateToDb({
              userId,
              campaignStage: 1,
              gems: 0,
              auraLevel: 1,
              auraXp: 0,
              auraColor: '#00ffcc',
              rebirths: 0,
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
            });
            defaultDbRow.user_id = userId;

            const { error: stateError } = await client.from('game_states').insert(defaultDbRow).returns<SupabaseGameStateRow[]>();
            if (stateError) throw stateError;
          }

          const newUser: User = {
            id: userId,
            username: username.trim(),
            role,
            passwordHash: 'secured',
            createdAt: new Date().toISOString(),
            isActive
          };

          // Mirror locally just in case
          mockDb.createUser(username, passwordPlain, role, isActive);
          return newUser;
        }
        return null;
      } catch (err) {
        console.error('[BackendService] Supabase error in createUser, falling back to mockDb:', err);
        return mockDb.createUser(username, passwordPlain, role, isActive);
      }
    }
    return mockDb.createUser(username, passwordPlain, role, isActive);
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Updating user: ${userId} in Supabase...`, updates);
        const dbUpdates: Partial<SupabaseUserRow> = {};
        if (updates.username !== undefined) dbUpdates.username = updates.username;
        if (updates.passwordHash !== undefined) dbUpdates.password = updates.passwordHash;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        const { error } = await client.from('users').update(dbUpdates).eq('id', userId).returns<SupabaseUserRow[]>();
        if (error) throw error;
        mockDb.updateUser(userId, updates);
        return true;
      } catch (err) {
        console.error('[BackendService] Supabase error in updateUser, falling back to mockDb:', err);
        return mockDb.updateUser(userId, updates);
      }
    }
    return mockDb.updateUser(userId, updates);
  },

  async deleteUser(userId: string): Promise<boolean> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Deleting user: ${userId} in Supabase...`);
        const { error } = await client.from('users').delete().eq('id', userId).returns<SupabaseUserRow[]>();
        if (error) throw error;
        mockDb.deleteUser(userId);
        return true;
      } catch (err) {
        console.error('[BackendService] Supabase error in deleteUser, falling back to mockDb:', err);
        return mockDb.deleteUser(userId);
      }
    }
    return mockDb.deleteUser(userId);
  },

  // 2. Auth & Session
  async login(username: string, passwordPlain: string): Promise<User | null> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Logging in user: ${username} via Supabase Auth native...`);
        const email = `${username.toLowerCase().trim()}@auramathquest.local`;
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email,
          password: passwordPlain
        });
        if (authError) throw authError;

        if (authData && authData.user) {
          const { data, error } = await client
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .returns<SupabaseUserRow[]>();
          if (error) throw error;
          if (data && data.length > 0) {
            const u = data[0];
            if (u.is_active === false) return null;
            return {
              id: u.id,
              username: u.username,
              role: u.role,
              passwordHash: 'secured',
              createdAt: new Date().toISOString(),
              isActive: u.is_active ?? true
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
    if (user && user.passwordHash === mockDb.mockHash(passwordPlain)) {
      if (user.isActive === false) return null;
      return user;
    }
    return null;
  },

  // Helper to migrate legacy board settings from localStorage to GameState / Supabase
  checkAndMigrateLegacyBoards(userId: string, state: GameState): GameState {
    if (typeof window === 'undefined') return state;
    const legacyEquipped = localStorage.getItem(`amq_runner_equipped_board_${userId}`);
    const legacyPurchasedRaw = localStorage.getItem(`amq_runner_purchased_boards_${userId}`);
    
    if (!legacyEquipped && !legacyPurchasedRaw) {
      return state;
    }
    
    console.log(`[BackendService] Migrating legacy runner board data for ${userId} to game state...`);
    
    let updated = false;
    const purchased = [...(state.purchasedCosmetics || [])];
    const equipped = { ...(state.equippedCosmetics || {}) };
    
    if (legacyPurchasedRaw) {
      try {
        const legacyPurchased = JSON.parse(legacyPurchasedRaw) as string[];
        legacyPurchased.forEach(board => {
          if (['light_skate', 'tron_bike', 'holo_board'].includes(board) && !purchased.includes(board)) {
            purchased.push(board);
            updated = true;
          }
        });
      } catch (e) {
        console.error('Failed to parse legacy boards JSON:', e);
      }
    }
    
    if (legacyEquipped && ['light_skate', 'tron_bike', 'holo_board'].includes(legacyEquipped)) {
      if (equipped.vehicle !== legacyEquipped) {
        equipped.vehicle = legacyEquipped;
        updated = true;
      }
    }
    
    if (updated) {
      state.purchasedCosmetics = purchased;
      state.equippedCosmetics = equipped;
      state.updatedAt = new Date().toISOString();
      
      // Update in local mockDb
      mockDb.updateGameState(userId, {
        purchasedCosmetics: purchased,
        equippedCosmetics: equipped
      });
      
      // Remove legacy keys
      localStorage.removeItem(`amq_runner_equipped_board_${userId}`);
      localStorage.removeItem(`amq_runner_purchased_boards_${userId}`);
    }
    
    return state;
  },

  // 3. Game State
  async getGameState(userId: string): Promise<GameState | null> {
    let state: GameState | null = null;
    
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Fetching game state for ${userId} from Supabase...`);
        const { data, error } = await client.from('game_states').select('*').eq('user_id', userId).returns<SupabaseGameStateRow[]>();
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
              client.from('game_states').update(dbUpdates).eq('user_id', userId).returns<SupabaseGameStateRow[]>().then(({ error: sError }) => {
                if (sError) console.error('Error syncing local state to Supabase:', sError);
              });
              state = localState;
            }
          }
          if (!state) {
            // Sync to local mockDb
            mockDb.syncGameState(dbState);
            state = dbState;
          }
        } else if (localState) {
          // If not found in Cloud, initialize it
          const dbRow = mapGameStateToDb(localState);
          dbRow.user_id = userId;
          await client.from('game_states').insert(dbRow).returns<SupabaseGameStateRow[]>();
          state = localState;
        }
      } catch (err) {
        console.error('[BackendService] Supabase error in getGameState:', err);
      }
    }
    
    if (!state) {
      state = mockDb.getGameState(userId);
    }
    
    if (!state) {
      console.warn(`[BackendService] No game state found for ${userId}. Initializing default state...`);
      const defaultState: GameState = {
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
        updatedAt: new Date().toISOString(),
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
        customTimeLimit: 15,
        masteryThreshold: 5,
        lockedOperations: [],
      };

      const gameStates = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
      gameStates.push(defaultState);
      setStorageItem(STORAGE_KEYS.GAME_STATES, gameStates);

      state = defaultState;

      // Sync default state to Supabase in background
      const client = supabase;
      if (isSupabaseEnabled && client) {
        const dbRow = mapGameStateToDb(defaultState);
        dbRow.user_id = userId;
        client.from('game_states').insert(dbRow).returns<SupabaseGameStateRow[]>().then(({ error: sError }) => {
          if (sError) console.error('[BackendService] Error inserting seeded state on getGameState:', sError);
        });
      }
    }

    if (state) {
      state = this.checkAndMigrateLegacyBoards(userId, state);
    }
    
    return state;
  },

  async updateGameState(userId: string, updates: Partial<GameState>): Promise<GameState | null> {
    const localState = mockDb.updateGameState(userId, updates);
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Updating game state for ${userId} in Supabase...`, updates);
        const dbUpdates = mapGameStateToDb(localState || updates);
        const { data, error } = await client
          .from('game_states')
          .update(dbUpdates)
          .eq('user_id', userId)
          .select()
          .returns<SupabaseGameStateRow[]>();
        
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
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Fetching pets for ${userId} from Supabase...`);
        const { data, error } = await client.from('pets').select('*').eq('user_id', userId).returns<SupabasePetRow[]>();
        if (error) throw error;
        
        const dbPets = (data || []).map(p => ({
          id: p.id,
          userId: p.user_id,
          petTypeId: p.pet_type_id,
          nickname: p.nickname,
          rarity: p.rarity,
          buffType: p.buff_type,
          buffValue: p.buff_value,
          createdAt: p.created_at || new Date().toISOString(),
          level: p.level ?? 1
        }));

        // Fallback sync: if cloud is empty but local has pets, push local pets to Supabase
        if (dbPets.length === 0 && localPets.length > 0) {
          console.log('🔄 [BackendService] Syncing local pets to Supabase...');
          localPets.forEach(pet => {
            client.from('pets').insert({
              id: pet.id,
              user_id: pet.userId,
              pet_type_id: pet.petTypeId,
              nickname: pet.nickname,
              rarity: pet.rarity,
              buff_type: pet.buffType,
              buff_value: pet.buffValue,
              level: pet.level
            }).returns<SupabasePetRow[]>().then(({ error: pError }) => {
              if (pError) console.error('Error syncing local pet to Supabase:', pError);
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
    const client = supabase;
    if (isSupabaseEnabled && client) {
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
        ] as const;

        const matchedType = PET_TYPES_LOCAL.find(pt => pt.id === petTypeId);

        const rarity: 'common' | 'rare' | 'epic' | 'legendary' = matchedType ? matchedType.rarity : 'common';
        const buffType: 'time_bonus' | 'aura_multiplier' | 'gem_multiplier' | 'combined' = matchedType ? matchedType.buffType : 'gem_multiplier';
        const buffValue = matchedType ? matchedType.buffValue : 1.1;

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

        const { error } = await client.from('pets').insert({
          id: petId,
          user_id: userId,
          pet_type_id: petTypeId,
          nickname,
          rarity,
          buff_type: buffType,
          buff_value: buffValue,
          level: 1
        }).returns<SupabasePetRow[]>();

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
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Fusing pets ${parentId1} and ${parentId2} in Supabase...`);
        
        // 1. Fetch both pets and verify they belong to userId (RPC simulation security validation)
        const { data: petData1 } = await client.from('pets').select('*').eq('id', parentId1).eq('user_id', userId).returns<SupabasePetRow[]>();
        const { data: petData2 } = await client.from('pets').select('*').eq('id', parentId2).eq('user_id', userId).returns<SupabasePetRow[]>();
        
        if (!petData1 || petData1.length === 0 || !petData2 || petData2.length === 0) {
          throw new Error('Um ou ambos os pets não pertencem ao usuário ou não existem.');
        }

        const pet = petData1[0];
        const currentStars = (pet as any).stars ?? 1;
        const { error: updateError } = await client
          .from('pets')
          .update({
            stars: (currentStars as number) + 1,
            buff_value: pet.buff_value * 1.5
          })
          .eq('id', parentId1)
          .returns<SupabasePetRow[]>();
        if (updateError) throw updateError;

        const { error: deleteError } = await client.from('pets').delete().eq('id', parentId2).returns<SupabasePetRow[]>();
        if (deleteError) throw deleteError;
      } catch (err) {
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

  async getTimeline(userId: string): Promise<TimelineEntry[]> {
    return mockDb.getTimeline(userId);
  },

  // 5. Statistics & Adaptive Review
  async getMathStats(userId: string): Promise<MathStatistic[]> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Fetching math stats for ${userId} from Supabase...`);
        const { data, error } = await client.from('math_statistics').select('*').eq('user_id', userId).returns<SupabaseMathStatisticRow[]>();
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
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Recording answer for ${userId} in Supabase: ${questionKey}`);
        
        // Fetch existing row to increment
        const { data } = await client
          .from('math_statistics')
          .select('*')
          .eq('user_id', userId)
          .eq('question_key', questionKey)
          .returns<SupabaseMathStatisticRow[]>();
        
        if (data && data.length > 0) {
          const row = data[0];
          const updates = {
            correct_count: (row.correct_count ?? 0) + (isCorrect ? 1 : 0),
            incorrect_count: (row.incorrect_count ?? 0) + (isCorrect ? 0 : 1),
            total_time_taken_ms: (row.total_time_taken_ms ?? 0) + timeTakenMs
          };
          await client
            .from('math_statistics')
            .update(updates)
            .eq('user_id', userId)
            .eq('question_key', questionKey)
            .returns<SupabaseMathStatisticRow[]>();
        } else {
          const statId = 'stat_' + Math.random().toString(36).substring(2, 11);
          await client.from('math_statistics').insert({
            id: statId,
            user_id: userId,
            question_key: questionKey,
            correct_count: isCorrect ? 1 : 0,
            incorrect_count: isCorrect ? 0 : 1,
            total_time_taken_ms: timeTakenMs
          }).returns<SupabaseMathStatisticRow[]>();
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

  async recordOlympicMedal(userId: string, category: string, medal: 'gold' | 'silver' | 'bronze'): Promise<GameState | null> {
    return mockDb.recordOlympicMedal(userId, category, medal);
  },

  async resetMathStats(userId: string): Promise<void> {
    mockDb.resetMathStats(userId);
  },

  getMathProgress(userId: string, op: string): {
    currentTier: number;
    maxUnlockedTier: number;
    percentToNext: number;
    unlockedList: number[];
    masteredList: number[];
  } {
    return mockDb.getMathProgress(userId, op);
  },


  async completeCampaignStage(userId: string, stageId: number, overrideXp?: number, overrideGems?: number): Promise<GameState | null> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
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
          const camelCaseUpdates: Partial<GameState> = {
            campaignStage: nextStage,
            gems: state.gems + gemsReward,
            auraXp: state.auraXp + xpReward
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
            camelCaseUpdates.auraLevel = level;
            camelCaseUpdates.auraXp = xp;
          }

          const freshState = await this.updateGameState(userId, camelCaseUpdates);
          
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
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log('[BackendService] Fetching real-time leaderboard from Supabase...');
        // Fetch players, game_states, and pets in parallel
        const [usersRes, statesRes, petsRes, clansRes] = await Promise.race([
          Promise.all([
            client.from('users').select('id, username').eq('role', 'player').returns<SupabaseUserRow[]>(),
            client.from('game_states').select('user_id, aura_level, rebirths, gems, equipped_pet_id, equipped_cosmetic_id, active_class, aura_color, clan_id, clan_contributions, total_play_time_seconds, selected_operation, unlocked_skills, updated_at').returns<SupabaseGameStateRow[]>(),
            client.from('pets').select('*').returns<SupabasePetRow[]>(),
            client.from('clans').select('id, name').returns<SupabaseClanRow[]>()
          ]),
          new Promise<{ data: any; error: any }[]>((_, reject) => 
            setTimeout(() => reject(new Error('Supabase request timed out')), 2500)
          )
        ]);

        if (usersRes.error) throw usersRes.error;
        if (statesRes.error) throw statesRes.error;
        
        const dbUsers = usersRes.data || [];
        const dbStates = statesRes.data || [];
        const dbPets = petsRes.data || [];
        const dbClans = clansRes.data || [];

        const PET_TYPES_LOCAL = [
          { id: 'robot_pup', emoji: '🤖', name: 'Robô Pup' },
          { id: 'slime_buddy', emoji: '🧪', name: 'Slime' },
          { id: 'phoenix_chick', emoji: '🔥', name: 'Fênix' },
          { id: 'dragon_kid', emoji: '🐉', name: 'Dragão' },
          { id: 'cosmic_owl', emoji: '🦉', name: 'Coruja' },
          { id: 'neon_kitten', emoji: '🐱', name: 'Gato Neon' },
          { id: 'cyber_phoenix', emoji: '🐦', name: 'Cyber Fênix' }
        ];

        return dbUsers
          .map((u: SupabaseUserRow) => {
            const state = dbStates.find((s: SupabaseGameStateRow) => s.user_id === u.id) || {
              user_id: u.id,
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
              selected_operation: 'multiplication' as const,
              unlocked_skills: []
            };
            const equippedPet = state.equipped_pet_id ? dbPets.find((p: SupabasePetRow) => p.id === state.equipped_pet_id) : null;
            const petType = equippedPet ? PET_TYPES_LOCAL.find((pt) => pt.id === equippedPet.pet_type_id) : null;
            const petEmoji = petType?.emoji;
            const petName = equippedPet?.nickname || petType?.name;
            const petLevel = equippedPet?.level ?? 1;

            const rawEquipped = state.equipped_cosmetic_id || null;
            let equippedCosmetics: Record<string, string> = {};
            let equippedCosmeticId: string | null = null;
            if (rawEquipped) {
              if (rawEquipped.startsWith('{')) {
                try {
                  equippedCosmetics = JSON.parse(rawEquipped) as Record<string, string>;
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

            const activeTitleId = equippedCosmetics.title || (equippedCosmeticId?.startsWith('title_') ? equippedCosmeticId : null);
            const titleItem = activeTitleId ? COSMETIC_ITEMS.find(c => c.id === activeTitleId) : null;
            const titleText = titleItem ? titleItem.name.replace('Título: ', '') : undefined;

            const clan = state.clan_id ? dbClans.find((c: SupabaseClanRow) => c.id === state.clan_id) : null;

            const lastActiveTime = new Date(state.updated_at || 0).getTime();
            const isOnline = (Date.now() - lastActiveTime) < 180000;

            const parseStringArray = (val: string[] | string | undefined): string[] => {
              if (!val) return [];
              if (Array.isArray(val)) return val;
              if (val.startsWith('{')) {
                try {
                  return val.replace(/[{}]/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
                } catch {
                  return [];
                }
              }
              return [val];
            };

            return {
              username: u.username,
              level: state.aura_level ?? 1,
              rebirths: state.rebirths ?? 0,
              gems: state.gems ?? 0,
              equippedPetEmoji: petEmoji,
              equippedPetName: petName,
              equippedPetLevel: petLevel,
              equippedTitle: titleText,
              classId: (state.active_class || null) as 'warrior' | 'chronomancer' | 'alchemist' | null,
              auraColor: state.aura_color || '#00ffcc',
              equippedCosmetics,
              equippedCosmeticId,
              clanName: clan ? clan.name : undefined,
              clanContributions: state.clan_contributions ?? 0,
              totalPlayTimeSeconds: state.total_play_time_seconds ?? 0,
              selectedOperation: state.selected_operation ?? 'multiplication',
              unlockedSkillsCount: parseStringArray(state.unlocked_skills).length,
              isOnline
            };
          })
          .sort((a: { rebirths: number; level: number }, b: { rebirths: number; level: number }) => {
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
  async getClanLeaderboard(): Promise<Clan[]> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log('[BackendService] Fetching clans leaderboard from Supabase...');
        const results = await Promise.race([
          Promise.all([
            client.from('clans').select('*').returns<SupabaseClanRow[]>(),
            client.from('game_states').select('user_id, aura_level, rebirths').returns<SupabaseGameStateRow[]>()
          ]),
          new Promise<[{ data: SupabaseClanRow[] | null; error: any }, { data: SupabaseGameStateRow[] | null; error: any }]>((_, reject) => 
            setTimeout(() => reject(new Error('Supabase request timed out')), 2500)
          )
        ]);
        const clansRes = results[0];
        const statesRes = results[1];
        if (clansRes.error) throw clansRes.error;
        const dbClans = clansRes.data || [];
        const dbStates = statesRes.data || [];

        return dbClans.map((clan: SupabaseClanRow) => {
          let totalAuraLevel = 0;
          let totalRebirths = 0;
          const membersList = clan.members || [];
          
          membersList.forEach((memberId: string) => {
            const state = dbStates.find((s: SupabaseGameStateRow) => s.user_id === memberId);
            if (state) {
              totalAuraLevel += (state.aura_level ?? 0);
              totalRebirths += (state.rebirths ?? 0);
            }
          });

          return {
            id: clan.id,
            name: clan.name,
            tag: clan.tag,
            motto: clan.motto || '',
            badgeEmoji: clan.badge_emoji || '🛡️',
            members: membersList,
            totalAuraLevel,
            totalRebirths,
            level: clan.level ?? 1,
            xp: clan.xp ?? 0,
            leaderId: clan.leader_id || '',
            joinRequests: clan.join_requests || [],
            bossHp: clan.boss_hp ?? 5000,
            bossMaxHp: clan.boss_max_hp ?? 5000,
            bossLevel: clan.boss_level ?? 1
          };
        }).sort((a: { totalRebirths: number; totalAuraLevel: number }, b: { totalRebirths: number; totalAuraLevel: number }) => {
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
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Student ${userId} joining Clan ${clanId}...`);
        
        // 1. Leave current clan first if any
        await this.leaveClan(userId);

        // 2. Fetch target clan to update member list
        const { data: clanData, error: fetchErr } = await client.from('clans').select('*').eq('id', clanId).returns<SupabaseClanRow[]>();
        if (fetchErr) throw fetchErr;

        if (clanData && clanData.length > 0) {
          const clan = clanData[0];
          const membersList = clan.members || [];
          if (!membersList.includes(userId)) {
            membersList.push(userId);
            const { error: updateClanErr } = await client.from('clans').update({ members: membersList }).eq('id', clanId).returns<SupabaseClanRow[]>();
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
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Student ${userId} leaving clan...`);
        const state = await this.getGameState(userId);
        if (state && state.clanId) {
          const { data: clanData } = await client.from('clans').select('*').eq('id', state.clanId).returns<SupabaseClanRow[]>();
          if (clanData && clanData.length > 0) {
            const clan = clanData[0];
            const membersList = (clan.members || []).filter((id: string) => id !== userId);
            
            if (membersList.length === 0) {
              // Delete clan if empty
              await client.from('clans').delete().eq('id', state.clanId).returns<SupabaseClanRow[]>();
            } else {
              const updatePayload: Partial<SupabaseClanRow> = { members: membersList };
              if (clan.leader_id === userId) {
                updatePayload.leader_id = membersList[0];
              }
              await client.from('clans').update(updatePayload).eq('id', state.clanId).returns<SupabaseClanRow[]>();
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
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Student ${userId} creating Clan ${name}...`);
        
        // 1. Leave current clan first
        await this.leaveClan(userId);

        // 2. Insert new clan row
        const newClanId = 'clan_' + Math.random().toString(36).substring(2, 11);
        const { error: insertErr } = await client.from('clans').insert({
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
        }).returns<SupabaseClanRow[]>();

        if (insertErr) throw insertErr;

        // 3. Update user's game state with new clan_id
        return await this.updateGameState(userId, { clanId: newClanId });
      } catch (err: any) {
        console.error('[BackendService] Supabase error in createClan:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert('Erro no Banco de Dados (Supabase):\n' + errMsg + '\n\nO clã foi salvo apenas no modo Offline/Local.');
      }
    }
    return mockDb.createClan(userId, name, tag, motto, badgeEmoji);
  },

  async damageClanBoss(userId: string, clanId: string, amount: number): Promise<{ bossHp: number; bossMaxHp: number; bossLevel: number; defeated: boolean; rewardGems: number } | null> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        console.log(`[BackendService] Damaging clan boss of ${clanId} by ${amount}...`);
        const { data, error } = await client.from('clans').select('boss_hp, boss_max_hp, boss_level, members, level, xp').eq('id', clanId).returns<SupabaseClanRow[]>();
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
            const { data: states } = await client.from('game_states').select('user_id, gems').in('user_id', membersList).returns<SupabaseGameStateRow[]>();
            if (states) {
              for (const s of states) {
                const nextGems = (s.gems ?? 0) + rewardGems;
                await client.from('game_states').update({ gems: nextGems }).eq('user_id', s.user_id).returns<SupabaseGameStateRow[]>();
              }
            }
          }

          // Save clan boss state
          const { error: updateErr } = await client.from('clans').update({
            boss_hp: bossHp,
            boss_max_hp: bossMaxHp,
            boss_level: bossLevel,
            level,
            xp
          }).eq('id', clanId).returns<SupabaseClanRow[]>();

          if (updateErr) throw updateErr;

          // Sync with local memory
          mockDb.damageClanBoss(userId, clanId, amount);

          return { bossHp, bossMaxHp, bossLevel, defeated, rewardGems };
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in damageClanBoss:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert('Erro no Banco de Dados (Supabase - Chefão de Clã):\n' + errMsg + '\n\nO progresso do clã foi salvo apenas offline.');
      }
    }
    return mockDb.damageClanBoss(userId, clanId, amount);
  },

  async applyToClan(userId: string, clanId: string): Promise<void> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        const { data } = await client.from('clans').select('join_requests, members').eq('id', clanId).returns<SupabaseClanRow[]>();
        if (data && data.length > 0) {
          const clan = data[0];
          if (!(clan.members || []).includes(userId) && !(clan.join_requests || []).includes(userId)) {
            const newReqs = [...(clan.join_requests || []), userId];
            await client.from('clans').update({ join_requests: newReqs }).eq('id', clanId).returns<SupabaseClanRow[]>();
          }
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in applyToClan:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert('Erro no Banco de Dados (Supabase - Candidatar-se ao Clã):\n' + errMsg);
      }
    }
    mockDb.applyToClan(userId, clanId);
  },

  async acceptApplication(leaderId: string, clanId: string, candidateId: string): Promise<void> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        const { data } = await client.from('clans').select('leader_id, join_requests, members').eq('id', clanId).returns<SupabaseClanRow[]>();
        if (data && data.length > 0) {
          const clan = data[0];
          if (clan.leader_id === leaderId) {
            const newReqs = (clan.join_requests || []).filter((id: string) => id !== candidateId);
            const newMembers = [...(clan.members || [])];
            if (!newMembers.includes(candidateId)) newMembers.push(candidateId);
            
            await client.from('clans').update({ join_requests: newReqs, members: newMembers }).eq('id', clanId).returns<SupabaseClanRow[]>();
            await this.updateGameState(candidateId, { clanId });
          }
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in acceptApplication:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert('Erro no Banco de Dados (Supabase - Aceitar Membro):\n' + errMsg);
      }
    }
    mockDb.acceptApplication(leaderId, clanId, candidateId);
  },

  async rejectApplication(leaderId: string, clanId: string, candidateId: string): Promise<void> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        const { data } = await client.from('clans').select('leader_id, join_requests').eq('id', clanId).returns<SupabaseClanRow[]>();
        if (data && data.length > 0 && data[0].leader_id === leaderId) {
          const newReqs = (data[0].join_requests || []).filter((id: string) => id !== candidateId);
          await client.from('clans').update({ join_requests: newReqs }).eq('id', clanId).returns<SupabaseClanRow[]>();
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in rejectApplication:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert('Erro no Banco de Dados (Supabase - Recusar Membro):\n' + errMsg);
      }
    }
    mockDb.rejectApplication(leaderId, clanId, candidateId);
  },

  async kickMember(leaderId: string, clanId: string, targetId: string): Promise<void> {
    if (leaderId === targetId) return;
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        const { data } = await client.from('clans').select('leader_id, members').eq('id', clanId).returns<SupabaseClanRow[]>();
        if (data && data.length > 0 && data[0].leader_id === leaderId) {
          const newMembers = (data[0].members || []).filter((id: string) => id !== targetId);
          await client.from('clans').update({ members: newMembers }).eq('id', clanId).returns<SupabaseClanRow[]>();
          await this.updateGameState(targetId, { clanId: null });
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in kickMember:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert('Erro no Banco de Dados (Supabase - Expulsar Membro):\n' + errMsg);
      }
    }
    mockDb.kickMember(leaderId, clanId, targetId);
  },

  async transferLeadership(leaderId: string, clanId: string, targetId: string): Promise<void> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        const { data } = await client.from('clans').select('leader_id, members').eq('id', clanId).returns<SupabaseClanRow[]>();
        if (data && data.length > 0 && data[0].leader_id === leaderId && (data[0].members || []).includes(targetId)) {
          await client.from('clans').update({ leader_id: targetId }).eq('id', clanId).returns<SupabaseClanRow[]>();
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in transferLeadership:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert('Erro no Banco de Dados (Supabase - Promover Líder):\n' + errMsg);
      }
    }
    mockDb.transferLeadership(leaderId, clanId, targetId);
  },

  async addClanXp(clanId: string, amount: number): Promise<void> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        const { data } = await client.from('clans').select('level, xp').eq('id', clanId).returns<SupabaseClanRow[]>();
        if (data && data.length > 0) {
          let { level, xp } = data[0];
          level = level ?? 1;
          xp = (xp ?? 0) + amount;
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
          await client.from('clans').update({ level, xp }).eq('id', clanId).returns<SupabaseClanRow[]>();
        }
      } catch (err: any) {
        console.error('[BackendService] Supabase error in addClanXp:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert('Erro no Banco de Dados (Supabase - Sincronizar XP do Clã):\n' + errMsg);
      }
    }
    mockDb.addClanXp(clanId, amount);
  },

  async getClanBonus(clanId: string): Promise<{ xpMultiplier: number, gemMultiplier: number }> {
    const client = supabase;
    if (isSupabaseEnabled && client) {
      try {
        const { data } = await client.from('clans').select('level').eq('id', clanId).returns<SupabaseClanRow[]>();
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
