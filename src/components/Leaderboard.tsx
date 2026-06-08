import React, { useState } from 'react';
import { CyberSprite } from './CyberSprite';
import { COSMETIC_ITEMS } from '../services/mockDb';
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
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUsername: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, currentUsername }) => {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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
    <div className="cyber-card" style={{ width: '100%', border: '1px solid rgba(0, 255, 204, 0.2)' }}>
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
        {entries.map((entry, index) => {
          const isCurrentUser = entry.username.toLowerCase() === currentUsername.toLowerCase();
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
                  
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                       <span
                        style={{
                          fontWeight: 800,
                          color: nameColor,
                          textTransform: 'capitalize',
                          textShadow: entry.rebirths > 0 ? '0 0 10px rgba(244,63,94,0.4)' : 'none',
                        }}
                      >
                        {entry.username}
                      </span>
                      {entry.clanName && (
                        <span 
                          style={{ 
                            fontSize: '0.65rem', 
                            color: 'var(--neon-yellow)', 
                            background: 'rgba(234, 179, 8, 0.12)', 
                            border: '1px solid rgba(234, 179, 8, 0.35)', 
                            padding: '1px 5px', 
                            borderRadius: '4px', 
                            fontWeight: 900,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            textShadow: '0 0 4px rgba(234, 179, 8, 0.4)'
                          }}
                        >
                          🛡️ {entry.clanName}
                        </span>
                      )}
                      {entry.equippedTitle && (
                        <span style={{ fontSize: '0.7rem', color: '#00ffcc', fontWeight: 800, textShadow: '0 0 5px rgba(0, 255, 204, 0.5)' }}>
                          {entry.equippedTitle}
                        </span>
                      )}
                      {entry.rebirths > 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--neon-yellow)', filter: 'drop-shadow(0 0 4px var(--neon-yellow))' }}>
                          {getRebirthStars(entry.rebirths)}
                        </span>
                      )}
                      {isCurrentUser && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            background: 'var(--neon-cyan)',
                            color: '#0b0f19',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 800,
                          }}
                        >
                          VOCÊ
                        </span>
                      )}
                    </div>
                    
                    {/* Equipped Pet Display (Summary) */}
                    {entry.equippedPetEmoji && (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🐾 <span>{entry.equippedPetEmoji}</span> <strong>{entry.equippedPetName}</strong> <span style={{ color: 'var(--neon-cyan)', background: 'rgba(0,255,204,0.1)', padding: '0px 4px', borderRadius: '3px', fontSize: '0.65rem' }}>Lvl {entry.equippedPetLevel || 1}</span>
                      </span>
                    )}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
