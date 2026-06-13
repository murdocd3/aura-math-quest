import React, { useState, useEffect } from 'react';
import { mockDb, PET_TYPES, getPetEvolutionEmoji } from '../services/mockDb';
import type { Pet, GameState, TradeListing } from '../services/mockDb';
import { backendService } from '../services/backendService';
import { audioEngine } from './AudioEngine';

interface PetShopProps {
  userId: string;
  gameState: GameState;
  onStateUpdate: (newState: GameState) => void;
  onBack: () => void;
}

function rollPetRarityAndType(type: 'standard' | 'golden'): string {
  const random = Math.random() * 100;
  let rolledRarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';

  if (type === 'standard') {
    if (random < 1) rolledRarity = 'legendary';
    else if (random < 10) rolledRarity = 'epic';
    else if (random < 30) rolledRarity = 'rare';
    else rolledRarity = 'common';
  } else {
    if (random < 15) rolledRarity = 'legendary';
    else if (random < 60) rolledRarity = 'epic';
    else rolledRarity = 'rare';
  }

  const eligibleTypes = PET_TYPES.filter(pt => pt.rarity === rolledRarity && pt.cost < 999);
  const selectedPetType = eligibleTypes.length > 0
    ? eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)]
    : PET_TYPES[0]; // fallback
  return selectedPetType.id;
}

function calculateTimeLeftSec(endTimeStr: string, _tick: number): number {
  return Math.max(0, Math.floor((new Date(endTimeStr).getTime() - Date.now()) / 1000));
}

export const PetShop: React.FC<PetShopProps> = ({ userId, gameState, onStateUpdate, onBack }) => {
  const [pets, setPets] = useState<Pet[]>(mockDb.getPets(userId));
  const [isHatching, setIsHatching] = useState(false);
  const [hatchStage, setHatchStage] = useState<'idle' | 'shaking' | 'spinning' | 'revealed'>('idle');
  const [hatchedPet, setHatchedPet] = useState<Pet | null>(null);
  const [spinEmoji, setSpinEmoji] = useState('🥚');
  const [eggTypeSelected, setEggTypeSelected] = useState<'standard' | 'golden'>('standard');
  const [petNicknameInput, setPetNicknameInput] = useState('');

  // Fusion States
  const [activeTab, setActiveTab] = useState<'hatch' | 'fusion' | 'trade' | 'album' | 'train' | 'expedition'>('hatch');
  const [selectedPet1Id, setSelectedPet1Id] = useState<string | null>(null);
  const [selectedPet2Id, setSelectedPet2Id] = useState<string | null>(null);
  const [fusionSuccessMsg, setFusionSuccessMsg] = useState<string | null>(null);

  // Training & Feeding States
  const [selectedTrainingPetId, setSelectedTrainingPetId] = useState<string | null>(null);
  const [trainingGameMode, setTrainingGameMode] = useState<'select' | 'food_chase' | 'memory_matrix'>('select');
  const [levelUpMessage, setLevelUpMessage] = useState<{ name: string; level: number; emoji: string } | null>(null);

  // Corrida dos Cálculos (Food Chase)
  const [foodChaseStep, setFoodChaseStep] = useState<number>(0);
  const [foodChaseQuestion, setFoodChaseQuestion] = useState<{ num1: number; num2: number; op: string; answer: number } | null>(null);
  const [foodChaseInput, setFoodChaseInput] = useState<string>('');
  const [foodChaseFeedback, setFoodChaseFeedback] = useState<string | null>(null);

  // Matriz de Memória (Memory Matrix)
  const [memoryMatrixQuestion, setMemoryMatrixQuestion] = useState<{ initial: number; steps: { op: string; val: number }[]; answer: number } | null>(null);
  const [memoryMatrixInput, setMemoryMatrixInput] = useState<string>('');
  const [memoryMatrixFeedback, setMemoryMatrixFeedback] = useState<string | null>(null);

  // Expedition States
  const [expeditionPetId, setExpeditionPetId] = useState<string | null>(null);
  const [expeditionDuration, setExpeditionDuration] = useState<'short' | 'medium' | 'long'>('short');

  // General Notification States
  const [petSuccessMsg, setPetSuccessMsg] = useState<string | null>(null);
  const [petErrorMsg, setPetErrorMsg] = useState<string | null>(null);
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState('');
  const [tick, setTick] = useState(0);
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterElement, setFilterElement] = useState<string>('all');

  const getPetElement = (petName: string) => {
    if (petName.includes('🔥') || petName.includes('Flamejante')) return 'fire';
    if (petName.includes('⚡') || petName.includes('Voltaico')) return 'electric';
    if (petName.includes('❄️') || petName.includes('Glacial')) return 'ice';
    if (petName.includes('🌌') || petName.includes('Cósmico')) return 'cosmic';
    return 'none';
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => { clearInterval(timer); };
  }, []);

  // Trading States
  const [tradeListings, setTradeListings] = useState<TradeListing[]>([]);
  const [selectedOfferPetId, setSelectedOfferPetId] = useState<string | null>(null);
  const [tradeRequestedType, setTradeRequestedType] = useState<'gems' | 'pet'>('gems');
  const [tradeRequestedAmount, setTradeRequestedAmount] = useState<number>(10);
  const [tradeRequestedPetTypeId, setTradeRequestedPetTypeId] = useState<string>('robot_pup');
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);
  const [tradeErrorMsg, setTradeErrorMsg] = useState<string | null>(null);

  const loadTrades = () => {
    setTradeListings(mockDb.getTradeListings());
  };

  const generateFoodChaseQuestion = () => {
    const ops = ['+', '-', 'x'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let num1 = 0;
    let num2 = 0;
    let answer = 0;
    
    if (op === '+') {
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      answer = num1 + num2;
    } else if (op === '-') {
      num1 = Math.floor(Math.random() * 20) + 10;
      num2 = Math.floor(Math.random() * num1);
      answer = num1 - num2;
    } else {
      num1 = Math.floor(Math.random() * 9) + 2;
      num2 = Math.floor(Math.random() * 9) + 2;
      answer = num1 * num2;
    }
    
    setFoodChaseQuestion({ num1, num2, op, answer });
    setFoodChaseInput('');
    setFoodChaseFeedback(null);
  };

  const handleCheckFoodChaseAnswer = async () => {
    if (!foodChaseQuestion || !selectedTrainingPetId) return;
    const userAnswer = parseInt(foodChaseInput);
    if (userAnswer === foodChaseQuestion.answer) {
      audioEngine.playCorrect();
      setFoodChaseFeedback('Correto! O pet avança em direção à guloseima!');
      
      const nextStep = foodChaseStep + 1;
      setFoodChaseStep(nextStep);

      if (nextStep >= 3) {
        audioEngine.playLevelUp();
        
        const xpGained = 40;
        const res = mockDb.addPetXp(userId, selectedTrainingPetId, xpGained);
        setPets(mockDb.getPets(userId));

        const currentTreats = gameState.treats || 0;
        const updatedState = await backendService.updateGameState(userId, {
          treats: currentTreats + 2
        });
        if (updatedState) {
          onStateUpdate(updatedState);
        }

        if (res.leveledUp && res.pet) {
          const pt = PET_TYPES.find(p => p.id === res.pet?.petTypeId);
          setLevelUpMessage({
            name: res.pet.nickname,
            level: res.pet.level,
            emoji: pt?.emoji || '🐾'
          });
        }

        setFoodChaseFeedback(`Parabéns! Seu pet alcançou a Guloseima 🍖! Ganhou +40 XP e +2 Guloseimas!`);
        setTimeout(() => {
          setTrainingGameMode('select');
          setFoodChaseStep(0);
          setFoodChaseFeedback(null);
        }, 4000);
      } else {
        setTimeout(() => {
          generateFoodChaseQuestion();
        }, 1500);
      }
    } else {
      audioEngine.playError();
      setFoodChaseFeedback(`Ops! Tente novamente. A resposta certa era ${foodChaseQuestion.answer}.`);
      setTimeout(() => {
        generateFoodChaseQuestion();
      }, 2000);
    }
  };

  const generateMemoryMatrixQuestion = () => {
    const initial = Math.floor(Math.random() * 10) + 2;
    const steps: { op: string; val: number }[] = [];
    let currentVal = initial;

    for (let i = 0; i < 3; i++) {
      const ops = ['+', '-', 'x'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let val = 0;
      if (op === '+') {
        val = Math.floor(Math.random() * 8) + 2;
        currentVal += val;
      } else if (op === '-') {
        val = Math.floor(Math.random() * (currentVal - 1)) + 1;
        currentVal -= val;
      } else {
        val = Math.floor(Math.random() * 3) + 2;
        currentVal *= val;
      }
      steps.push({ op, val });
    }

    setMemoryMatrixQuestion({ initial, steps, answer: currentVal });
    setMemoryMatrixInput('');
    setMemoryMatrixFeedback(null);
  };

  const handleCheckMemoryMatrixAnswer = async () => {
    if (!memoryMatrixQuestion || !selectedTrainingPetId) return;
    const userAnswer = parseInt(memoryMatrixInput);
    if (userAnswer === memoryMatrixQuestion.answer) {
      audioEngine.playCorrect();
      setMemoryMatrixFeedback('Incrível! Resposta correta! Matriz Sincronizada.');

      const xpGained = 50;
      const res = mockDb.addPetXp(userId, selectedTrainingPetId, xpGained);
      setPets(mockDb.getPets(userId));

      const currentTreats = gameState.treats || 0;
      const updatedState = await backendService.updateGameState(userId, {
        treats: currentTreats + 3
      });
      if (updatedState) {
        onStateUpdate(updatedState);
      }

      if (res.leveledUp && res.pet) {
        const pt = PET_TYPES.find(p => p.id === res.pet?.petTypeId);
        setLevelUpMessage({
          name: res.pet.nickname,
          level: res.pet.level,
          emoji: pt?.emoji || '🐾'
        });
      }

      setTimeout(() => {
        setTrainingGameMode('select');
        setMemoryMatrixFeedback(null);
      }, 4000);
    } else {
      audioEngine.playError();
      setMemoryMatrixFeedback(`Ops! Conexão falhou. A resposta era ${memoryMatrixQuestion.answer}.`);
      setTimeout(() => {
        generateMemoryMatrixQuestion();
      }, 2500);
    }
  };

  const handleFeedPet = async (_petId: string) => {
    const currentTreats = gameState.treats || 0;
    if (currentTreats < 5) {
      audioEngine.playError();
      setPetErrorMsg('Você precisa de pelo menos 5 Guloseimas 🍖 para alimentar o pet!');
      setTimeout(() => { setPetErrorMsg(null); }, 3000);
      return;
    }
    
    audioEngine.playLevelUp();
    
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const updatedState = await backendService.updateGameState(userId, {
      treats: currentTreats - 5,
      fedBonusUntil: twoHoursFromNow
    });
    
    if (updatedState) {
      onStateUpdate(updatedState);
      setPetSuccessMsg('Seu pet foi alimentado! +50% de bônus ativo por 2 horas!');
      setScreenReaderAnnouncement('Seu pet foi alimentado! Ganhou bônus de XP!');
      setTimeout(() => { setPetSuccessMsg(null); }, 4000);
    }
  };

  const handleStartExpedition = async () => {
    if (!expeditionPetId) return;
    
    if (gameState.equippedPetId === expeditionPetId) {
      audioEngine.playError();
      setPetErrorMsg('Você não pode enviar o seu pet equipado em uma expedição! Desequipe-o primeiro.');
      setTimeout(() => { setPetErrorMsg(null); }, 3000);
      return;
    }
    
    let durationMs = 0;
    let rewardGems = 0;
    if (expeditionDuration === 'short') {
      durationMs = 30 * 1000;
      rewardGems = 15;
    } else if (expeditionDuration === 'medium') {
      durationMs = 30 * 60 * 1000;
      rewardGems = 100;
    } else {
      durationMs = 2 * 60 * 60 * 1000;
      rewardGems = 300;
    }
    
    const endTime = new Date(Date.now() + durationMs).toISOString();
    const currentExpeditions = gameState.activeExpeditions || [];
    
    if (currentExpeditions.some(e => e.petId === expeditionPetId)) {
      audioEngine.playError();
      setPetErrorMsg('Este pet já está em uma expedição!');
      setTimeout(() => { setPetErrorMsg(null); }, 3000);
      return;
    }
    
    audioEngine.playHatchRoll();
    const updatedState = await backendService.updateGameState(userId, {
      activeExpeditions: [...currentExpeditions, { petId: expeditionPetId, endTime, rewardGems }]
    });
    
    if (updatedState) {
      onStateUpdate(updatedState);
      setPetSuccessMsg('Expedição iniciada com sucesso! O pet partiu em sua jornada.');
      setScreenReaderAnnouncement('Expedição iniciada com sucesso! Seu pet partiu em jornada.');
      setExpeditionPetId(null);
      setTimeout(() => { setPetSuccessMsg(null); }, 4000);
    }
  };

  const handleCollectExpedition = async (petId: string) => {
    const currentExpeditions = gameState.activeExpeditions || [];
    const expedition = currentExpeditions.find(e => e.petId === petId);
    if (!expedition) return;
    
    if (new Date(expedition.endTime) > new Date()) {
      audioEngine.playError();
      setPetErrorMsg('Esta expedição ainda não terminou!');
      setTimeout(() => { setPetErrorMsg(null); }, 3000);
      return;
    }
    
    audioEngine.playLevelUp();
    const updatedExpeditions = currentExpeditions.filter(e => e.petId !== petId);
    const updatedState = await backendService.updateGameState(userId, {
      gems: gameState.gems + expedition.rewardGems,
      activeExpeditions: updatedExpeditions
    });
    
    if (updatedState) {
      onStateUpdate(updatedState);
      setPetSuccessMsg(`Expedição concluída! Você coletou 💎 ${expedition.rewardGems} gemas!`);
      setScreenReaderAnnouncement(`Expedição concluída! Você resgatou ${expedition.rewardGems} gemas.`);
      setTimeout(() => { setPetSuccessMsg(null); }, 4000);
    }
  };

  useEffect(() => {
    setPets(mockDb.getPets(userId));
  }, [userId, gameState]);

  useEffect(() => {
    loadTrades();
  }, []);

  const handleAcceptTrade = (listingId: string) => {
    const listing = tradeListings.find(t => t.id === listingId);
    if (!listing) return;

    if (listing.requestedType === 'gems') {
      if (gameState.gems < listing.requestedAmount) {
        audioEngine.playError();
        setTradeErrorMsg('Gemas insuficientes para aceitar esta troca!');
        setTimeout(() => { setTradeErrorMsg(null); }, 4000);
        return;
      }
    } else {
      const eligiblePets = pets.filter(p => p.petTypeId === listing.requestedPetTypeId && p.level === 1);
      if (eligiblePets.length === 0) {
        audioEngine.playError();
        const petTypeName = PET_TYPES.find(pt => pt.id === listing.requestedPetTypeId)?.name || 'pet';
        setTradeErrorMsg(`Você não possui um pet do tipo "${petTypeName}" no Nível 1 para oferecer!`);
        setTimeout(() => { setTradeErrorMsg(null); }, 4000);
        return;
      }
    }

    const updatedState = mockDb.acceptTrade(userId, listingId);
    if (updatedState) {
      audioEngine.playHatchSuccess();
      setTradeSuccessMsg('Troca realizada com sucesso! Novo pet adicionado à mochila.');
      onStateUpdate(updatedState);
      loadPets();
      setTimeout(() => { setTradeSuccessMsg(null); }, 4000);
    } else {
      audioEngine.playError();
      setTradeErrorMsg('Erro ao aceitar troca. Verifique seus requisitos.');
      setTimeout(() => { setTradeErrorMsg(null); }, 4000);
    }
  };

  const handlePostTrade = () => {
    if (!selectedOfferPetId) {
      audioEngine.playError();
      setTradeErrorMsg('Selecione um pet de sua mochila para oferecer!');
      setTimeout(() => { setTradeErrorMsg(null); }, 4000);
      return;
    }

    const petToOffer = pets.find(p => p.id === selectedOfferPetId);
    if (!petToOffer) return;

    if (petToOffer.level !== 1) {
      audioEngine.playError();
      setTradeErrorMsg('Apenas pets de Nível 1 podem ser anunciados!');
      setTimeout(() => { setTradeErrorMsg(null); }, 4000);
      return;
    }

    const reqPetTypeId = tradeRequestedType === 'pet' ? tradeRequestedPetTypeId : null;
    const reqAmount = tradeRequestedType === 'gems' ? tradeRequestedAmount : 0;

    const updatedState = mockDb.postTrade(userId, selectedOfferPetId, tradeRequestedType, reqAmount, reqPetTypeId);
    if (updatedState) {
      audioEngine.playCorrect();
      setTradeSuccessMsg(`Pet "${petToOffer.nickname}" anunciado no mercado com sucesso!`);
      setSelectedOfferPetId(null);
      onStateUpdate(updatedState);
      loadPets();
      setTimeout(() => { setTradeSuccessMsg(null); }, 4000);
    } else {
      audioEngine.playError();
      setTradeErrorMsg('Erro ao publicar o anúncio. Tente novamente.');
      setTimeout(() => { setTradeErrorMsg(null); }, 4000);
    }
  };

  const handleCancelTrade = (listingId: string) => {
    const trades = JSON.parse(localStorage.getItem('amq_trades') || '[]');
    const listing = trades.find((t: any) => t.id === listingId);
    if (!listing) return;

    if (listing.posterId !== userId) return;

    const petTypeId = listing.offeredPetTypeId || 'robot_pup';

    mockDb.createPet(userId, petTypeId, listing.offeredPetName);

    const cleanTrades = trades.filter((t: any) => t.id !== listingId);
    localStorage.setItem('amq_trades', JSON.stringify(cleanTrades));

    audioEngine.playCorrect();
    setTradeSuccessMsg('Anúncio cancelado e pet retornado à mochila!');
    loadPets();
    setTimeout(() => { setTradeSuccessMsg(null); }, 4000);
  };

  const handleFusion = async () => {
    if (!selectedPet1Id || !selectedPet2Id) return;

    const pet1 = pets.find(p => p.id === selectedPet1Id);
    const pet2 = pets.find(p => p.id === selectedPet2Id);

    if (!pet1 || !pet2) return;

    if (pet1.petTypeId !== pet2.petTypeId) {
      audioEngine.playError();
      alert('Os pets precisam ser da mesma espécie!');
      return;
    }

    if (pet1.level !== pet2.level) {
      audioEngine.playError();
      alert('Ambos os pets precisam estar no mesmo Nível para realizar a fusão!');
      return;
    }

    if (pet1.level >= 6) {
      audioEngine.playError();
      alert('Seu pet já atingiu o nível máximo de evolução (Nível 6)!');
      return;
    }

    try {
      const updatedState = await backendService.fusePets(userId, selectedPet1Id, selectedPet2Id);
      if (updatedState) {
        audioEngine.playHatchSuccess();
        const nextLvl = pet1.level + 1;
        const stars = '★'.repeat(nextLvl - 1);
        setFusionSuccessMsg(`Fusão Completa! Seu pet "${pet1.nickname}" evoluiu para o Nível ${nextLvl} ${stars}!`);
        setScreenReaderAnnouncement(`Fusão Completa! Seu pet ${pet1.nickname} subiu para o nível ${nextLvl}.`);
        setSelectedPet1Id(null);
        setSelectedPet2Id(null);
        onStateUpdate(updatedState);
        loadPets();
        setTimeout(() => { setFusionSuccessMsg(null); }, 5000);
      } else {
        audioEngine.playError();
        alert('Erro ao realizar a fusão dos pets. Verifique as regras.');
      }
    } catch (err: any) {
      audioEngine.playError();
      alert('Erro na Fusão (Simulado RPC):\n' + (err.message || err));
    }
  };

  const EGG_COSTS = {
    standard: 15,
    golden: 40,
  };

  const loadPets = () => {
    setPets(mockDb.getPets(userId));
    loadTrades();
  };

  const handleHatch = (type: 'standard' | 'golden') => {
    const cost = EGG_COSTS[type];
    if (gameState.gems < cost) {
      audioEngine.playError();
      alert('Gemas insuficientes para comprar este ovo! Ganhe mais batalhas perfeitas.');
      return;
    }

    setEggTypeSelected(type);
    setIsHatching(true);
    setHatchStage('shaking');
    setPetNicknameInput('');

    // Deduct gems
    backendService.updateGameState(userId, {
      gems: gameState.gems - cost,
    }).then(updatedState => {
      if (updatedState) {
        onStateUpdate(updatedState);
      }
    });

    // Step 1: Egg Shaking (1.5 seconds)
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
      audioEngine.playHatchRoll();
      shakeCount++;
      if (shakeCount >= 6) {
        clearInterval(shakeInterval);
        startSpinning(type);
      }
    }, 250);
  };

  const startSpinning = (type: 'standard' | 'golden') => {
    setHatchStage('spinning');

    const selectedPetTypeId = rollPetRarityAndType(type);

    // Spin roulette animation (1.2 seconds)
    let spinIndex = 0;
    const spinInterval = setInterval(() => {
      audioEngine.playHatchRoll();
      const randomPet = PET_TYPES[spinIndex % PET_TYPES.length];
      setSpinEmoji(randomPet.emoji);
      spinIndex++;
    }, 150);

    setTimeout(() => {
      clearInterval(spinInterval);
      revealPet(selectedPetTypeId);
    }, 1200);
  };

  const revealPet = (petTypeId: string) => {
    audioEngine.playHatchSuccess();
    const createdPet = mockDb.createPet(userId, petTypeId);
    
    if (createdPet) {
      setHatchedPet(createdPet);
      const pt = PET_TYPES.find(p => p.id === petTypeId);
      setScreenReaderAnnouncement(`Hatch completo! Você obteve um ${pt?.name || 'Pet'}!`);
      setPetNicknameInput(createdPet.nickname);
      setHatchStage('revealed');
      loadPets();
    }
  };

  const saveNickname = () => {
    if (!hatchedPet) return;
    const nameToSet = petNicknameInput.trim() || hatchedPet.nickname;
    setScreenReaderAnnouncement(`Nome do pet salvo com sucesso como ${nameToSet}!`);
    const allPets = mockDb.getPets(userId);
    const index = allPets.findIndex(p => p.id === hatchedPet.id);
    if (index !== -1) {
      allPets[index].nickname = nameToSet;
      localStorage.setItem('amq_pets', JSON.stringify(allPets));
      loadPets();
    }
    closeHatchModal();
  };

  const closeHatchModal = () => {
    setIsHatching(false);
    setHatchStage('idle');
    setHatchedPet(null);
  };

  const handleEquip = async (petId: string) => {
    audioEngine.playCorrect();
    const nextEquipId = gameState.equippedPetId === petId ? null : petId;
    const updated = await backendService.updateGameState(userId, {
      equippedPetId: nextEquipId
    });
    if (updated) {
      onStateUpdate(updated);
    }
  };

  const handleRelease = async (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;

    if (window.confirm(`Quer libertar o seu pet "${pet.nickname}"? Você receberá 3 Gemas de Matemática em troca.`)) {
      audioEngine.playCorrect();
      
      let nextEquipId = gameState.equippedPetId;
      if (gameState.equippedPetId === petId) {
        nextEquipId = null;
      }

      mockDb.deletePet(petId);
      
      const updatedState = await backendService.updateGameState(userId, {
        gems: gameState.gems + 3,
        equippedPetId: nextEquipId
      });
      
      if (updatedState) {
        onStateUpdate(updatedState);
      }
      loadPets();
    }
  };

  const getBuffDescription = (pet: Pet | typeof PET_TYPES[0]) => {
    // If it is a Pet instance, find its base type in PET_TYPES catalog to check for combined/hybrid buffs
    const pt = 'petTypeId' in pet ? PET_TYPES.find(x => x.id === pet.petTypeId) : pet;
    
    if (pt && pt.buffType === 'combined') {
      if (pt.buffDescription) {
        // Scale composite text based on level if it's a Pet instance
        const level = 'level' in pet ? pet.level : 1;
        if (level > 1) {
          let desc = '';
          if (pt.extraTime) desc += `+${(pt.extraTime * level).toFixed(1)}s Resposta`;
          if (pt.xpMultiplier) {
            if (desc) desc += ' / ';
            desc += `XP +${Math.round(((pt.xpMultiplier - 1) * level) * 100)}%`;
          }
          if (pt.gemMultiplier) {
            if (desc) desc += ' / ';
            desc += `Gemas +${Math.round(((pt.gemMultiplier - 1) * level) * 100)}%`;
          }
          return desc;
        }
        return pt.buffDescription;
      }
    }

    // Single buff types
    switch (pet.buffType) {
      case 'time_bonus':
        return `+${pet.buffValue} segundos de tempo para responder`;
      case 'aura_multiplier':
        return `+${Math.round((pet.buffValue - 1) * 100)}% de Aura XP`;
      case 'gem_multiplier':
        return `+${Math.round((pet.buffValue - 1) * 100)}% de Gemas`;
      default:
        return '';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#a1a1aa'; // silver
      case 'rare': return '#22c55e'; // green
      case 'epic': return '#3b82f6'; // blue
      case 'legendary': return '#a855f7'; // purple
      default: return '#fff';
    }
  };

  const getEggEmoji = (type: 'standard' | 'golden') => {
    return type === 'standard' ? '🥚' : '✨🥚✨';
  };

  return (
    <div style={{ padding: '20px', minHeight: '80vh' }}>
      <span style={{ display: 'none' }}>{tick}</span>
      {/* Title & Hub Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 className="text-glow-yellow" style={{ color: 'var(--neon-yellow)', fontSize: '2.2rem' }}>
            🏪 LOJA DE PETS GACHA
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Hache ovos matemáticos para conseguir companheiros mágicos com bônus incríveis!</p>
        </div>
        <button className="cyber-btn" onClick={onBack} style={{ padding: '10px 18px' }}>
          ◀ Voltar para o Hub
        </button>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('hatch'); }}
          style={{
            flex: '1 1 140px',
            padding: '10px',
            background: activeTab === 'hatch' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'hatch' ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'hatch' ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem'
          }}
        >
          🥚 Chocar Ovos
        </button>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('fusion'); }}
          style={{
            flex: '1 1 140px',
            padding: '10px',
            background: activeTab === 'fusion' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'fusion' ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'fusion' ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem'
          }}
        >
          🧬 Fusão de Pets
        </button>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('trade'); }}
          style={{
            flex: '1 1 140px',
            padding: '10px',
            background: activeTab === 'trade' ? 'rgba(0, 255, 204, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'trade' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'trade' ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem'
          }}
        >
          🌌 Trocas
        </button>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('album'); }}
          style={{
            flex: '1 1 140px',
            padding: '10px',
            background: activeTab === 'album' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'album' ? 'var(--neon-pink)' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'album' ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem'
          }}
        >
          📖 Álbum
        </button>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('train'); }}
          style={{
            flex: '1 1 140px',
            padding: '10px',
            background: activeTab === 'train' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'train' ? '#ea580c' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'train' ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem'
          }}
        >
          🍖 Treinar & Alimentar
        </button>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('expedition'); }}
          style={{
            flex: '1 1 140px',
            padding: '10px',
            background: activeTab === 'expedition' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'expedition' ? '#22c55e' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'expedition' ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem'
          }}
        >
          🎒 Expedições
        </button>
      </div>

      {/* Main Grid: Eggs for Sale / Fusion Lab (Left) vs Pets Inventory (Right) */}
      {activeTab === 'album' ? (
        <div className="cyber-card animate-fade-in" style={{ borderColor: 'var(--neon-pink)', background: 'rgba(15, 23, 42, 0.65)', padding: '24px' }}>
          <h2 className="text-glow-pink" style={{ color: 'var(--neon-pink)', fontSize: '1.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '20px' }}>
            📖 Álbum Holográfico de Pets
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.4rem' }}>
            Descubra e colecione todos os pets do universo de matemática! Pets que você já conquistou aparecem coloridos e brilhantes, enquanto os que ainda não obteve ficam com silhuetas sombreadas no álbum.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '18px' }}>
            {PET_TYPES.map(pt => {
              const hasUnlocked = pets.some(p => p.petTypeId === pt.id);
              const rarityColor = getRarityColor(pt.rarity);

              return (
                <div
                  key={pt.id}
                  className="cyber-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    borderColor: hasUnlocked ? rarityColor : 'rgba(255, 255, 255, 0.05)',
                    background: hasUnlocked ? 'rgba(15, 23, 42, 0.4)' : 'rgba(3, 7, 18, 0.8)',
                    opacity: hasUnlocked ? 1 : 0.4,
                    filter: hasUnlocked ? 'none' : 'grayscale(100%) blur(0.5px)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Holographic glowing lines for unlocked pets */}
                  {hasUnlocked && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: `linear-gradient(135deg, ${rarityColor}05 0%, ${rarityColor}15 100%)`,
                      pointerEvents: 'none'
                    }} />
                  )}

                  <span style={{
                    fontSize: '3.2rem',
                    marginBottom: '10px',
                    display: 'inline-block',
                    filter: hasUnlocked ? `drop-shadow(0 0 8px ${rarityColor}80)` : 'none'
                  }}>
                    {pt.emoji}
                  </span>

                  <div style={{
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    color: hasUnlocked ? '#fff' : 'rgba(255,255,255,0.3)',
                    textAlign: 'center',
                    marginBottom: '4px'
                  }}>
                    {hasUnlocked ? pt.name : '???'}
                  </div>

                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: hasUnlocked ? rarityColor + '20' : 'rgba(255,255,255,0.05)',
                      color: hasUnlocked ? rarityColor : 'rgba(255,255,255,0.2)',
                      border: `1px solid ${hasUnlocked ? rarityColor + '40' : 'rgba(255,255,255,0.1)'}`
                    }}
                  >
                    {pt.rarity}
                  </span>

                  <div style={{ fontSize: '0.75rem', color: hasUnlocked ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.15)', marginTop: '8px', textAlign: 'center' }}>
                    {hasUnlocked ? getBuffDescription(pt) : 'Bloqueado'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'train' ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tutorial / Help header */}
          <div className="cyber-card" style={{ borderColor: '#ea580c', background: 'rgba(234, 88, 12, 0.03)', padding: '16px' }}>
            <h3 style={{ color: '#ea580c', fontSize: '1.2rem', marginBottom: '6px', fontWeight: 'bold' }}>
              🍖 Centro de Treinamento Holográfico de Pets
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: '1.3rem', margin: 0 }}>
              Treine seus pets para ganhar <strong>XP</strong> e evoluí-los visualmente e em poder! Escolha um pet e jogue mini-jogos matemáticos ou use suas Guloseimas 🍖 para alimentá-lo!
            </p>
          </div>

          <div className="responsive-grid-2">
            {/* Left Card: Pet Selection and XP Info */}
            <div className="cyber-card" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.65)', padding: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '16px' }}>
                🐾 Selecione o Pet para Treinar
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', marginBottom: '20px' }}>
                {pets.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' }}>Você não tem pets ainda. Hatch no gacha para conseguir!</p>
                ) : (
                  pets.map(pet => {
                    const pt = PET_TYPES.find(p => p.id === pet.petTypeId);
                    const isSelected = selectedTrainingPetId === pet.id;
                    
                    return (
                      <div
                        key={pet.id}
                        onClick={() => {
                          audioEngine.playHatchRoll();
                          setSelectedTrainingPetId(pet.id);
                          setTrainingGameMode('select');
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isSelected ? 'rgba(234, 88, 12, 0.1)' : 'rgba(255,255,255,0.02)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid #ea580c' : '1px solid rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '2rem' }}>{getPetEvolutionEmoji(pt?.emoji || '🐾', pet.level)}</span>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>
                              {pet.nickname}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                              Nvl {pet.level} • XP: {pet.xp || 0}/100
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#ea580c', fontWeight: 900 }}>
                            {isSelected ? 'ATIVO' : 'SELECIONAR'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedTrainingPetId && (
                (() => {
                  const activePet = pets.find(p => p.id === selectedTrainingPetId);
                  if (!activePet) return null;
                  const pt = PET_TYPES.find(p => p.id === activePet.petTypeId);
                  return (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '3rem' }}>{getPetEvolutionEmoji(pt?.emoji || '🐾', activePet.level)}</span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem' }}>{activePet.nickname}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Nível {activePet.level}/6 • {activePet.rarity}</span>
                        </div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                          <span>Experiência (XP):</span>
                          <span>{activePet.xp || 0}/100</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${activePet.xp || 0}%`, height: '100%', background: 'linear-gradient(90deg, #ea580c, #f97316)', boxShadow: '0 0 8px rgba(234, 88, 12, 0.5)', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button
                          className="cyber-btn"
                          onClick={() => handleFeedPet(activePet.id)}
                          style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: 'rgba(234, 88, 12, 0.1)', borderColor: '#ea580c' }}
                        >
                          Alimentar 🍖 (5 Guloseimas)
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Right Card: Training Minigame Area */}
            <div className="cyber-card" style={{ borderColor: '#ea580c', background: 'rgba(15, 23, 42, 0.65)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>
                  🎮 Arena de Jogos de Lógica e Aritmética
                </h3>
                <strong style={{ fontSize: '1rem', color: '#ea580c' }}>🍖 {gameState.treats || 0} Guloseimas</strong>
              </div>

              {petSuccessMsg && <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '0.8rem', marginBottom: '12px' }}>{petSuccessMsg}</div>}
              {petErrorMsg && <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', fontSize: '0.8rem', marginBottom: '12px' }}>{petErrorMsg}</div>}

              {!selectedTrainingPetId ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', padding: '40px' }}>
                  Selecione um pet da lista ao lado para iniciar as atividades de treinamento matemático!
                </div>
              ) : trainingGameMode === 'select' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    Escolha um minijogo abaixo para treinar seu pet selecionado e ganhar bônus de XP e Guloseimas!
                  </p>

                  <div
                    onClick={() => {
                      audioEngine.playHatchRoll();
                      setTrainingGameMode('food_chase');
                      setFoodChaseStep(0);
                      generateFoodChaseQuestion();
                    }}
                    style={{
                      border: '1.5px solid rgba(234, 88, 12, 0.3)',
                      background: 'rgba(234, 88, 12, 0.03)',
                      padding: '16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    className="cyber-hover"
                  >
                    <h4 style={{ margin: '0 0 4px 0', color: '#ea580c', fontSize: '1.05rem', fontWeight: 'bold' }}>🏃‍♂️ Corrida dos Cálculos (Food Chase)</h4>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                      Ajude seu pet a alcançar a guloseima 🍖 resolvendo 3 contas aritméticas rápidas em sequência. Concede <strong>+40 XP</strong> e <strong>+2 Guloseimas</strong>!
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      audioEngine.playHatchRoll();
                      setTrainingGameMode('memory_matrix');
                      generateMemoryMatrixQuestion();
                    }}
                    style={{
                      border: '1.5px solid rgba(168, 85, 247, 0.3)',
                      background: 'rgba(168, 85, 247, 0.03)',
                      padding: '16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    className="cyber-hover"
                  >
                    <h4 style={{ margin: '0 0 4px 0', color: 'var(--neon-purple)', fontSize: '1.05rem', fontWeight: 'bold' }}>🌌 Matriz de Memória Aritmética</h4>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                      Calcule mentalmente a cadeia de operações exibidas na tela cyberpunk e informe o resultado final. Concede <strong>+50 XP</strong> e <strong>+3 Guloseimas</strong>!
                    </p>
                  </div>
                </div>
              ) : trainingGameMode === 'food_chase' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#ea580c', fontWeight: 'bold' }}>🏃‍♂️ Corrida dos Cálculos</span>
                    <button className="cyber-btn" onClick={() => { setTrainingGameMode('select'); }} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Sair</button>
                  </div>

                  {/* Visual progress bar / chase track */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '10px', margin: '12px 0', border: '1px dashed rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', width: '100%', position: 'relative', height: '40px', alignItems: 'center' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: `${(foodChaseStep / 3) * 78}%`,
                          transition: 'all 0.4s ease',
                          fontSize: '2.5rem',
                          zIndex: 1
                        }}
                      >
                        {getPetEvolutionEmoji(PET_TYPES.find(p => p.id === pets.find(x => x.id === selectedTrainingPetId)?.petTypeId)?.emoji || '🐾', pets.find(x => x.id === selectedTrainingPetId)?.level || 1)}
                      </div>
                      <div style={{ position: 'absolute', right: '5%', fontSize: '2.5rem', animation: 'pulse-ring 1s infinite alternate', zIndex: 1 }}>
                        🍖
                      </div>
                    </div>
                  </div>

                  {foodChaseQuestion ? (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px 0' }}>Resolva para avançar (Passo {foodChaseStep + 1}/3):</p>
                      <h2 style={{ fontSize: '2.4rem', color: '#fff', fontWeight: 900, letterSpacing: '2px', margin: '0 0 12px 0' }}>
                        {foodChaseQuestion.num1} {foodChaseQuestion.op === 'x' ? '×' : foodChaseQuestion.op} {foodChaseQuestion.num2}
                      </h2>
                      
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '300px', margin: '0 auto 10px auto' }}>
                        <input
                          type="number"
                          value={foodChaseInput}
                          onChange={(e) => { setFoodChaseInput(e.target.value); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCheckFoodChaseAnswer(); }}
                          placeholder="Resposta"
                          style={{
                            flex: 1,
                            padding: '10px',
                            fontSize: '1.2rem',
                            textAlign: 'center',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            backgroundColor: '#0b0f19',
                            color: '#fff'
                          }}
                        />
                        <button className="cyber-btn" onClick={handleCheckFoodChaseAnswer} style={{ padding: '0 16px', background: 'rgba(234, 88, 12, 0.1)', borderColor: '#ea580c' }}>
                          Enviar
                        </button>
                      </div>

                      {foodChaseFeedback && (
                        <div style={{ fontSize: '0.85rem', color: foodChaseFeedback.includes('Correto') || foodChaseFeedback.includes('Parabéns') ? 'var(--neon-green)' : 'var(--neon-pink)', fontWeight: 'bold', marginTop: '6px' }}>
                          {foodChaseFeedback}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : trainingGameMode === 'memory_matrix' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--neon-purple)', fontWeight: 'bold' }}>🌌 Matriz de Memória</span>
                    <button className="cyber-btn" onClick={() => { setTrainingGameMode('select'); }} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Sair</button>
                  </div>

                  {memoryMatrixQuestion ? (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px 0' }}>Calcule mentalmente toda a sequência:</p>
                      
                      {/* Cyberpunk matrix pipeline layout */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', alignItems: 'center', margin: '16px 0', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '6px 12px', borderRadius: '4px', color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          Valor Inicial: {memoryMatrixQuestion.initial}
                        </div>
                        {memoryMatrixQuestion.steps.map((step, idx) => (
                          <React.Fragment key={idx}>
                            <span style={{ color: 'rgba(255,255,255,0.65)' }}>➔</span>
                            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '4px', color: '#fff', fontSize: '0.9rem' }}>
                              {step.op === 'x' ? '×' : step.op} {step.val}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: '14px 0 6px 0' }}>Qual é o resultado final?</p>
                      
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '300px', margin: '0 auto 10px auto' }}>
                        <input
                          type="number"
                          value={memoryMatrixInput}
                          onChange={(e) => { setMemoryMatrixInput(e.target.value); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCheckMemoryMatrixAnswer(); }}
                          placeholder="Resultado Final"
                          style={{
                            flex: 1,
                            padding: '10px',
                            fontSize: '1.2rem',
                            textAlign: 'center',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            backgroundColor: '#0b0f19',
                            color: '#fff'
                          }}
                        />
                        <button className="cyber-btn" onClick={handleCheckMemoryMatrixAnswer} style={{ padding: '0 16px', background: 'rgba(168, 85, 247, 0.1)', borderColor: 'var(--neon-purple)' }}>
                          Enviar
                        </button>
                      </div>

                      {memoryMatrixFeedback && (
                        <div style={{ fontSize: '0.85rem', color: memoryMatrixFeedback.includes('Incrível') ? 'var(--neon-green)' : 'var(--neon-pink)', fontWeight: 'bold', marginTop: '6px' }}>
                          {memoryMatrixFeedback}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : activeTab === 'expedition' ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tutorial / Help Header */}
          <div className="cyber-card" style={{ borderColor: '#22c55e', background: 'rgba(34, 197, 94, 0.03)', padding: '16px' }}>
            <h3 style={{ color: '#22c55e', fontSize: '1.2rem', marginBottom: '6px', fontWeight: 'bold' }}>
              🎒 Expedições Espaciais de Pets
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: '1.3rem', margin: 0 }}>
              Envie seus pets não equipados em expedições espaciais. Quando o tempo acabar, eles voltarão carregados de gemas grátis para você gastar!
            </p>
          </div>

          <div className="grid-cols-2">
            {/* Left Card: Send Pet on Expedition */}
            <div className="cyber-card" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.65)', padding: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '16px' }}>
                🚀 Lançar Nova Expedição
              </h3>

              {petErrorMsg && <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', fontSize: '0.8rem', marginBottom: '12px' }}>{petErrorMsg}</div>}
              {petSuccessMsg && <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '0.8rem', marginBottom: '12px' }}>{petSuccessMsg}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Selecione o Pet:</label>
                  <select
                    value={expeditionPetId || ''}
                    onChange={(e) => { setExpeditionPetId(e.target.value || null); }}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Escolha um Pet --</option>
                    {pets
                      .filter(p => p.id !== gameState.equippedPetId && !(gameState.activeExpeditions || []).some(e => e.petId === p.id))
                      .map(p => {
                        const emoji = getPetEvolutionEmoji(PET_TYPES.find(x => x.id === p.petTypeId)?.emoji || '🐾', p.level);
                        return (
                          <option key={p.id} value={p.id}>{emoji} {p.nickname} (Nvl {p.level})</option>
                        );
                      })
                    }
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Duração da Expedição:</label>
                  <div className="responsive-grid-3">
                    <button
                      className="cyber-btn"
                      onClick={() => { setExpeditionDuration('short'); }}
                      style={{
                        padding: '8px',
                        fontSize: '0.8rem',
                        background: expeditionDuration === 'short' ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.3)',
                        borderColor: expeditionDuration === 'short' ? '#22c55e' : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      Curta ⚡<br />
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>30 seg (+15 💎)</span>
                    </button>
                    <button
                      className="cyber-btn"
                      onClick={() => { setExpeditionDuration('medium'); }}
                      style={{
                        padding: '8px',
                        fontSize: '0.8rem',
                        background: expeditionDuration === 'medium' ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.3)',
                        borderColor: expeditionDuration === 'medium' ? '#22c55e' : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      Média 🛰️<br />
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>30 min (+100 💎)</span>
                    </button>
                    <button
                      className="cyber-btn"
                      onClick={() => { setExpeditionDuration('long'); }}
                      style={{
                        padding: '8px',
                        fontSize: '0.8rem',
                        background: expeditionDuration === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.3)',
                        borderColor: expeditionDuration === 'long' ? '#22c55e' : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      Longa 🚀<br />
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>2 horas (+300 💎)</span>
                    </button>
                  </div>
                </div>

                <button
                  className="cyber-btn"
                  onClick={handleStartExpedition}
                  disabled={!expeditionPetId}
                  style={{ width: '100%', padding: '12px', marginTop: '10px', background: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e', color: '#fff', fontSize: '0.9rem', opacity: expeditionPetId ? 1 : 0.5 }}
                >
                  🚀 Lançar ao Espaço
                </button>
              </div>
            </div>

            {/* Right Card: Active Expeditions List */}
            <div className="cyber-card" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.65)', padding: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '16px' }}>
                🛰️ Expedições Ativas / Concluídas
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {(gameState.activeExpeditions || []).length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                    Nenhuma expedição ativa. Escolha um pet e lance-o em órbita!
                  </p>
                ) : (
                  (gameState.activeExpeditions || []).map(exp => {
                    const pet = pets.find(p => p.id === exp.petId);
                    if (!pet) return null;
                    const pt = PET_TYPES.find(p => p.id === pet.petTypeId);
                    const timeLeftSec = calculateTimeLeftSec(exp.endTime, tick);
                    const isFinished = timeLeftSec <= 0;
                    
                    return (
                      <div key={exp.petId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '2rem' }}>{getPetEvolutionEmoji(pt?.emoji || '🐾', pet.level)}</span>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{pet.nickname}</div>
                            <div style={{ fontSize: '0.7rem', color: isFinished ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
                              {isFinished ? 'Pronto para retorno!' : `Tempo restante: ${Math.floor(timeLeftSec / 60)}m ${timeLeftSec % 60}s`}
                            </div>
                          </div>
                        </div>

                        {isFinished ? (
                          <button
                            className="cyber-btn animate-pulse"
                            onClick={() => handleCollectExpedition(exp.petId)}
                            style={{ padding: '6px 12px', fontSize: '0.75rem', height: '32px', background: 'rgba(34, 197, 94, 0.2)', borderColor: '#22c55e', color: '#fff', fontWeight: 'bold' }}
                          >
                            Resgatar +{exp.rewardGems} 💎
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                            Em Órbita ⏳
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid-cols-2">
        
        {/* Left Side: Eggs */}
        {activeTab === 'hatch' && (
          <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              Ovos Disponíveis
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Standard Egg */}
              <div
                className="cyber-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderColor: 'rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="animate-float" style={{ fontSize: '3rem' }}>🥚</span>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Ovo Comum</h3>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                      Chances: Comum (70%) | Raro (20%) | Épico (9%) | Lendário (1%)
                    </p>
                  </div>
                </div>
                <button
                  className="cyber-btn cyber-btn-cyan"
                  onClick={() => { handleHatch('standard'); }}
                  style={{ padding: '12px 20px', minWidth: '120px' }}
                >
                  Hachar<br />💎 {EGG_COSTS.standard}
                </button>
              </div>

              {/* Golden Egg */}
              <div
                className="cyber-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderColor: 'rgba(234, 179, 8, 0.3)',
                  background: 'rgba(234, 179, 8, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="animate-float" style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 10px var(--neon-yellow))' }}>✨🥚✨</span>
                  <div>
                    <h3 className="text-glow-yellow" style={{ fontSize: '1.2rem', color: 'var(--neon-yellow)' }}>Ovo Lendário</h3>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                      Chances: Raro (40%) | Épico (45%) | Lendário (15%)
                    </p>
                  </div>
                </div>
                <button
                  className="cyber-btn"
                  onClick={() => { handleHatch('golden'); }}
                  style={{
                    padding: '12px 20px',
                    minWidth: '120px',
                    borderColor: 'var(--neon-yellow)',
                    background: 'rgba(234, 179, 8, 0.1)',
                  }}
                >
                  Hachar<br />💎 {EGG_COSTS.golden}
                </button>
              </div>
              
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 255, 204, 0.05)',
                border: '1px solid rgba(0, 255, 204, 0.15)',
                marginTop: '10px',
              }}
            >
              <div style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Suas Gemas Disponíveis:</span>
                <span className="text-glow-cyan" style={{ fontWeight: 800, color: 'var(--neon-cyan)' }}>
                  💎 {gameState.gems} Gemas
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Left Side: Fusion Panel */}
        {activeTab === 'fusion' && (
          <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderColor: 'var(--neon-purple)' }}>
            <h2 className="text-glow-purple" style={{ fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', color: 'var(--neon-purple)' }}>
              🧬 Laboratório de Fusão Cósmica
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.3rem' }}>
              Una a essência de <strong>dois pets idênticos de Nível 1</strong> para evoluí-los para o <strong>Nível 2 ★</strong>!
              O pet fundido receberá o dobro do bônus de status original!
            </p>

            {fusionSuccessMsg && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22c55e',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {fusionSuccessMsg}
              </div>
            )}

            {/* Selection Slots Row */}
            <div className="responsive-fusion-grid">
              
              {/* Slot 1 */}
              <div
                className="cyber-card"
                onClick={() => { setSelectedPet1Id(null); }}
                style={{
                  height: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: selectedPet1Id ? 'pointer' : 'default',
                  background: selectedPet1Id ? 'rgba(168, 85, 247, 0.05)' : 'rgba(15, 23, 42, 0.4)',
                  borderColor: selectedPet1Id ? 'var(--neon-purple)' : 'rgba(255,255,255,0.08)',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                {selectedPet1Id ? (
                  (() => {
                    const pet = pets.find(p => p.id === selectedPet1Id);
                    const pt = PET_TYPES.find(p => p.id === pet?.petTypeId);
                    return (
                      <>
                        <span style={{ fontSize: '2.5rem' }}>{getPetEvolutionEmoji(pt?.emoji || '🐾', pet?.level || 1)}</span>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', marginTop: '6px' }}>{pet?.nickname}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>Clique para remover</div>
                      </>
                    );
                  })()
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                    <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '4px' }}>➕</span>
                    Selecione Pet 1<br />(No painel ao lado)
                  </div>
                )}
              </div>

              {/* Fusion Sign */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: 'var(--neon-purple)' }}>
                🧬
              </div>

              {/* Slot 2 */}
              <div
                className="cyber-card"
                onClick={() => { setSelectedPet2Id(null); }}
                style={{
                  height: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: selectedPet2Id ? 'pointer' : 'default',
                  background: selectedPet2Id ? 'rgba(168, 85, 247, 0.05)' : 'rgba(15, 23, 42, 0.4)',
                  borderColor: selectedPet2Id ? 'var(--neon-purple)' : 'rgba(255,255,255,0.08)',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                {selectedPet2Id ? (
                  (() => {
                    const pet = pets.find(p => p.id === selectedPet2Id);
                    const pt = PET_TYPES.find(p => p.id === pet?.petTypeId);
                    return (
                      <>
                        <span style={{ fontSize: '2.5rem' }}>{getPetEvolutionEmoji(pt?.emoji || '🐾', pet?.level || 1)}</span>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', marginTop: '6px' }}>{pet?.nickname}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>Clique para remover</div>
                      </>
                    );
                  })()
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                    <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '4px' }}>➕</span>
                    Selecione Pet 2<br />(No painel ao lado)
                  </div>
                )}
              </div>

            </div>

            {/* Fusion Rules & Evolution Preview */}
            {(() => {
              if (selectedPet1Id && selectedPet2Id) {
                const pet1 = pets.find(p => p.id === selectedPet1Id);
                const pet2 = pets.find(p => p.id === selectedPet2Id);
                if (pet1 && pet2) {
                  if (pet1.level !== pet2.level) {
                    return (
                      <div style={{ color: 'var(--neon-pink)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
                        ⚠️ Ops! Os pets selecionados precisam estar no mesmo Nível.
                      </div>
                    );
                  }

                  if (pet1.level >= 6) {
                    return (
                      <div style={{ color: 'var(--neon-pink)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
                        ⚠️ Ops! Este pet já está no nível máximo (Nível 6).
                      </div>
                    );
                  }
                  
                  const nextLvl = pet1.level + 1;
                  
                  // Mock a temporary evolved pet object to preview its buff description
                  const evolvedPetMock: Pet = {
                    ...pet1,
                    level: nextLvl,
                    buffValue: pet1.buffValue // Not strictly needed for composite text but fits structure
                  };
                  
                  const originalBonus = getBuffDescription(pet1);
                  const evolvedBonus = getBuffDescription(evolvedPetMock);
                  
                  const baseName = pet1.nickname.split(' ★')[0];
                  const currentStars = '★'.repeat(pet1.level - 1);
                  const nextStars = '★'.repeat(nextLvl - 1);
                  
                  return (
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--neon-cyan)', textTransform: 'uppercase', marginBottom: '6px', textAlign: 'center' }}>
                        Visualização da Evolução
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{baseName} {currentStars}</strong>
                          <div style={{ color: 'rgba(255,255,255,0.5)' }}>Lvl {pet1.level} ({originalBonus})</div>
                        </div>
                        <div style={{ fontSize: '1.2rem' }}>➔</div>
                        <div>
                          <strong style={{ color: 'var(--neon-yellow)' }}>{baseName} {nextStars}</strong>
                          <div style={{ color: 'var(--neon-yellow)' }}>Lvl {nextLvl} ({evolvedBonus})</div>
                        </div>
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}

            <button
              className="cyber-btn"
              disabled={!selectedPet1Id || !selectedPet2Id || (pets.find(p => p.id === selectedPet1Id)?.petTypeId !== pets.find(p => p.id === selectedPet2Id)?.petTypeId)}
              onClick={handleFusion}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 800,
                borderColor: 'var(--neon-purple)',
                background: 'rgba(168, 85, 247, 0.2)',
                opacity: (selectedPet1Id && selectedPet2Id && pets.find(p => p.id === selectedPet1Id)?.petTypeId === pets.find(p => p.id === selectedPet2Id)?.petTypeId) ? 1 : 0.5,
              }}
            >
              💥 REALIZAR FUSÃO EVOLUTIVA! 💥
            </button>
          </div>
        )}

        {/* Left Side: Trading Panel */}
        {activeTab === 'trade' && (
          <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderColor: 'var(--neon-cyan)', maxHeight: '600px', overflowY: 'auto' }}>
            <h2 className="text-glow-cyan" style={{ fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', color: 'var(--neon-cyan)' }}>
              🌌 Mercado Cósmico de Pets
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.3rem' }}>
              Troque pets com outros estudantes e com NPCs em tempo real! Escolha um pet de sua mochila, defina o que deseja em troca, e crie seu anúncio!
            </p>

            {tradeSuccessMsg && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
                {tradeSuccessMsg}
              </div>
            )}

            {tradeErrorMsg && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
                {tradeErrorMsg}
              </div>
            )}

            {/* Posting Form */}
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: '#fff' }}>📢 Criar Anúncio de Venda</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                    1. Escolha o Pet que quer oferecer (Nível 1):
                  </label>
                  <select
                    value={selectedOfferPetId || ''}
                    onChange={(e) => { setSelectedOfferPetId(e.target.value || null); }}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  >
                    <option value="">-- Selecione um pet --</option>
                    {pets.filter(p => p.level === 1).map(p => {
                      const pt = PET_TYPES.find(pt => pt.id === p.petTypeId);
                      return (
                        <option key={p.id} value={p.id}>
                          {pt?.emoji} {p.nickname} (Nível 1)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                      2. Receber em Troca:
                    </label>
                    <select
                      value={tradeRequestedType}
                      onChange={(e) => { setTradeRequestedType(e.target.value as 'gems' | 'pet'); }}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                    >
                      <option value="gems">💎 Gemas</option>
                      <option value="pet">🐾 Outro Pet</option>
                    </select>
                  </div>

                  <div style={{ flex: 1.5 }}>
                    {tradeRequestedType === 'gems' ? (
                      <>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                          Preço em Gemas:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={tradeRequestedAmount}
                          onChange={(e) => { setTradeRequestedAmount(Number(e.target.value)); }}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                        />
                      </>
                    ) : (
                      <>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                          Espécie de Pet Desejada:
                        </label>
                        <select
                          value={tradeRequestedPetTypeId}
                          onChange={(e) => { setTradeRequestedPetTypeId(e.target.value); }}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                        >
                          {PET_TYPES.map(pt => (
                            <option key={pt.id} value={pt.id}>
                              {pt.emoji} {pt.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>

                <button
                  className="cyber-btn"
                  onClick={handlePostTrade}
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 800, borderColor: 'var(--neon-cyan)', background: 'rgba(0, 255, 204, 0.1)' }}
                >
                  🚀 Publicar no Mercado
                </button>
              </div>
            </div>

            {/* Listings List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', color: '#fff' }}>
                🛒 Ofertas Ativas ({tradeListings.length})
              </h3>
              
              {tradeListings.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Nenhuma oferta ativa no momento. Crie o seu anúncio!
                </div>
              ) : (
                tradeListings.map(listing => {
                  const isOwnListing = listing.posterId === userId;
                  const reqPetType = PET_TYPES.find(p => p.id === listing.requestedPetTypeId);
                  
                  // Verification for button disabled
                  let canAccept = !isOwnListing;
                  let requirementsText = '';
                  
                  if (listing.requestedType === 'gems') {
                    requirementsText = `${listing.requestedAmount} 💎`;
                    if (gameState.gems < listing.requestedAmount) {
                      canAccept = false;
                    }
                  } else {
                    requirementsText = `${reqPetType?.emoji} ${reqPetType?.name}`;
                    const eligiblePets = pets.filter(p => p.petTypeId === listing.requestedPetTypeId && p.level === 1);
                    if (eligiblePets.length === 0) {
                      canAccept = false;
                    }
                  }

                  return (
                    <div
                      key={listing.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: isOwnListing ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                        background: isOwnListing ? 'rgba(168, 85, 247, 0.03)' : 'rgba(15, 23, 42, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                          Vendedor: <strong style={{ color: isOwnListing ? 'var(--neon-purple)' : 'var(--neon-cyan)' }}>{listing.posterUsername}</strong>
                          {listing.posterId.includes('npc') && ' (NPC)'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(listing.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.8rem' }}>{listing.offeredPetEmoji}</span>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{listing.offeredPetName}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)' }}>Nível 1</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.65)' }}>➔</div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)' }}>Quer em troca:</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: listing.requestedType === 'gems' ? 'var(--neon-yellow)' : 'var(--neon-cyan)' }}>
                            {listing.requestedType === 'gems' ? '💎 ' : ''}{requirementsText}
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        {isOwnListing ? (
                          <button
                            className="cyber-btn cyber-btn-pink"
                            onClick={() => { handleCancelTrade(listing.id); }}
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            ❌ Cancelar Anúncio
                          </button>
                        ) : (
                          <button
                            className="cyber-btn"
                            disabled={!canAccept}
                            onClick={() => { handleAcceptTrade(listing.id); }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              borderColor: canAccept ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
                              background: canAccept ? 'rgba(0, 255, 204, 0.15)' : 'rgba(255,255,255,0.05)',
                              color: canAccept ? '#fff' : 'rgba(255,255,255,0.3)',
                              cursor: canAccept ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {canAccept ? '🤝 Aceitar Troca' : '⚠️ Requisitos insuficientes'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Side: Inventory */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '16px' }}>
            Seus Pets ({pets.length})
          </h2>

          {/* New Filters UI Block */}
          {pets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', minWidth: '60px' }}>Raridade:</span>
                <select
                  value={filterRarity}
                  onChange={(e) => { setFilterRarity(e.target.value); }}
                  style={{
                    flex: 1,
                    background: '#030712',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', minWidth: '60px' }}>Elemento:</span>
                <select
                  value={filterElement}
                  onChange={(e) => { setFilterElement(e.target.value); }}
                  style={{
                    flex: 1,
                    background: '#030712',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="fire">Fogo 🔥</option>
                  <option value="electric">Raio ⚡</option>
                  <option value="ice">Gelo ❄️</option>
                  <option value="cosmic">Cósmico 🌌</option>
                  <option value="none">Nenhum</option>
                </select>
              </div>
            </div>
          )}

          {pets.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.65)', padding: '40px' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎒</span>
              <p style={{ fontStyle: 'italic' }}>Sua mochila de pets está vazia.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Gaste suas Gemas Matemáticas para abrir um ovo!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {pets
                .filter(pet => {
                  if (filterRarity !== 'all' && pet.rarity !== filterRarity) return false;
                  if (filterElement !== 'all') {
                    const petElem = getPetElement(pet.nickname);
                    if (filterElement !== petElem) return false;
                  }
                  return true;
                })
                .map(pet => {
                const isEquipped = gameState.equippedPetId === pet.id;
                const petType = PET_TYPES.find(p => p.id === pet.petTypeId);
                const rarityColor = getRarityColor(pet.rarity);

                return (
                  <div
                    key={pet.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: isEquipped ? 'rgba(0, 255, 204, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                      border: isEquipped ? '1.5px solid var(--neon-cyan)' : '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span
                        className={isEquipped ? 'animate-float' : ''}
                        style={{ fontSize: '2.2rem', display: 'inline-block' }}
                      >
                        {getPetEvolutionEmoji(petType?.emoji || '🐶', pet.level)}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                            {pet.nickname}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: pet.level === 2 ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.5)', fontWeight: 800 }}>
                            Lvl {pet.level}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: rarityColor + '20',
                              color: rarityColor,
                              border: `1px solid ${rarityColor}40`,
                            }}
                          >
                            {pet.rarity}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                          Buff: {getBuffDescription(pet)}
                        </div>
                      </div>
                    </div>

                    {activeTab === 'trade' ? (
                      pet.level > 1 ? (
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', alignSelf: 'center' }}>
                          Evoluído Não Negociável
                        </span>
                      ) : (
                        <button
                          className="cyber-btn"
                          onClick={() => {
                            audioEngine.playCorrect();
                            setSelectedOfferPetId(selectedOfferPetId === pet.id ? null : pet.id);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            borderColor: selectedOfferPetId === pet.id ? 'var(--neon-cyan)' : 'rgba(0, 255, 204, 0.4)',
                            background: selectedOfferPetId === pet.id ? 'rgba(0, 255, 204, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                          }}
                        >
                          {selectedOfferPetId === pet.id ? 'Selecionado' : 'Oferecer Pet'}
                        </button>
                      )
                    ) : activeTab === 'fusion' ? (
                      pet.level >= 6 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--neon-yellow)', fontWeight: 800, alignSelf: 'center' }}>
                          ★ MÁXIMO
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="cyber-btn"
                            disabled={selectedPet2Id === pet.id}
                            onClick={() => {
                              audioEngine.playHatchRoll();
                              setSelectedPet1Id(selectedPet1Id === pet.id ? null : pet.id);
                            }}
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.75rem',
                              borderWidth: selectedPet1Id === pet.id ? '2px' : '1px',
                              borderColor: selectedPet1Id === pet.id ? 'var(--neon-purple)' : 'rgba(0, 255, 204, 0.4)',
                              background: selectedPet1Id === pet.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 255, 204, 0.1)',
                            }}
                          >
                            Slot 1
                          </button>
                          <button
                            className="cyber-btn"
                            disabled={selectedPet1Id === pet.id}
                            onClick={() => {
                              audioEngine.playHatchRoll();
                              setSelectedPet2Id(selectedPet2Id === pet.id ? null : pet.id);
                            }}
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.75rem',
                              borderWidth: selectedPet2Id === pet.id ? '2px' : '1px',
                              borderColor: selectedPet2Id === pet.id ? 'var(--neon-purple)' : 'rgba(244, 63, 94, 0.4)',
                              background: selectedPet2Id === pet.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(244, 63, 94, 0.1)',
                            }}
                          >
                            Slot 2
                          </button>
                        </div>
                      )
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className={`cyber-btn ${isEquipped ? 'cyber-btn-pink' : 'cyber-btn-cyan'}`}
                          onClick={() => handleEquip(pet.id)}
                          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        >
                          {isEquipped ? 'Desequipar' : 'Equipar'}
                        </button>
                        <button
                          onClick={() => handleRelease(pet.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--neon-pink)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: '0 8px',
                          }}
                        >
                          Libertar 💸
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Hatch Overlay / Modal Animation */}
      {isHatching && (
        <div
          className={hatchStage === 'shaking' ? 'screen-shake-anim' : ''}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.95)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <style>{`
            @keyframes cyber-hatch-shake {
              0% { transform: translate(0, 0) rotate(0deg) scale(1); filter: drop-shadow(0 0 5px rgba(251, 113, 133, 0.5)); }
              10% { transform: translate(-4px, -2px) rotate(-3deg) scale(1.05); filter: drop-shadow(0 0 15px rgba(251, 113, 133, 0.8)); }
              20% { transform: translate(3px, 2px) rotate(4deg); }
              30% { transform: translate(-5px, 0px) rotate(-4deg); }
              40% { transform: translate(4px, -1px) rotate(3deg) scale(1.1); filter: drop-shadow(0 0 25px rgba(234, 179, 8, 0.9)); }
              50% { transform: translate(-3px, 2px) rotate(-3deg); }
              60% { transform: translate(4px, 1px) rotate(4deg); }
              70% { transform: translate(-4px, -2px) rotate(-4deg) scale(1.15); }
              80% { transform: translate(3px, 2px) rotate(3deg); }
              90% { transform: translate(-2px, -1px) rotate(-2deg); }
              100% { transform: translate(0, 0) rotate(0deg) scale(1.2); filter: drop-shadow(0 0 40px rgba(234, 179, 8, 1)); }
            }

            @keyframes cyber-hatch-glow {
              0% { transform: rotate(0deg) scale(1.2); filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.6)); }
              50% { transform: rotate(180deg) scale(1.4); filter: drop-shadow(0 0 50px rgba(236, 72, 153, 1)); }
              100% { transform: rotate(360deg) scale(1.6); filter: drop-shadow(0 0 80px rgba(253, 224, 71, 1)); }
            }

            @keyframes cyber-reveal-burst {
              0% { transform: scale(0.1) rotate(-45deg); opacity: 0; filter: brightness(3) blur(10px); }
              50% { transform: scale(1.3) rotate(10deg); opacity: 0.9; filter: brightness(1.5) blur(0px); }
              75% { transform: scale(0.9) rotate(-5deg); opacity: 1; }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }

            @keyframes screen-shake-severe {
              0%, 100% { transform: translate(0, 0); }
              10% { transform: translate(-4px, -4px); }
              20% { transform: translate(4px, 3px); }
              30% { transform: translate(-4px, 4px); }
              40% { transform: translate(3px, -3px); }
              50% { transform: translate(-4px, 3px); }
              60% { transform: translate(4px, -3px); }
              70% { transform: translate(-3px, 4px); }
              80% { transform: translate(3px, -4px); }
              90% { transform: translate(-4px, 3px); }
            }

            @keyframes particle-drift {
              0% { transform: translate(0, 0) scale(1); opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
            }

            .screen-shake-anim {
              animation: screen-shake-severe 0.25s infinite;
            }

            .cyber-hatch-shake-class {
              animation: cyber-hatch-shake 0.35s infinite;
            }

            .cyber-hatch-glow-class {
              animation: cyber-hatch-glow 1.2s infinite linear;
            }

            .cyber-reveal-burst-class {
              animation: cyber-reveal-burst 0.75s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }

            .confetti-particle {
              position: absolute;
              animation: particle-drift 1.8s ease-out forwards;
              font-size: 1.5rem;
              pointer-events: none;
            }
          `}</style>

          <div
            className="cyber-card"
            style={{
              width: '90%',
              maxWidth: '450px',
              textAlign: 'center',
              padding: '40px 30px',
              border: hatchStage === 'shaking' ? '2px solid var(--neon-pink)' : hatchStage === 'spinning' ? '2px solid var(--neon-purple)' : '2px solid var(--neon-yellow)',
              boxShadow: hatchStage === 'shaking' ? '0 0 35px rgba(244, 63, 94, 0.3)' : hatchStage === 'spinning' ? '0 0 35px rgba(168, 85, 247, 0.3)' : '0 0 35px rgba(234, 179, 8, 0.4)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {hatchStage === 'shaking' && (
              <div>
                <h2 className="text-glow-pink" style={{ color: 'var(--neon-pink)', fontSize: '1.8rem', marginBottom: '24px' }}>
                  Comprando Ovo Matemático...
                </h2>
                <div
                  className="cyber-hatch-shake-class"
                  style={{
                    fontSize: '6rem',
                    margin: '30px 0',
                    display: 'inline-block',
                  }}
                >
                  {getEggEmoji(eggTypeSelected)}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Prepare-se! O ovo está prestes a quebrar...</p>
              </div>
            )}

            {hatchStage === 'spinning' && (
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
                    animation: 'pulse-ring 1.5s infinite alternate',
                    zIndex: 0
                  }}
                />
                <h2 className="text-glow-purple" style={{ color: 'var(--neon-purple)', fontSize: '1.8rem', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                  Rachando o Ovo...
                </h2>
                <div
                  className="cyber-hatch-glow-class"
                  style={{
                    fontSize: '6rem',
                    margin: '30px 0',
                    display: 'inline-block',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  {spinEmoji}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)', position: 'relative', zIndex: 1 }}>Calculando probabilidade cósmica...</p>
              </div>
            )}

            {hatchStage === 'revealed' && hatchedPet && (
              <div style={{ position: 'relative' }}>
                {/* Emitter of emoji sparks / confetti */}
                {Array.from({ length: 15 }).map((_, i) => {
                  const tx = (Math.random() - 0.5) * 260 + 'px';
                  const ty = -100 - Math.random() * 120 + 'px';
                  const delay = Math.random() * 0.4 + 's';
                  const emojis = ['✨', '⭐', '🎉', '💥', '🌟', '🍭', '💖'];
                  const randomEmoji = emojis[i % emojis.length];
                  return (
                    <span
                      key={i}
                      className="confetti-particle"
                      style={{
                        left: '50%',
                        top: '40%',
                        animationDelay: delay,
                        '--tx': tx,
                        '--ty': ty,
                      } as React.CSSProperties}
                    >
                      {randomEmoji}
                    </span>
                  );
                })}

                <h2
                  className="text-glow-yellow"
                  style={{
                    color: getRarityColor(hatchedPet.rarity),
                    fontSize: '2rem',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                  }}
                >
                  ¡PET DESBLOQUEADO!
                </h2>
                
                <div style={{ fontSize: '7rem', margin: '20px 0' }} className="cyber-reveal-burst-class">
                  {PET_TYPES.find(p => p.id === hatchedPet.petTypeId)?.emoji}
                </div>

                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    backgroundColor: getRarityColor(hatchedPet.rarity) + '20',
                    color: getRarityColor(hatchedPet.rarity),
                    border: `1.5px solid ${getRarityColor(hatchedPet.rarity)}40`,
                    marginBottom: '16px',
                  }}
                >
                  {hatchedPet.rarity}
                </div>

                <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#fff' }}>
                  {hatchedPet.nickname}
                </h3>
                
                <p style={{ color: 'var(--neon-cyan)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '24px' }}>
                  Bônus: {getBuffDescription(hatchedPet)}
                </p>

                {/* Nickname modification */}
                <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'rgba(255,255,255,0.7)' }}>
                    Dê um apelido personalizado para o seu pet:
                  </label>
                  <input
                    type="text"
                    value={petNicknameInput}
                    onChange={(e) => { setPetNicknameInput(e.target.value); }}
                    placeholder="Apelido do pet"
                    maxLength={15}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      backgroundColor: '#0b0f19',
                      color: '#fff',
                      fontSize: '1rem',
                      textAlign: 'center',
                    }}
                  />
                </div>

                <button
                  className="cyber-btn"
                  onClick={saveNickname}
                  style={{
                    padding: '12px 30px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    width: '100%',
                  }}
                >
                  Salvar e Equipar Pet ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Level Up Overlay */}
      {levelUpMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.95)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="cyber-card"
            style={{
              width: '90%',
              maxWidth: '450px',
              textAlign: 'center',
              padding: '40px 30px',
              border: '2px solid var(--neon-green)',
              boxShadow: '0 0 35px rgba(34, 197, 94, 0.4)',
            }}
          >
            <h2 className="text-glow-green" style={{ color: 'var(--neon-green)', fontSize: '2rem', marginBottom: '10px', textTransform: 'uppercase' }}>
              💥 EVOLUÇÃO COMPLETA! 💥
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', marginBottom: '20px' }}>
              Seu pet alcançou um novo patamar de poder matemático!
            </p>
            
            <div style={{ fontSize: '7.5rem', margin: '20px 0' }} className="animate-float">
              {levelUpMessage.emoji}
            </div>

            <h3 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '6px' }}>
              {levelUpMessage.name}
            </h3>
            <p style={{ color: 'var(--neon-yellow)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '30px' }}>
              NÍVEL ATUAL: {levelUpMessage.level}
            </p>

            <button
              className="cyber-btn"
              onClick={() => { setLevelUpMessage(null); }}
              style={{
                padding: '12px 30px',
                fontSize: '1rem',
                fontWeight: 800,
                width: '100%',
                background: 'rgba(34, 197, 94, 0.15)',
                borderColor: 'var(--neon-green)'
              }}
            >
              Continuar Treino ➔
            </button>
          </div>
        </div>
      )}
      {/* Accessibility screen reader announcements */}
      <div aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>
        {screenReaderAnnouncement}
      </div>
    </div>
  );
};
