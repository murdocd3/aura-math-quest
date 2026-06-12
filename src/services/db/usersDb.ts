import type { 
  User, 
  GameState, 
  Pet, 
  MathStatistic,
  SupabaseUserRow,
  SupabaseGameStateRow
} from './dbConfig';
import { 
  STORAGE_KEYS, 
  mockHash, 
  getStorageItem, 
  setStorageItem, 
  isSupabaseEnabled, 
  supabase 
} from './dbConfig';


export const usersDb = {
  getUsers(): User[] {
    return getStorageItem<User>(STORAGE_KEYS.USERS);
  },

  authenticate(username: string, passwordPlain: string): User | null {
    const users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === cleanUser);
    if (user && user.passwordHash === mockHash(passwordPlain)) {
      return user;
    }
    return null;
  },

  createUser(username: string, passwordPlain: string, role: 'admin' | 'player', isActive: boolean = true): User | null {
    const users = this.getUsers();
    const cleanUser = username.trim();
    if (users.some(u => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      return null; // Username exists
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      username: cleanUser,
      role,
      passwordHash: mockHash(passwordPlain),
      createdAt: new Date().toISOString(),
      isActive,
    };

    users.push(newUser);
    setStorageItem(STORAGE_KEYS.USERS, users);

    let newState: GameState | null = null;

    // Initialize default game state for player
    if (role === 'player') {
      const gameStates = getStorageItem<GameState>(STORAGE_KEYS.GAME_STATES);
      const createdState: GameState = {
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
        customTimeLimit: 15,
        masteryThreshold: 5,
        lockedOperations: [],
      };
      gameStates.push(createdState);
      newState = createdState;
      setStorageItem(STORAGE_KEYS.GAME_STATES, gameStates);
    }

    // Sync to Supabase in background
    const client = supabase;
    if (isSupabaseEnabled && client) {
      // Helper map inside usersDb to avoid circular dependency
      const dbRow: Partial<SupabaseGameStateRow> = {};
      if (newState) {
        if (newState.campaignStage !== undefined) dbRow.campaign_stage = newState.campaignStage;
        if (newState.gems !== undefined) dbRow.gems = newState.gems;
        if (newState.auraLevel !== undefined) dbRow.aura_level = newState.auraLevel;
        if (newState.auraXp !== undefined) dbRow.aura_xp = newState.auraXp;
        if (newState.auraColor !== undefined) dbRow.aura_color = newState.auraColor;
        if (newState.rebirths !== undefined) dbRow.rebirths = newState.rebirths;
        if (newState.currentZone !== undefined) dbRow.current_zone = newState.currentZone;
        if (newState.equippedPetId !== undefined) dbRow.equipped_pet_id = newState.equippedPetId;
        if (newState.activeAuras !== undefined) dbRow.active_auras = newState.activeAuras;
        if (newState.totalPlayTimeSeconds !== undefined) dbRow.total_play_time_seconds = newState.totalPlayTimeSeconds;
        if (newState.purchasedCosmetics !== undefined) dbRow.purchased_cosmetics = newState.purchasedCosmetics;
        if (newState.equippedCosmeticId !== undefined) dbRow.equipped_cosmetic_id = newState.equippedCosmeticId;
        if (newState.selectedOperation !== undefined) dbRow.selected_operation = newState.selectedOperation;
        if (newState.questWins !== undefined) dbRow.quest_wins = newState.questWins;
        if (newState.questCriticals !== undefined) dbRow.quest_criticals = newState.questCriticals;
        if (newState.questStreak !== undefined) dbRow.quest_streak = newState.questStreak;
        if (newState.claimedQuests !== undefined) dbRow.claimed_quests = newState.claimedQuests;
        if (newState.classId !== undefined) dbRow.active_class = newState.classId;
        if (newState.skillPoints !== undefined) dbRow.skill_points = newState.skillPoints;
        if (newState.unlockedSkills !== undefined) dbRow.unlocked_skills = newState.unlockedSkills;
        if (newState.clanId !== undefined) dbRow.clan_id = newState.clanId;
        if (newState.clanContributions !== undefined) dbRow.clan_contributions = newState.clanContributions;
        dbRow.updated_at = new Date().toISOString();
      }

      client.from('users')
        .insert({
          id: newUser.id,
          username: newUser.username,
          password: newUser.passwordHash,
          role: newUser.role,
          is_active: newUser.isActive,
        })
        .returns<SupabaseUserRow[]>()
        .then(({ error: uError }) => {
          if (uError) {
            console.error('[mockDb] Error syncing new user to Supabase:', uError);
            return;
          }

          if (role === 'player' && newState) {
            dbRow.user_id = newUser.id;
            client.from('game_states')
              .insert(dbRow)
              .returns<SupabaseGameStateRow[]>()
              .then(({ error: sError }) => {
                if (sError) console.error('[mockDb] Error syncing default game state to Supabase:', sError);
              });
          }
        });
    }

    return newUser;
  },
  updateUser(id: string, updates: Partial<Pick<User, 'username' | 'passwordHash' | 'isActive'>>): boolean {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
      const newUser: User = {
        id,
        username: updates.username || 'usuario_synced',
        role: 'player',
        passwordHash: updates.passwordHash ? mockHash(updates.passwordHash) : mockHash('123'),
        createdAt: new Date().toISOString(),
        isActive: updates.isActive !== false,
      };
      users.push(newUser);
      setStorageItem(STORAGE_KEYS.USERS, users);
      return true;
    }

    if (updates.username) {
      const cleanUser = updates.username.trim();
      if (users.some(u => u.id !== id && u.username.toLowerCase() === cleanUser.toLowerCase())) {
        return false; // Name clash
      }
      users[index].username = cleanUser;
    }
    if (updates.passwordHash) {
      users[index].passwordHash = mockHash(updates.passwordHash);
    }
    if (updates.isActive !== undefined) {
      users[index].isActive = updates.isActive;
    }

    setStorageItem(STORAGE_KEYS.USERS, users);

    // Sync to Supabase in background
    const client = supabase;
    if (isSupabaseEnabled && client) {
      const dbUpdates: Partial<SupabaseUserRow> = {};
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.passwordHash !== undefined) dbUpdates.password = updates.passwordHash;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      client.from('users')
        .update(dbUpdates)
        .eq('id', id)
        .returns<SupabaseUserRow[]>()
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

    // Sync to Supabase in background
    const client = supabase;
    if (isSupabaseEnabled && client) {
      client.from('users')
        .delete()
        .eq('id', id)
        .returns<SupabaseUserRow[]>()
        .then(({ error }) => {
          if (error) console.error('[mockDb] Error syncing user deletion to Supabase:', error);
        });
    }

    return true;
  },
};
