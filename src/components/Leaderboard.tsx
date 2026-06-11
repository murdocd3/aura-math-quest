import { useState, memo } from 'react';
import { CyberSprite } from './CyberSprite';
import { COSMETIC_ITEMS, getPetEvolutionEmoji } from '../services/mockDb';
import { audioEngine } from './AudioEngine';

interface LeaderboardEntry {
  username: string;
  level: number;
  rebirths: number;
  gems: number;
  equippedPetEmoji?: string;
  equippedPetName?: string;
  equippedPetLevel?: number;
  equippedTitle?: string;
  classId?: 'warrior' | 'chronomancer' | 'alchemist' | null;
  auraColor?: string;
  equippedCosmetics?: Record<string, string>;
  equippedCosmeticId?: string | null;
  clanName?: string;
  clanContributions?: number;
  totalPlayTimeSeconds?: number;
  selectedOperation?: string;
  unlockedSkillsCount?: number;
  olympicMedals?: Record<string, 'gold' | 'silver' | 'bronze'>;
  isOnline?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUsername: string;
}

export const Leaderboard = memo<LeaderboardProps>(({ entries = [], currentUsername }) => {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const safeEntries = Array.isArray(entries) ? entries : [];

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  const getRebirthStars = (count: number) => {
    if (count <= 0) return '';
    return '⭐'.repeat(count);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getOperationLabel = (op?: string) => {
    switch (op) {
      case 'addition': return 'Soma ➕';
      case 'subtraction': return 'Subtração ➖';
      case 'multiplication': return 'Multiplicação ✖️';
      case 'division': return 'Divisão ➗';
      default: return 'Multiplicação ✖️';
    }
  };

  return (
    <div className="cyber-card" style={{ width: '100%', border: '1px solid rgba(0, 255, 204, 0.2)', position: 'relative' }}>
      {/* Floating inline Toast Notification */}
      {toastMessage && (
        <div
          className="cyber-card border-glow-cyan animate-fade-in"
          style={{
            position: 'absolute',
            top: '40px',
            left: '10px',
            right: '10px',
            zIndex: 100,
            padding: '10px 14px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1.5px solid var(--neon-cyan)',
            boxShadow: '0 0 15px rgba(0, 255, 204, 0.3)',
            borderRadius: '6px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💬</span>
            <span style={{ fontWeight: 'bold' }}>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '0 4px'
            }}
          >
            ✕
          </button>
        </div>
      )}
      <h2
        className="text-glow-cyan"
        style={{
          fontSize: '1.8rem',
          color: 'var(--neon-cyan)',
          textAlign: 'center',
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        🌌 Ranking de Aura
      </h2>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '20px' }}>
        Clique em um jogador para ver seus detalhes e estilo!
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
        {safeEntries.map((entry, index) => {
          const isCurrentUser = entry && entry.username && currentUsername && entry.username.toLowerCase() === currentUsername.toLowerCase();
          const isExpanded = expandedUser === entry.username;
          
          const nameColor = entry.rebirths > 0 ? 'var(--neon-pink)' : '#fff';
          const rowBg = isCurrentUser 
            ? 'rgba(0, 255, 204, 0.15)' 
            : index < 3 
              ? 'rgba(255, 255, 255, 0.04)' 
              : 'rgba(15, 23, 42, 0.4)';

          const rowBorder = isCurrentUser 
            ? '1.5px solid var(--neon-cyan)' 
            : '1px solid rgba(255, 255, 255, 0.05)';

          const activeCosmeticsList = Object.entries(entry.equippedCosmetics || {})
            .map(([_, itemId]) => COSMETIC_ITEMS.find(c => c.id === itemId))
            .filter(Boolean);

          return (
            <div
              key={entry.username}
              onClick={() => {
                audioEngine.playHatchRoll();
                setExpandedUser(isExpanded ? null : entry.username);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '10px',
                background: rowBg,
                border: rowBorder,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {/* Core header row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '12px 16px',
                }}
              >
                {/* Left Column: Rank + Name + Rebirths */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: index < 3 ? '1.4rem' : '0.95rem',
                      fontWeight: 800,
                      width: '28px',
                      textAlign: 'center',
                      color: index === 0 ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {getRankBadge(index)}
                  </span>
                  
                  {/* Player Sprite Avatar circle */}
                  <div 
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      border: `1.5px solid ${entry.auraColor || 'var(--neon-cyan)'}`, 
                      background: 'rgba(15, 23, 42, 0.6)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      overflow: 'hidden',
                      boxShadow: `0 0 8px ${(entry.auraColor || 'var(--neon-cyan)')}33`
                    }}
                  >
                    <CyberSprite
                      type="player"
                      equippedCosmeticId={entry.equippedCosmeticId}
                      equippedCosmetics={entry.equippedCosmetics || {}}
                      auraColor={entry.auraColor || '#00ffcc'}
                      width={38}
                      height={38}
                      classId={entry.classId}
                      rebirths={entry.rebirths}
                      level={entry.level}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span 
                        title={entry.isOnline ? "Online" : "Offline"}
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: entry.isOnline ? '#00ffcc' : '#4b5563',
                          boxShadow: entry.isOnline ? '0 0 6px #00ffcc' : 'none',
                          display: 'inline-block',
                          flexShrink: 0
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 800,
                          color: nameColor,
                          textTransform: 'capitalize',
                          textShadow: entry.rebirths > 0 ? '0 0 10px rgba(244,63,94,0.4)' : 'none',
                          fontSize: '0.95rem'
                        }}
                      >
                        {entry.username}
                      </span>
                      {entry.rebirths > 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--neon-yellow)', filter: 'drop-shadow(0 0 4px var(--neon-yellow))' }}>
                          {getRebirthStars(entry.rebirths)}
                        </span>
                      )}
                      {isCurrentUser && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            background: 'var(--neon-cyan)',
                            color: '#0b0f19',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 800,
                          }}
                        >
                          VOCÊ
                        </span>
                      )}
                    </div>
                    
                    {/* Secondary line: Title, Clan, Pet summary & Medals */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                      {entry.equippedTitle && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            color: 'var(--neon-cyan)',
                            background: 'rgba(0, 255, 204, 0.08)',
                            border: '1px solid rgba(0, 255, 204, 0.25)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            textShadow: '0 0 4px rgba(0, 255, 204, 0.3)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {entry.equippedTitle}
                        </span>
                      )}
                      {entry.clanName && (
                        <span 
                          style={{ 
                            fontSize: '0.62rem', 
                            color: 'var(--neon-yellow)', 
                            background: 'rgba(234, 179, 8, 0.08)', 
                            border: '1px solid rgba(234, 179, 8, 0.25)', 
                            padding: '1px 5px', 
                            borderRadius: '4px', 
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🛡️ {entry.clanName}
                        </span>
                      )}
                      {entry.equippedPetEmoji && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          🐾 <span>{getPetEvolutionEmoji(entry.equippedPetEmoji || '', entry.equippedPetLevel || 1)}</span> <strong>{entry.equippedPetName}</strong> <span style={{ color: 'var(--neon-cyan)', background: 'rgba(0,255,204,0.1)', padding: '0px 4px', borderRadius: '3px', fontSize: '0.6rem' }}>Lvl {entry.equippedPetLevel || 1}</span>
                        </span>
                      )}
                      {(() => {
                        const m = entry.olympicMedals || {};
                        const golds = Object.values(m).filter(x => x === 'gold').length;
                        const silvers = Object.values(m).filter(x => x === 'silver').length;
                        const bronzes = Object.values(m).filter(x => x === 'bronze').length;
                        if (golds === 0 && silvers === 0 && bronzes === 0) return null;
                        return (
                          <span style={{ fontSize: '0.65rem', display: 'inline-flex', gap: '4px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                            🏅 {golds > 0 && `🥇${golds}`} {silvers > 0 && `🥈${silvers}`} {bronzes > 0 && `🥉${bronzes}`}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right Column: Aura stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                      Nível de Aura
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        color: entry.rebirths > 0 ? 'var(--neon-pink)' : 'var(--neon-cyan)',
                        textShadow: entry.rebirths > 0 ? '0 0 8px rgba(244, 63, 94, 0.4)' : '0 0 8px rgba(0, 255, 204, 0.4)',
                      }}
                    >
                      Lvl {entry.level}
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expandable details panel */}
              {isExpanded && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(10, 15, 30, 0.5)',
                    padding: '12px 16px',
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    {/* Left detailed panel */}
                    <div>
                      <div style={{ marginBottom: '6px' }}>
                        🛡️ <strong>Clã:</strong> {entry.clanName ? (
                          <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>
                            {entry.clanName} <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>(Contrib: 💎 {entry.clanContributions})</span>
                          </span>
                        ) : 'Sem Clã'}
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        ⏱️ <strong>Tempo de Jogo:</strong> {formatTime(entry.totalPlayTimeSeconds || 0)}
                      </div>
                      <div>
                        🎯 <strong>Foco:</strong> {getOperationLabel(entry.selectedOperation)}
                      </div>
                    </div>

                    {/* Right detailed panel */}
                    <div>
                      <div style={{ marginBottom: '6px' }}>
                        💎 <strong>Gemas:</strong> {entry.gems}
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        ⚡ <strong>Classe:</strong> <span style={{ textTransform: 'capitalize', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                          {entry.classId || 'Sem Classe'}
                        </span>
                      </div>
                      <div>
                        🔮 <strong>Habilidades:</strong> {entry.unlockedSkillsCount || 0} desbloqueada(s)
                      </div>
                    </div>
                  </div>

                  {/* Equipped Items List */}
                  {activeCosmeticsList.length > 0 && (
                    <div style={{ marginTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>🧥 Equipamentos Ativos:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activeCosmeticsList.map((item: any) => (
                          <span 
                            key={item.id} 
                            style={{ 
                              fontSize: '0.75rem', 
                              background: 'rgba(255,255,255,0.05)', 
                              border: `1px solid ${item.color}40`,
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{item.emoji}</span> <span style={{ color: item.color }}>{item.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Chat Reations (Child Safe Roblox-style Emojis) */}
                  {!isCurrentUser && (
                    <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>💬 Enviar Reação Rápida:</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { text: "Parabéns! 🏆", sound: "correct" },
                          { text: "Quase te alcanço! 🏃‍♂️", sound: "hatch_roll" },
                          { text: "Matemática neles! ⚔️", sound: "level_up" },
                          { text: "Incrível! 🌟", sound: "hatch_success" },
                        ].map((btn, idx) => (
                          <button
                            key={idx}
                            className="cyber-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (btn.sound === 'correct') audioEngine.playCorrect();
                              else if (btn.sound === 'level_up') audioEngine.playLevelUp();
                              else if (btn.sound === 'hatch_success') audioEngine.playHatchSuccess();
                              else audioEngine.playHatchRoll();
                              
                              setToastMessage(`Enviado para ${entry.username}: "${btn.text}"!`);
                              
                              // Trigger automatic simulation reply from AI in ranking after 2 seconds
                              setTimeout(() => {
                                audioEngine.playHatchSuccess();
                                setToastMessage(`[De ${entry.username}]: Obrigado! Boa sorte nos estudos! 🍀`);
                              }, 2500);
                            }}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              borderColor: 'var(--neon-cyan)',
                              background: 'rgba(0, 255, 204, 0.05)',
                              cursor: 'pointer'
                            }}
                          >
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

Leaderboard.displayName = 'Leaderboard';
