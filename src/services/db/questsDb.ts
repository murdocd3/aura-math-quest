import type { 
  GameState, 
  Pet,
  SupabaseGameStateRow
} from './dbConfig';
import { 
  STORAGE_KEYS, 
  getStorageItem, 
  setStorageItem, 
  COSMETIC_ITEMS, 
  isSupabaseEnabled, 
  supabase,
  SKILL_TREE
} from './dbConfig';
import { petsDb } from './petsDb';


// Reusable local map helper
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
  if (state.olympicMedals !== undefined) dbRow.olympic_medals = JSON.stringify(state.olympicMedals);
  dbRow.updated_at = new Date().toISOString();
  return dbRow;
};

export const questsDb = {
  getGameState(userId: string): GameState | null {
    const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    const state = states.find(gs => gs.userId === userId);
    if (!state) return null;
    
    if (state.auraPassXp === undefined) state.auraPassXp = 0;
    if (state.hasElitePass === undefined) state.hasElitePass = false;
    if (state.claimedPassTiers === undefined) state.claimedPassTiers = [];
    
    if (!state.equippedCosmetics) {
      state.equippedCosmetics = {};
      if (state.equippedCosmeticId) {
        const item = COSMETIC_ITEMS.find(c => c.id === state.equippedCosmeticId);
        if (item) {
          state.equippedCosmetics[item.category] = state.equippedCosmeticId;
        }
      }
    }
    
    if (state.olympicMedals === undefined) state.olympicMedals = {};
    return state;
  },

  updateGameState(userId: string, updates: Partial<Omit<GameState, 'userId'>>): GameState | null {
    const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    const index = states.findIndex(gs => gs.userId === userId);
    if (index === -1) return null;

    const existingState = states[index];
    if (existingState.auraPassXp === undefined) existingState.auraPassXp = 0;
    if (existingState.hasElitePass === undefined) existingState.hasElitePass = false;
    if (existingState.claimedPassTiers === undefined) existingState.claimedPassTiers = [];

    const updatedState = {
      ...existingState,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.auraXp !== undefined) {
      let level = updatedState.auraLevel ?? 1;
      let xp = updatedState.auraXp ?? 0;
      const getXpNeeded = (l: number) => Math.round(100 * Math.pow(1.15, l - 1));
      let nextLevelXp = getXpNeeded(level);

      while (xp >= nextLevelXp && level < 100) {
        xp -= nextLevelXp;
        level += 1;
        nextLevelXp = getXpNeeded(level);
      }

      updatedState.auraLevel = level;
      updatedState.auraXp = xp;
    }

    states[index] = updatedState;
    setStorageItem(STORAGE_KEYS.GAME_STATES, states);

    // Sync to Supabase in background
    const client = supabase;
    if (isSupabaseEnabled && client) {
      const finalUpdates: Partial<GameState> = { ...updates };
      if (updates.auraXp !== undefined) {
        finalUpdates.auraLevel = updatedState.auraLevel;
        finalUpdates.auraXp = updatedState.auraXp;
      }
      const dbUpdates = mapGameStateToDb(finalUpdates);
      client.from('game_states')
        .update(dbUpdates)
        .eq('user_id', userId)
        .returns<SupabaseGameStateRow[]>()
        .then(({ error }) => {
          if (error) {
            console.error('[mockDb] Error syncing game_state to Supabase:', error);
          }
        });
    }

    return states[index];
  },

  addPlayTime(userId: string, seconds: number): void {
    const state = this.getGameState(userId);
    if (state) {
      this.updateGameState(userId, {
        totalPlayTimeSeconds: (state.totalPlayTimeSeconds || 0) + seconds,
      });
    }
  },

  completeCampaignStage(userId: string, stageId: number, overrideXp?: number, overrideGems?: number): GameState | null {
    const state = this.getGameState(userId);
    if (!state) return null;

    const cycle = Math.floor((stageId - 1) / 5) + 1;
    const stageIndexInCycle = (stageId - 1) % 5;

    let baseXP = 0;
    let baseGems = 0;
    switch (stageIndexInCycle) {
      case 0: baseXP = 100; baseGems = 15; break;
      case 1: baseXP = 150; baseGems = 20; break;
      case 2: baseXP = 200; baseGems = 25; break;
      case 3: baseXP = 250; baseGems = 30; break;
      case 4: baseXP = 500; baseGems = 50; break;
    }

    const isFirstTime = stageId === state.campaignStage;
    
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

    const updated = this.updateGameState(userId, {
      campaignStage: nextStage,
      gems: state.gems + gemsReward,
      auraXp: state.auraXp + xpReward,
    });

    if (updated) {
      let level = updated.auraLevel;
      let xp = updated.auraXp;
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
        this.updateGameState(userId, {
          auraLevel: level,
          auraXp: xp,
        });
      }
    }

    if (stageId === 5 && isFirstTime) {
      const ownedPets = petsDb.getPets(userId);
      if (!ownedPets.some(p => p.petTypeId === 'cosmic_owl')) {
        petsDb.createPet(userId, 'cosmic_owl', 'Coruja Cósmica');
      }
    }

    return this.getGameState(userId);
  },

  syncGameState(state: GameState): void {
    const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    const index = states.findIndex(gs => gs.userId === state.userId);
    if (index === -1) {
      states.push(state);
    } else {
      states[index] = state;
    }
    setStorageItem(STORAGE_KEYS.GAME_STATES, states);
  },

  syncPets(userId: string, fetchedPets: Pet[]): void {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const otherUsersPets = pets.filter(p => p.userId !== userId);
    const newPetsList = [...otherUsersPets, ...fetchedPets];
    setStorageItem(STORAGE_KEYS.PETS, newPetsList);
  },

  buyCosmetic(userId: string, cosmeticId: string): GameState | null {
    const state = this.getGameState(userId);
    const cosmetic = COSMETIC_ITEMS.find(c => c.id === cosmeticId);
    if (!state || !cosmetic) return null;

    const purchased = state.purchasedCosmetics || [];
    if (purchased.includes(cosmeticId)) return null;

    if (state.gems < cosmetic.cost) return null;

    const updated = this.updateGameState(userId, {
      gems: state.gems - cosmetic.cost,
      purchasedCosmetics: [...purchased, cosmeticId],
    });
    return updated;
  },

  equipCosmetic(userId: string, cosmeticId: string | null, category: string): GameState | null {
    const state = this.getGameState(userId);
    if (!state) return null;

    const equipped = { ...state.equippedCosmetics };

    if (cosmeticId === null) {
      delete equipped[category];
    } else {
      const purchased = state.purchasedCosmetics || [];
      if (!purchased.includes(cosmeticId)) return null;
      equipped[category] = cosmeticId;
    }

    const updated = this.updateGameState(userId, {
      equippedCosmetics: equipped,
    });
    return updated;
  },

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
};

