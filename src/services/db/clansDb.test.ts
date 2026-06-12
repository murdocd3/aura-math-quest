import { describe, it, expect, beforeEach } from 'vitest';
import { clansDb } from './clansDb';
import { statsDb } from './statsDb';
import { questsDb } from './questsDb';
import { STORAGE_KEYS, setStorageItem, mockHash } from './dbConfig';
import type { User, GameState, MathStatistic } from './dbConfig';

describe('clansDb & statsDb Progress Tests', () => {
  const testUserId = 'test_user_1';

  beforeEach(() => {
    localStorage.clear();
    const defaultUser: User = {
      id: testUserId,
      username: 'testuser',
      role: 'player',
      passwordHash: mockHash('pass'),
      createdAt: new Date().toISOString()
    };
    setStorageItem(STORAGE_KEYS.USERS, [defaultUser]);

    const defaultState: GameState = {
      userId: testUserId,
      auraLevel: 10,
      auraXp: 0,
      auraColor: '#00ffcc',
      rebirths: 1,
      gems: 100,
      currentZone: 'forest',
      equippedPetId: null,
      activeAuras: [],
      totalPlayTimeSeconds: 0,
      updatedAt: new Date().toISOString(),
      purchasedCosmetics: [],
      equippedCosmetics: {},
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
      masteryThreshold: 5
    };
    setStorageItem(STORAGE_KEYS.GAME_STATES, [defaultState]);
    setStorageItem(STORAGE_KEYS.CLANS, []);
    setStorageItem(STORAGE_KEYS.STATS, []);
  });

  describe('clansDb', () => {
    it('creates a clan successfully and assigns leadership', () => {
      const state = clansDb.createClan(testUserId, 'Super Math', 'MATH', 'Fun with numbers', '🥇');
      expect(state).not.toBeNull();
      expect(state?.clanId).toBeDefined();

      const clans = clansDb.getClans();
      expect(clans.length).toBe(1);
      expect(clans[0].name).toBe('Super Math');
      expect(clans[0].tag).toBe('MATH');
      expect(clans[0].leaderId).toBe(testUserId);
      expect(clans[0].members).toContain(testUserId);
    });

    it('manages member joining, leaving and leadership transfer', () => {
      const clanState = clansDb.createClan(testUserId, 'Super Math', 'MATH', 'Fun with numbers', '🥇');
      const clanId = clanState!.clanId!;
      const otherUserId = 'other_user_2';

      const otherState: GameState = {
        userId: otherUserId,
        auraLevel: 5,
        auraXp: 0,
        auraColor: '#00ffcc',
        rebirths: 0,
        gems: 10,
        currentZone: 'forest',
        equippedPetId: null,
        activeAuras: [],
        totalPlayTimeSeconds: 0,
        updatedAt: new Date().toISOString(),
        purchasedCosmetics: [],
        equippedCosmetics: {},
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
        campaignStage: 1
      };
      const allStates = [questsDb.getGameState(testUserId)!, otherState];
      setStorageItem(STORAGE_KEYS.GAME_STATES, allStates);

      clansDb.joinClan(otherUserId, clanId);
      let clan = clansDb.getClans()[0];
      expect(clan.members).toContain(otherUserId);

      clansDb.transferLeadership(testUserId, clanId, otherUserId);
      clan = clansDb.getClans()[0];
      expect(clan.leaderId).toBe(otherUserId);

      clansDb.kickMember(otherUserId, clanId, testUserId);
      clan = clansDb.getClans()[0];
      expect(clan.members).not.toContain(testUserId);
    });

    it('simulates damaging boss and handles level up correctly', () => {
      const clanState = clansDb.createClan(testUserId, 'Boss Slayers', 'SLAY', 'Raid daily', '⚔️');
      const clanId = clanState!.clanId!;

      const result = clansDb.damageClanBoss(testUserId, clanId, 6000);
      expect(result).not.toBeNull();
      expect(result?.defeated).toBe(true);
      expect(result?.bossLevel).toBe(2);

      const clan = clansDb.getClans()[0];
      // level remaining 1 because xp gained (200) is less than nextLevelXp (500)
      expect(clan.level).toBe(1);
      expect(clan.xp).toBe(200);
    });
  });

  describe('statsDb.getMathProgress', () => {
    it('returns progressive unlocked tiers and mastered lists', () => {
      const stats: MathStatistic[] = [];
      // Mastery threshold is 5 correct answers
      for (let x = 2; x <= 9; x++) {
        stats.push({ userId: testUserId, questionKey: `2x${x}`, correctCount: 5, errorCount: 0, averageTimeMs: 1000 });
        stats.push({ userId: testUserId, questionKey: `3x${x}`, correctCount: 5, errorCount: 0, averageTimeMs: 1000 });
      }
      // Add 2 mastery facts for Tier 4 (which is unlocked because 2 and 3 are mastered)
      // Since Tier 4 has 8 facts total (4x2 to 4x9), mastering 2 facts means 2/8 = 25% progress.
      stats.push({ userId: testUserId, questionKey: `4x2`, correctCount: 5, errorCount: 0, averageTimeMs: 1000 });
      stats.push({ userId: testUserId, questionKey: `4x3`, correctCount: 5, errorCount: 0, averageTimeMs: 1000 });
      setStorageItem(STORAGE_KEYS.STATS, stats);

      const progress = statsDb.getMathProgress(testUserId, 'multiplication');
      expect(progress.masteredList).toContain(2);
      expect(progress.masteredList).toContain(3);
      expect(progress.currentTier).toBe(4);
      expect(progress.percentToNext).toBe(25);
    });
  });
});
