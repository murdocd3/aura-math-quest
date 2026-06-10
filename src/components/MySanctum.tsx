import React, { useState, useEffect } from 'react';
import type { User, GameState } from '../services/mockDb';
import { mockDb, PET_TYPES } from '../services/mockDb';
import { audioEngine } from './AudioEngine';

interface MySanctumProps {
  playerUser: User;
  gameState: GameState;
  onStateUpdate: (state: GameState) => void;
  onBack: () => void;
}

interface SanctumItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  x: number; // percentage left (20-80)
  y: number; // percentage top (30-70)
  purchased: boolean;
  placed: boolean;
}

export const MySanctum: React.FC<MySanctumProps> = ({
  playerUser,
  gameState,
  onStateUpdate,
  onBack
}) => {
  const [items, setItems] = useState<SanctumItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SanctumItem | null>(null);

  // Shop catalog
  const catalog: Omit<SanctumItem, 'x' | 'y' | 'placed' | 'purchased'>[] = [
    { id: 'chair', name: 'Cadeira Ciber-Gamer', emoji: '💺', cost: 15 },
    { id: 'table', name: 'Mesa de Holograma', emoji: '🎛️', cost: 25 },
    { id: 'trophy', name: 'Troféu dos Deuses', emoji: '🏆', cost: 40 },
    { id: 'neon', name: 'Painel LED Ciber', emoji: '🏮', cost: 20 },
    { id: 'console', name: 'Super Ciber-Console', emoji: '🎮', cost: 30 },
  ];

  useEffect(() => {
    // Load purchased and placed items from localStorage
    const saved = localStorage.getItem(`amq_santuario_items_${playerUser.id}`);
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      // Default initial states
      const defaultItems: SanctumItem[] = catalog.map(item => ({
        ...item,
        x: 50,
        y: 60,
        purchased: false,
        placed: false,
      }));
      setItems(defaultItems);
    }
  }, [playerUser.id]);

  const saveItems = (updatedItems: SanctumItem[]) => {
    setItems(updatedItems);
    localStorage.setItem(`amq_santuario_items_${playerUser.id}`, JSON.stringify(updatedItems));
  };

  const handleBuy = (item: SanctumItem) => {
    if (gameState.gems < item.cost) {
      audioEngine.playError();
      alert('Gemas insuficientes para esta mobília!');
      return;
    }

    // Deduct gems and update state
    const nextGems = gameState.gems - item.cost;
    mockDb.updateGameState(playerUser.id, { gems: nextGems });
    
    // Fetch fresh state and update parent
    const fresh = mockDb.getGameState(playerUser.id);
    if (fresh) {
      onStateUpdate(fresh);
    }

    const updated = items.map(i => {
      if (i.id === item.id) {
        return { ...i, purchased: true, placed: true, x: 30 + Math.random() * 40, y: 45 + Math.random() * 15 };
      }
      return i;
    });

    saveItems(updated);
    audioEngine.playCorrect();
  };

  const handleTogglePlace = (item: SanctumItem) => {
    const updated = items.map(i => {
      if (i.id === item.id) {
        return { ...i, placed: !i.placed };
      }
      return i;
    });
    saveItems(updated);
    audioEngine.playCorrect();
  };

  // Basic drag simulations via simple grid movements to keep it cross-platform & pure HTML
  const moveItem = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedItem) return;
    const step = 5;
    const updated = items.map(i => {
      if (i.id === selectedItem.id) {
        let nextX = i.x;
        let nextY = i.y;
        if (dir === 'left') nextX = Math.max(15, i.x - step);
        if (dir === 'right') nextX = Math.min(85, i.x + step);
        if (dir === 'up') nextY = Math.max(30, i.y - step);
        if (dir === 'down') nextY = Math.min(75, i.y + step);
        const next = { ...i, x: nextX, y: nextY };
        setSelectedItem(next);
        return next;
      }
      return i;
    });
    saveItems(updated);
  };

  const getActivePetInfo = () => {
    if (!gameState.equippedPetId) return null;
    const pets = mockDb.getPets(playerUser.id);
    const equipped = pets.find(p => p.id === gameState.equippedPetId);
    if (!equipped) return null;
    const petType = PET_TYPES.find(pt => pt.id === equipped.petTypeId);
    return {
      emoji: petType?.emoji || '🐶',
      nickname: equipped.nickname,
      color: petType?.color || '#fff'
    };
  };

  const activePet = getActivePetInfo();

  return (
    <div style={{ padding: '20px', minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 className="text-glow-purple" style={{ fontSize: '2rem', color: 'var(--neon-purple)' }}>
            🏠 MEU CIBER-SANTUÁRIO
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Personalize seu quarto futurista e exiba suas conquistas!</p>
        </div>
        <button className="cyber-btn cyber-btn-pink" onClick={onBack} style={{ padding: '10px 20px' }}>
          ⬅ Retornar ao Hub
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '20px' }}>
        
        {/* Left: The Room Frame */}
        <div
          className="cyber-card"
          style={{
            height: '450px',
            position: 'relative',
            background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #030712 100%)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden',
          }}
        >
          {/* Cybernetic grid lines */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundImage: 'radial-gradient(var(--neon-purple) 0.5px, transparent 0.5px), radial-gradient(var(--neon-cyan) 0.5px, #030712 0.5px)',
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px',
              opacity: 0.12,
              pointerEvents: 'none',
            }}
          />

          {/* Room Base Floor Perspective Line */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              height: '120px',
              background: 'linear-gradient(to top, rgba(168, 85, 247, 0.08) 0%, transparent 100%)',
              borderTop: '1.5px solid rgba(168, 85, 247, 0.25)',
              pointerEvents: 'none',
            }}
          />

          {/* Render Placed Furniture */}
          {items.filter(i => i.purchased && i.placed).map(item => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                  audioEngine.playHatchRoll();
                }}
                style={{
                  position: 'absolute',
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: '3.5rem',
                  cursor: 'pointer',
                  filter: isSelected 
                    ? 'drop-shadow(0 0 12px var(--neon-yellow))' 
                    : 'drop-shadow(0 0 6px var(--neon-purple))',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                  zIndex: Math.round(item.y),
                }}
              >
                {item.emoji}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--neon-yellow)',
                    color: '#000',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 0 6px var(--neon-yellow)'
                  }}>
                    {item.name}
                  </div>
                )}
              </div>
            );
          })}

          {/* Render Active Equipped Pet walking */}
          {activePet && (
            <div
              className="animate-float"
              style={{
                position: 'absolute',
                left: '25%',
                bottom: '15px',
                fontSize: '3.2rem',
                filter: `drop-shadow(0 0 8px ${activePet.color})`,
                userSelect: 'none',
                zIndex: 80,
              }}
            >
              {activePet.emoji}
              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(15,23,42,0.85)',
                border: `1px solid ${activePet.color}`,
                color: '#fff',
                fontSize: '0.65rem',
                padding: '1px 5px',
                borderRadius: '3px',
                whiteSpace: 'nowrap'
              }}>
                🐾 {activePet.nickname}
              </div>
            </div>
          )}
        </div>

        {/* Right: Customization Panel / Shop */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Gems counter card */}
          <div className="cyber-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'var(--neon-cyan)', background: 'rgba(0, 255, 204, 0.05)' }}>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Minhas Gemas:</span>
            <span className="text-glow-cyan" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>
              💎 {gameState.gems}
            </span>
          </div>

          {/* Furniture Catalog Shop & Placer */}
          <div className="cyber-card" style={{ flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fff' }}>🛋️ Loja e Inventário</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.8rem' }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        {item.purchased ? 'Adquirido' : `Custo: 💎 ${item.cost}`}
                      </div>
                    </div>
                  </div>

                  {!item.purchased ? (
                    <button
                      className="cyber-btn cyber-btn-cyan"
                      onClick={() => handleBuy(item)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', height: '28px' }}
                    >
                      Comprar
                    </button>
                  ) : (
                    <button
                      className={`cyber-btn ${item.placed ? 'cyber-btn-pink' : ''}`}
                      onClick={() => handleTogglePlace(item)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', height: '28px' }}
                    >
                      {item.placed ? 'Guardar' : 'Posicionar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Item Movement controls when item is selected */}
      {selectedItem && selectedItem.placed && (
        <div className="cyber-card" style={{ marginTop: '20px', width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'var(--neon-yellow)', background: 'rgba(234, 179, 8, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>{selectedItem.emoji}</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Ajustar Posição: {selectedItem.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Use os botões para mover ou clique fora para desmarcar</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="cyber-btn" onClick={() => moveItem('left')} style={{ width: '40px', height: '40px', padding: 0 }}>◀</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button className="cyber-btn" onClick={() => moveItem('up')} style={{ width: '40px', height: '18px', padding: 0 }}>▲</button>
              <button className="cyber-btn" onClick={() => moveItem('down')} style={{ width: '40px', height: '18px', padding: 0 }}>▼</button>
            </div>
            <button className="cyber-btn" onClick={() => moveItem('right')} style={{ width: '40px', height: '40px', padding: 0 }}>▶</button>
            <button className="cyber-btn cyber-btn-pink" onClick={() => setSelectedItem(null)} style={{ padding: '0 12px', height: '40px', fontSize: '0.75rem' }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};
