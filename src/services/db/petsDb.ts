import type { 
  Pet, 
  GameState, 
  TradeListing,
  PetType,
  SupabasePetRow
} from './dbConfig';
import { 
  STORAGE_KEYS, 
  getStorageItem, 
  setStorageItem, 
  PET_TYPES, 
  isSupabaseEnabled, 
  supabase 
} from './dbConfig';
import { usersDb } from './usersDb';
import { questsDb } from './questsDb';

export const petsDb = {
  getPets(userId: string): Pet[] {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    return pets.filter(p => p.userId === userId);
  },

  createPet(userId: string, petTypeId: string, nickname?: string): Pet | null {
    const petType = PET_TYPES.find(p => p.id === petTypeId);
    if (!petType) return null;

    const newPet: Pet = {
      id: 'pet_' + Math.random().toString(36).substring(2, 11),
      userId,
      petTypeId,
      nickname: nickname || petType.name,
      rarity: petType.rarity,
      buffType: petType.buffType,
      buffValue: petType.buffValue,
      createdAt: new Date().toISOString(),
      level: 1,
    };

    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    pets.push(newPet);
    setStorageItem(STORAGE_KEYS.PETS, pets);

    // Sync to Supabase in background
    const client = supabase;
    if (isSupabaseEnabled && client) {
      const dbRow: SupabasePetRow = {
        id: newPet.id,
        user_id: newPet.userId,
        pet_type_id: newPet.petTypeId,
        nickname: newPet.nickname,
        rarity: newPet.rarity,
        buff_type: newPet.buffType,
        buff_value: newPet.buffValue,
        level: newPet.level,
      };

      client.from('pets')
        .insert(dbRow)
        .returns<SupabasePetRow[]>()
        .then(({ error }) => {
          if (error) {
            console.error('[mockDb] Error syncing new pet to Supabase:', error);
          }
        });
    }

    return newPet;
  },

  deletePet(petId: string): boolean {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const filteredPets = pets.filter(p => p.id !== petId);
    if (pets.length === filteredPets.length) return false;

    setStorageItem(STORAGE_KEYS.PETS, filteredPets);

    // Sync to Supabase in background
    const client = supabase;
    if (isSupabaseEnabled && client) {
      client.from('pets')
        .delete()
        .eq('id', petId)
        .returns<SupabasePetRow[]>()
        .then(({ error }) => {
          if (error) {
            console.error('[mockDb] Error deleting pet from Supabase:', error);
          }
        });
    }

    return true;
  },

  updatePet(petId: string, updates: Partial<Pet>): Pet | null {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const index = pets.findIndex(p => p.id === petId);
    if (index === -1) return null;

    pets[index] = {
      ...pets[index],
      ...updates
    };

    setStorageItem(STORAGE_KEYS.PETS, pets);

    const client = supabase;
    if (isSupabaseEnabled && client) {
      const sbUpdates: Partial<SupabasePetRow> = {};
      if (updates.nickname !== undefined) sbUpdates.nickname = updates.nickname;
      if (updates.level !== undefined) sbUpdates.level = updates.level;
      if (updates.buffValue !== undefined) sbUpdates.buff_value = updates.buffValue;

      client.from('pets')
        .update(sbUpdates)
        .eq('id', petId)
        .returns<SupabasePetRow[]>()
        .then(({ error }) => {
          if (error) {
            console.error('[mockDb] Error updating pet in Supabase:', error);
          }
        });
    }

    return pets[index];
  },

  equipPet(userId: string, petId: string | null): boolean {
    const state = questsDb.getGameState(userId);
    if (!state) return false;

    if (petId !== null) {
      const pets = this.getPets(userId);
      const petExists = pets.some(p => p.id === petId);
      if (!petExists) return false;
    }

    questsDb.updateGameState(userId, { equippedPetId: petId });
    return true;
  },

  fusePets(userId: string, petId1: string, petId2: string): GameState | null {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const p1Index = pets.findIndex(p => p.id === petId1 && p.userId === userId);
    const p2Index = pets.findIndex(p => p.id === petId2 && p.userId === userId);

    if (p1Index === -1 || p2Index === -1 || petId1 === petId2) return null;

    const pet1 = pets[p1Index];
    const pet2 = pets[p2Index];

    if (pet1.petTypeId !== pet2.petTypeId) return null;
    if (pet1.level !== pet2.level) return null;
    if (pet1.level >= 6) return null; // Can't fuse further than Level 6 (5 fusions)

    const state = questsDb.getGameState(userId);
    if (!state) return null;

    if (state.equippedPetId === petId2) {
      this.equipPet(userId, null);
    }
    if (state.equippedPetId === petId1) {
      this.equipPet(userId, null);
    }

    // Delete pet2
    const updatedPets = pets.filter(p => p.id !== petId2);

    // Evolve pet1 to next level
    const p1NewIndex = updatedPets.findIndex(p => p.id === petId1);
    
    const baseType = PET_TYPES.find(pt => pt.id === pet1.petTypeId);
    const baseBuffVal = baseType ? baseType.buffValue : pet1.buffValue;
    
    let nextLevel = pet1.level + 1;
    let scaledValue = pet1.buffValue;

    if (pet1.buffType === 'time_bonus') {
      scaledValue = baseBuffVal * nextLevel;
    } else {
      const increment = baseBuffVal - 1;
      scaledValue = 1 + (increment * nextLevel);
    }

    const stars = '★'.repeat(nextLevel - 1);
    let baseName = pet1.nickname.split(' ★')[0];
    
    baseName = baseName.replace(/ (Flamejante 🔥|Voltaico ⚡|Glacial ❄️|Cósmico 🌌)/g, '');

    let elementSuffix = '';
    if (nextLevel === 3) elementSuffix = ' Flamejante 🔥';
    else if (nextLevel === 4) elementSuffix = ' Voltaico ⚡';
    else if (nextLevel === 5) elementSuffix = ' Glacial ❄️';
    else if (nextLevel >= 6) elementSuffix = ' Cósmico 🌌';

    updatedPets[p1NewIndex] = {
      ...pet1,
      level: nextLevel,
      nickname: `${baseName}${elementSuffix} ${stars}`,
      buffValue: Math.round(scaledValue * 100) / 100,
    };

    setStorageItem(STORAGE_KEYS.PETS, updatedPets);

    // Sync to Supabase in background
    const client = supabase;
    if (isSupabaseEnabled && client) {
      const p1Updates: Partial<SupabasePetRow> = {
        level: nextLevel,
        nickname: updatedPets[p1NewIndex].nickname,
        buff_value: updatedPets[p1NewIndex].buffValue
      };
      client.from('pets')
        .update(p1Updates)
        .eq('id', petId1)
        .returns<SupabasePetRow[]>()
        .then(() => {
          client.from('pets')
            .delete()
            .eq('id', petId2)
            .returns<SupabasePetRow[]>()
            .then(() => {});
        });
    }

    return questsDb.getGameState(userId);
  },

  addPetXp(userId: string, petId: string, xpGained: number): { pet: Pet | null, leveledUp: boolean } {
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const index = pets.findIndex(p => p.id === petId && p.userId === userId);
    if (index === -1) return { pet: null, leveledUp: false };

    const pet = pets[index];
    let xp = (pet.xp || 0) + xpGained;
    let level = pet.level;
    let leveledUp = false;

    if (level < 6) {
      if (xp >= 100) {
        level += 1;
        xp = xp - 100;
        leveledUp = true;
      }
    } else {
      xp = 0;
    }

    const baseType = PET_TYPES.find(pt => pt.id === pet.petTypeId);
    const baseBuffVal = baseType ? baseType.buffValue : pet.buffValue;
    let scaledValue = pet.buffValue;

    if (leveledUp) {
      if (pet.buffType === 'time_bonus') {
        scaledValue = baseBuffVal * level;
      } else {
        const increment = baseBuffVal - 1;
        scaledValue = 1 + (increment * level);
      }
    }

    let nickname = pet.nickname;
    if (leveledUp) {
      const stars = '★'.repeat(level - 1);
      let baseName = pet.nickname.split(' ★')[0];
      baseName = baseName.replace(/ (Flamejante 🔥|Voltaico ⚡|Glacial ❄️|Cósmico 🌌)/g, '');
      let elementSuffix = '';
      if (level === 3) elementSuffix = ' Flamejante 🔥';
      else if (level === 4) elementSuffix = ' Voltaico ⚡';
      else if (level === 5) elementSuffix = ' Glacial ❄️';
      else if (level >= 6) elementSuffix = ' Cósmico 🌌';
      nickname = `${baseName}${elementSuffix} ${stars}`;
    }

    pets[index] = {
      ...pet,
      xp,
      level,
      nickname,
      buffValue: Math.round(scaledValue * 100) / 100
    };

    setStorageItem(STORAGE_KEYS.PETS, pets);

    const client = supabase;
    if (isSupabaseEnabled && client) {
      const petUpdates: Partial<SupabasePetRow> = {
        level,
        nickname,
        buff_value: pets[index].buffValue,
        xp
      };
      client.from('pets')
        .update(petUpdates)
        .eq('id', petId)
        .returns<SupabasePetRow[]>()
        .then(({ error }) => {
          if (error) {
            console.error('[mockDb] Error updating pet XP/Level in Supabase:', error);
          }
        });
    }

    return { pet: pets[index], leveledUp };
  },

  getTradeListings(): TradeListing[] {
    this.simulateNPCTrades();
    return getStorageItem<TradeListing>(STORAGE_KEYS.TRADES);
  },

  postTrade(userId: string, petId: string, requestedType: 'gems' | 'pet', requestedAmount: number, requestedPetTypeId: string | null): GameState | null {
    const state = questsDb.getGameState(userId);
    if (!state) return null;
    
    const pets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
    const petIndex = pets.findIndex(p => p.id === petId && p.userId === userId);
    if (petIndex === -1) return null;
    
    const pet = pets[petIndex];
    const petType = PET_TYPES.find(pt => pt.id === pet.petTypeId);
    if (!petType) return null;
    
    if (state.equippedPetId === petId) {
      this.equipPet(userId, null);
    }
    
    const updatedPets = pets.filter(p => p.id !== petId);
    setStorageItem(STORAGE_KEYS.PETS, updatedPets);
    
    const newListing: TradeListing = {
      id: 'trade_' + Math.random().toString(36).substring(2, 11),
      posterId: userId,
      posterUsername: usersDb.getUsers().find(u => u.id === userId)?.username || 'Desconhecido',
      offeredPetId: petId,
      offeredPetTypeId: pet.petTypeId,
      offeredPetEmoji: petType.emoji,
      offeredPetName: pet.nickname,
      requestedType,
      requestedAmount,
      requestedPetTypeId,
      createdAt: new Date().toISOString()
    };
    
    const trades = getStorageItem<TradeListing>(STORAGE_KEYS.TRADES);
    trades.push(newListing);
    setStorageItem(STORAGE_KEYS.TRADES, trades);
    
    return questsDb.getGameState(userId);
  },

  acceptTrade(userId: string, listingId: string): GameState | null {
    const state = questsDb.getGameState(userId);
    if (!state) return null;
    
    const trades = getStorageItem<TradeListing>(STORAGE_KEYS.TRADES);
    const lIndex = trades.findIndex(t => t.id === listingId);
    if (lIndex === -1) return null;
    
    const listing = trades[lIndex];
    if (listing.posterId === userId) return null;
    
    if (listing.requestedType === 'gems') {
      if (state.gems < listing.requestedAmount) return null;
      questsDb.updateGameState(userId, { gems: state.gems - listing.requestedAmount });
      
      if (listing.posterId.startsWith('usr_') || listing.posterId.startsWith('player-')) {
        const posterState = questsDb.getGameState(listing.posterId);
        if (posterState) {
          questsDb.updateGameState(listing.posterId, { gems: posterState.gems + listing.requestedAmount });
        }
      }
    } else {
      const playerPets = getStorageItem<Pet>(STORAGE_KEYS.PETS).filter(p => p.userId === userId && p.level === 1);
      const requestedPetIndex = playerPets.findIndex(p => p.petTypeId === listing.requestedPetTypeId);
      
      if (requestedPetIndex === -1) return null;
      
      const playerPet = playerPets[requestedPetIndex];
      
      if (state.equippedPetId === playerPet.id) {
        this.equipPet(userId, null);
      }
      
      const allPets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
      const cleanPets = allPets.filter(p => p.id !== playerPet.id);
      setStorageItem(STORAGE_KEYS.PETS, cleanPets);

      const client = supabase;
      if (isSupabaseEnabled && client) {
        client.from('pets')
          .delete()
          .eq('id', playerPet.id)
          .returns<SupabasePetRow[]>()
          .then(({ error }) => {
            if (error) console.error('[mockDb acceptTrade] Error deleting trade-offered pet from Supabase:', error);
          });
      }
      
      if (listing.posterId.startsWith('usr_') || listing.posterId.startsWith('player-')) {
        this.createPet(listing.posterId, playerPet.petTypeId, playerPet.nickname);
      }
    }
    
    if (listing.offeredPetId) {
      const allPets = getStorageItem<Pet>(STORAGE_KEYS.PETS);
      const cleanPets = allPets.filter(p => p.id !== listing.offeredPetId);
      setStorageItem(STORAGE_KEYS.PETS, cleanPets);

      const client = supabase;
      if (isSupabaseEnabled && client) {
        client.from('pets')
          .delete()
          .eq('id', listing.offeredPetId)
          .returns<SupabasePetRow[]>()
          .then(({ error }) => {
            if (error) console.error('[mockDb acceptTrade] Error deleting poster pet from Supabase:', error);
          });
      }
    }

    const petTypeId = listing.offeredPetTypeId || 'robot_pup';
    
    this.createPet(userId, petTypeId, listing.offeredPetName);
    
    const cleanTrades = trades.filter(t => t.id !== listingId);
    setStorageItem(STORAGE_KEYS.TRADES, cleanTrades);
    
    return questsDb.getGameState(userId);
  },

  simulateNPCTrades(): void {
    // Disabled to prevent simulated NPC activity
    return;
  },
};
export type { PetType };
