import type { 
  Clan, 
  GameState 
} from './dbConfig';
import { 
  STORAGE_KEYS, 
  getStorageItem, 
  setStorageItem 
} from './dbConfig';
import { questsDb } from './questsDb';

export const clansDb = {
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
    
    const state = questsDb.getGameState(userId);
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
    
    return questsDb.updateGameState(userId, { clanId });
  },

  leaveClan(userId: string): GameState | null {
    const state = questsDb.getGameState(userId);
    if (!state || !state.clanId) return null;
    
    const clans = this.getClans();
    const clanIndex = clans.findIndex(c => c.id === state.clanId);
    if (clanIndex !== -1) {
      clans[clanIndex].members = clans[clanIndex].members.filter(id => id !== userId);
      if (clans[clanIndex].members.length === 0) {
        clans.splice(clanIndex, 1);
      } else if (clans[clanIndex].leaderId === userId) {
        clans[clanIndex].leaderId = clans[clanIndex].members[0];
      }
      setStorageItem(STORAGE_KEYS.CLANS, clans);
    }
    
    return questsDb.updateGameState(userId, { clanId: null });
  },

  createClan(userId: string, name: string, tag: string, motto: string, badgeEmoji: string): GameState | null {
    const state = questsDb.getGameState(userId);
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
      totalRebirths: state.rebirths,
      level: 1,
      xp: 0,
      leaderId: userId,
      joinRequests: [],
      bossHp: 5000,
      bossMaxHp: 5000,
      bossLevel: 1
    };
    
    const currentClans = this.getClans();
    currentClans.push(newClan);
    setStorageItem(STORAGE_KEYS.CLANS, currentClans);
    
    return questsDb.updateGameState(userId, { clanId: newClan.id });
  },

  addClanXp(clanId: string, amount: number): void {
    const clans = this.getClans();
    const clanIndex = clans.findIndex(c => c.id === clanId);
    if (clanIndex !== -1) {
      const clan = clans[clanIndex];
      clan.xp += amount;
      
      let nextLevelXp = clan.level * 500;
      while (clan.xp >= nextLevelXp && clan.level < 10) {
        clan.xp -= nextLevelXp;
        clan.level += 1;
        nextLevelXp = clan.level * 500;
      }
      if (clan.level >= 10) {
        clan.level = 10;
        clan.xp = Math.min(clan.xp, nextLevelXp);
      }
      setStorageItem(STORAGE_KEYS.CLANS, clans);
    }
  },

  damageClanBoss(_userId: string, clanId: string, amount: number): { bossHp: number; bossMaxHp: number; bossLevel: number; defeated: boolean; rewardGems: number } | null {
    const clans = this.getClans();
    const clanIndex = clans.findIndex(c => c.id === clanId);
    if (clanIndex === -1) return null;

    const clan = clans[clanIndex];
    if (clan.bossHp === undefined) clan.bossHp = 5000;
    if (clan.bossMaxHp === undefined) clan.bossMaxHp = 5000;
    if (clan.bossLevel === undefined) clan.bossLevel = 1;

    clan.bossHp = Math.max(0, clan.bossHp - amount);
    let defeated = false;
    let rewardGems = 0;

    if (clan.bossHp <= 0) {
      defeated = true;
      clan.bossLevel += 1;
      clan.bossMaxHp = clan.bossLevel * 5000;
      clan.bossHp = clan.bossMaxHp;
      rewardGems = clan.bossLevel * 10;
      clan.xp += 100 * clan.bossLevel;

      let nextLevelXp = clan.level * 500;
      while (clan.xp >= nextLevelXp && clan.level < 10) {
        clan.xp -= nextLevelXp;
        clan.level += 1;
        nextLevelXp = clan.level * 500;
      }
      if (clan.level >= 10) {
        clan.level = 10;
        clan.xp = Math.min(clan.xp, nextLevelXp);
      }

      // Add gems reward to all members of the clan
      const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
      clan.members.forEach(mId => {
        const mStateIndex = states.findIndex(gs => gs.userId === mId);
        if (mStateIndex !== -1) {
          states[mStateIndex].gems += rewardGems;
        }
      });
      localStorage.setItem(STORAGE_KEYS.GAME_STATES, JSON.stringify(states));
    }

    setStorageItem(STORAGE_KEYS.CLANS, clans);
    return {
      bossHp: clan.bossHp,
      bossMaxHp: clan.bossMaxHp,
      bossLevel: clan.bossLevel,
      defeated,
      rewardGems
    };
  },

  applyToClan(userId: string, clanId: string): void {
    const clans = this.getClans();
    const clan = clans.find(c => c.id === clanId);
    if (clan && !clan.members.includes(userId) && (!clan.joinRequests || !clan.joinRequests.includes(userId))) {
      clan.joinRequests = clan.joinRequests || [];
      clan.joinRequests.push(userId);
      setStorageItem(STORAGE_KEYS.CLANS, clans);
    }
  },

  acceptApplication(leaderId: string, clanId: string, candidateId: string): void {
    const clans = this.getClans();
    const clan = clans.find(c => c.id === clanId);
    if (clan && clan.leaderId === leaderId) {
      clan.joinRequests = (clan.joinRequests || []).filter(id => id !== candidateId);
      if (!clan.members.includes(candidateId)) {
        clan.members.push(candidateId);
      }
      setStorageItem(STORAGE_KEYS.CLANS, clans);
      questsDb.updateGameState(candidateId, { clanId });
    }
  },

  rejectApplication(leaderId: string, clanId: string, candidateId: string): void {
    const clans = this.getClans();
    const clan = clans.find(c => c.id === clanId);
    if (clan && clan.leaderId === leaderId) {
      clan.joinRequests = (clan.joinRequests || []).filter(id => id !== candidateId);
      setStorageItem(STORAGE_KEYS.CLANS, clans);
    }
  },

  kickMember(leaderId: string, clanId: string, targetId: string): void {
    if (leaderId === targetId) return;
    const clans = this.getClans();
    const clan = clans.find(c => c.id === clanId);
    if (clan && clan.leaderId === leaderId) {
      clan.members = clan.members.filter(id => id !== targetId);
      setStorageItem(STORAGE_KEYS.CLANS, clans);
      questsDb.updateGameState(targetId, { clanId: null });
    }
  },

  transferLeadership(leaderId: string, clanId: string, targetId: string): void {
    const clans = this.getClans();
    const clan = clans.find(c => c.id === clanId);
    if (clan && clan.leaderId === leaderId && clan.members.includes(targetId)) {
      clan.leaderId = targetId;
      setStorageItem(STORAGE_KEYS.CLANS, clans);
    }
  },

  getClanBonus(clanId: string): { xpMultiplier: number, gemMultiplier: number } {
    const clans = this.getClans();
    const clan = clans.find(c => c.id === clanId);
    if (!clan) return { xpMultiplier: 1.0, gemMultiplier: 1.0 };
    
    const bonus = clan.level * 0.02;
    return {
      xpMultiplier: 1.0 + bonus,
      gemMultiplier: 1.0 + bonus
    };
  },
};
