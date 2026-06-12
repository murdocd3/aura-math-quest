import React from 'react';
import { COSMETIC_ITEMS, type User, type GameState } from '../services/mockDb';
import { backendService } from '../services/backendService';
import { audioEngine } from './AudioEngine';

interface HubShopProps {
  playerUser: User;
  gameState: GameState;
  onStateUpdate: (newState: GameState) => void;
  refreshLeaderboard: () => void;
}

export const HubShop: React.FC<HubShopProps> = ({
  playerUser,
  gameState,
  onStateUpdate,
  refreshLeaderboard
}) => {
  const handleBuyCosmetic = async (cosmeticId: string) => {
    try {
      const updated = await backendService.buyCosmetic(playerUser.id, cosmeticId);
      if (updated) {
        audioEngine.playHatchSuccess();
        onStateUpdate(updated);
        refreshLeaderboard();
      } else {
        audioEngine.playError();
        alert('Erro ao processar a compra do cosmético!');
      }
    } catch (err: any) {
      audioEngine.playError();
      alert('Erro na compra (Transação Segura RPC):\n' + (err.message || err));
    }
  };

  const handleEquipCosmetic = async (cosmeticId: string) => {
    audioEngine.playCorrect();
    const cosmetic = COSMETIC_ITEMS.find(c => c.id === cosmeticId);
    if (!cosmetic) return;
    
    const equipped = { ...(gameState.equippedCosmetics || {}) };
    
    if (equipped[cosmetic.category] === cosmeticId) {
      delete equipped[cosmetic.category];
    } else {
      equipped[cosmetic.category] = cosmeticId;
    }
    
    const updated = await backendService.updateGameState(playerUser.id, {
      equippedCosmetics: equipped
    });
    if (updated) {
      onStateUpdate(updated);
    }
  };

  const categoryNames: Record<string, string> = {
    weapon: '🗡️ Armas & Cetros',
    hat: '👑 Chapéus & Coroas',
    glasses: '🕶️ Óculos & Visores',
    cloak: '🧥 Capas & Asas',
    ring: '💍 Anéis Mágicos',
    title: '🏷️ Títulos Honoríficos',
  };

  return (
    <div className="cyber-card">
      <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#fff', textShadow: '0 0 10px rgba(0, 255, 204, 0.4)' }}>🎨 Loja de Personalização do Avatar</h3>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
        Equipe até um item de cada categoria simultaneamente para criar um avatar único e divertido!
      </p>
      
      {['hat', 'glasses', 'weapon', 'cloak', 'ring', 'title'].map(cat => {
        const itemsInCat = COSMETIC_ITEMS.filter(item => item.category === cat);
        if (itemsInCat.length === 0) return null;
        
        return (
          <div key={cat} style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '1.05rem', color: 'var(--neon-cyan)', marginBottom: '12px', borderBottom: '1px solid rgba(0, 255, 204, 0.2)', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {categoryNames[cat] || cat}
            </h4>
            <div className="grid-cols-2">
              {itemsInCat.map(item => {
                const purchased = gameState.purchasedCosmetics || [];
                const isOwned = purchased.includes(item.id);
                const isEquipped = gameState.equippedCosmetics && gameState.equippedCosmetics[item.category] === item.id;

                return (
                  <div
                    key={item.id}
                    className="cyber-card"
                    style={{
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: isEquipped ? '1.5px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.08)',
                      background: isEquipped ? 'rgba(0,255,204,0.05)' : 'rgba(15,23,42,0.3)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '2rem' }}>{item.emoji}</span>
                        {isOwned && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', background: 'rgba(0,255,204,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            POSSUÍDO
                          </span>
                        )}
                      </div>
                      <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>{item.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px', minHeight: '36px' }}>
                        {item.description}
                      </p>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      {isOwned ? (
                        <button
                          className={`cyber-btn ${isEquipped ? 'cyber-btn-pink' : 'cyber-btn-cyan'}`}
                          onClick={() => handleEquipCosmetic(item.id)}
                          style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
                        >
                          {isEquipped ? 'Desequipar' : 'Equipar'}
                        </button>
                      ) : (
                        <button
                          className="cyber-btn"
                          disabled={gameState.gems < item.cost}
                          onClick={() => handleBuyCosmetic(item.id)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '0.8rem',
                            opacity: gameState.gems >= item.cost ? 1 : 0.5,
                            borderColor: 'var(--neon-yellow)',
                          }}
                        >
                          Comprar: 💎 {item.cost}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
