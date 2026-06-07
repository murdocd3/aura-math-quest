// Mock Database Service using LocalStorage
// Implements schemas for users, game states, pets, and math stats.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';

const isSupabaseEnabled = SUPABASE_URL.trim() !== '' && SUPABASE_ANON_KEY.trim() !== '';

const supabase = isSupabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;


export interface User {
  id: string;
  username: string;
  role: 'admin' | 'player';
  passwordHash: string; // Plaintext for mockup simplicity, or base64
  createdAt: string;
}

export interface GameState {
  userId: string;
  auraLevel: number;
  auraXp: number;
  auraColor: string; // e.g., '#00ffcc', '#ff00ff'
  rebirths: number;
  gems: number;
  currentZone: 'forest' | 'volcano';
  equippedPetId: string | null;
  activeAuras: string[]; // Tiers unlocked
  totalPlayTimeSeconds: number;
  updatedAt: string;
  purchasedCosmetics: string[];
  equippedCosmeticId: string | null;
  selectedOperation: 'addition' | 'subtraction' | 'multiplication' | 'division';
  questWins: number;
  questCriticals: number;
  questStreak: number;
  claimedQuests: string[];
  classId: 'warrior' | 'chronomancer' | 'alchemist' | null;
  skillPoints: number;
  unlockedSkills: string[];
  clanId: string | null;
  clanContributions: number;
  campaignStage: number;
  auraPassXp?: number;
  hasElitePass?: boolean;
  claimedPassTiers?: number[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  cost: number;
  classId: 'warrior' | 'chronomancer' | 'alchemist';
}

export const SKILL_TREE: Skill[] = [
  { id: 'extra_shield', name: 'Escudo Reforçado', description: '+1 Escudo HP Máximo em combate.', cost: 1, classId: 'warrior' },
  { id: 'crit_window', name: 'Foco de Combate', description: 'Janela de tempo de crítico +15% maior.', cost: 2, classId: 'warrior' },
  { id: 'time_focus', name: 'Foco Temporal', description: '+1.5s de resposta em combates.', cost: 1, classId: 'chronomancer' },
  { id: 'time_freeze', name: 'Esfera Estática', description: 'Tempo congelado na 1ª pergunta.', cost: 2, classId: 'chronomancer' },
  { id: 'alchemy_gems', name: 'Transmutação de Gemas', description: '+20% Gemas ganhas em batalhas.', cost: 1, classId: 'alchemist' },
  { id: 'lucky_hatch', name: 'Ovo da Sorte', description: '+10% chance de lendários no Gacha.', cost: 2, classId: 'alchemist' },
];

export interface Clan {
  id: string;
  name: string;
  tag: string;
  motto: string;
  badgeEmoji: string;
  members: string[];
  totalAuraLevel: number;
  totalRebirths: number;
}

export interface TradeListing {
  id: string;
  posterId: string;
  posterUsername: string;
  offeredPetId: string | null;
  offeredPetEmoji: string;
  offeredPetName: string;
  requestedType: 'gems' | 'pet';
  requestedAmount: number;
  requestedPetTypeId: string | null;
  createdAt: string;
}

export interface CosmeticItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  description: string;
  color: string;
}

export const COSMETIC_ITEMS: CosmeticItem[] = [
  { id: 'cyber_wand', name: 'Varinha Cyber', emoji: '🪄', cost: 12, description: 'Dispara raios neon ao resolver contas.', color: '#00ffcc' },
  { id: 'neon_hat', name: 'Chapéu de Mago Neon', emoji: '🧙‍♂️', cost: 18, description: 'Aumenta sua presença mágica.', color: '#a855f7' },
  { id: 'glitch_crown', name: 'Coroa Glitch', emoji: '👑', cost: 30, description: 'Reservada para os maiores mestres da aura.', color: '#f97316' },
  { id: 'retro_shades', name: 'Óculos Cyberpunk', emoji: '🕶️', cost: 15, description: 'Estilo pixelado retro para focar nas equações.', color: '#ec4899' },
];

export interface Pet {
  id: string;
  userId: string;
  petTypeId: string;
  nickname: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  buffType: 'time_bonus' | 'aura_multiplier' | 'gem_multiplier';
  buffValue: number;
  createdAt: string;
  level: number;
}

export interface MathStatistic {
  userId: string;
  questionKey: string; // e.g. "8x7"
  correctCount: number;
  errorCount: number;
  averageTimeMs: number;
}

export interface PetType {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  buffType: 'time_bonus' | 'aura_multiplier' | 'gem_multiplier';
  buffValue: number; // seconds for time_bonus, multiplier factor for others
  cost: number;
  color: string;
  emoji: string;
}

export const PET_TYPES: PetType[] = [
  {
    id: 'robot_pup',
    name: 'Robot Pup',
    rarity: 'common',
    buffType: 'gem_multiplier',
    buffValue: 1.1, // +10% Gems
    cost: 10,
    color: '#a1a1aa', // Silver/gray
    emoji: '🤖',
  },
  {
    id: 'cyber_bunny',
    name: 'Ciber Coelho',
    rarity: 'common',
    buffType: 'time_bonus',
    buffValue: 1.0, // +1.0s reply time
    cost: 10,
    color: '#a1a1aa',
    emoji: '🐇',
  },
  {
    id: 'pixel_piggy',
    name: 'Piggy Pixel',
    rarity: 'common',
    buffType: 'aura_multiplier',
    buffValue: 1.05, // +5% Aura XP
    cost: 12,
    color: '#a1a1aa',
    emoji: '🐷',
  },
  {
    id: 'slime_buddy',
    name: 'Slime Buddy',
    rarity: 'rare',
    buffType: 'aura_multiplier',
    buffValue: 1.15, // +15% Aura XP
    cost: 20,
    color: '#22c55e', // Green
    emoji: '🧪',
  },
  {
    id: 'neon_kitten',
    name: 'Cyber Kitten',
    rarity: 'rare',
    buffType: 'time_bonus',
    buffValue: 2.0, // +2.0 seconds reply time
    cost: 22,
    color: '#06b6d4', // Cyan
    emoji: '🐱',
  },
  {
    id: 'vector_fox',
    name: 'Raposa Vetorial',
    rarity: 'rare',
    buffType: 'gem_multiplier',
    buffValue: 1.2, // +20% Gems
    cost: 24,
    color: '#22c55e',
    emoji: '🦊',
  },
  {
    id: 'phoenix_chick',
    name: 'Phoenix Chick',
    rarity: 'epic',
    buffType: 'time_bonus',
    buffValue: 2.0, // +2.0 seconds reply time
    cost: 35,
    color: '#f97316', // Orange
    emoji: '🔥',
  },
  {
    id: 'hologram_monkey',
    name: 'Macaco Holo',
    rarity: 'epic',
    buffType: 'aura_multiplier',
    buffValue: 1.25, // +25% Aura XP
    cost: 38,
    color: '#3b82f6',
    emoji: '🐒',
  },
  {
    id: 'glitch_raccoon',
    name: 'Guaxinim Glitch',
    rarity: 'epic',
    buffType: 'gem_multiplier',
    buffValue: 1.3, // +30% Gems
    cost: 40,
    color: '#3b82f6',
    emoji: '🦝',
  },
  {
    id: 'quantum_panda',
    name: 'Panda Quântico',
    rarity: 'epic',
    buffType: 'time_bonus',
    buffValue: 3.0, // +3.0 seconds reply time
    cost: 45,
    color: '#3b82f6',
    emoji: '🐼',
  },
  {
    id: 'dragon_kid',
    name: 'Dragon Kid',
    rarity: 'legendary',
    buffType: 'gem_multiplier', // Also doubles up as custom stats in battle
    buffValue: 1.4, // +40% Gems and +2s Response (coded in Arena)
    cost: 50,
    color: '#a855f7', // Purple/Neon
    emoji: '🐉',
  },
  {
    id: 'cosmic_owl',
    name: 'Cosmic Owl',
    rarity: 'legendary',
    buffType: 'gem_multiplier',
    buffValue: 1.5, // +50% Gems
    cost: 999, // Unlocked via Story Mode
    color: '#ec4899', // Hot Pink
    emoji: '🦉',
  },
  {
    id: 'cyber_phoenix',
    name: 'Cyber Phoenix',
    rarity: 'legendary',
    buffType: 'gem_multiplier',
    buffValue: 1.5, // +50% Gems
    cost: 999, // Unlocked via Aura Pass
    color: '#f43f5e', // Rose
    emoji: '🐦',
  },
  {
    id: 'binary_wolf',
    name: 'Lobo Binário',
    rarity: 'legendary',
    buffType: 'time_bonus',
    buffValue: 4.0, // +4.0s response time
    cost: 90,
    color: '#a855f7',
    emoji: '🐺',
  },
  {
    id: 'hyper_unicorn',
    name: 'Unicórnio Hiper',
    rarity: 'legendary',
    buffType: 'aura_multiplier',
    buffValue: 1.5, // +50% Aura XP
    cost: 100,
    color: '#a855f7',
    emoji: '🦄',
  },
];

const STORAGE_KEYS = {
  USERS: 'amq_users',
  GAME_STATES: 'amq_game_states',
  PETS: 'amq_pets',
  STATS: 'amq_stats',
  CLANS: 'amq_clans',
  TRADES: 'amq_trades',
};

// Seed initial data if empty
export function seedDatabase() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers: User[] = [
      { id: 'admin-id', username: 'admin', role: 'admin', passwordHash: 'auraadmin123', createdAt: new Date().toISOString() },
      { id: 'player-lucas', username: 'lucas', role: 'player', passwordHash: 'lucas123', createdAt: new Date().toISOString() },
      { id: 'player-sofia', username: 'sofia', role: 'player', passwordHash: 'sofia123', createdAt: new Date().toISOString() },
      { id: 'player-gabriel', username: 'gabriel', role: 'player', passwordHash: 'gabriel123', createdAt: new Date().toISOString() },
      { id: 'player-beatriz', username: 'beatriz', role: 'player', passwordHash: 'beatriz123', createdAt: new Date().toISOString() },
    ];

    const defaultGameStates: GameState[] = [
      {
        userId: 'player-lucas',
        auraLevel: 75,
        auraXp: 1200,
        auraColor: '#a855f7',
        rebirths: 2,
        gems: 85,
        currentZone: 'volcano',
        equippedPetId: 'pet-lucas-dragon',
        activeAuras: ['lvl10', 'lvl30', 'lvl60'],
        totalPlayTimeSeconds: 7200,
        updatedAt: new Date().toISOString(),
        purchasedCosmetics: ['cyber_wand', 'retro_shades'],
        equippedCosmeticId: 'cyber_wand',
        selectedOperation: 'multiplication',
        questWins: 0,
        questCriticals: 0,
        questStreak: 0,
        claimedQuests: [],
        classId: 'warrior',
        skillPoints: 2,
        unlockedSkills: ['extra_shield'],
        clanId: 'clan-alpha',
        clanContributions: 150,
        campaignStage: 3,
      },
      {
        userId: 'player-sofia',
        auraLevel: 42,
        auraXp: 450,
        auraColor: '#3b82f6',
        rebirths: 1,
        gems: 30,
        currentZone: 'forest',
        equippedPetId: 'pet-sofia-slime',
        activeAuras: ['lvl10', 'lvl30'],
        totalPlayTimeSeconds: 3600,
        updatedAt: new Date().toISOString(),
        purchasedCosmetics: [],
        equippedCosmeticId: null,
        selectedOperation: 'multiplication',
        questWins: 0,
        questCriticals: 0,
        questStreak: 0,
        claimedQuests: [],
        classId: 'chronomancer',
        skillPoints: 1,
        unlockedSkills: [],
        clanId: 'clan-alpha',
        clanContributions: 50,
        campaignStage: 2,
      },
      {
        userId: 'player-gabriel',
        auraLevel: 12,
        auraXp: 100,
        auraColor: '#00ffcc',
        rebirths: 0,
        gems: 5,
        currentZone: 'forest',
        equippedPetId: null,
        activeAuras: ['lvl10'],
        totalPlayTimeSeconds: 1200,
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
      },
      {
        userId: 'player-beatriz',
        auraLevel: 95,
        auraXp: 8500,
        auraColor: '#f43f5e',
        rebirths: 4,
        gems: 150,
        currentZone: 'volcano',
        equippedPetId: 'pet-beatriz-phoenix',
        activeAuras: ['lvl10', 'lvl30', 'lvl60'],
        totalPlayTimeSeconds: 15000,
        updatedAt: new Date().toISOString(),
        purchasedCosmetics: ['glitch_crown'],
        equippedCosmeticId: 'glitch_crown',
        selectedOperation: 'multiplication',
        questWins: 0,
        questCriticals: 0,
        questStreak: 0,
        claimedQuests: [],
        classId: 'alchemist',
        skillPoints: 4,
        unlockedSkills: ['alchemy_gems', 'lucky_hatch'],
        clanId: 'clan-glitch',
        clanContributions: 300,
        campaignStage: 5,
      },
    ];

    const defaultPets: Pet[] = [
      {
        id: 'pet-lucas-dragon',
        userId: 'player-lucas',
        petTypeId: 'dragon_kid',
        nickname: 'Draco',
        rarity: 'legendary',
        buffType: 'gem_multiplier',
        buffValue: 1.4,
        createdAt: new Date().toISOString(),
        level: 1,
      },
      {
        id: 'pet-sofia-slime',
        userId: 'player-sofia',
        petTypeId: 'slime_buddy',
        nickname: 'Gloop',
        rarity: 'rare',
        buffType: 'aura_multiplier',
        buffValue: 1.15,
        createdAt: new Date().toISOString(),
        level: 1,
      },
      {
        id: 'pet-beatriz-phoenix',
        userId: 'player-beatriz',
        petTypeId: 'phoenix_chick',
        nickname: 'Fenix',
        rarity: 'epic',
        buffType: 'time_bonus',
        buffValue: 2.0,
        createdAt: new Date().toISOString(),
        level: 1,
      },
    ];

    const defaultStats: MathStatistic[] = [
      { userId: 'player-lucas', questionKey: '8x7', correctCount: 15, errorCount: 5, averageTimeMs: 4200 },
      { userId: 'player-lucas', questionKey: '9x8', correctCount: 10, errorCount: 6, averageTimeMs: 5500 },
      { userId: 'player-sofia', questionKey: '3x4', correctCount: 22, errorCount: 1, averageTimeMs: 2200 },
      { userId: 'player-sofia', questionKey: '7x6', correctCount: 8, errorCount: 8, averageTimeMs: 6500 },
      { userId: 'player-gabriel', questionKey: '2x3', correctCount: 10, errorCount: 0, averageTimeMs: 1800 },
      { userId: 'player-beatriz', questionKey: '9x9', correctCount: 40, errorCount: 2, averageTimeMs: 1900 },
    ];

    const defaultClans: Clan[] = [
      {
        id: 'clan-alpha',
        name: 'Alpha Math',
        tag: 'AMATH',
        motto: 'Somando forças, dividindo limites!',
        badgeEmoji: '⚡',
        members: ['player-lucas', 'player-sofia'],
        totalAuraLevel: 117,
        totalRebirths: 3,
      },
      {
        id: 'clan-glitch',
        name: 'Code Glitchers',
        tag: 'GLITCH',
        motto: 'Nós controlamos a instabilidade.',
        badgeEmoji: '👾',
        members: ['player-beatriz'],
        totalAuraLevel: 95,
        totalRebirths: 4,
      }
    ];

    const defaultTrades: TradeListing[] = [
      {
        id: 'trade-sofia-1',
        posterId: 'player-sofia',
        posterUsername: 'sofia',
        offeredPetId: null,
        offeredPetEmoji: '🧪',
        offeredPetName: 'Slime Buddy',
        requestedType: 'gems',
        requestedAmount: 12,
        requestedPetTypeId: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trade-lucas-1',
        posterId: 'player-lucas',
        posterUsername: 'lucas',
        offeredPetId: null,
        offeredPetEmoji: '🤖',
        offeredPetName: 'Robot Pup',
        requestedType: 'pet',
        requestedAmount: 0,
        requestedPetTypeId: 'slime_buddy',
        createdAt: new Date().toISOString(),
      }
    ];

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    localStorage.setItem(STORAGE_KEYS.GAME_STATES, JSON.stringify(defaultGameStates));
    localStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(defaultPets));
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(defaultStats));
    localStorage.setItem(STORAGE_KEYS.CLANS, JSON.stringify(defaultClans));
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(defaultTrades));
  }

  // Clear specific users (patricia, luigi, manu, maju) if they exist in localStorage
  try {
    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (rawUsers) {
      const users: User[] = JSON.parse(rawUsers);
      const targets = ['patricia', 'luigi', 'manu', 'maju'];
      const usersToClear = users.filter(u => targets.includes(u.username.toLowerCase()));

      if (usersToClear.length > 0) {
        const remainingUsers = users.filter(u => !targets.includes(u.username.toLowerCase()));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(remainingUsers));

        const userIdsToClear = usersToClear.map(u => u.id);

        // Clear GameStates
        const rawStates = localStorage.getItem(STORAGE_KEYS.GAME_STATES);
        if (rawStates) {
          const states: GameState[] = JSON.parse(rawStates);
          localStorage.setItem(STORAGE_KEYS.GAME_STATES, JSON.stringify(states.filter(s => !userIdsToClear.includes(s.userId))));
        }

        // Clear Pets
        const rawPets = localStorage.getItem(STORAGE_KEYS.PETS);
        if (rawPets) {
          const pets: Pet[] = JSON.parse(rawPets);
          localStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(pets.filter(p => !userIdsToClear.includes(p.userId))));
        }

        // Clear Stats
        const rawStats = localStorage.getItem(STORAGE_KEYS.STATS);
        if (rawStats) {
          const stats: MathStatistic[] = JSON.parse(rawStats);
          localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats.filter(s => !userIdsToClear.includes(s.userId))));
        }

        // Sync deletion to Supabase in background
        if (isSupabaseEnabled && supabase) {
          userIdsToClear.forEach(id => {
            supabase.from('users').delete().eq('id', id).then(({ error }) => {
              if (error) console.error('[mockDb seed clean] Error cleaning user from Supabase:', error);
            });
          });
        }
      }
    }
  } catch (err) {
    console.error('[mockDb] Error during user cleanup step:', err);
  }
}

// Helper methods to read/write JSON
const getStorageItem = <T>(key: string): T[] => {
  seedDatabase();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setStorageItem = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
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

// API LAYER

export const mockDb = {
  // Users APIs
  getUsers(): User[] {
    return getStorageItem<User>(STORAGE_KEYS.USERS);
  },

  authenticate(username: string, passwordHash: string): User | null {
    const users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === cleanUser);
    if (user && user.passwordHash === passwordHash) {
      return user;
    }
    return null;
  },

  createUser(username: string, passwordHash: string, role: 'admin' | 'player'): User | null {
    const users = this.getUsers();
    const cleanUser = username.trim();
    if (users.some(u => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      return null; // Username exists
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      username: cleanUser,
      role,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    setStorageItem(STORAGE_KEYS.USERS, users);

    let newState: GameState | null = null;

    // Initialize default game state for player
    if (role === 'player') {
      const gameStates = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
      newState = {
        userId: newUser.id,
        auraLevel: 1,
        auraXp: 0,
        auraColor: '#00ffcc', // initial neon color
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
      };
      gameStates.push(newState);
      setStorageItem(STORAGE_KEYS.GAME_STATES, gameStates);
    }

    // Sync to Supabase in background
    if (isSupabaseEnabled && supabase) {
      supabase.from('users')
        .insert({
          id: newUser.id,
          username: newUser.username,
          password: newUser.passwordHash,
          role: newUser.role,
        })
        .then(({ error: uError }) => {
          if (uError) {
            console.error('[mockDb] Error syncing new user to Supabase:', uError);
            return;
          }

          if (role === 'player' && newState) {
            const dbRow = mapGameStateToDb(newState);
            dbRow.user_id = newUser.id;
            supabase.from('game_states')
              .insert(dbRow)
              .then(({ error: sError }) => {
                if (sError) console.error('[mockDb] Error syncing default game state to Supabase:', sError);
              });
          }
        });
    }

    return newUser;
  },

  updateUser(id: string, updates: Partial<Pick<User, 'username' | 'passwordHash'>>): boolean {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;

    if (updates.username) {
      const cleanUser = updates.username.trim();
      if (users.some(u => u.id !== id && u.username.toLowerCase() === cleanUser.toLowerCase())) {
        return false; // Name clash
      }
      users[index].username = cleanUser;
    }
    if (updates.passwordHash) {
      users[index].passwordHash = updates.passwordHash;
    }

    setStorageItem(STORAGE_KEYS.USERS, users);

    // Sync to Supabase in background
    if (isSupabaseEnabled && supabase) {
      const dbUpdates: any = {};
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.passwordHash !== undefined) dbUpdates.password = updates.passwordHash;
      supabase.from('users')
        .update(dbUpdates)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('[mockDb] Error syncing user update to Supabase:', error);
        });
    }

    return true;
  },

  deleteUser(id: string): boolean {
    const users = this.getUsers();
    const filteredUsers = users.filter(u => u.id !== id);
    if (users.length === filteredUsers.length) return false;

    setStorageItem(STORAGE_KEYS.USERS, filteredUsers);

    // Cascade deletions
    const gameStates = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    setStorageItem(STORAGE_KEYS.GAME_STATES, gameStates.filter(gs => gs.userId !== id));

    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    setStorageItem(STORAGE_KEYS.PETS, pets.filter(p => p.userId !== id));

    const stats = getStorageItem<MathStatistic>(STORAGE_KEYS.STATS);
    setStorageItem(STORAGE_KEYS.STATS, stats.filter(s => s.userId !== id));

    // Sync to Supabase in background (cascade deletion in DB schema automatically deletes associated game_states, pets, stats)
    if (isSupabaseEnabled && supabase) {
      supabase.from('users')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('[mockDb] Error syncing user deletion to Supabase:', error);
        });
    }

    return true;
  },

  getGameState(userId: string): GameState | null {
    const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    const state = states.find(gs => gs.userId === userId);
    if (!state) return null;
    
    // Auto-fill defaults for seasonal expansion
    if (state.auraPassXp === undefined) state.auraPassXp = 0;
    if (state.hasElitePass === undefined) state.hasElitePass = false;
    if (state.claimedPassTiers === undefined) state.claimedPassTiers = [];
    
    return state;
  },

  updateGameState(userId: string, updates: Partial<Omit<GameState, 'userId'>>): GameState | null {
    const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    const index = states.findIndex(gs => gs.userId === userId);
    if (index === -1) return null;

    states[index] = {
      ...states[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setStorageItem(STORAGE_KEYS.GAME_STATES, states);

    // Sync to Supabase in background
    if (isSupabaseEnabled && supabase) {
      const dbUpdates = mapGameStateToDb(updates);
      supabase.from('game_states')
        .update(dbUpdates)
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) {
            console.error('[mockDb] Error syncing game_state to Supabase:', error);
          }
        });
    }

    return states[index];
  },

  addPlayTime(userId: string, seconds: number) {
    const state = this.getGameState(userId);
    if (state) {
      this.updateGameState(userId, {
        totalPlayTimeSeconds: (state.totalPlayTimeSeconds || 0) + seconds,
      });
    }
  },

  // Pets APIs
  getPets(userId: string): Pet[] {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    return pets.filter(p => p.userId === userId);
  },

  createPet(userId: string, petTypeId: string, nickname?: string): Pet | null {
    const petType = PET_TYPES.find(p => p.id === petTypeId);
    if (!petType) return null;

    const newPet: Pet = {
      id: 'pet_' + Math.random().toString(36).substring(2, 11),
      userId,
      petTypeId,
      nickname: nickname || petType.name,
      rarity: petType.rarity,
      buffType: petType.buffType,
      buffValue: petType.buffValue,
      createdAt: new Date().toISOString(),
      level: 1,
    };

    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    pets.push(newPet);
    setStorageItem(STORAGE_KEYS.PETS, pets);

    // Sync to Supabase in background
    if (isSupabaseEnabled && supabase) {
      supabase.from('pets')
        .insert({
          id: newPet.id,
          user_id: newPet.userId,
          pet_type_id: newPet.petTypeId,
          nickname: newPet.nickname,
          rarity: newPet.rarity,
          buff_type: newPet.buffType,
          buff_value: newPet.buffValue,
          level: newPet.level,
        })
        .then(({ error }) => {
          if (error) {
            console.error('[mockDb] Error syncing new pet to Supabase:', error);
          }
        });
    }

    return newPet;
  },

  deletePet(petId: string): boolean {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const filteredPets = pets.filter(p => p.id !== petId);
    if (pets.length === filteredPets.length) return false;

    setStorageItem(STORAGE_KEYS.PETS, filteredPets);

    // Sync to Supabase in background
    if (isSupabaseEnabled && supabase) {
      supabase.from('pets')
        .delete()
        .eq('id', petId)
        .then(({ error }) => {
          if (error) {
            console.error('[mockDb] Error deleting pet from Supabase:', error);
          }
        });
    }

    return true;
  },

  equipPet(userId: string, petId: string | null): boolean {
    const state = this.getGameState(userId);
    if (!state) return false;

    if (petId !== null) {
      const pets = this.getPets(userId);
      const petExists = pets.some(p => p.id === petId);
      if (!petExists) return false;
    }

    this.updateGameState(userId, { equippedPetId: petId });
    return true;
  },

  // Math Statistics APIs
  getMathStats(userId: string): MathStatistic[] {
    const stats = getStorageItem<MathStatistic>(STORAGE_KEYS.STATS);
    return stats.filter(s => s.userId === userId);
  },

  recordMathAnswer(userId: string, questionKey: string, correct: boolean, timeMs: number): void {
    const stats = getStorageItem<MathStatistic>(STORAGE_KEYS.STATS);
    const index = stats.findIndex(s => s.userId === userId && s.questionKey === questionKey);

    let updatedStat: MathStatistic;

    if (index === -1) {
      updatedStat = {
        userId,
        questionKey,
        correctCount: correct ? 1 : 0,
        errorCount: correct ? 0 : 1,
        averageTimeMs: timeMs,
      };
      stats.push(updatedStat);
    } else {
      const current = stats[index];
      const newCorrect = current.correctCount + (correct ? 1 : 0);
      const newErrors = current.errorCount + (correct ? 0 : 1);
      const totalAnswers = newCorrect + newErrors;
      const newAverage = Math.round(
        ((current.averageTimeMs * (totalAnswers - 1)) + timeMs) / totalAnswers
      );

      updatedStat = {
        ...current,
        correctCount: newCorrect,
        errorCount: newErrors,
        averageTimeMs: newAverage,
      };
      stats[index] = updatedStat;
    }

    setStorageItem(STORAGE_KEYS.STATS, stats);

    // Sync to Supabase in background
    if (isSupabaseEnabled && supabase) {
      supabase.from('math_statistics')
        .select('*')
        .eq('user_id', userId)
        .eq('question_key', questionKey)
        .then(({ data, error }) => {
          if (error) {
            console.error('[mockDb] Error checking stats in Supabase:', error);
            return;
          }

          if (data && data.length > 0) {
            const row = data[0];
            const updates = {
              correct_count: (row.correct_count ?? 0) + (correct ? 1 : 0),
              incorrect_count: (row.incorrect_count ?? 0) + (correct ? 0 : 1),
              total_time_taken_ms: (row.total_time_taken_ms ?? 0) + timeMs
            };
            supabase.from('math_statistics')
              .update(updates)
              .eq('user_id', userId)
              .eq('question_key', questionKey)
              .then(({ error: uError }) => {
                if (uError) console.error('[mockDb] Error updating stats in Supabase:', uError);
              });
          } else {
            const statId = 'stat_' + Math.random().toString(36).substring(2, 11);
            supabase.from('math_statistics')
              .insert({
                id: statId,
                user_id: userId,
                question_key: questionKey,
                correct_count: correct ? 1 : 0,
                incorrect_count: correct ? 0 : 1,
                total_time_taken_ms: timeMs
              })
              .then(({ error: iError }) => {
                if (iError) console.error('[mockDb] Error inserting stats to Supabase:', iError);
              });
          }
        });
    }
  },

  // Global Leaderboard View
  getLeaderboard(): { username: string; level: number; rebirths: number; gems: number; equippedPetEmoji?: string }[] {
    const users = this.getUsers().filter(u => u.role === 'player');
    const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);

    const fictitiousUserIds = ['player-lucas', 'player-sofia', 'player-gabriel', 'player-beatriz'];

    // Map all entries, filtering out fictitious/seeded users
    return users
      .filter(u => !fictitiousUserIds.includes(u.id))
      .map(u => {
        const state = states.find(gs => gs.userId === u.id) || {
          auraLevel: 1,
          rebirths: 0,
          gems: 0,
          equippedPetId: null,
        };

        const equippedPet = state.equippedPetId ? pets.find(p => p.id === state.equippedPetId) : null;
        const petType = equippedPet ? PET_TYPES.find(pt => pt.id === equippedPet.petTypeId) : null;

        return {
          username: u.username,
          level: state.auraLevel,
          rebirths: state.rebirths,
          gems: state.gems,
          equippedPetEmoji: petType?.emoji,
        };
      })
      .sort((a, b) => {
        if (b.rebirths !== a.rebirths) {
          return b.rebirths - a.rebirths;
        }
        return b.level - a.level;
      });
  },

  // Cosmetics APIs
  buyCosmetic(userId: string, cosmeticId: string): GameState | null {
    const state = this.getGameState(userId);
    const cosmetic = COSMETIC_ITEMS.find(c => c.id === cosmeticId);
    if (!state || !cosmetic) return null;

    const purchased = state.purchasedCosmetics || [];
    if (purchased.includes(cosmeticId)) return null; // already owned

    if (state.gems < cosmetic.cost) return null;

    const updated = this.updateGameState(userId, {
      gems: state.gems - cosmetic.cost,
      purchasedCosmetics: [...purchased, cosmeticId],
    });
    return updated;
  },

  equipCosmetic(userId: string, cosmeticId: string | null): GameState | null {
    const state = this.getGameState(userId);
    if (!state) return null;

    if (cosmeticId !== null) {
      const purchased = state.purchasedCosmetics || [];
      if (!purchased.includes(cosmeticId)) return null; // not owned
    }

    const updated = this.updateGameState(userId, {
      equippedCosmeticId: cosmeticId,
    });
    return updated;
  },

  // Pet Fusion API
  fusePets(userId: string, petId1: string, petId2: string): GameState | null {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const p1Index = pets.findIndex(p => p.id === petId1 && p.userId === userId);
    const p2Index = pets.findIndex(p => p.id === petId2 && p.userId === userId);

    if (p1Index === -1 || p2Index === -1 || petId1 === petId2) return null;

    const pet1 = pets[p1Index];
    const pet2 = pets[p2Index];

    // Verify constraints: same type and both must be level 1
    // Verify constraints: same type, same level, and max level is less than 6 (max 5 fusions -> level 6)
    if (pet1.petTypeId !== pet2.petTypeId) return null;
    if (pet1.level !== pet2.level) return null;
    if (pet1.level >= 6) return null; // Can't fuse further than Level 6 (5 fusions)

    // Check if pet2 is equipped, if so unequip it in game state
    const state = this.getGameState(userId);
    if (!state) return null;

    if (state.equippedPetId === petId2) {
      this.equipPet(userId, null);
    }
    if (state.equippedPetId === petId1) {
      this.equipPet(userId, null);
    }

    // Delete pet2
    const updatedPets = pets.filter(p => p.id !== petId2);

    // Evolve pet1 to next level
    const p1NewIndex = updatedPets.findIndex(p => p.id === petId1);
    
    // Scale buff values: add original base increment per level
    const baseType = PET_TYPES.find(pt => pt.id === pet1.petTypeId);
    const baseBuffVal = baseType ? baseType.buffValue : pet1.buffValue;
    
    let nextLevel = pet1.level + 1;
    let scaledValue = pet1.buffValue;

    if (pet1.buffType === 'time_bonus') {
      // E.g. base is +2s. Level 1: 2s. Level 2: 4s. Level 3: 6s. Level 4: 8s. Level 5: 10s. Level 6: 12s.
      scaledValue = baseBuffVal * nextLevel;
    } else {
      // E.g. base is 1.15 (+15%). Increment is +15%.
      // Level 1: 1.15 (+15%). Level 2: 1.30 (+30%). Level 3: 1.45 (+45%). etc.
      const increment = baseBuffVal - 1;
      scaledValue = 1 + (increment * nextLevel);
    }

    // Add stars to nickname
    const stars = '★'.repeat(nextLevel - 1);
    const baseName = pet1.nickname.split(' ★')[0];

    updatedPets[p1NewIndex] = {
      ...pet1,
      level: nextLevel,
      nickname: `${baseName} ${stars}`,
      buffValue: Math.round(scaledValue * 100) / 100, // round nicely
    };

    setStorageItem(STORAGE_KEYS.PETS, updatedPets);

    // Sync to Supabase in background
    if (isSupabaseEnabled && supabase) {
      supabase.from('pets')
        .update({
          level: nextLevel,
          nickname: updatedPets[p1NewIndex].nickname,
          buff_value: updatedPets[p1NewIndex].buffValue
        })
        .eq('id', petId1)
        .then(() => {
          supabase.from('pets').delete().eq('id', petId2).then(() => {});
        });
    }

    // Force refresh game state to unequip both pets for safety
    return this.getGameState(userId);
  },

  // Clan APIs
  getClans(): Clan[] {
    return getStorageItem<Clan>(STORAGE_KEYS.CLANS);
  },

  getClanLeaderboard(): Clan[] {
    const clans = this.getClans();
    const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    
    return clans.map(clan => {
      let totalAuraLevel = 0;
      let totalRebirths = 0;
      
      clan.members.forEach(memberId => {
        const state = states.find(gs => gs.userId === memberId);
        if (state) {
          totalAuraLevel += state.auraLevel;
          totalRebirths += state.rebirths;
        }
      });
      
      return {
        ...clan,
        totalAuraLevel,
        totalRebirths
      };
    }).sort((a, b) => {
      if (b.totalRebirths !== a.totalRebirths) {
        return b.totalRebirths - a.totalRebirths;
      }
      return b.totalAuraLevel - a.totalAuraLevel;
    });
  },

  joinClan(userId: string, clanId: string): GameState | null {
    const clans = this.getClans();
    const clanIndex = clans.findIndex(c => c.id === clanId);
    if (clanIndex === -1) return null;
    
    const state = this.getGameState(userId);
    if (!state) return null;
    
    if (state.clanId) {
      this.leaveClan(userId);
    }
    
    const currentClans = this.getClans();
    const freshClanIndex = currentClans.findIndex(c => c.id === clanId);
    if (freshClanIndex !== -1 && !currentClans[freshClanIndex].members.includes(userId)) {
      currentClans[freshClanIndex].members.push(userId);
    }
    setStorageItem(STORAGE_KEYS.CLANS, currentClans);
    
    return this.updateGameState(userId, { clanId });
  },

  leaveClan(userId: string): GameState | null {
    const state = this.getGameState(userId);
    if (!state || !state.clanId) return null;
    
    const clans = this.getClans();
    const clanIndex = clans.findIndex(c => c.id === state.clanId);
    if (clanIndex !== -1) {
      clans[clanIndex].members = clans[clanIndex].members.filter(id => id !== userId);
      setStorageItem(STORAGE_KEYS.CLANS, clans);
    }
    
    return this.updateGameState(userId, { clanId: null });
  },

  createClan(userId: string, name: string, tag: string, motto: string, badgeEmoji: string): GameState | null {
    const state = this.getGameState(userId);
    if (!state) return null;
    
    const clans = this.getClans();
    if (clans.some(c => c.name.toLowerCase() === name.toLowerCase() || c.tag.toLowerCase() === tag.toLowerCase())) {
      return null;
    }
    
    if (state.clanId) {
      this.leaveClan(userId);
    }
    
    const newClan: Clan = {
      id: 'clan_' + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      tag: tag.trim().toUpperCase(),
      motto: motto.trim(),
      badgeEmoji: badgeEmoji,
      members: [userId],
      totalAuraLevel: state.auraLevel,
      totalRebirths: state.rebirths
    };
    
    const currentClans = this.getClans();
    currentClans.push(newClan);
    setStorageItem(STORAGE_KEYS.CLANS, currentClans);
    
    return this.updateGameState(userId, { clanId: newClan.id });
  },

  // Skill Tree APIs
  selectClass(userId: string, classId: 'warrior' | 'chronomancer' | 'alchemist'): GameState | null {
    return this.updateGameState(userId, { classId, unlockedSkills: [], skillPoints: 0 });
  },

  buySkill(userId: string, skillId: string): GameState | null {
    const state = this.getGameState(userId);
    if (!state) return null;
    
    const skill = SKILL_TREE.find(s => s.id === skillId);
    if (!skill || skill.classId !== state.classId) return null;
    if (state.unlockedSkills.includes(skillId)) return null;
    
    const spentPoints = state.unlockedSkills.reduce((acc, sid) => {
      const sk = SKILL_TREE.find(s => s.id === sid);
      return acc + (sk ? sk.cost : 0);
    }, 0);
    const availablePoints = state.rebirths - spentPoints;
    
    if (availablePoints < skill.cost) return null;
    
    return this.updateGameState(userId, {
      unlockedSkills: [...state.unlockedSkills, skillId]
    });
  },

  // Trading Hub APIs
  getTradeListings(): TradeListing[] {
    this.simulateNPCTrades();
    return getStorageItem<TradeListing>(STORAGE_KEYS.TRADES);
  },

  postTrade(userId: string, petId: string, requestedType: 'gems' | 'pet', requestedAmount: number, requestedPetTypeId: string | null): GameState | null {
    const state = this.getGameState(userId);
    if (!state) return null;
    
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const petIndex = pets.findIndex(p => p.id === petId && p.userId === userId);
    if (petIndex === -1) return null;
    
    const pet = pets[petIndex];
    const petType = PET_TYPES.find(pt => pt.id === pet.petTypeId);
    if (!petType) return null;
    
    if (state.equippedPetId === petId) {
      this.equipPet(userId, null);
    }
    
    const updatedPets = pets.filter(p => p.id !== petId);
    setStorageItem(STORAGE_KEYS.PETS, updatedPets);
    
    const newListing: TradeListing = {
      id: 'trade_' + Math.random().toString(36).substring(2, 11),
      posterId: userId,
      posterUsername: this.getUsers().find(u => u.id === userId)?.username || 'Desconhecido',
      offeredPetId: petId,
      offeredPetEmoji: petType.emoji,
      offeredPetName: pet.nickname,
      requestedType,
      requestedAmount,
      requestedPetTypeId,
      createdAt: new Date().toISOString()
    };
    
    const trades = getStorageItem<TradeListing>(STORAGE_KEYS.TRADES);
    trades.push(newListing);
    setStorageItem(STORAGE_KEYS.TRADES, trades);
    
    return this.getGameState(userId);
  },

  acceptTrade(userId: string, listingId: string): GameState | null {
    const state = this.getGameState(userId);
    if (!state) return null;
    
    const trades = getStorageItem<TradeListing>(STORAGE_KEYS.TRADES);
    const lIndex = trades.findIndex(t => t.id === listingId);
    if (lIndex === -1) return null;
    
    const listing = trades[lIndex];
    if (listing.posterId === userId) return null;
    
    if (listing.requestedType === 'gems') {
      if (state.gems < listing.requestedAmount) return null;
      this.updateGameState(userId, { gems: state.gems - listing.requestedAmount });
      
      if (listing.posterId.startsWith('usr_') || listing.posterId.startsWith('player-')) {
        const posterState = this.getGameState(listing.posterId);
        if (posterState) {
          this.updateGameState(listing.posterId, { gems: posterState.gems + listing.requestedAmount });
        }
      }
    } else {
      const playerPets = getStorageItem<Pet>(STORAGE_KEYS.PETS).filter(p => p.userId === userId && p.level === 1);
      const requestedPetIndex = playerPets.findIndex(p => p.petTypeId === listing.requestedPetTypeId);
      
      if (requestedPetIndex === -1) return null;
      
      const playerPet = playerPets[requestedPetIndex];
      
      if (state.equippedPetId === playerPet.id) {
        this.equipPet(userId, null);
      }
      
      const allPets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
      const cleanPets = allPets.filter(p => p.id !== playerPet.id);
      setStorageItem(STORAGE_KEYS.PETS, cleanPets);
      
      if (listing.posterId.startsWith('usr_') || listing.posterId.startsWith('player-')) {
        this.createPet(listing.posterId, playerPet.petTypeId, playerPet.nickname);
      }
    }
    
    let petTypeId = 'robot_pup';
    if (listing.offeredPetName.includes('Slime')) petTypeId = 'slime_buddy';
    else if (listing.offeredPetName.includes('Phoenix') || listing.offeredPetName.includes('Fenix')) petTypeId = 'phoenix_chick';
    else if (listing.offeredPetName.includes('Dragon') || listing.offeredPetName.includes('Draco')) petTypeId = 'dragon_kid';
    
    this.createPet(userId, petTypeId, listing.offeredPetName);
    
    const cleanTrades = trades.filter(t => t.id !== listingId);
    setStorageItem(STORAGE_KEYS.TRADES, cleanTrades);
    
    return this.getGameState(userId);
  },

  simulateNPCTrades(): void {
    if (Math.random() > 0.15) return;
    
    const trades = getStorageItem<TradeListing>(STORAGE_KEYS.TRADES);
    const npcs = ['sofia', 'lucas', 'beatriz', 'gabriel'];
    const npcsIds = ['player-sofia', 'player-lucas', 'player-beatriz', 'player-gabriel'];
    
    if (Math.random() < 0.6 && trades.length < 5) {
      const npcIdx = Math.floor(Math.random() * npcs.length);
      const npcName = npcs[npcIdx];
      const npcId = npcsIds[npcIdx];
      
      const randomPetType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
      const isGemsRequest = Math.random() < 0.5;
      
      const newListing: TradeListing = {
        id: 'trade_npc_' + Math.random().toString(36).substring(2, 9),
        posterId: npcId,
        posterUsername: npcName,
        offeredPetId: null,
        offeredPetEmoji: randomPetType.emoji,
        offeredPetName: randomPetType.name,
        requestedType: isGemsRequest ? 'gems' : 'pet',
        requestedAmount: isGemsRequest ? Math.floor(Math.random() * 15) + 8 : 0,
        requestedPetTypeId: isGemsRequest ? null : PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)].id,
        createdAt: new Date().toISOString()
      };
      
      trades.push(newListing);
      setStorageItem(STORAGE_KEYS.TRADES, trades);
    }
    
    const playerListingIndex = trades.findIndex(t => t.posterId.startsWith('usr_'));
    if (playerListingIndex !== -1 && Math.random() < 0.3) {
      const listing = trades[playerListingIndex];
      const posterState = this.getGameState(listing.posterId);
      
      if (posterState) {
        if (listing.requestedType === 'gems') {
          this.updateGameState(listing.posterId, { gems: posterState.gems + listing.requestedAmount });
        } else {
          if (listing.requestedPetTypeId) {
            this.createPet(listing.posterId, listing.requestedPetTypeId);
          }
        }
        
        const cleanTrades = trades.filter(t => t.id !== listing.id);
        setStorageItem(STORAGE_KEYS.TRADES, cleanTrades);
      }
    }
  },

  completeCampaignStage(userId: string, stageId: number): GameState | null {
    const state = this.getGameState(userId);
    if (!state) return null;

    let xpReward = 0;
    let gemsReward = 0;
    switch (stageId) {
      case 1: xpReward = 100; gemsReward = 15; break;
      case 2: xpReward = 150; gemsReward = 20; break;
      case 3: xpReward = 200; gemsReward = 25; break;
      case 4: xpReward = 250; gemsReward = 30; break;
      case 5: xpReward = 500; gemsReward = 50; break;
    }

    const nextStage = stageId === state.campaignStage ? state.campaignStage + 1 : state.campaignStage;

    const updated = this.updateGameState(userId, {
      campaignStage: nextStage,
      gems: state.gems + gemsReward,
      auraXp: state.auraXp + xpReward,
    });

    if (updated) {
      let level = updated.auraLevel;
      let xp = updated.auraXp;
      let nextLevelXp = level * 100;
      let leveledUp = false;

      while (xp >= nextLevelXp) {
        xp -= nextLevelXp;
        level += 1;
        nextLevelXp = level * 100;
        leveledUp = true;
      }

      if (leveledUp) {
        this.updateGameState(userId, {
          auraLevel: level,
          auraXp: xp,
        });
      }
    }

    if (stageId === 5) {
      const ownedPets = this.getPets(userId);
      if (!ownedPets.some(p => p.petTypeId === 'cosmic_owl')) {
        this.createPet(userId, 'cosmic_owl', 'Coruja Cósmica');
      }
    }

    return this.getGameState(userId);
  },
};
