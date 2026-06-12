import type { MathStatistic, TimelineEntry, GameState, Pet } from './dbConfig';
import { 
  STORAGE_KEYS, 
  getStorageItem, 
  setStorageItem, 
  isSupabaseEnabled, 
  supabase, 
  COSMETIC_ITEMS, 
  PET_TYPES 
} from './dbConfig';
import { usersDb } from './usersDb';
import { questsDb } from './questsDb';


export const statsDb = {
  // Math Statistics APIs
  getTimeline(userId: string): TimelineEntry[] {
    return (getStorageItem<TimelineEntry>(STORAGE_KEYS.TIMELINE) || []).filter(t => t.userId === userId);
  },

  getMathStats(userId: string): MathStatistic[] {
    const stats = getStorageItem<MathStatistic>(STORAGE_KEYS.STATS);
    return stats.filter(s => s.userId === userId);
  },

  recordOlympicMedal(userId: string, category: string, medal: 'gold' | 'silver' | 'bronze'): GameState | null {
    const state = questsDb.getGameState(userId);
    if (!state) return null;
    const medals = { ...(state.olympicMedals || {}) };
    const currentMedal = medals[category];
    
    let shouldUpdate = false;
    if (!currentMedal) {
      shouldUpdate = true;
    } else if (currentMedal === 'bronze' && (medal === 'silver' || medal === 'gold')) {
      shouldUpdate = true;
    } else if (currentMedal === 'silver' && medal === 'gold') {
      shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      medals[category] = medal;
      return questsDb.updateGameState(userId, { olympicMedals: medals });
    }
    return state;
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

    // Record timeline entry for temporal progress tracking
    let category = 'Geral';
    if (questionKey.includes('+')) category = 'Adição';
    else if (questionKey.includes('-')) category = 'Subtração';
    else if (questionKey.includes('x') || questionKey.includes('*')) category = 'Multiplicação';
    else if (questionKey.includes('/') || questionKey.includes('÷')) category = 'Divisão';
    else if (questionKey.startsWith('Olimpíadas')) category = 'Olimpíadas';

    const timeline = getStorageItem<TimelineEntry>(STORAGE_KEYS.TIMELINE) || [];
    timeline.push({
      userId,
      timestamp: new Date().toISOString(),
      category,
      questionKey,
      correct,
      timeMs
    });
    const userTimeline = timeline.filter(t => t.userId === userId).slice(-1000);
    const otherUsers = timeline.filter(t => t.userId !== userId);
    setStorageItem(STORAGE_KEYS.TIMELINE, [...otherUsers, ...userTimeline]);

    // Sync to Supabase in background
    if (isSupabaseEnabled && supabase) {
      supabase!.from('math_statistics')
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
            supabase!.from('math_statistics')
              .update(updates)
              .eq('user_id', userId)
              .eq('question_key', questionKey)
              .then(({ error: uError }) => {
                if (uError) console.error('[mockDb] Error updating stats in Supabase:', uError);
              });
          } else {
            const statId = 'stat_' + Math.random().toString(36).substring(2, 11);
            supabase!.from('math_statistics')
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

  forceMathStatsState(userId: string, questionKey: string, targetState: 'mastered' | 'weak'): void {
    const stats = getStorageItem<MathStatistic>(STORAGE_KEYS.STATS);
    const index = stats.findIndex(s => s.userId === userId && s.questionKey === questionKey);

    const updatedStat: MathStatistic = {
      userId,
      questionKey,
      correctCount: targetState === 'mastered' ? 5 : 0,
      errorCount: targetState === 'weak' ? 3 : 0,
      averageTimeMs: targetState === 'mastered' ? 800 : 5000,
    };

    if (index === -1) {
      stats.push(updatedStat);
    } else {
      stats[index] = updatedStat;
    }

    setStorageItem(STORAGE_KEYS.STATS, stats);

    // Sync to Supabase if active
    if (isSupabaseEnabled && supabase) {
      const updates = {
        correct_count: targetState === 'mastered' ? 5 : 0,
        incorrect_count: targetState === 'weak' ? 3 : 0,
        total_time_taken_ms: targetState === 'mastered' ? 800 : 5000
      };
      supabase!.from('math_statistics')
        .select('*')
        .eq('user_id', userId)
        .eq('question_key', questionKey)
        .then(({ data, error }) => {
          if (error) return;
          if (data && data.length > 0) {
            supabase!.from('math_statistics')
              .update(updates)
              .eq('user_id', userId)
              .eq('question_key', questionKey)
              .then(() => {});
          } else {
            const statId = 'stat_' + Math.random().toString(36).substring(2, 11);
            supabase!.from('math_statistics')
              .insert({
                id: statId,
                user_id: userId,
                question_key: questionKey,
                ...updates
              })
              .then(() => {});
          }
        });
    }
  },

  resetMathStats(userId: string): void {
    const stats = getStorageItem<MathStatistic>(STORAGE_KEYS.STATS);
    const filtered = stats.filter(s => s.userId !== userId);
    setStorageItem(STORAGE_KEYS.STATS, filtered);

    if (isSupabaseEnabled && supabase) {
      supabase!.from('math_statistics')
        .delete()
        .eq('user_id', userId)
        .then(() => {});
    }
  },

  getMathProgress(userId: string, op: string): {
    currentTier: number;
    maxUnlockedTier: number;
    percentToNext: number;
    unlockedList: number[];
    masteredList: number[];
  } {
    const stats = this.getMathStats(userId);
    const state = questsDb.getGameState(userId);
    const threshold = state?.masteryThreshold !== undefined ? state.masteryThreshold : 5;

    if (op === 'multiplication' || op === 'division') {
      const isMult = op === 'multiplication';
      const masteredList: number[] = [];
      const unlockedList: number[] = [2, 3]; // Initial unlocked houses

      for (let h = 2; h <= 10; h++) {
        let masteredFactsCount = 0;
        for (let x = 2; x <= 9; x++) {
          const key = isMult ? `${h}x${x}` : `${h * x}÷${h}`;
          const altKey = isMult ? `${x}x${h}` : `${h * x}/${h}`;
          const stat = stats.find(s => s.questionKey === key || s.questionKey === altKey);
          if (stat && stat.correctCount >= threshold) {
            masteredFactsCount++;
          }
        }
        if (masteredFactsCount >= 6) {
          masteredList.push(h);
        }
      }

      for (let h = 4; h <= 10; h++) {
        let allPrevMastered = true;
        for (let prev = 2; prev < h; prev++) {
          if (!masteredList.includes(prev)) {
            allPrevMastered = false;
            break;
          }
        }
        if (allPrevMastered) {
          unlockedList.push(h);
        }
      }

      const activeHouse = unlockedList.find(h => !masteredList.includes(h)) || 10;

      let masteredInActive = 0;
      for (let x = 2; x <= 9; x++) {
        const key = isMult ? `${activeHouse}x${x}` : `${activeHouse * x}÷${activeHouse}`;
        const altKey = isMult ? `${x}x${activeHouse}` : `${activeHouse * x}/${activeHouse}`;
        const stat = stats.find(s => s.questionKey === key || s.questionKey === altKey);
        if (stat && stat.correctCount >= threshold) {
          masteredInActive++;
        }
      }
      const percentToNext = Math.round((masteredInActive / 8) * 100);

      return {
        currentTier: activeHouse,
        maxUnlockedTier: Math.max(...unlockedList),
        percentToNext,
        unlockedList,
        masteredList,
      };
    } else {
      const isAdd = op === 'addition';
      const masteredList: number[] = [];
      const unlockedList: number[] = [1];
      const opStats = stats.filter(s => isAdd ? s.questionKey.includes('+') : s.questionKey.includes('-'));

      const getTierOfStat = (key: string): number => {
        const parts = key.split(isAdd ? '+' : '-');
        const num = parseInt(parts[0]);
        if (isNaN(num)) return 1;

        if (isAdd) {
          const sum = num + parseInt(parts[1] || '0');
          if (sum <= 20) return 1;
          if (sum <= 50) return 2;
          if (sum <= 100) return 3;
          if (sum <= 200) return 4;
          return 5;
        } else {
          if (num <= 10) return 1;
          if (num <= 30) return 2;
          if (num <= 60) return 3;
          if (num <= 120) return 4;
          return 5;
        }
      };

      const masteredCountPerTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      opStats.forEach(s => {
        if (s.correctCount >= threshold) {
          const tier = getTierOfStat(s.questionKey);
          masteredCountPerTier[tier] = (masteredCountPerTier[tier] || 0) + 1;
        }
      });

      for (let t = 1; t <= 5; t++) {
        if (masteredCountPerTier[t] >= 10) {
          masteredList.push(t);
        }
      }

      for (let t = 2; t <= 5; t++) {
        let allPrevMastered = true;
        for (let prev = 1; prev < t; prev++) {
          if (!masteredList.includes(prev)) {
            allPrevMastered = false;
            break;
          }
        }
        if (allPrevMastered) {
          unlockedList.push(t);
        }
      }

      const activeTier = unlockedList.find(t => !masteredList.includes(t)) || 5;
      const percentToNext = Math.min(100, Math.round(((masteredCountPerTier[activeTier] || 0) / 10) * 100));

      return {
        currentTier: activeTier,
        maxUnlockedTier: Math.max(...unlockedList),
        percentToNext,
        unlockedList,
        masteredList,
      };
    }
  },

  // Global Leaderboard View
  getLeaderboard(): {
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
    isOnline: boolean;
  }[] {
    const users = usersDb.getUsers().filter(u => u.role === 'player' && u.isActive !== false);
    const states = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const clans = getStorageItem<any>(STORAGE_KEYS.CLANS);

    return users
      .map(u => {
        const state = states.find(gs => gs.userId === u.id) || {
          auraLevel: 1,
          rebirths: 0,
          gems: 0,
          equippedPetId: null,
          equippedCosmeticId: null,
          classId: null,
          auraColor: '#00ffcc',
          equippedCosmetics: {},
          clanId: null,
          clanContributions: 0,
          totalPlayTimeSeconds: 0,
          selectedOperation: 'multiplication',
          unlockedSkills: [],
          updatedAt: new Date(0).toISOString()
        };

        let equippedCosmetics: Record<string, string> = state.equippedCosmetics || {};
        if (state.equippedCosmeticId && Object.keys(equippedCosmetics).length === 0) {
          const item = COSMETIC_ITEMS.find(c => c.id === state.equippedCosmeticId);
          if (item) {
            equippedCosmetics = { [item.category]: state.equippedCosmeticId };
          }
        }

        const equippedPet = state.equippedPetId ? pets.find(p => p.id === state.equippedPetId) : null;
        const petType = equippedPet ? PET_TYPES.find(pt => pt.id === equippedPet.petTypeId) : null;

        const activeTitleId = equippedCosmetics['title'] || (state.equippedCosmeticId?.startsWith('title_') ? state.equippedCosmeticId : null);
        const titleItem = activeTitleId ? COSMETIC_ITEMS.find(c => c.id === activeTitleId) : null;
        const titleText = titleItem ? titleItem.name.replace('Título: ', '') : undefined;

        const clan = state.clanId ? clans.find((c: any) => c.id === state.clanId) : null;

        return {
          username: u.username,
          level: state.auraLevel,
          rebirths: state.rebirths,
          gems: state.gems,
          equippedPetEmoji: petType?.emoji,
          equippedPetName: equippedPet?.nickname || petType?.name,
          equippedPetLevel: equippedPet?.level,
          equippedTitle: titleText,
          classId: state.classId || null,
          auraColor: state.auraColor || '#00ffcc',
          equippedCosmetics,
          equippedCosmeticId: state.equippedCosmeticId || null,
          clanName: clan ? clan.name : undefined,
          clanContributions: state.clanContributions ?? 0,
          totalPlayTimeSeconds: state.totalPlayTimeSeconds ?? 0,
          selectedOperation: state.selectedOperation ?? 'multiplication',
          unlockedSkillsCount: (state.unlockedSkills || []).length,
          isOnline: (Date.now() - new Date(state.updatedAt || 0).getTime()) < 180000
        };
      })
      .sort((a, b) => {
        if (b.rebirths !== a.rebirths) {
          return b.rebirths - a.rebirths;
        }
        return b.level - a.level;
      });
  },
};
