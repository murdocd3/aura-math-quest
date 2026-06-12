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
  isSupabaseEnabled, 
  supabase,
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
    ];

    const defaultGameStates: GameState[] = [];
    const defaultPets: Pet[] = [];
    const defaultStats: MathStatistic[] = [];
    const defaultClans: Clan[] = [];
    const defaultTrades: TradeListing[] = [];

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
    localStorage.setItem('amq_timeline', JSON.stringify(defaultTimeline));
  }

  // Clear specific users (patricia, luigi, manu, maju, lucas, sofia, gabriel, beatriz) if they exist in localStorage
  try {
    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (rawUsers) {
      const users: User[] = JSON.parse(rawUsers);
      const targets = ['patricia', 'luigi', 'manu', 'maju', 'lucas', 'sofia', 'gabriel', 'beatriz'];
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

        // Clear Timeline
        const rawTimeline = localStorage.getItem(STORAGE_KEYS.TIMELINE);
        if (rawTimeline) {
          const timeline: TimelineEntry[] = JSON.parse(rawTimeline);
          localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(timeline.filter(t => !userIdsToClear.includes(t.userId))));
        }

        // Sync deletion to Supabase in background
        if (isSupabaseEnabled && supabase) {
          userIdsToClear.forEach(id => {
            supabase!.from('users').delete().eq('id', id).then(({ error }) => {
              if (error) console.error('[mockDb seed clean] Error cleaning user from Supabase:', error);
            });
          });
        }
      }
    }
  } catch (err) {
    console.error('[mockDb] Error during user cleanup step:', err);
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
