import React from 'react';

interface LeaderboardEntry {
  username: string;
  level: number;
  rebirths: number;
  gems: number;
  equippedPetEmoji?: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUsername: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, currentUsername }) => {
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

  return (
    <div className="cyber-card" style={{ width: '100%', border: '1px solid rgba(0, 255, 204, 0.2)' }}>
      <h2
        className="text-glow-cyan"
        style={{
          fontSize: '1.8rem',
          color: 'var(--neon-cyan)',
          textAlign: 'center',
          marginBottom: '20px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        🌌 Ranking de Aura
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
        {entries.map((entry, index) => {
          const isCurrentUser = entry.username.toLowerCase() === currentUsername.toLowerCase();
          
          // Cosmic text glow effect for users with rebirths
          const nameColor = entry.rebirths > 0 ? 'var(--neon-pink)' : '#fff';
          const rowBg = isCurrentUser 
            ? 'rgba(0, 255, 204, 0.15)' 
            : index < 3 
              ? 'rgba(255, 255, 255, 0.04)' 
              : 'rgba(15, 23, 42, 0.4)';

          const rowBorder = isCurrentUser 
            ? '1.5px solid var(--neon-cyan)' 
            : '1px solid rgba(255, 255, 255, 0.05)';

          return (
            <div
              key={entry.username}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                background: rowBg,
                border: rowBorder,
                transition: 'transform 0.2s',
              }}
            >
              {/* Left Column: Rank + Name + Rebirths */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span
                  style={{
                    fontSize: index < 3 ? '1.4rem' : '0.95rem',
                    fontWeight: 800,
                    width: '32px',
                    textAlign: 'center',
                    color: index === 0 ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {getRankBadge(index)}
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                          marginLeft: '4px',
                        }}
                      >
                        VOCÊ
                      </span>
                    )}
                  </div>
                  
                  {/* Equipped Pet Display */}
                  {entry.equippedPetEmoji && (
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                      Pet Equipado: {entry.equippedPetEmoji}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Aura stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                    Nível de Aura
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      color: entry.rebirths > 0 ? 'var(--neon-pink)' : 'var(--neon-cyan)',
                      textShadow: entry.rebirths > 0 ? '0 0 8px rgba(244, 63, 94, 0.4)' : '0 0 8px rgba(0, 255, 204, 0.4)',
                    }}
                  >
                    Lvl {entry.level}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
