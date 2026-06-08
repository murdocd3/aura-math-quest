import React, { useState } from 'react';
import { backendService } from '../services/backendService';
import type { GameState } from '../services/mockDb';
import { audioEngine } from './AudioEngine';

interface AuraPassProps {
  userId: string;
  gameState: GameState;
  onStateUpdate: (newState: GameState) => void;
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
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 15 }); // 15 gems refund for Gacha egg
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
      name: "Aura Dourada (Gold)",
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
      name: "Mago Neon Cosmético",
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
      name: "Título: [CIBER]",
      icon: "🏷️",
      claim: async (userId) => {
        // Unlocks cosmetic label
        return await backendService.getGameState(userId);
      }
    },
    premiumReward: {
      name: "Coroa Glitch Recompensada",
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
        if (state) return await backendService.updateGameState(userId, { gems: state.gems + 40 }); // Legendary Egg refund
        return null;
      }
    },
    premiumReward: {
      name: "Varinha Cyber Especial",
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
      name: "Título: [MESTRE]",
      icon: "🏷️",
      claim: async (userId) => {
        return await backendService.getGameState(userId);
      }
    },
    premiumReward: {
      name: "Lendária Fênix Cibernética 🐦",
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
}) => {
  const currentXp = gameState.auraPassXp || 0;
  const isPremiumUnlocked = gameState.hasElitePass || false;
  const claimedTiers = gameState.claimedPassTiers || [];

  const [quests, setQuests] = useState([
    { id: 'q1', desc: 'Resolver 10 multiplicações seguidas', xpReward: 50, completed: false },
    { id: 'q2', desc: 'Vencer 2 Batalhas PvP na Arena', xpReward: 40, completed: false },
    { id: 'q3', desc: 'Correr 500m no Cyber Runner', xpReward: 30, completed: false },
  ]);

  const handleQuestSimulate = async (questId: string, xpReward: number) => {
    audioEngine.playHatchSuccess();
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, completed: true } : q));

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

  return (
    <div className="cyber-card" style={{ borderColor: '#a855f7', boxShadow: '0 0 15px rgba(168,85,247,0.1)' }}>
      <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#fff', textAlign: 'center' }}>🌌 Passe de Aura Sazonal (Temporada 1)</h3>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '20px' }}>
        Acumule XP de Passe resolvendo desafios matemáticos e resgate recompensas lendárias.
      </p>

      {/* Explanatory Banner */}
      <div style={{
        background: 'rgba(168, 85, 247, 0.08)',
        border: '1px dashed rgba(168, 85, 247, 0.3)',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '0.85rem',
        lineHeight: '1.45rem',
        textAlign: 'left'
      }}>
        <strong style={{ color: '#c084fc', display: 'block', fontSize: '0.9rem', marginBottom: '6px', textShadow: '0 0 6px rgba(168,85,247,0.4)' }}>
          🌌 Como Funciona o Passe de Aura?
        </strong>
        1. <strong>Ganhar XP de Passe:</strong> Conclua as Missões de Passe abaixo para subir de nível e acumular XP.
        <br />
        2. <strong>Fila de Recompensas:</strong> Conforme acumula XP, você alcança novos tiers. A linha superior é <strong>Grátis</strong> para todos; a linha inferior é <strong>Elite/Premium</strong> (desbloqueada com o Passe Elite).
        <br />
        3. <strong>Passe Elite:</strong> Custa 50 gemas de matemática e libera prêmios premium adicionais, como cosméticos lendários e gemas extras!
      </div>

      {/* Progress & Elite purchase */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '4px' }}>
            Nível Sazonal: <strong>{Math.floor(currentXp / 100) + 1}</strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
            Progresso Geral: {currentXp} XP (Próxima recompensa a cada 100 XP)
          </div>
          <div style={{ width: '220px', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: `${Math.min(100, currentXp % 100)}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #ec4899)' }} />
          </div>
        </div>

        <div>
          {isPremiumUnlocked ? (
            <div style={{ background: 'rgba(250,204,21,0.15)', border: '1.5px solid #facc15', color: '#facc15', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}>
              ⭐ PASSE ELITE ATIVO
            </div>
          ) : (
            <button className="cyber-btn" onClick={handleBuyPremium} style={{ borderColor: '#facc15', background: 'rgba(250,204,21,0.05)', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 800 }}>
              ⭐ Ativar Passe Elite (50 💎)
            </button>
          )}
        </div>
      </div>

      {/* Tiers Grid */}
      <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '16px' }}>🎁 Recompensas Disponíveis</h4>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '30px' }}>
        {PASS_TIERS.map((tier) => {
          const reached = currentXp >= tier.xpRequired;
          const freeClaimed = claimedTiers.includes(tier.tier);
          const premiumClaimed = claimedTiers.includes(tier.tier * 100);

          return (
            <div
              key={tier.tier}
              style={{
                flexShrink: 0,
                width: '180px',
                background: reached ? 'rgba(15,23,42,0.8)' : 'rgba(15,23,42,0.4)',
                border: `1.5px solid ${reached ? '#a855f7' : 'rgba(255,255,255,0.05)'}`,
                boxShadow: reached ? '0 0 10px rgba(168,85,247,0.1)' : 'none',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                opacity: reached ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 800 }}>NÍVEL {tier.tier}</span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{tier.xpRequired} XP</span>
              </div>

              {/* Free Track Reward Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Grátis:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{tier.freeReward.icon}</span>
                  <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{tier.freeReward.name}</span>
                </div>
                <button
                  className="cyber-btn"
                  disabled={!reached || freeClaimed}
                  onClick={() => handleClaim(tier.tier, false)}
                  style={{
                    width: '100%',
                    padding: '4px',
                    fontSize: '0.65rem',
                    marginTop: '8px',
                    borderColor: freeClaimed ? 'transparent' : '#a855f7',
                    background: freeClaimed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
                    color: freeClaimed ? '#22c55e' : '#fff'
                  }}
                >
                  {freeClaimed ? 'Resgatado ✓' : reached ? 'Resgatar' : '🔒 Bloqueado'}
                </button>
              </div>

              {/* Premium Track Reward Card */}
              <div style={{ background: 'rgba(250,204,21,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(250,204,21,0.1)' }}>
                <span style={{ fontSize: '0.7rem', color: '#facc15', display: 'block', marginBottom: '4px' }}>Elite Premium:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{tier.premiumReward.icon}</span>
                  <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{tier.premiumReward.name}</span>
                </div>
                <button
                  className="cyber-btn"
                  disabled={!reached || premiumClaimed || !isPremiumUnlocked}
                  onClick={() => handleClaim(tier.tier, true)}
                  style={{
                    width: '100%',
                    padding: '4px',
                    fontSize: '0.65rem',
                    marginTop: '8px',
                    borderColor: premiumClaimed ? 'transparent' : '#facc15',
                    background: premiumClaimed ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
                    color: premiumClaimed ? '#22c55e' : '#fff'
                  }}
                >
                  {premiumClaimed ? 'Resgatado ✓' : !isPremiumUnlocked ? '🔒 Ativar Elite' : reached ? 'Resgatar' : '🔒 Bloqueado'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quests Section for local testing */}
      <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px' }}>🎯 Desafios Semanais (Ganhos de Passe XP)</h4>
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
              padding: '12px 16px',
              borderRadius: '8px',
              opacity: q.completed ? 0.6 : 1
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{q.desc}</div>
              <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 700 }}>+{q.xpReward} XP de Passe</div>
            </div>
            <button
              className="cyber-btn"
              disabled={q.completed}
              onClick={() => handleQuestSimulate(q.id, q.xpReward)}
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                borderColor: q.completed ? 'rgba(255,255,255,0.1)' : '#a855f7'
              }}
            >
              {q.completed ? 'Concluída ✓' : 'Completar Missão'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
