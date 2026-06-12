import type { 
  Pet, 
  GameState, 
  TradeListing
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
    if (isSupabaseEnabled && supabase) {
      supabase!.from('pets')
        .insert({
          id: newPet.id,
          user_id: newPet.userId,
          pet_type_id: newPet.petTypeId,
          nickname: newPet.nickname,
          rarity: newPet.rarity,
          buff_type: newPet.buffType,
          buff_value: newPet.buffValue,
          level: newPet.level,
        })
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
    if (isSupabaseEnabled && supabase) {
      supabase!.from('pets')
        .delete()
        .eq('id', petId)
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

    if (isSupabaseEnabled && supabase) {
      const sbUpdates: any = {};
      if (updates.nickname !== undefined) sbUpdates.nickname = updates.nickname;
      if (updates.level !== undefined) sbUpdates.level = updates.level;
      if (updates.buffValue !== undefined) sbUpdates.buff_value = updates.buffValue;

      supabase!.from('pets')
        .update(sbUpdates)
        .eq('id', petId)
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
    if (isSupabaseEnabled && supabase) {
      supabase!.from('pets')
        .update({
          level: nextLevel,
          nickname: updatedPets[p1NewIndex].nickname,
          buff_value: updatedPets[p1NewIndex].buffValue
        })
        .eq('id', petId1)
        .then(() => {
          supabase!.from('pets').delete().eq('id', petId2).then(() => {});
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

    if (isSupabaseEnabled && supabase) {
      supabase!.from('pets')
        .update({
          level,
          nickname,
          buff_value: pets[index].buffValue,
          xp
        })
        .eq('id', petId)
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

      if (isSupabaseEnabled && supabase) {
        supabase!.from('pets').delete().eq('id', playerPet.id).then(({ error }) => {
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

      if (isSupabaseEnabled && supabase) {
        supabase!.from('pets').delete().eq('id', listing.offeredPetId).then(({ error }) => {
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
    if (Math.random() > 0.15) return;
    
    const trades = getStorageItem<TradeListing>(STORAGE_KEYS.TRADES);
    const npcs = ['sofia', 'lucas', 'beatriz', 'gabriel'];
    const npcsIds = ['player-sofia', 'player-lucas', 'player-beatriz', 'player-gabriel'];
    
    if (Math.random() < 0.6 && trades.length < 5) {
      const npcIdx = Math.floor(Math.random() * npcs.length);
      const npcName = npcs[npcIdx];
      const npcId = npcsIds[npcIdx];
      
      const randomPetType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
      const isGemsRequest = Math.random() < 0.5;
      
      const newListing: TradeListing = {
        id: 'trade_npc_' + Math.random().toString(36).substring(2, 9),
        posterId: npcId,
        posterUsername: npcName,
        offeredPetId: null,
        offeredPetTypeId: randomPetType.id,
        offeredPetEmoji: randomPetType.emoji,
        offeredPetName: randomPetType.name,
        requestedType: isGemsRequest ? 'gems' : 'pet',
        requestedAmount: isGemsRequest ? Math.floor(Math.random() * 15) + 8 : 0,
        requestedPetTypeId: isGemsRequest ? null : PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)].id,
        createdAt: new Date().toISOString()
      };
      
      trades.push(newListing);
      setStorageItem(STORAGE_KEYS.TRADES, trades);
    }
    
    const playerListingIndex = trades.findIndex(t => t.posterId.startsWith('usr_'));
    if (playerListingIndex !== -1 && Math.random() < 0.3) {
      const listing = trades[playerListingIndex];
      const posterState = questsDb.getGameState(listing.posterId);
      
      if (posterState) {
        if (listing.requestedType === 'gems') {
          questsDb.updateGameState(listing.posterId, { gems: posterState.gems + listing.requestedAmount });
        } else {
          if (listing.requestedPetTypeId) {
            this.createPet(listing.posterId, listing.requestedPetTypeId);
          }
        }
        
        const cleanTrades = trades.filter(t => t.id !== listing.id);
        setStorageItem(STORAGE_KEYS.TRADES, cleanTrades);
      }
    }
  },
};
export type PetType = any; // backward compatible dummy export
