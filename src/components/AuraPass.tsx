import React from 'react';
import { backendService } from '../services/backendService';
import type { GameState } from '../services/mockDb';
import { audioEngine } from './AudioEngine';

interface AuraPassProps {
  userId: string;
  gameState: GameState;
  onStateUpdate: (newState: GameState) => void;
  onNavigateToRunner?: () => void;
  onNavigateToOlympics?: () => void;
  onNavigateToSanctum?: () => void;
  onSelectZone?: (zone: 'forest' | 'volcano' | 'unified') => void;
}

interface PassTier {
  tier: number;
  xpRequired: number;
  freeReward: { name: string; icon: string; claim: (userId: string) => Promise<GameState | null> };
  premiumReward: { name: string; icon: string; claim: (userId: string) => Promise<GameState | null> };
}

// 10 tiers, 100 XP per tier
export const PASS_TIERS: PassTier[] = [
  {
    tier: 1,
    xpRequired: 0,
    freeReward: {
      name: "15 Gemas",
      icon: "💎",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 15 });
        return null;
      }
    },
    premiumReward: {
      name: "30 Gemas Extras",
      icon: "💎",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 30 });
        return null;
      }
    }
  },
  {
    tier: 2,
    xpRequired: 100,
    freeReward: {
      name: "Aura Ciano",
      icon: "🎨",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const auras = Array.from(new Set([...(state.activeAuras || []), '#00ffcc']));
          return await backendService.updateGameState(userId, { activeAuras: auras });
        }
        return null;
      }
    },
    premiumReward: {
      name: "Visual Óculos Retro",
      icon: "🕶️",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const items = Array.from(new Set([...(state.purchasedCosmetics || []), 'retro_shades']));
          return await backendService.updateGameState(userId, { purchasedCosmetics: items });
        }
        return null;
      }
    }
  },
  {
    tier: 3,
    xpRequired: 200,
    freeReward: {
      name: "50 XP de Aura",
      icon: "⚡",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { auraXp: state.auraXp + 50 });
        return null;
      }
    },
    premiumReward: {
      name: "150 XP de Aura",
      icon: "⚡",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { auraXp: state.auraXp + 150 });
        return null;
      }
    }
  },
  {
    tier: 4,
    xpRequired: 300,
    freeReward: {
      name: "Ovo Raro 🥚",
      icon: "🥚",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 15 });
        return null;
      }
    },
    premiumReward: {
      name: "Pet Kitten 🐱",
      icon: "🐱",
      claim: async (userId) => {
        await backendService.createPet(userId, 'neon_kitten', 'Cyber Gatinho');
        return await backendService.getGameState(userId);
      }
    }
  },
  {
    tier: 5,
    xpRequired: 400,
    freeReward: {
      name: "Aura Dourada",
      icon: "🎨",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const auras = Array.from(new Set([...(state.activeAuras || []), '#eab308']));
          return await backendService.updateGameState(userId, { activeAuras: auras });
        }
        return null;
      }
    },
    premiumReward: {
      name: "Mago Neon",
      icon: "🧙‍♂️",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const items = Array.from(new Set([...(state.purchasedCosmetics || []), 'neon_hat']));
          return await backendService.updateGameState(userId, { purchasedCosmetics: items });
        }
        return null;
      }
    }
  },
  {
    tier: 6,
    xpRequired: 500,
    freeReward: {
      name: "25 Gemas",
      icon: "💎",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 25 });
        return null;
      }
    },
    premiumReward: {
      name: "50 Gemas Extras",
      icon: "💎",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 50 });
        return null;
      }
    }
  },
  {
    tier: 7,
    xpRequired: 600,
    freeReward: {
      name: "Título: [👾 CIBER]",
      icon: "🏷️",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const items = Array.from(new Set([...(state.purchasedCosmetics || []), 'title_ciber']));
          return await backendService.updateGameState(userId, { purchasedCosmetics: items });
        }
        return null;
      }
    },
    premiumReward: {
      name: "Coroa Glitch",
      icon: "👑",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const items = Array.from(new Set([...(state.purchasedCosmetics || []), 'glitch_crown']));
          return await backendService.updateGameState(userId, { purchasedCosmetics: items });
        }
        return null;
      }
    }
  },
  {
    tier: 8,
    xpRequired: 700,
    freeReward: {
      name: "Ovo Lendário 🥚",
      icon: "🥚",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 40 });
        return null;
      }
    },
    premiumReward: {
      name: "Varinha Cyber",
      icon: "🪄",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const items = Array.from(new Set([...(state.purchasedCosmetics || []), 'cyber_wand']));
          return await backendService.updateGameState(userId, { purchasedCosmetics: items });
        }
        return null;
      }
    }
  },
  {
    tier: 9,
    xpRequired: 800,
    freeReward: {
      name: "Aura Rosa",
      icon: "🎨",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const auras = Array.from(new Set([...(state.activeAuras || []), '#ec4899']));
          return await backendService.updateGameState(userId, { activeAuras: auras });
        }
        return null;
      }
    },
    premiumReward: {
      name: "100 Gemas Extras",
      icon: "💎",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 100 });
        return null;
      }
    }
  },
  {
    tier: 10,
    xpRequired: 900,
    freeReward: {
      name: "Título: [👑 MESTRE]",
      icon: "🏷️",
      claim: async (userId) => {
        const state = await backendService.getGameState(userId);
        if (state) {
          const items = Array.from(new Set([...(state.purchasedCosmetics || []), 'title_mestre']));
          return await backendService.updateGameState(userId, { purchasedCosmetics: items });
        }
        return null;
      }
    },
    premiumReward: {
      name: "Fênix Cyber",
      icon: "🐦",
      claim: async (userId) => {
        await backendService.createPet(userId, 'cyber_phoenix', 'Fênix Cibernética');
        return await backendService.getGameState(userId);
      }
    }
  }
];

export const AuraPass: React.FC<AuraPassProps> = ({
  userId,
  gameState,
  onStateUpdate,
  onNavigateToRunner,
  onNavigateToOlympics,
  onNavigateToSanctum,
  onSelectZone,
}) => {
  const currentXp = gameState.auraPassXp || 0;
  const isPremiumUnlocked = gameState.hasElitePass || false;
  const claimedTiers = gameState.claimedPassTiers || [];

  const quests = [
    { id: 'q1', desc: 'Resolver 10 multiplicações seguidas', xpReward: 50, action: 'Tabuadas', target: 'forest' },
    { id: 'q2', desc: 'Vencer 2 Batalhas PvP na Arena', xpReward: 40, action: 'Ir para Arena', target: 'sanctum' },
    { id: 'q3', desc: 'Correr 500m no Cyber Runner', xpReward: 30, action: 'Ir Correr', target: 'runner' },
    { id: 'q4', desc: 'Desafiar a Olimpíada dos Deuses', xpReward: 45, action: 'Olimpíadas', target: 'olympics' },
  ];

  const handleQuestSimulate = async (xpReward: number) => {
    audioEngine.playHatchSuccess();
    const updated = await backendService.updateGameState(userId, {
      auraPassXp: currentXp + xpReward,
    });
    if (updated) {
      onStateUpdate(updated);
    }
  };

  const handleBuyPremium = async () => {
    if (gameState.gems < 50) {
      audioEngine.playError();
      alert("Você precisa de 50 Gemas de Matemática para desbloquear o Passe Elite!");
      return;
    }

    audioEngine.playLevelUp();
    const updated = await backendService.updateGameState(userId, {
      gems: gameState.gems - 50,
      hasElitePass: true,
    });
    if (updated) {
      onStateUpdate(updated);
      alert("🔥 PASSE ELITE DESBLOQUEADO! Você agora tem acesso aos prêmios premium de todas as fases!");
    }
  };

  const handleClaim = async (tier: number, isPremium: boolean) => {
    const claimId = isPremium ? tier * 100 : tier;
    if (claimedTiers.includes(claimId)) return;

    const config = PASS_TIERS.find(pt => pt.tier === tier);
    if (!config) return;

    // Check if player has enough XP
    if (currentXp < config.xpRequired) {
      audioEngine.playError();
      alert("Você ainda não possui XP de Passe suficiente para resgatar este nível!");
      return;
    }

    if (isPremium && !isPremiumUnlocked) {
      audioEngine.playError();
      alert("Ative o Passe Elite para resgatar os prêmios da linha inferior!");
      return;
    }

    audioEngine.playHatchSuccess();

    // Trigger state change via reward claim lambda
    const newState = await (isPremium ? config.premiumReward.claim(userId) : config.freeReward.claim(userId));
    if (newState) {
      const nextClaimed = [...claimedTiers, claimId];
      const finalState = await backendService.updateGameState(userId, {
        claimedPassTiers: nextClaimed
      });
      if (finalState) {
        onStateUpdate(finalState);
      }
    }
  };

  const executeQuestShortcut = (target: string) => {
    audioEngine.playCorrect();
    if (target === 'forest' && onSelectZone) {
      onSelectZone('forest');
    } else if (target === 'sanctum' && onNavigateToSanctum) {
      onNavigateToSanctum();
    } else if (target === 'runner' && onNavigateToRunner) {
      onNavigateToRunner();
    } else if (target === 'olympics' && onNavigateToOlympics) {
      onNavigateToOlympics();
    }
  };

  return (
    <div className="cyber-card" style={{ 
      borderColor: 'var(--neon-purple)', 
      boxShadow: '0 0 25px rgba(168,85,247,0.2)',
      padding: '24px',
      overflow: 'hidden'
    }}>
      {/* Title Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.1) 50%, rgba(0, 255, 204, 0.05) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        marginBottom: '24px',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--neon-purple)',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '2px 12px',
          borderRadius: '20px',
          boxShadow: '0 0 10px rgba(168,85,247,0.5)',
          letterSpacing: '1px'
        }}>
          TEMPORADA 1
        </div>
        <h3 style={{ fontSize: '1.6rem', marginBottom: '8px', color: '#fff', fontWeight: 800, textShadow: '0 0 10px rgba(168,85,247,0.4)' }}>
          🌌 Passe de Aura Sazonal
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', maxWidth: '500px', margin: '0 auto' }}>
          Acumule XP resolvendo missões matemáticas e desbloqueie visuais de aura exclusivos, moedas e pets lendários!
        </p>
      </div>

      {/* Progress & Elite Pass Purchase Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.2fr 0.8fr', 
        gap: '20px', 
        alignItems: 'center',
        background: 'rgba(15,23,42,0.6)', 
        padding: '20px', 
        borderRadius: '12px', 
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>
              Nível do Passe: <span style={{ color: 'var(--neon-purple)', textShadow: '0 0 8px rgba(168,85,247,0.3)' }}>{Math.floor(currentXp / 100) + 1}</span>
            </span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
              {currentXp} XP Acumulados
            </span>
          </div>
          <div style={{ width: '100%', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <div style={{ width: `${Math.min(100, currentXp % 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-purple), var(--neon-pink))', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
            Falta {100 - (currentXp % 100)} XP para alcançar o próximo nível
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {isPremiumUnlocked ? (
            <div style={{ 
              background: 'rgba(250,204,21,0.1)', 
              border: '2px solid var(--neon-yellow)', 
              color: 'var(--neon-yellow)', 
              padding: '12px 24px', 
              borderRadius: '8px', 
              fontSize: '0.9rem', 
              fontWeight: 800,
              textShadow: '0 0 6px rgba(234,179,8,0.3)',
              boxShadow: '0 0 15px rgba(234,179,8,0.1)'
            }}>
              ⭐ PASSE ELITE ATIVO
            </div>
          ) : (
            <button 
              className="cyber-btn" 
              onClick={handleBuyPremium} 
              style={{ 
                borderColor: 'var(--neon-yellow)', 
                background: 'rgba(250,204,21,0.05)', 
                padding: '12px 24px', 
                fontSize: '0.9rem', 
                fontWeight: 800,
                color: 'var(--neon-yellow)',
                boxShadow: '0 0 15px rgba(234,179,8,0.15)'
              }}
            >
              ⭐ Ativar Passe Elite (50 💎)
            </button>
          )}
        </div>
      </div>

      {/* Grid Track Rewards - Fortnite Parallel Design */}
      <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '16px', fontWeight: 600 }}>
        🎁 Trilha de Recompensas do Passe
      </h4>

      {/* Overflow Container preventing grid breaks */}
      <div style={{ 
        width: '100%', 
        minWidth: 0,
        overflowX: 'auto', 
        paddingBottom: '20px', 
        marginBottom: '24px',
        background: 'rgba(15,23,42,0.3)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.03)'
      }}>
        {/* The timeline flex grid structure */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', width: 'max-content' }}>
          
          {/* Row 1: Free Track */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'end' }}>
            {PASS_TIERS.map((tier) => {
              const reached = currentXp >= tier.xpRequired;
              const claimed = claimedTiers.includes(tier.tier);
              return (
                <div 
                  key={`free-${tier.tier}`} 
                  style={{
                    width: '150px',
                    height: '110px',
                    background: claimed ? 'rgba(34,197,94,0.05)' : reached ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${claimed ? '#22c55e' : reached ? 'var(--neon-purple)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    opacity: reached ? 1 : 0.6,
                    transform: reached && !claimed ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', display: 'block' }}>GRÁTIS</span>
                    <strong style={{ fontSize: '0.75rem', color: '#fff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {tier.freeReward.name}
                    </strong>
                  </div>
                  <div style={{ fontSize: '1.8rem', textAlign: 'center', margin: '4px 0' }}>{tier.freeReward.icon}</div>
                  <button
                    className="cyber-btn"
                    disabled={!reached || claimed}
                    onClick={() => handleClaim(tier.tier, false)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      fontSize: '0.65rem',
                      borderColor: claimed ? '#22c55e' : reached ? 'var(--neon-purple)' : 'rgba(255,255,255,0.2)',
                      background: claimed ? 'rgba(34,197,94,0.15)' : 'transparent',
                      color: claimed ? '#22c55e' : '#fff'
                    }}
                  >
                    {claimed ? 'Resgatado ✓' : reached ? 'Resgatar' : 'Bloqueado'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Row 2: Level timeline bar */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', margin: '8px 0', position: 'relative' }}>
            {/* Timeline connector bar */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '0',
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, var(--neon-purple) 0%, rgba(255,255,255,0.08) 100%)',
              zIndex: 1,
              transform: 'translateY(-50%)'
            }} />
            
            {PASS_TIERS.map((tier) => {
              const reached = currentXp >= tier.xpRequired;
              return (
                <div 
                  key={`lvl-${tier.tier}`} 
                  style={{
                    width: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: 2,
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: reached ? 'var(--neon-purple)' : '#1e293b',
                    border: `2px solid ${reached ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: reached ? '0 0 10px var(--neon-purple)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 800
                  }}>
                    {tier.tier}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 3: Premium Track */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
            {PASS_TIERS.map((tier) => {
              const reached = currentXp >= tier.xpRequired;
              const claimed = claimedTiers.includes(tier.tier * 100);
              return (
                <div 
                  key={`premium-${tier.tier}`} 
                  style={{
                    width: '150px',
                    height: '110px',
                    background: claimed ? 'rgba(34,197,94,0.05)' : reached && isPremiumUnlocked ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${claimed ? '#22c55e' : reached && isPremiumUnlocked ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    opacity: reached ? 1 : 0.6,
                    transform: reached && isPremiumUnlocked && !claimed ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--neon-yellow)', display: 'block', fontWeight: 800 }}>ELITE PREMIUM</span>
                    <strong style={{ fontSize: '0.75rem', color: '#fff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {tier.premiumReward.name}
                    </strong>
                  </div>
                  <div style={{ fontSize: '1.8rem', textAlign: 'center', margin: '4px 0' }}>{tier.premiumReward.icon}</div>
                  <button
                    className="cyber-btn"
                    disabled={!reached || claimed || !isPremiumUnlocked}
                    onClick={() => handleClaim(tier.tier, true)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      fontSize: '0.65rem',
                      borderColor: claimed ? '#22c55e' : reached && isPremiumUnlocked ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.2)',
                      background: claimed ? 'rgba(34,197,94,0.15)' : 'transparent',
                      color: claimed ? '#22c55e' : !isPremiumUnlocked ? 'rgba(255,255,255,0.4)' : '#fff'
                    }}
                  >
                    {claimed ? 'Resgatado ✓' : !isPremiumUnlocked ? '🔒 Ativar' : reached ? 'Resgatar' : 'Bloqueado'}
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Quests Section for local testing */}
      <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '12px', fontWeight: 600 }}>
        🎯 Missões de Passe (Ganhar XP)
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {quests.map((q) => (
          <div
            key={q.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '14px 18px',
              borderRadius: '10px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{q.desc}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neon-purple)', fontWeight: 800 }}>
                +{q.xpReward} XP de Passe
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="cyber-btn"
                onClick={() => executeQuestShortcut(q.target)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  borderColor: 'rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                🎮 Jogar
              </button>
              
              <button
                className="cyber-btn"
                onClick={() => handleQuestSimulate(q.xpReward)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  borderColor: 'var(--neon-purple)',
                  background: 'rgba(168,85,247,0.05)'
                }}
              >
                ⚡ Simular Missão
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
