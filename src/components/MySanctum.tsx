import React, { useState, useEffect, useRef } from 'react';
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
  x: number; // percentage left (5-95)
  y: number; // percentage top (20-90)
  purchased: boolean;
  placed: boolean;
}

// Dialogues dynamic responses for the pet when interacting or patrolling
const PET_THOUGHTS = [
  "Hmm... essa coordenada matemática parece promissora! 🌀",
  "Será que tem petiscos de tabuada por aqui? 🍖",
  "Seu Santuário está ficando incrível! ✨",
  "Estou pronto para a próxima aventura na Arena! ⚔️",
  "Você é o melhor mestre da matemática! 🧠",
  "BEEP BOOP! Sincronizando ondas de Aura! ⚡",
  "Adoro ver as luzes neon piscando! 🏮",
  "Que tal uma partida rápida de Cyber Runner? 🏃‍♂️",
  "Minha casinha tecnológica é tão aconchegante! 🚀",
  "Adoro tirar uma soneca perto da Janela de Neon! 🌌",
  "Uau, esse tapete holográfico faz cócegas nas patas! 👾",
  "A estante está cheia de hologramas de álgebra antiga! 📚"
];

const LIGHT_MODES = [
  { name: 'Roxo Glitch 🌌', primary: '#a855f7', radial: '#1e1b4b' },
  { name: 'Ciano Cyber 💎', primary: '#00ffcc', radial: '#022c22' },
  { name: 'Rosa Neon 🦩', primary: '#f43f5e', radial: '#311018' },
  { name: 'Dourado Divino 👑', primary: '#eab308', radial: '#2e1c02' },
];

export const MySanctum: React.FC<MySanctumProps> = ({
  playerUser,
  gameState,
  onStateUpdate,
  onBack
}) => {
  const [items, setItems] = useState<SanctumItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SanctumItem | null>(null);
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState('');
  
  // Interactive Customization states
  const [lightModeIdx, setLightModeIdx] = useState(0);
  const [isNeonOn, setIsNeonOn] = useState(true);
  const [toyActiveId, setToyActiveId] = useState<string | null>(null);

  // Pet autonomous behavior states
  const [petX, setPetX] = useState(25);
  const [petY, setPetY] = useState(70);
  const [petThought, setPetThought] = useState<string | null>("Saudações, Mestre! Adorei o Santuário!");
  const [petDirection, setPetDirection] = useState<'left' | 'right'>('right');

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const roomRef = useRef<HTMLDivElement>(null);

  // Shop catalog (Expanded to 12 items to support home features)
  const catalog: Omit<SanctumItem, 'x' | 'y' | 'placed' | 'purchased'>[] = [
    { id: 'chair', name: 'Cadeira Ciber-Gamer', emoji: '💺', cost: 15 },
    { id: 'table', name: 'Mesa de Holograma', emoji: '🎛️', cost: 25 },
    { id: 'bed', name: 'Cama de Levitação Criogênica', emoji: '🛌', cost: 35 },
    { id: 'plant', name: 'Orquídea Neon Fluorescente', emoji: '🌵', cost: 12 },
    { id: 'window', name: 'Janela com Projeção Estelar', emoji: '🖼️', cost: 30 },
    { id: 'rug', name: 'Tapete de Fibra Holográfica', emoji: '🪩', cost: 18 },
    { id: 'bookshelf', name: 'Estante de Dados Ópticos', emoji: '📚', cost: 28 },
    { id: 'lamp', name: 'Luminária de Plasma Quântico', emoji: '🔮', cost: 14 },
    { id: 'pethouse', name: 'Cápsula Pet-Santuário', emoji: '🚀', cost: 22 },
    { id: 'neon', name: 'Painel LED Ciber', emoji: '🏮', cost: 20 },
    { id: 'console', name: 'Super Ciber-Console', emoji: '🎮', cost: 30 },
    { id: 'trophy', name: 'Troféu dos Deuses', emoji: '🏆', cost: 40 },
  ];

  useEffect(() => {
    // Load purchased and placed items
    const saved = localStorage.getItem(`amq_santuario_items_${playerUser.id}`);
    if (saved) {
      const parsed: SanctumItem[] = JSON.parse(saved);
      // Merge with new catalog items in case they are missing in local storage
      const merged = catalog.map(catItem => {
        const existing = parsed.find(p => p.id === catItem.id);
        if (existing) return existing;
        return {
          ...catItem,
          x: 40 + Math.random() * 20,
          y: 50 + Math.random() * 20,
          purchased: false,
          placed: false
        };
      });
      setItems(merged);
    } else {
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

  // Pet movement / patrol tick
  useEffect(() => {
    const petMovementInterval = setInterval(() => {
      // Pet random decision: 60% chance to move slightly, 15% chance to think/speak
      const decision = Math.random();
      if (decision < 0.6) {
        // Move towards a random direction
        setPetX(prev => {
          const step = Math.floor(Math.random() * 12) - 6;
          const next = prev + step;
          if (next < 10) { setPetDirection('right'); return 12; }
          if (next > 90) { setPetDirection('left'); return 88; }
          if (step > 0) setPetDirection('right');
          if (step < 0) setPetDirection('left');
          return next;
        });
        setPetY(prev => {
          const step = Math.floor(Math.random() * 6) - 3;
          const next = prev + step;
          if (next < 55) return 58;
          if (next > 85) return 82;
          return next;
        });
      } else if (decision < 0.75) {
        // Say something cute!
        const randomThought = PET_THOUGHTS[Math.floor(Math.random() * PET_THOUGHTS.length)];
        setPetThought(randomThought);
        // Fade thought bubble after 4 seconds
        setTimeout(() => { setPetThought(null); }, 4000);
      }
    }, 4500);

    return () => { clearInterval(petMovementInterval); };
  }, []);

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

    const nextGems = gameState.gems - item.cost;
    mockDb.updateGameState(playerUser.id, { gems: nextGems });
    
    const fresh = mockDb.getGameState(playerUser.id);
    if (fresh) {
      onStateUpdate(fresh);
    }

    const updated = items.map(i => {
      if (i.id === item.id) {
        return { ...i, purchased: true, placed: true, x: 25 + Math.random() * 50, y: 55 + Math.random() * 20 };
      }
      return i;
    });

    saveItems(updated);
    setScreenReaderAnnouncement(`Móvel ${item.name} comprado e posicionado no santuário!`);
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
    setScreenReaderAnnouncement(`Móvel ${item.name} foi ${!item.placed ? 'posicionado no' : 'guardado do'} santuário.`);
    audioEngine.playCorrect();
  };

  // Drag handlers
  const handleDragStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedId(id);
    const item = items.find(i => i.id === id);
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !draggedId || !roomRef.current) return;

    // Get pointer coordinates relative to the room frame
    const rect = roomRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const xPos = clientX - rect.left;
    const yPos = clientY - rect.top;

    // Convert to percentages (restrained inside bounds)
    const xPct = Math.max(5, Math.min(95, Math.round((xPos / rect.width) * 100)));
    const yPct = Math.max(20, Math.min(88, Math.round((yPos / rect.height) * 100)));

    const updated = items.map(i => {
      if (i.id === draggedId) {
        return { ...i, x: xPct, y: yPct };
      }
      return i;
    });

    setItems(updated);
  };

  const handleDragEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedId(null);
      saveItems(items);
      audioEngine.playHatchRoll();
    }
  };

  // Keyboard navigation movement helper
  const moveItem = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedItem) return;
    const step = 4;
    const updated = items.map(i => {
      if (i.id === selectedItem.id) {
        let nextX = i.x;
        let nextY = i.y;
        if (dir === 'left') nextX = Math.max(5, i.x - step);
        if (dir === 'right') nextX = Math.min(95, i.x + step);
        if (dir === 'up') nextY = Math.max(20, i.y - step);
        if (dir === 'down') nextY = Math.min(88, i.y - step);
        const next = { ...i, x: nextX, y: nextY };
        setSelectedItem(next);
        return next;
      }
      return i;
    });
    saveItems(updated);
    setScreenReaderAnnouncement(`Móvel ${selectedItem.name} movido para ${dir === 'left' ? 'esquerda' : dir === 'right' ? 'direita' : dir === 'up' ? 'cima' : 'baixo'}.`);
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
  const activeLight = LIGHT_MODES[lightModeIdx];

  // Interact with objects click sfx & animation
  const handleItemInteract = (item: SanctumItem) => {
    audioEngine.playHatchSuccess();
    setToyActiveId(item.id);
    setTimeout(() => { setToyActiveId(null); }, 1200);

    // Dynamic reaction logic
    if (item.id === 'console') {
      setPetThought("Uau! Esse jogo de 8-bits parece super divertido! 🎮");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'trophy') {
      setPetThought("Glória eterna aos matemáticos! 🏆");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'chair') {
      setPetThought("Parece super confortável. Posso deitar? 💺");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'bed') {
      setPetThought("Que delícia de cama flutuante! Zzz... 🛌");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'plant') {
      setPetThought("Essa planta brilha no escuro! Que incrível! 🌵");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'window') {
      setPetThought("Olha as estrelas lá fora! O espaço é infinito... 🖼️");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'rug') {
      setPetThought("Esse tapete faz cócegas eletrônicas nas patinhas! 🪩");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'bookshelf') {
      setPetThought("Muitos gigabytes de pura sabedoria nessa estante! 📚");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'pethouse') {
      setPetThought("Meu próprio casulo espacial de recarga! Obrigado! 🚀");
      setTimeout(() => { setPetThought(null); }, 4000);
    } else if (item.id === 'lamp') {
      setPetThought("Essa lâmpada flutuante de plasma é hipnotizante... 🔮");
      setTimeout(() => { setPetThought(null); }, 4000);
    }
  };

  return (
    <div style={{ padding: '20px', minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Top Header */}
      <div className="sanctum-header">
        <div>
          <h1 className="text-glow-purple" style={{ fontSize: '2rem', color: 'var(--neon-purple)' }}>
            🏠 MEU CIBER-SANTUÁRIO
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
            Arraste os móveis com o mouse, interaja com itens e veja seu pet explorar o quarto!
          </p>
        </div>
        <button className="cyber-btn cyber-btn-pink" onClick={onBack} style={{ padding: '10px 20px' }}>
          ⬅ Retornar ao Hub
        </button>
      </div>

      <div className="sanctum-layout-grid" style={{ width: '100%', maxWidth: '950px' }}>
        
        {/* Left: Interactive Room Frame */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            ref={roomRef}
            onMouseMove={handleDragMove}
            onTouchMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onTouchEnd={handleDragEnd}
            className="cyber-card"
            style={{
              height: '460px',
              position: 'relative',
              background: isNeonOn 
                ? `radial-gradient(circle at 50% 40%, ${activeLight.radial} 0%, #030712 100%)` 
                : '#020205',
              border: isNeonOn 
                ? `2px solid ${activeLight.primary}` 
                : '2.5px solid rgba(255,255,255,0.1)',
              boxShadow: isNeonOn 
                ? `inset 0 0 50px rgba(0, 0, 0, 0.9), 0 0 20px ${activeLight.primary}25` 
                : 'inset 0 0 50px rgba(0, 0, 0, 0.95)',
              overflow: 'hidden',
              userSelect: 'none',
              transition: 'all 0.5s ease',
            }}
          >
            {/* Cybernetic grid lines */}
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundImage: `radial-gradient(${isNeonOn ? activeLight.primary : 'rgba(255,255,255,0.05)'} 0.5px, transparent 0.5px)`,
                backgroundSize: '25px 25px',
                opacity: isNeonOn ? 0.15 : 0.04,
                pointerEvents: 'none',
              }}
            />

            {/* Room Base Floor Perspective Line */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: '130px',
                background: isNeonOn 
                  ? `linear-gradient(to top, ${activeLight.primary}12 0%, transparent 100%)` 
                  : 'transparent',
                borderTop: `1.5px solid ${isNeonOn ? activeLight.primary + '40' : 'rgba(255,255,255,0.1)'}`,
                pointerEvents: 'none',
                transition: 'all 0.5s ease',
              }}
            />

            {/* Neon Lamp / Room controller overlay */}
            <div
              onClick={() => {
                audioEngine.playHatchRoll();
                if (!isNeonOn) {
                  setIsNeonOn(true);
                } else {
                  if (lightModeIdx >= LIGHT_MODES.length - 1) {
                    setIsNeonOn(false);
                    setLightModeIdx(0);
                  } else {
                    setLightModeIdx(prev => prev + 1);
                  }
                }
              }}
              style={{
                position: 'absolute',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '6px 16px',
                borderRadius: '20px',
                backgroundColor: 'rgba(0,0,0,0.85)',
                border: `1.5px solid ${isNeonOn ? activeLight.primary : 'rgba(255,255,255,0.2)'}`,
                color: isNeonOn ? activeLight.primary : '#888',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: isNeonOn ? `0 0 10px ${activeLight.primary}` : 'none',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
              }}
            >
              💡 {isNeonOn ? `Cor: ${activeLight.name}` : 'Luzes Apagadas'}
            </div>

            {/* Render Placed Furniture */}
            {items.filter(i => i.purchased && i.placed).map(item => {
              const isSelected = selectedItem?.id === item.id;
              const isActiveToy = toyActiveId === item.id;
              
              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => { handleDragStart(item.id, e); }}
                  onTouchStart={(e) => { handleDragStart(item.id, e); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemInteract(item);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: `translate(-50%, -50%) ${isActiveToy ? 'scale(1.25) rotate(10deg)' : 'scale(1)'}`,
                    fontSize: '4rem',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    filter: isSelected 
                      ? 'drop-shadow(0 0 12px var(--neon-yellow))' 
                      : isNeonOn 
                        ? `drop-shadow(0 0 8px ${activeLight.primary})` 
                        : 'none',
                    userSelect: 'none',
                    transition: isDragging && draggedId === item.id ? 'none' : 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s',
                    zIndex: Math.round(item.y),
                  }}
                  title="Clique para interagir! Clique e segure para arrastar."
                >
                  {item.emoji}
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'var(--neon-yellow)',
                      color: '#000',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 0 6px var(--neon-yellow)',
                      pointerEvents: 'none',
                    }}>
                      {item.name}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render Active Equipped Pet with autonomous patrol */}
            {activePet && (
              <div
                style={{
                  position: 'absolute',
                  left: `${petX}%`,
                  top: `${petY}%`,
                  transform: `translate(-50%, -50%) scaleX(${petDirection === 'left' ? -1 : 1})`,
                  fontSize: '3.6rem',
                  filter: isNeonOn ? `drop-shadow(0 0 10px ${activePet.color})` : 'none',
                  userSelect: 'none',
                  zIndex: 85,
                  transition: 'left 4.5s linear, top 4.5s linear, transform 0.3s ease',
                }}
              >
                {activePet.emoji}

                {/* Flip back label container so text isn't mirrored */}
                <div style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '50%',
                  transform: `translateX(-50%) scaleX(${petDirection === 'left' ? -1 : 1})`,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  {/* Thought bubble */}
                  {petThought && (
                    <div style={{
                      backgroundColor: 'rgba(15,23,42,0.92)',
                      border: `1.5px solid ${activePet.color}`,
                      color: '#fff',
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      boxShadow: `0 0 8px ${activePet.color}30`,
                      marginBottom: '4px',
                      animation: 'pulse-ring 1s alternate infinite',
                    }}>
                      💬 {petThought}
                    </div>
                  )}

                  <div style={{
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
              </div>
            )}
          </div>

          {/* Interactive room hints footer */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
            <span>🖱️ Clique e arraste para reposicionar os móveis</span>
            <span>•</span>
            <span>⚡ Clique nas mobílias ou mude a luz neon para ouvir reações</span>
          </div>
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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fff' }}>🛋️ Inventário de Móveis</h3>
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
                      onClick={() => { handleBuy(item); }}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', height: '28px' }}
                    >
                      Comprar
                    </button>
                  ) : (
                    <button
                      className={`cyber-btn ${item.placed ? 'cyber-btn-pink' : ''}`}
                      onClick={() => { handleTogglePlace(item); }}
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

      {/* Manual Keyboard Position controls when item is selected */}
      {selectedItem && selectedItem.placed && (
        <div className="cyber-card" style={{ marginTop: '20px', width: '100%', maxWidth: '950px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'var(--neon-yellow)', background: 'rgba(234, 179, 8, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>{selectedItem.emoji}</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Ajustar Posição Fina: {selectedItem.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Use os botões abaixo ou arraste-o livremente com o mouse</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="cyber-btn" onClick={() => { moveItem('left'); }} style={{ width: '40px', height: '40px', padding: 0 }}>◀</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button className="cyber-btn" onClick={() => { moveItem('up'); }} style={{ width: '40px', height: '18px', padding: 0 }}>▲</button>
              <button className="cyber-btn" onClick={() => { moveItem('down'); }} style={{ width: '40px', height: '18px', padding: 0 }}>▼</button>
            </div>
            <button className="cyber-btn" onClick={() => { moveItem('right'); }} style={{ width: '40px', height: '40px', padding: 0 }}>▶</button>
            <button className="cyber-btn cyber-btn-pink" onClick={() => { setSelectedItem(null); }} style={{ padding: '0 12px', height: '40px', fontSize: '0.75rem' }}>OK</button>
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
