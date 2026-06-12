// Wrapper Mock Database Service preserving backward compatibility
import type { 
  User, 
  GameState, 
  Skill, 
  Clan, 
  TradeListing, 
  CosmeticItem, 
  Pet, 
  PetType,
  MathStatistic,
  TimelineEntry
} from './db/dbConfig';

import { 
  SKILL_TREE, 
  COSMETIC_ITEMS, 
  PET_TYPES, 
  STORAGE_KEYS, 
  mockHash,
  isSupabaseEnabled, 
  supabase 
} from './db/dbConfig';

import { usersDb } from './db/usersDb';
import { petsDb } from './db/petsDb';
import { clansDb } from './db/clansDb';
import { questsDb } from './db/questsDb';
import { statsDb } from './db/statsDb';
import { seedDatabase } from './db/dbSeeder';

// Re-export type and value dependencies
export type { User, GameState, Skill, Clan, TradeListing, CosmeticItem, Pet, PetType, MathStatistic, TimelineEntry };
export { SKILL_TREE, COSMETIC_ITEMS, PET_TYPES, STORAGE_KEYS, mockHash, isSupabaseEnabled, supabase, seedDatabase };

export function getPetEvolutionEmoji(baseEmoji: string, level: number): string {
  if (level <= 2) return baseEmoji;
  switch (baseEmoji) {
    case '🐶': return level <= 4 ? '🐕' : '🐺';
    case '🐱': return level <= 4 ? '🐈' : '🐅';
    case '🐰': return level <= 4 ? '🐇' : '🦄';
    case '🦉': return level <= 4 ? '🦉' : '🦅';
    case '🐉': return level <= 4 ? '🐉' : '🦖';
    case '🤖': return level <= 4 ? '🤖' : '🦾';
    case '🧬': return level <= 4 ? '🧬' : '👾';
    default: {
      if (level <= 4) return `${baseEmoji}✨`;
      return `👑${baseEmoji}👑`;
    }
  }
}

export const mockDb = {
  mockHash,
  // Users APIs
  getUsers: usersDb.getUsers.bind(usersDb),
  authenticate: usersDb.authenticate.bind(usersDb),
  createUser: usersDb.createUser.bind(usersDb),
  updateUser: usersDb.updateUser.bind(usersDb),
  deleteUser: usersDb.deleteUser.bind(usersDb),

  // Quests & GameState APIs
  getGameState: questsDb.getGameState.bind(questsDb),
  updateGameState: questsDb.updateGameState.bind(questsDb),
  addPlayTime: questsDb.addPlayTime.bind(questsDb),
  completeCampaignStage: questsDb.completeCampaignStage.bind(questsDb),
  syncGameState: questsDb.syncGameState.bind(questsDb),
  syncPets: questsDb.syncPets.bind(questsDb),
  buyCosmetic: questsDb.buyCosmetic.bind(questsDb),
  equipCosmetic: questsDb.equipCosmetic.bind(questsDb),
  selectClass: questsDb.selectClass.bind(questsDb),
  buySkill: questsDb.buySkill.bind(questsDb),

  // Pets APIs
  getPets: petsDb.getPets.bind(petsDb),
  createPet: petsDb.createPet.bind(petsDb),
  deletePet: petsDb.deletePet.bind(petsDb),
  updatePet: petsDb.updatePet.bind(petsDb),
  equipPet: petsDb.equipPet.bind(petsDb),
  fusePets: petsDb.fusePets.bind(petsDb),
  addPetXp: petsDb.addPetXp.bind(petsDb),
  getTradeListings: petsDb.getTradeListings.bind(petsDb),
  postTrade: petsDb.postTrade.bind(petsDb),
  acceptTrade: petsDb.acceptTrade.bind(petsDb),
  simulateNPCTrades: petsDb.simulateNPCTrades.bind(petsDb),

  // Clans APIs
  getClans: clansDb.getClans.bind(clansDb),
  getClanLeaderboard: clansDb.getClanLeaderboard.bind(clansDb),
  joinClan: clansDb.joinClan.bind(clansDb),
  leaveClan: clansDb.leaveClan.bind(clansDb),
  createClan: clansDb.createClan.bind(clansDb),
  addClanXp: clansDb.addClanXp.bind(clansDb),
  damageClanBoss: clansDb.damageClanBoss.bind(clansDb),
  applyToClan: clansDb.applyToClan.bind(clansDb),
  acceptApplication: clansDb.acceptApplication.bind(clansDb),
  rejectApplication: clansDb.rejectApplication.bind(clansDb),
  kickMember: clansDb.kickMember.bind(clansDb),
  transferLeadership: clansDb.transferLeadership.bind(clansDb),
  getClanBonus: clansDb.getClanBonus.bind(clansDb),

  // Math Stats APIs
  getTimeline: statsDb.getTimeline.bind(statsDb),
  getMathStats: statsDb.getMathStats.bind(statsDb),
  recordOlympicMedal: statsDb.recordOlympicMedal.bind(statsDb),
  recordMathAnswer: statsDb.recordMathAnswer.bind(statsDb),
  forceMathStatsState: statsDb.forceMathStatsState.bind(statsDb),
  resetMathStats: statsDb.resetMathStats.bind(statsDb),
  getMathProgress: statsDb.getMathProgress.bind(statsDb),
  getLeaderboard: statsDb.getLeaderboard.bind(statsDb),
};
