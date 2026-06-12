import type { 
  User, 
  GameState, 
  Pet, 
  MathStatistic, 
  Clan, 
  TradeListing, 
  TimelineEntry 
} from './dbConfig';
import { 
  STORAGE_KEYS, 
  mockHash
} from './dbConfig';

export function seedDatabase() {
  const storedUsersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
  let needsSeed = !storedUsersRaw;

  if (storedUsersRaw) {
    try {
      const parsedUsers = JSON.parse(storedUsersRaw) as User[];
      const hasUnhashed = parsedUsers.some(u => !u.passwordHash.startsWith('mockhash_'));
      if (hasUnhashed) {
        needsSeed = true;
        localStorage.removeItem(STORAGE_KEYS.USERS);
        localStorage.removeItem(STORAGE_KEYS.GAME_STATES);
        localStorage.removeItem(STORAGE_KEYS.PETS);
        localStorage.removeItem(STORAGE_KEYS.STATS);
        localStorage.removeItem(STORAGE_KEYS.CLANS);
      }
    } catch (e) {
      needsSeed = true;
    }
  }

  if (needsSeed) {
    const defaultUsers: User[] = [
      { id: 'admin-id', username: 'admin', role: 'admin', passwordHash: mockHash('auraadmin123'), createdAt: new Date().toISOString() },
      { id: 'player-lucas', username: 'lucas', role: 'player', passwordHash: mockHash('lucas123'), createdAt: new Date().toISOString() },
      { id: 'player-sofia', username: 'sofia', role: 'player', passwordHash: mockHash('sofia123'), createdAt: new Date().toISOString() },
      { id: 'player-gabriel', username: 'gabriel', role: 'player', passwordHash: mockHash('gabriel123'), createdAt: new Date().toISOString() },
      { id: 'player-beatriz', username: 'beatriz', role: 'player', passwordHash: mockHash('beatriz123'), createdAt: new Date().toISOString() },
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
        clanId: null,
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
        clanId: null,
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
        clanId: null,
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
        buffType: 'combined',
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
        buffType: 'combined',
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
        buffType: 'combined',
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

    const defaultClans: Clan[] = [];

    const defaultTrades: TradeListing[] = [
      {
        id: 'trade-sofia-1',
        posterId: 'player-sofia',
        posterUsername: 'sofia',
        offeredPetId: null,
        offeredPetTypeId: 'slime_buddy',
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
        offeredPetTypeId: 'robot_pup',
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

  // Check or seed timeline logs
  if (!localStorage.getItem('amq_timeline')) {
    const defaultTimeline: TimelineEntry[] = [];
    const categories = ['Adição', 'Subtração', 'Multiplicação', 'Divisão'];
    const mockUserIds = ['player-lucas', 'player-sofia', 'player-gabriel', 'player-beatriz'];

    for (let dayOffset = 5; dayOffset >= 0; dayOffset--) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const isoDate = date.toISOString();

      mockUserIds.forEach(u => {
        const numQuestions = 6 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numQuestions; i++) {
          const cat = categories[Math.floor(Math.random() * categories.length)];
          const correctChance = 0.55 + ((5 - dayOffset) * 0.07);
          const correct = Math.random() < correctChance;
          const timeMs = Math.round(7500 - ((5 - dayOffset) * 700) + (Math.random() * 1000));

          defaultTimeline.push({
            userId: u,
            timestamp: isoDate,
            category: cat,
            questionKey: `${2 + Math.floor(Math.random() * 8)}x${2 + Math.floor(Math.random() * 8)}`,
            correct,
            timeMs
          });
        }
      });
    }
    localStorage.setItem('amq_timeline', JSON.stringify(defaultTimeline));
  }



  // Dynamic creation and seeding for robust demonstration user
  try {
    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (rawUsers) {
      const usersList: User[] = JSON.parse(rawUsers);
      const hasDemo = usersList.some(u => u.username === 'aluno_demonstracao');
      if (!hasDemo) {
        const demoUser: User = {
          id: 'player-demo',
          username: 'aluno_demonstracao',
          role: 'player',
          passwordHash: mockHash('demo123'),
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: false
        };
        usersList.push(demoUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersList));

        // Add GameState
        const rawStates = localStorage.getItem(STORAGE_KEYS.GAME_STATES);
        if (rawStates) {
          const statesList: GameState[] = JSON.parse(rawStates);
          if (!statesList.some(s => s.userId === 'player-demo')) {
            statesList.push({
              userId: 'player-demo',
              auraLevel: 32,
              auraXp: 800,
              auraColor: '#00ffcc',
              rebirths: 1,
              gems: 50,
              currentZone: 'forest',
              equippedPetId: null,
              activeAuras: ['lvl10', 'lvl30'],
              totalPlayTimeSeconds: 8500,
              updatedAt: new Date().toISOString(),
              purchasedCosmetics: [],
              equippedCosmeticId: null,
              selectedOperation: 'addition',
              questWins: 5,
              questCriticals: 2,
              questStreak: 3,
              claimedQuests: [],
              classId: 'chronomancer',
              skillPoints: 2,
              unlockedSkills: [],
              clanId: null,
              clanContributions: 0,
              campaignStage: 3,
            });
            localStorage.setItem(STORAGE_KEYS.GAME_STATES, JSON.stringify(statesList));
          }
        }
      }
    }

    // Seed 15 days of progressive statistics for player-demo if timeline not already populated for them
    const rawTimeline = localStorage.getItem('amq_timeline');
    if (rawTimeline) {
      const timelineList: TimelineEntry[] = JSON.parse(rawTimeline);
      const hasDemoTimeline = timelineList.some(t => t.userId === 'player-demo');
      if (!hasDemoTimeline) {
        const categories = ['Adição', 'Subtração', 'Multiplicação', 'Divisão', 'Olimpíadas'];
        for (let dayOffset = 15; dayOffset >= 0; dayOffset--) {
          const date = new Date();
          date.setDate(date.getDate() - dayOffset);
          const isoDate = date.toISOString();

          // Generate 10 to 15 responses per day
          const numQuestions = 10 + Math.floor(Math.random() * 6);
          for (let i = 0; i < numQuestions; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const progressRatio = (15 - dayOffset) / 15; // 0 to 1
            
            const correctChance = 0.40 + (progressRatio * 0.52) + (Math.random() * 0.1 - 0.05);
            const correct = Math.random() < correctChance;

            const baseTime = 9000 - (progressRatio * 6600);
            const timeMs = Math.round(baseTime + (Math.random() * 1500 - 750));

            timelineList.push({
              userId: 'player-demo',
              timestamp: isoDate,
              category,
              questionKey: `${2 + Math.floor(Math.random() * 8)}x${2 + Math.floor(Math.random() * 8)}`,
              correct,
              timeMs: Math.max(1000, timeMs)
            });
          }
        }
        localStorage.setItem('amq_timeline', JSON.stringify(timelineList));
      }
    }
  } catch (err) {
    console.error('[mockDb] Error seeding demonstration user data:', err);
  }
}
