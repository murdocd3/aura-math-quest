import { createClient } from '@supabase/supabase-js';
import { seedDatabase } from './dbSeeder';

const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';

export const isSupabaseEnabled = SUPABASE_URL.trim() !== '' && SUPABASE_ANON_KEY.trim() !== '';

export const supabase = isSupabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'player';
  passwordHash: string;
  createdAt: string;
  isActive?: boolean;
}

export interface GameState {
  userId: string;
  auraLevel: number;
  auraXp: number;
  auraColor: string;
  rebirths: number;
  gems: number;
  currentZone: 'forest' | 'volcano';
  equippedPetId: string | null;
  activeAuras: string[];
  totalPlayTimeSeconds: number;
  updatedAt: string;
  purchasedCosmetics: string[];
  equippedCosmetics?: Record<string, string>;
  equippedCosmeticId?: string | null;
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
  treats?: number;
  activeExpeditions?: { petId: string; endTime: string; rewardGems: number }[];
  fedBonusUntil?: string;
  customTimeLimit?: number;
  masteryThreshold?: number;
  lockedOperations?: string[];
  olympicMedals?: Record<string, 'gold' | 'silver' | 'bronze'>;
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
  level: number;
  xp: number;
  leaderId: string;
  joinRequests: string[];
  bossHp?: number;
  bossMaxHp?: number;
  bossLevel?: number;
}

export interface TradeListing {
  id: string;
  posterId: string;
  posterUsername: string;
  offeredPetId: string | null;
  offeredPetTypeId: string;
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
  category: 'weapon' | 'hat' | 'glasses' | 'cloak' | 'ring' | 'title';
}

export const COSMETIC_ITEMS: CosmeticItem[] = [
  { id: 'cyber_wand', name: 'Varinha Cyber', emoji: '🪄', cost: 12, description: 'Dispara raios neon ao resolver contas.', color: '#00ffcc', category: 'weapon' },
  { id: 'neon_hat', name: 'Chapéu de Mago Neon', emoji: '🧙‍♂️', cost: 18, description: 'Aumenta sua presença mágica.', color: '#a855f7', category: 'hat' },
  { id: 'glitch_crown', name: 'Coroa Glitch', emoji: '👑', cost: 30, description: 'Reservada para os maiores mestres da aura.', color: '#f97316', category: 'hat' },
  { id: 'retro_shades', name: 'Óculos Cyberpunk', emoji: '🕶️', cost: 15, description: 'Estilo pixelado retro para focar nas equações.', color: '#ec4899', category: 'glasses' },
  { id: 'cyber_visor', name: 'Visor Holográfico', emoji: '🥽', cost: 22, description: 'Exibe coordenadas de dados neon na sua visão.', color: '#06b6d4', category: 'glasses' },
  { id: 'laser_blade', name: 'Sabre Voltaico', emoji: '⚔️', cost: 35, description: 'Um sabre de luz pura feito de estática e energia.', color: '#eab308', category: 'weapon' },
  { id: 'cosmic_wings', name: 'Asas de Fênix Digital', emoji: '🪶', cost: 45, description: 'Asas cintilantes feitas de pura informação espacial.', color: '#a855f7', category: 'cloak' },
  { id: 'pixel_shield', name: 'Escudo Voxel', emoji: '🛡️', cost: 25, description: 'Escudo digital com animação de partículas em grade.', color: '#22c55e', category: 'weapon' },
  { id: 'nebula_cloak', name: 'Capa da Nebulosa', emoji: '🧥', cost: 40, description: 'Capa mágica que distorce as cores do espaço ao redor.', color: '#ec4899', category: 'cloak' },
  { id: 'hologram_orb', name: 'Orbe Projetora', emoji: '🔮', cost: 28, description: 'Pequeno satélite flutuante que projeta equações.', color: '#00ffcc', category: 'weapon' },
  { id: 'math_backpack', name: 'Mochila de Fórmulas', emoji: '🎒', cost: 16, description: 'Guarde seus pergaminhos de matrizes e vetores.', color: '#a1a1aa', category: 'cloak' },
  { id: 'aurora_ring', name: 'Anel da Aurora', emoji: '💍', cost: 50, description: 'Irradia partículas coloridas ao resolver cálculos rápidos.', color: '#f97316', category: 'ring' },
  { id: 'title_math_master', name: 'Título: [📐 Mestre do Cálculo]', emoji: '🏷️', cost: 20, description: 'Exibe o título ao lado do seu nome.', color: '#00ffcc', category: 'title' },
  { id: 'title_math_lightning', name: 'Título: [⚡ Relâmpago Matemático]', emoji: '🏷️', cost: 30, description: 'Exibe o título ao lado do seu nome.', color: '#a855f7', category: 'title' },
  { id: 'title_aura_alchemist', name: 'Título: [🔮 Alquimista de Aura]', emoji: '🏷️', cost: 50, description: 'Exibe o título ao lado do seu nome.', color: '#ec4899', category: 'title' },
  { id: 'title_legendary_legend', name: 'Título: [👑 Lenda do Universo]', emoji: '🏷️', cost: 100, description: 'Exibe o título ao lado do seu nome.', color: '#f97316', category: 'title' },
  { id: 'title_ciber', name: 'Título: [👾 Ciber-Viajante]', emoji: '🏷️', cost: 0, description: 'Desbloqueado no Passe de Aura Sazonal.', color: '#a855f7', category: 'title' },
  { id: 'title_mestre', name: 'Título: [👑 Mestre Cósmico]', emoji: '🏷️', cost: 0, description: 'Conquistado ao completar a Temporada 1 do Passe de Aura.', color: '#facc15', category: 'title' },
];

export interface Pet {
  id: string;
  userId: string;
  petTypeId: string;
  nickname: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  buffType: 'time_bonus' | 'aura_multiplier' | 'gem_multiplier' | 'combined';
  buffValue: number;
  createdAt: string;
  level: number;
  xp?: number;
  buffValue2?: number;
  xpMultiplier?: number;
  gemMultiplier?: number;
  extraTime?: number;
}


export interface PetType {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  buffType: 'time_bonus' | 'aura_multiplier' | 'gem_multiplier' | 'combined';
  buffValue: number;
  cost: number;
  color: string;
  emoji: string;
  extraTime?: number;
  xpMultiplier?: number;
  gemMultiplier?: number;
  buffDescription?: string;
}

export const PET_TYPES: PetType[] = [
  { id: 'robot_pup', name: 'Cão Cibernético', rarity: 'common', buffType: 'gem_multiplier', buffValue: 1.1, cost: 10, color: '#a1a1aa', emoji: '🐶' },
  { id: 'cyber_bunny', name: 'Ciber Coelho', rarity: 'common', buffType: 'time_bonus', buffValue: 1.0, cost: 10, color: '#a1a1aa', emoji: '🐇' },
  { id: 'pixel_piggy', name: 'Piggy Pixel', rarity: 'common', buffType: 'aura_multiplier', buffValue: 1.05, cost: 12, color: '#a1a1aa', emoji: '🐷' },
  { id: 'slime_buddy', name: 'Sapo Holográfico', rarity: 'rare', buffType: 'combined', buffValue: 1.15, cost: 20, color: '#22c55e', emoji: '🐸', xpMultiplier: 1.1, gemMultiplier: 1.1, buffDescription: 'XP +10% e Gemas +10%' },
  { id: 'neon_kitten', name: 'Cyber Gatinho', rarity: 'rare', buffType: 'time_bonus', buffValue: 2.0, cost: 22, color: '#06b6d4', emoji: '🐱' },
  { id: 'vector_fox', name: 'Raposa Vetorial', rarity: 'rare', buffType: 'gem_multiplier', buffValue: 1.2, cost: 24, color: '#22c55e', emoji: '🦊' },
  { id: 'phoenix_chick', name: 'Falcão de Fogo', rarity: 'epic', buffType: 'combined', buffValue: 2.0, cost: 35, color: '#f97316', emoji: '🐣', extraTime: 1.5, gemMultiplier: 1.15, buffDescription: '+1.5s Resposta e Gemas +15%' },
  { id: 'hologram_monkey', name: 'Macaco Holo', rarity: 'epic', buffType: 'aura_multiplier', buffValue: 1.25, cost: 38, color: '#3b82f6', emoji: '🐒' },
  { id: 'glitch_raccoon', name: 'Guaxinim Glitch', rarity: 'epic', buffType: 'gem_multiplier', buffValue: 1.3, cost: 40, color: '#3b82f6', emoji: '🦝' },
  { id: 'quantum_panda', name: 'Panda Quântico', rarity: 'epic', buffType: 'time_bonus', buffValue: 3.0, cost: 45, color: '#3b82f6', emoji: '🐼' },
  { id: 'dragon_kid', name: 'Lagarto Cyber', rarity: 'legendary', buffType: 'combined', buffValue: 1.4, cost: 50, color: '#a855f7', emoji: '🦎', extraTime: 2.0, gemMultiplier: 1.3, buffDescription: '+2.0s Resposta e Gemas +30%' },
  { id: 'cosmic_owl', name: 'Coruja Cósmica', rarity: 'legendary', buffType: 'combined', buffValue: 1.5, cost: 999, color: '#ec4899', emoji: '🦉', xpMultiplier: 1.3, gemMultiplier: 1.3, buffDescription: 'XP +30% e Gemas +30%' },
  { id: 'cyber_phoenix', name: 'Águia Cyber', rarity: 'legendary', buffType: 'combined', buffValue: 1.5, cost: 999, color: '#f43f5e', emoji: '🕊️', extraTime: 3.0, xpMultiplier: 1.35, buffDescription: '+3.0s Resposta e XP +35%' },
  { id: 'binary_wolf', name: 'Lobo Binário', rarity: 'legendary', buffType: 'time_bonus', buffValue: 4.0, cost: 90, color: '#a855f7', emoji: '🐺' },
  { id: 'hyper_unicorn', name: 'Cavalo Cibernético', rarity: 'legendary', buffType: 'combined', buffValue: 1.5, cost: 100, color: '#a855f7', emoji: '🐴', xpMultiplier: 1.25, gemMultiplier: 1.25, buffDescription: 'XP +25% e Gemas +25%' },
  { id: 'neon_lion', name: 'Leão Neon', rarity: 'rare', buffType: 'combined', buffValue: 1.15, cost: 25, color: '#22c55e', emoji: '🦁', xpMultiplier: 1.1, extraTime: 1.0, buffDescription: 'XP +10% e +1.0s Resposta' },
  { id: 'cyber_bear', name: 'Urso Cyber', rarity: 'rare', buffType: 'combined', buffValue: 1.2, cost: 26, color: '#22c55e', emoji: '🐻', gemMultiplier: 1.15, extraTime: 1.0, buffDescription: 'Gemas +15% e +1.0s Resposta' },
  { id: 'pixel_koala', name: 'Koala Pixel', rarity: 'common', buffType: 'time_bonus', buffValue: 1.0, cost: 11, color: '#a1a1aa', emoji: '🐨' },
  { id: 'quantum_tiger', name: 'Tigre Quântico', rarity: 'epic', buffType: 'combined', buffValue: 1.3, cost: 42, color: '#3b82f6', emoji: '🐯', xpMultiplier: 1.2, gemMultiplier: 1.2, buffDescription: 'XP +20% e Gemas +20%' },
  { id: 'holo_giraffe', name: 'Girafa Holo', rarity: 'epic', buffType: 'combined', buffValue: 1.25, cost: 44, color: '#3b82f6', emoji: '🦒', xpMultiplier: 1.15, extraTime: 2.0, buffDescription: 'XP +15% e +2.0s Resposta' },
  { id: 'vector_deer', name: 'Cervo Vetorial', rarity: 'rare', buffType: 'aura_multiplier', buffValue: 1.2, cost: 28, color: '#22c55e', emoji: '🦌' },
  { id: 'glitch_hedgehog', name: 'Ouriço Glitch', rarity: 'common', buffType: 'gem_multiplier', buffValue: 1.08, cost: 12, color: '#a1a1aa', emoji: '🦔' },
  { id: 'binary_bull', name: 'Touro Binário', rarity: 'rare', buffType: 'gem_multiplier', buffValue: 1.22, cost: 30, color: '#22c55e', emoji: '🐂' },
  { id: 'cyber_shark', name: 'Tubarão Cyber', rarity: 'legendary', buffType: 'combined', buffValue: 1.45, cost: 95, color: '#a855f7', emoji: '🦈', gemMultiplier: 1.35, extraTime: 2.5, buffDescription: 'Gemas +35% e +2.5s Resposta' },
  { id: 'cosmic_whale', name: 'Baleia Cósmica', rarity: 'legendary', buffType: 'combined', buffValue: 1.5, cost: 110, color: '#a855f7', emoji: '🐋', xpMultiplier: 1.3, gemMultiplier: 1.4, buffDescription: 'XP +30% e Gemas +40%' },
  { id: 'neon_octopus', name: 'Polvo Neon', rarity: 'epic', buffType: 'combined', buffValue: 1.32, cost: 46, color: '#3b82f6', emoji: '🐙', gemMultiplier: 1.25, extraTime: 1.5, buffDescription: 'Gemas +25% e +1.5s Resposta' },
  { id: 'pixel_penguin', name: 'Pinguim Pixel', rarity: 'common', buffType: 'aura_multiplier', buffValue: 1.08, cost: 12, color: '#a1a1aa', emoji: '🐧' },
  { id: 'quantum_elephant', name: 'Elefante Quântico', rarity: 'legendary', buffType: 'combined', buffValue: 1.55, cost: 120, color: '#a855f7', emoji: '🐘', xpMultiplier: 1.4, extraTime: 3.0, buffDescription: 'XP +40% e +3.0s Resposta' },
  { id: 'cyber_hamster', name: 'Hamster Cyber', rarity: 'common', buffType: 'time_bonus', buffValue: 1.2, cost: 13, color: '#a1a1aa', emoji: '🐹' },
  { id: 'holo_sloth', name: 'Preguiça Holo', rarity: 'rare', buffType: 'time_bonus', buffValue: 2.5, cost: 32, color: '#22c55e', emoji: '🦥' },
  { id: 'neon_capybara', name: 'Capivara Neon', rarity: 'legendary', buffType: 'combined', buffValue: 1.5, cost: 130, color: '#a855f7', emoji: '🦫', xpMultiplier: 1.5, gemMultiplier: 1.5, extraTime: 3.5, buffDescription: 'XP +50%, Gemas +50% e +3.5s Resposta' },
  { id: 'cyber_chameleon', name: 'Camaleão Cyber', rarity: 'common', buffType: 'time_bonus', buffValue: 1.0, cost: 14, color: '#a1a1aa', emoji: '🐊' },
  { id: 'pixel_meerkat', name: 'Suricato Pixel', rarity: 'common', buffType: 'aura_multiplier', buffValue: 1.05, cost: 14, color: '#a1a1aa', emoji: '🐭' },
  { id: 'holo_owl', name: 'Mocho Holo', rarity: 'common', buffType: 'gem_multiplier', buffValue: 1.08, cost: 14, color: '#a1a1aa', emoji: '🦜' },
  { id: 'glitch_squirrel', name: 'Esquilo Glitch', rarity: 'common', buffType: 'time_bonus', buffValue: 1.2, cost: 15, color: '#a1a1aa', emoji: '🐿' },
  { id: 'quantum_badger', name: 'Teixugo Quântico', rarity: 'common', buffType: 'aura_multiplier', buffValue: 1.07, cost: 15, color: '#a1a1aa', emoji: '🦡' },
  { id: 'neon_otter', name: 'Lontra Neon', rarity: 'rare', buffType: 'combined', buffValue: 1.1, cost: 30, color: '#22c55e', emoji: '🦦', gemMultiplier: 1.1, extraTime: 1.0, buffDescription: 'Gemas +10% e +1.0s Resposta' },
  { id: 'cyber_raccoon', name: 'Guaxinim Cyber', rarity: 'rare', buffType: 'combined', buffValue: 1.1, cost: 31, color: '#22c55e', emoji: '🐈', xpMultiplier: 1.1, extraTime: 1.0, buffDescription: 'XP +10% e +1.0s Resposta' },
  { id: 'pixel_platypus', name: 'Ornitorrinco Pixel', rarity: 'rare', buffType: 'aura_multiplier', buffValue: 1.12, cost: 32, color: '#22c55e', emoji: '🦆' },
  { id: 'holo_llama', name: 'Lhama Holo', rarity: 'rare', buffType: 'gem_multiplier', buffValue: 1.18, cost: 33, color: '#22c55e', emoji: '🦙' },
  { id: 'vector_koala', name: 'Coala Vetorial', rarity: 'rare', buffType: 'time_bonus', buffValue: 1.8, cost: 34, color: '#22c55e', emoji: '🦓' },
  { id: 'glitch_sloth', name: 'Preguiça Glitch', rarity: 'rare', buffType: 'combined', buffValue: 1.12, cost: 35, color: '#22c55e', emoji: '🦧', gemMultiplier: 1.12, xpMultiplier: 1.12, buffDescription: 'XP +12% e Gemas +12%' },
  { id: 'binary_ram', name: 'Carneiro Binário', rarity: 'epic', buffType: 'combined', buffValue: 1.2, cost: 48, color: '#3b82f6', emoji: '🐏', xpMultiplier: 1.2, extraTime: 1.5, buffDescription: 'XP +20% e +1.5s Resposta' },
  { id: 'cyber_lemur', name: 'Lêmure Cyber', rarity: 'epic', buffType: 'combined', buffValue: 1.22, cost: 49, color: '#3b82f6', emoji: '🦍', gemMultiplier: 1.22, extraTime: 1.5, buffDescription: 'Gemas +22% e +1.5s Resposta' },
  { id: 'pixel_sloth_epic', name: 'Preguiça Pixel Estelar', rarity: 'epic', buffType: 'aura_multiplier', buffValue: 1.3, cost: 50, color: '#3b82f6', emoji: '🦘' },
  { id: 'holo_flamingo', name: 'Flamingo Holo', rarity: 'epic', buffType: 'combined', buffValue: 1.18, cost: 51, color: '#3b82f6', emoji: '🦩', xpMultiplier: 1.18, gemMultiplier: 1.18, buffDescription: 'XP +18% e Gemas +18%' },
  { id: 'vector_toucan', name: 'Tucano Vetorial', rarity: 'epic', buffType: 'time_bonus', buffValue: 2.8, cost: 52, color: '#3b82f6', emoji: '🐦' },
  { id: 'glitch_cheetah', name: 'Guepardo Glitch', rarity: 'epic', buffType: 'combined', buffValue: 1.28, cost: 54, color: '#3b82f6', emoji: '🐆', gemMultiplier: 1.28, extraTime: 2.0, buffDescription: 'Gemas +28% e +2.0s Resposta' },
  { id: 'quantum_dolphin', name: 'Golfinho Quântico', rarity: 'legendary', buffType: 'combined', buffValue: 1.35, cost: 115, color: '#a855f7', emoji: '🐬', xpMultiplier: 1.35, gemMultiplier: 1.35, buffDescription: 'XP +35% e Gemas +35%' },
  { id: 'neon_orca', name: 'Orca Neon', rarity: 'legendary', buffType: 'combined', buffValue: 1.45, cost: 125, color: '#a855f7', emoji: '🐳', gemMultiplier: 1.45, extraTime: 2.8, buffDescription: 'Gemas +45% e +2.8s Resposta' },
  { id: 'cyber_whale_legendary', name: 'Peixe-Palhaço Cyber', rarity: 'legendary', buffType: 'combined', buffValue: 1.45, cost: 128, color: '#a855f7', emoji: '🐠', xpMultiplier: 1.45, extraTime: 3.2, buffDescription: 'XP +45% e +3.2s Resposta' },
  { id: 'pixel_turtle', name: 'Tartaruga Pixel', rarity: 'legendary', buffType: 'combined', buffValue: 1.3, cost: 135, color: '#a855f7', emoji: '🐢', xpMultiplier: 1.3, gemMultiplier: 1.3, extraTime: 4.0, buffDescription: 'XP/Gemas +30% e +4.0s Resposta' },
  { id: 'holo_peacock', name: 'Pavão Holo', rarity: 'legendary', buffType: 'combined', buffValue: 1.5, cost: 140, color: '#a855f7', emoji: '🦚', xpMultiplier: 1.5, gemMultiplier: 1.4, buffDescription: 'XP +50% e Gemas +40%' },
  { id: 'vector_eagle', name: 'Águia Vetorial', rarity: 'legendary', buffType: 'combined', buffValue: 1.45, cost: 145, color: '#a855f7', emoji: '🦅', xpMultiplier: 1.45, gemMultiplier: 1.45, buffDescription: 'XP +45% e Gemas +45%' },
  { id: 'glitch_tiger_legendary', name: 'Tigre Glitch Supremo', rarity: 'legendary', buffType: 'combined', buffValue: 1.5, cost: 150, color: '#a855f7', emoji: '🐅', gemMultiplier: 1.5, extraTime: 3.0, buffDescription: 'Gemas +50% e +3.0s Resposta' },
  { id: 'quantum_wolf_legendary', name: 'Lobo Quântico Cósmico', rarity: 'legendary', buffType: 'combined', buffValue: 1.5, cost: 155, color: '#a855f7', emoji: '🐾', xpMultiplier: 1.5, extraTime: 3.0, buffDescription: 'XP +50% e +3.0s Resposta' },
  { id: 'neon_pegasus', name: 'Pégaso Neon Supremo', rarity: 'legendary', buffType: 'combined', buffValue: 1.6, cost: 180, color: '#a855f7', emoji: '🦄', xpMultiplier: 1.6, gemMultiplier: 1.6, buffDescription: 'XP +60% e Gemas +60%' },
  { id: 'cyber_dragon_legendary', name: 'Dragão Cibernético', rarity: 'legendary', buffType: 'combined', buffValue: 1.7, cost: 200, color: '#f43f5e', emoji: '🐉', xpMultiplier: 1.7, gemMultiplier: 1.7, buffDescription: 'XP/Gemas +70% (Ultra Buff)' },
  { id: 'gold_fenix', name: 'Fênix Dourada de Aura', rarity: 'legendary', buffType: 'combined', buffValue: 1.8, cost: 999, color: '#ec4899', emoji: '🦤', xpMultiplier: 1.8, gemMultiplier: 1.8, extraTime: 4.0, buffDescription: 'XP/Gemas +80% e +4.0s Resposta' },
  { id: 'cosmic_unicorn', name: 'Unicórnio Estelar Cósmico', rarity: 'legendary', buffType: 'combined', buffValue: 1.9, cost: 999, color: '#ec4899', emoji: '🐎', xpMultiplier: 1.9, gemMultiplier: 1.9, extraTime: 5.0, buffDescription: 'XP/Gemas +90% e +5.0s Resposta' },
];

export const STORAGE_KEYS = {
  USERS: 'amq_users',
  GAME_STATES: 'amq_game_states',
  PETS: 'amq_pets',
  STATS: 'amq_stats',
  CLANS: 'amq_clans',
  TRADES: 'amq_trades',
  TIMELINE: 'amq_timeline',
};

/**
 * ⚠️ WARNING: NON-CRYPTOGRAPHIC INSECURE MOCK HASH!
 * Only used for local storage/mockDb offline client fallback.
 * DO NOT reuse this algorithm for production authentication or storing real credentials.
 */
export function mockHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return 'mockhash_' + Math.abs(hash).toString(16);
}

export function getStorageItem<T>(key: string): T[] {
  seedDatabase();
  if (typeof localStorage === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export function setStorageItem(key: string, data: unknown[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

export interface MathStatistic {
  userId: string;
  questionKey: string;
  correctCount: number;
  errorCount: number;
  averageTimeMs: number;
}

export interface TimelineEntry {
  userId: string;
  timestamp: string;
  category: string;
  questionKey: string;
  correct: boolean;
  timeMs: number;
}

export interface SupabaseUserRow {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'player';
  is_active?: boolean;
}

export interface SupabaseGameStateRow {
  user_id: string;
  campaign_stage?: number;
  gems?: number;
  aura_level?: number;
  aura_xp?: number;
  aura_color?: string;
  rebirths?: number;
  current_zone?: 'forest' | 'volcano';
  equipped_pet_id?: string | null;
  active_auras?: string[] | string;
  total_play_time_seconds?: number;
  purchased_cosmetics?: string[] | string;
  equipped_cosmetic_id?: string | null;
  selected_operation?: 'addition' | 'subtraction' | 'multiplication' | 'division';
  quest_wins?: number;
  quest_criticals?: number;
  quest_streak?: number;
  claimed_quests?: string[] | string;
  active_class?: 'warrior' | 'chronomancer' | 'alchemist' | null;
  skill_points?: number;
  unlocked_skills?: string[] | string;
  clan_id?: string | null;
  clan_contributions?: number;
  updated_at?: string;
  olympic_medals?: Record<string, 'gold' | 'silver' | 'bronze'> | string | any;
}

export interface SupabasePetRow {
  id: string;
  user_id: string;
  pet_type_id: string;
  nickname: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  buff_type: 'time_bonus' | 'aura_multiplier' | 'gem_multiplier' | 'combined';
  buff_value: number;
  level: number;
  xp?: number;
  created_at?: string;
}

export interface SupabaseMathStatisticRow {
  id: string;
  user_id: string;
  question_key: string;
  correct_count: number;
  incorrect_count: number;
  total_time_taken_ms: number;
}

export interface SupabaseClanRow {
  id: string;
  name: string;
  tag: string;
  motto?: string;
  badge_emoji?: string;
  members?: string[];
  level?: number;
  xp?: number;
  leader_id?: string;
  join_requests?: string[];
  boss_hp?: number;
  boss_max_hp?: number;
  boss_level?: number;
}


