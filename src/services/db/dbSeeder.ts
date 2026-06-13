import type { 
  User, 
  GameState, 
  Pet, 
  MathStatistic, 
  Clan, 
  TradeListing 
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
      const hasMockUsers = parsedUsers.some(u => u.id.startsWith('player-'));
      if (hasUnhashed || hasMockUsers) {
        needsSeed = true;
        localStorage.removeItem(STORAGE_KEYS.USERS);
        localStorage.removeItem(STORAGE_KEYS.GAME_STATES);
        localStorage.removeItem(STORAGE_KEYS.PETS);
        localStorage.removeItem(STORAGE_KEYS.STATS);
        localStorage.removeItem(STORAGE_KEYS.CLANS);
        localStorage.removeItem(STORAGE_KEYS.TRADES);
        localStorage.removeItem('amq_timeline');
        localStorage.removeItem('amq_weekly_leaderboard');
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
    localStorage.setItem('amq_timeline', JSON.stringify([]));
  }
}
