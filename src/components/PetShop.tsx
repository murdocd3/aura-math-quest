import React, { useState, useEffect } from 'react';
import { mockDb, PET_TYPES } from '../services/mockDb';
import type { Pet, GameState, TradeListing } from '../services/mockDb';
import { audioEngine } from './AudioEngine';

interface PetShopProps {
  userId: string;
  gameState: GameState;
  onStateUpdate: (newState: GameState) => void;
  onBack: () => void;
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
  const [activeTab, setActiveTab] = useState<'hatch' | 'fusion' | 'trade' | 'album'>('hatch');
  const [selectedPet1Id, setSelectedPet1Id] = useState<string | null>(null);
  const [selectedPet2Id, setSelectedPet2Id] = useState<string | null>(null);
  const [fusionSuccessMsg, setFusionSuccessMsg] = useState<string | null>(null);

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
        setTimeout(() => setTradeErrorMsg(null), 4000);
        return;
      }
    } else {
      const eligiblePets = pets.filter(p => p.petTypeId === listing.requestedPetTypeId && p.level === 1);
      if (eligiblePets.length === 0) {
        audioEngine.playError();
        const petTypeName = PET_TYPES.find(pt => pt.id === listing.requestedPetTypeId)?.name || 'pet';
        setTradeErrorMsg(`Você não possui um pet do tipo "${petTypeName}" no Nível 1 para oferecer!`);
        setTimeout(() => setTradeErrorMsg(null), 4000);
        return;
      }
    }

    const updatedState = mockDb.acceptTrade(userId, listingId);
    if (updatedState) {
      audioEngine.playHatchSuccess();
      setTradeSuccessMsg('Troca realizada com sucesso! Novo pet adicionado à mochila.');
      onStateUpdate(updatedState);
      loadPets();
      setTimeout(() => setTradeSuccessMsg(null), 4000);
    } else {
      audioEngine.playError();
      setTradeErrorMsg('Erro ao aceitar troca. Verifique seus requisitos.');
      setTimeout(() => setTradeErrorMsg(null), 4000);
    }
  };

  const handlePostTrade = () => {
    if (!selectedOfferPetId) {
      audioEngine.playError();
      setTradeErrorMsg('Selecione um pet de sua mochila para oferecer!');
      setTimeout(() => setTradeErrorMsg(null), 4000);
      return;
    }

    const petToOffer = pets.find(p => p.id === selectedOfferPetId);
    if (!petToOffer) return;

    if (petToOffer.level !== 1) {
      audioEngine.playError();
      setTradeErrorMsg('Apenas pets de Nível 1 podem ser anunciados!');
      setTimeout(() => setTradeErrorMsg(null), 4000);
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
      setTimeout(() => setTradeSuccessMsg(null), 4000);
    } else {
      audioEngine.playError();
      setTradeErrorMsg('Erro ao publicar o anúncio. Tente novamente.');
      setTimeout(() => setTradeErrorMsg(null), 4000);
    }
  };

  const handleCancelTrade = (listingId: string) => {
    const trades = JSON.parse(localStorage.getItem('amq_trades') || '[]');
    const listing = trades.find((t: any) => t.id === listingId);
    if (!listing) return;

    if (listing.posterId !== userId) return;

    let petTypeId = 'robot_pup';
    if (listing.offeredPetName.includes('Slime')) petTypeId = 'slime_buddy';
    else if (listing.offeredPetName.includes('Phoenix') || listing.offeredPetName.includes('Fenix')) petTypeId = 'phoenix_chick';
    else if (listing.offeredPetName.includes('Dragon') || listing.offeredPetName.includes('Draco')) petTypeId = 'dragon_kid';

    mockDb.createPet(userId, petTypeId, listing.offeredPetName);

    const cleanTrades = trades.filter((t: any) => t.id !== listingId);
    localStorage.setItem('amq_trades', JSON.stringify(cleanTrades));

    audioEngine.playCorrect();
    setTradeSuccessMsg('Anúncio cancelado e pet retornado à mochila!');
    loadPets();
    setTimeout(() => setTradeSuccessMsg(null), 4000);
  };

  const handleFusion = () => {
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

    const updatedState = mockDb.fusePets(userId, selectedPet1Id, selectedPet2Id);
    if (updatedState) {
      audioEngine.playHatchSuccess();
      const nextLvl = pet1.level + 1;
      const stars = '★'.repeat(nextLvl - 1);
      setFusionSuccessMsg(`Fusão Completa! Seu pet "${pet1.nickname}" evoluiu para o Nível ${nextLvl} ${stars}!`);
      setSelectedPet1Id(null);
      setSelectedPet2Id(null);
      onStateUpdate(updatedState);
      loadPets();
      setTimeout(() => setFusionSuccessMsg(null), 5000);
    } else {
      audioEngine.playError();
      alert('Erro ao realizar a fusão dos pets. Verifique as regras.');
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
    const updatedState = mockDb.updateGameState(userId, {
      gems: gameState.gems - cost,
    });
    if (updatedState) {
      onStateUpdate(updatedState);
    }

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

    // Determine Rarity & Pet Type based on probabilities
    const random = Math.random() * 100;
    let selectedPetTypeId = 'robot_pup'; // default

    if (type === 'standard') {
      // Standard: 70% Common, 20% Rare, 9% Epic, 1% Legendary
      if (random < 1) selectedPetTypeId = 'dragon_kid';
      else if (random < 10) selectedPetTypeId = 'phoenix_chick';
      else if (random < 30) selectedPetTypeId = 'slime_buddy';
      else selectedPetTypeId = 'robot_pup';
    } else {
      // Golden: 40% Rare, 45% Epic, 15% Legendary (0% Common)
      if (random < 15) selectedPetTypeId = 'dragon_kid';
      else if (random < 60) selectedPetTypeId = 'phoenix_chick';
      else selectedPetTypeId = 'slime_buddy';
    }

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
      setPetNicknameInput(createdPet.nickname);
      setHatchStage('revealed');
      loadPets();
    }
  };

  const saveNickname = () => {
    if (!hatchedPet) return;
    const allPets = mockDb.getPets(userId);
    const index = allPets.findIndex(p => p.id === hatchedPet.id);
    if (index !== -1) {
      allPets[index].nickname = petNicknameInput.trim() || hatchedPet.nickname;
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

  const handleEquip = (petId: string) => {
    audioEngine.playCorrect();
    // If selecting currently equipped, unequip it
    const nextEquipId = gameState.equippedPetId === petId ? null : petId;
    const success = mockDb.equipPet(userId, nextEquipId);
    if (success) {
      const state = mockDb.getGameState(userId);
      if (state) {
        onStateUpdate(state);
      }
    }
  };

  const handleRelease = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;

    if (window.confirm(`Quer libertar o seu pet "${pet.nickname}"? Você receberá 3 Gemas de Matemática em troca.`)) {
      audioEngine.playCorrect();
      
      // If equipped, unequip first
      if (gameState.equippedPetId === petId) {
        mockDb.equipPet(userId, null);
      }

      mockDb.deletePet(petId);
      
      // Add 3 gems
      const updatedState = mockDb.updateGameState(userId, {
        gems: gameState.gems + 3,
      });
      
      if (updatedState) {
        onStateUpdate(updatedState);
      }
      loadPets();
    }
  };

  const getBuffDescription = (pet: Pet | typeof PET_TYPES[0]) => {
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

      {/* Tabs Selector: Gacha vs Fusion */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('hatch'); }}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'hatch' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'hatch' ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'hatch' ? '#fff' : 'rgba(255,255,255,0.7)',
          }}
        >
          🥚 Chocar Ovos Gacha
        </button>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('fusion'); }}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'fusion' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'fusion' ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'fusion' ? '#fff' : 'rgba(255,255,255,0.7)',
          }}
        >
          🧬 Fusão de Pets (Evolução)
        </button>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('trade'); }}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'trade' ? 'rgba(0, 255, 204, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'trade' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'trade' ? '#fff' : 'rgba(255,255,255,0.7)',
          }}
        >
          🌌 Trocas Cósmicas (Mercado)
        </button>
        <button
          className="cyber-btn"
          onClick={() => { audioEngine.playHatchRoll(); setActiveTab('album'); }}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'album' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(15,23,42,0.6)',
            borderColor: activeTab === 'album' ? 'var(--neon-pink)' : 'rgba(255,255,255,0.1)',
            color: activeTab === 'album' ? '#fff' : 'rgba(255,255,255,0.7)',
          }}
        >
          📖 Álbum de Figurinhas
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
                    {hasUnlocked ? (pt.buffType === 'time_bonus' ? `+${pt.buffValue}s Tempo` : `+${Math.round((pt.buffValue - 1) * 100)}% Bonus`) : 'Bloqueado'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
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
                  onClick={() => handleHatch('standard')}
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
                  onClick={() => handleHatch('golden')}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', alignItems: 'center', gap: '12px', margin: '10px 0' }}>
              
              {/* Slot 1 */}
              <div
                className="cyber-card"
                onClick={() => setSelectedPet1Id(null)}
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
                        <span style={{ fontSize: '2.5rem' }}>{pt?.emoji}</span>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', marginTop: '6px' }}>{pet?.nickname}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Clique para remover</div>
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
                onClick={() => setSelectedPet2Id(null)}
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
                        <span style={{ fontSize: '2.5rem' }}>{pt?.emoji}</span>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', marginTop: '6px' }}>{pet?.nickname}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Clique para remover</div>
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
                  
                  const baseType = PET_TYPES.find(pt => pt.id === pet1.petTypeId);
                  const baseBuffVal = baseType ? baseType.buffValue : pet1.buffValue;
                  const nextLvl = pet1.level + 1;
                  
                  let nextBuffVal = pet1.buffValue;
                  if (pet1.buffType === 'time_bonus') {
                    nextBuffVal = baseBuffVal * nextLvl;
                  } else {
                    const increment = baseBuffVal - 1;
                    nextBuffVal = 1 + (increment * nextLvl);
                  }
                  
                  const originalBonus = pet1.buffType === 'time_bonus' ? `+${pet1.buffValue}s Tempo` : `+${Math.round((pet1.buffValue - 1) * 100)}%`;
                  const evolvedBonus = pet1.buffType === 'time_bonus' ? `+${nextBuffVal}s Tempo` : `+${Math.round((nextBuffVal - 1) * 100)}%`;
                  
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
                    onChange={(e) => setSelectedOfferPetId(e.target.value || null)}
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
                      onChange={(e) => setTradeRequestedType(e.target.value as 'gems' | 'pet')}
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
                          onChange={(e) => setTradeRequestedAmount(Number(e.target.value))}
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
                          onChange={(e) => setTradeRequestedPetTypeId(e.target.value)}
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
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.85rem' }}>
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
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Nível 1</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.4)' }}>➔</div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Quer em troca:</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: listing.requestedType === 'gems' ? 'var(--neon-yellow)' : 'var(--neon-cyan)' }}>
                            {listing.requestedType === 'gems' ? '💎 ' : ''}{requirementsText}
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        {isOwnListing ? (
                          <button
                            className="cyber-btn cyber-btn-pink"
                            onClick={() => handleCancelTrade(listing.id)}
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            ❌ Cancelar Anúncio
                          </button>
                        ) : (
                          <button
                            className="cyber-btn"
                            disabled={!canAccept}
                            onClick={() => handleAcceptTrade(listing.id)}
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

          {pets.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎒</span>
              <p style={{ fontStyle: 'italic' }}>Sua mochila de pets está vazia.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Gaste suas Gemas Matemáticas para abrir um ovo!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {pets.map(pet => {
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
                        {petType?.emoji || '🐶'}
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
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', alignSelf: 'center' }}>
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
          <div
            className="cyber-card"
            style={{
              width: '90%',
              maxWidth: '450px',
              textAlign: 'center',
              padding: '40px 30px',
              border: '2px solid var(--neon-cyan)',
              boxShadow: '0 0 35px rgba(0, 255, 204, 0.2)',
            }}
          >
            {hatchStage === 'shaking' && (
              <div>
                <h2 className="text-glow-cyan" style={{ color: 'var(--neon-cyan)', fontSize: '1.8rem', marginBottom: '24px' }}>
                  Comprando Ovo Matemático...
                </h2>
                <div
                  className="animate-float"
                  style={{
                    fontSize: '6rem',
                    margin: '30px 0',
                    display: 'inline-block',
                    animationDuration: '0.4s',
                  }}
                >
                  {getEggEmoji(eggTypeSelected)}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Prepare-se! O ovo está prestes a quebrar...</p>
              </div>
            )}

            {hatchStage === 'spinning' && (
              <div>
                <h2 className="text-glow-purple" style={{ color: 'var(--neon-purple)', fontSize: '1.8rem', marginBottom: '24px' }}>
                  Rachando o Ovo...
                </h2>
                <div
                  style={{
                    fontSize: '6rem',
                    margin: '30px 0',
                    display: 'inline-block',
                    animation: 'pulse-ring 0.3s infinite alternate',
                  }}
                >
                  {spinEmoji}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Calculando probabilidade cósmica...</p>
              </div>
            )}

            {hatchStage === 'revealed' && hatchedPet && (
              <div>
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
                
                <div style={{ fontSize: '7rem', margin: '20px 0' }} className="animate-float">
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
                    onChange={(e) => setPetNicknameInput(e.target.value)}
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
    </div>
  );
};
