import React from 'react';

interface CyberSpriteProps {
  type: 'player' | 'monster';
  name?: string;
  equippedCosmeticId?: string | null;
  auraColor?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  classId?: 'warrior' | 'chronomancer' | 'alchemist' | null;
  rebirths?: number;
  level?: number;
}

export const CyberSprite: React.FC<CyberSpriteProps> = ({
  type,
  name = '',
  equippedCosmeticId = null,
  auraColor = '#00ffcc',
  width = 140,
  height = 140,
  style = {},
  classId = null,
  rebirths = 0,
  level = 1,
}) => {
  const normalizedName = name.toLowerCase();

  // Helper for glow filters
  const filterId = `glow-${Math.random().toString(36).substring(2, 9)}`;

  // Determine monster subtype
  let monsterSubtype: 'slime' | 'spider' | 'robo' | 'trojan' | 'dragon' | 'rei' | 'fallback' = 'fallback';
  if (type === 'monster') {
    if (normalizedName.includes('slime') || normalizedName.includes('código')) {
      monsterSubtype = 'slime';
    } else if (normalizedName.includes('spider') || normalizedName.includes('bug') || normalizedName.includes('subtração')) {
      monsterSubtype = 'spider';
    } else if (normalizedName.includes('spy') || normalizedName.includes('divisor')) {
      monsterSubtype = 'robo';
    } else if (normalizedName.includes('trojan') || normalizedName.includes('cavalo')) {
      monsterSubtype = 'trojan';
    } else if (normalizedName.includes('dragon') || normalizedName.includes('dragão') || normalizedName.includes('vulcão')) {
      monsterSubtype = 'dragon';
    } else if (normalizedName.includes('rei') || normalizedName.includes('core') || normalizedName.includes('glitch')) {
      monsterSubtype = 'rei';
    }
  }

  // Common glow filter definition
  const renderDefs = (color: string) => (
    <defs>
      <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id={`grad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id={`gold-grad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
  );

  // 1. RENDER PLAYER AVATAR
  if (type === 'player') {
    // Classes coloring defaults
    const activeClass = classId || 'chronomancer'; // Fallback to Mage
    
    // Class-based theme colors
    let classThemeColor = '#a855f7'; // purple for mage
    if (activeClass === 'warrior') classThemeColor = '#f43f5e'; // rose/red
    if (activeClass === 'alchemist') classThemeColor = '#eab308'; // yellow/gold

    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 120"
        style={{ overflow: 'visible', ...style }}
      >
        {renderDefs(auraColor)}

        <style>
          {`
            @keyframes pulse-aura {
              0% { transform: scale(1); opacity: 0.4; }
              50% { transform: scale(1.15); opacity: 0.8; }
              100% { transform: scale(1); opacity: 0.4; }
            }
            @keyframes chibi-idle {
              0% { transform: translateY(0px) scaleY(1); }
              50% { transform: translateY(-3px) scaleY(0.97); }
              100% { transform: translateY(0px) scaleY(1); }
            }
            @keyframes chibi-blink {
              0%, 48%, 52%, 100% { transform: scaleY(1); }
              50% { transform: scaleY(0.1); }
            }
            @keyframes spin-gear {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes float-wing-l {
              0%, 100% { transform: rotate(0deg) translate(0px, 0px); }
              50% { transform: rotate(-5deg) translate(-2px, -3px); }
            }
            @keyframes float-wing-r {
              0%, 100% { transform: rotate(0deg) translate(0px, 0px); }
              50% { transform: rotate(5deg) translate(2px, -3px); }
            }
            @keyframes swing-weapon {
              0% { transform: rotate(-10deg); }
              50% { transform: rotate(10deg); }
              100% { transform: rotate(-10deg); }
            }
            .glow-path {
              filter: url(#${filterId});
            }
            .aura-ring {
              animation: pulse-aura 3s infinite ease-in-out;
              transform-origin: 60px 105px;
            }
            .chibi-character {
              animation: chibi-idle 3.5s infinite ease-in-out;
              transform-origin: 60px 100px;
            }
            .chibi-eyes {
              animation: chibi-blink 4.5s infinite ease-in-out;
              transform-origin: 60px 48px;
            }
            .wing-left {
              animation: float-wing-l 4s infinite ease-in-out;
              transform-origin: 40px 65px;
            }
            .wing-right {
              animation: float-wing-r 4s infinite ease-in-out;
              transform-origin: 80px 65px;
            }
            .weapon-anim {
              animation: swing-weapon 2.5s infinite ease-in-out;
              transform-origin: 30px 85px;
            }
            .weapon-anim-right {
              animation: swing-weapon 2.2s infinite ease-in-out;
              transform-origin: 90px 85px;
            }
          `}
        </style>

        {/* Aura Ring at feet */}
        <ellipse
          cx="60"
          cy="105"
          rx="34"
          ry="9"
          fill="none"
          stroke={auraColor}
          strokeWidth="3.5"
          className="glow-path aura-ring"
          strokeDasharray="6 3"
        />

        {/* REBIRTH WINGS (behind player) */}
        {rebirths > 0 && (
          <g className="glow-path" opacity="0.85">
            {/* Left Wing */}
            <g className="wing-left">
              <path
                d="M 40,65 L 10,40 L 25,60 L 5,65 L 28,75 L 15,85 L 42,75 Z"
                fill="none"
                stroke={auraColor}
                strokeWidth={1.5 + Math.min(rebirths * 0.5, 3) + Math.min(level * 0.01, 1)}
              />
              <path
                d="M 35,62 L 15,48 L 25,62 M 30,68 L 12,68 L 27,72"
                stroke={auraColor}
                strokeWidth="1.5"
                fill="none"
              />
            </g>
            {/* Right Wing */}
            <g className="wing-right">
              <path
                d="M 80,65 L 110,40 L 95,60 L 115,65 L 92,75 L 105,85 L 78,75 Z"
                fill="none"
                stroke={auraColor}
                strokeWidth={1.5 + Math.min(rebirths * 0.5, 3) + Math.min(level * 0.01, 1)}
              />
              <path
                d="M 85,62 L 105,48 L 95,62 M 90,68 L 108,68 L 93,72"
                stroke={auraColor}
                strokeWidth="1.5"
                fill="none"
              />
            </g>
          </g>
        )}

        {/* Chibi Character Model Wrapper */}
        <g className="chibi-character">
          
          {/* 1. CHARACTER BODY & CLASS SPECIFIC GEAR */}
          {/* Mage class (chronomancer) */}
          {activeClass === 'chronomancer' && (
            <g>
              {/* Robe/Cloak back */}
              <path d="M 42,75 L 30,102 L 90,102 L 78,75 Z" fill="#4c1d95" opacity="0.8" />
              {/* Main Robe torso */}
              <path
                d="M 60,65 L 42,75 L 35,100 L 85,100 L 78,75 Z"
                fill="url(#grad-mage-robe)"
                stroke={classThemeColor}
                strokeWidth="2.5"
                className="glow-path"
              />
              {/* Cyber circuitry embroidery */}
              <path d="M 60,68 L 60,98 M 60,78 L 48,88 M 60,83 L 72,93" stroke="#00ffcc" strokeWidth="1.5" fill="none" opacity="0.6" />
              <circle cx="48" cy="88" r="2.5" fill="#00ffcc" />
              <circle cx="72" cy="93" r="2.5" fill="#00ffcc" />
              
              <defs>
                <linearGradient id="grad-mage-robe" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#1e1b4b" />
                </linearGradient>
              </defs>
            </g>
          )}

          {/* Warrior class (warrior) */}
          {activeClass === 'warrior' && (
            <g>
              {/* Cape */}
              <path d="M 42,75 L 24,103 L 96,103 L 78,75 Z" fill="#ef4444" opacity="0.85" />
              {/* Cybernetic Plate Armor */}
              <path
                d="M 60,65 L 40,73 L 38,98 L 82,98 L 80,73 Z"
                fill="#334155"
                stroke={classThemeColor}
                strokeWidth="2.5"
              />
              {/* LED Grid Chestpiece */}
              <rect x="50" y="75" width="20" height="12" rx="2" fill="#0f172a" stroke={classThemeColor} strokeWidth="1.5" />
              <circle cx="55" cy="81" r="2" fill="#f43f5e" className="glow-path" />
              <circle cx="60" cy="81" r="2" fill="#f43f5e" className="glow-path" />
              <circle cx="65" cy="81" r="2" fill="#f43f5e" className="glow-path" />
              
              {/* Massive LED Shoulder Pads */}
              <rect x="33" y="70" width="12" height="10" rx="3" fill="#f43f5e" stroke="#fff" strokeWidth="1" className="glow-path" />
              <rect x="75" y="70" width="12" height="10" rx="3" fill="#f43f5e" stroke="#fff" strokeWidth="1" className="glow-path" />
            </g>
          )}

          {/* Alchemist class (alchemist) */}
          {activeClass === 'alchemist' && (
            <g>
              {/* Long Cybercoat */}
              <path
                d="M 60,65 L 42,72 L 34,100 L 86,100 L 78,72 Z"
                fill="#1e293b"
                stroke={classThemeColor}
                strokeWidth="2.5"
              />
              {/* Neon straps & vest */}
              <path d="M 42,72 L 60,98 L 78,72" stroke={classThemeColor} strokeWidth="2.5" fill="none" className="glow-path" />
              <rect x="51" y="82" width="18" height="14" rx="2" fill="#eab308" opacity="0.3" />
              
              {/* Glowing Flask Tubes on Cinto */}
              <rect x="42" y="88" width="6" height="10" rx="1" fill="#22c55e" stroke="#fff" strokeWidth="0.8" className="glow-path" />
              <rect x="72" y="88" width="6" height="10" rx="1" fill="#3b82f6" stroke="#fff" strokeWidth="0.8" className="glow-path" />
            </g>
          )}

          {/* Hands */}
          <circle cx="34" cy="92" r="4.5" fill="#1e293b" stroke={auraColor} strokeWidth="1" />
          <circle cx="86" cy="92" r="4.5" fill="#1e293b" stroke={auraColor} strokeWidth="1" />

          {/* 2. CHIBI COMPACT HEAD (Visor Helmet Style) */}
          <g>
            {/* Back Head Helmet Shell */}
            <circle cx="60" cy="46" r="23" fill="#1e293b" stroke={classThemeColor} strokeWidth="2.5" />
            
            {/* Front Glass Visor (Black screen) */}
            <path
              d="M 40,46 C 40,32 80,32 80,46 C 80,59 40,59 40,46 Z"
              fill="#090d16"
              stroke={classThemeColor}
              strokeWidth="2"
            />

            {/* Neon LED Visor Eyes (Blinking Group) */}
            <g className="chibi-eyes glow-path">
              {activeClass === 'warrior' && (
                // Aggressive / determined LED visor
                <path d="M 46,45 L 54,48 M 74,45 L 66,48" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
              )}
              {activeClass === 'chronomancer' && (
                // Focused / neon bright line eyes
                <path d="M 47,46 L 55,46 M 65,46 L 73,46" stroke="#00ffcc" strokeWidth="3.5" strokeLinecap="round" />
              )}
              {activeClass === 'alchemist' && (
                // Circular scanner LED visors
                <g>
                  <circle cx="50" cy="46" r="3.5" fill="none" stroke="#eab308" strokeWidth="2" />
                  <circle cx="70" cy="46" r="3.5" fill="none" stroke="#eab308" strokeWidth="2" />
                  <rect x="57" y="45" width="6" height="2" fill="#eab308" />
                </g>
              )}
            </g>

            {/* Helmet decorations per class */}
            {activeClass === 'warrior' && (
              // Cyber Knight Helmet Horns
              <g>
                <path d="M 40,33 L 30,22 L 44,28 Z" fill="#f43f5e" stroke="#fff" strokeWidth="1" className="glow-path" />
                <path d="M 80,33 L 90,22 L 76,28 Z" fill="#f43f5e" stroke="#fff" strokeWidth="1" className="glow-path" />
              </g>
            )}
            {activeClass === 'chronomancer' && (
              // Cyber Hood outline overlay
              <path
                d="M 37,48 C 37,22 83,22 83,48 Q 80,56 60,54 Q 40,56 37,48 Z"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2.5"
                className="glow-path"
              />
            )}
          </g>

          {/* 3. DEFAULT WEAPONS & ANCILLARY RUNES */}
          {activeClass === 'warrior' && (
            // Neon broadsword on the back
            <g className="weapon-anim-right" transform="translate(88, 70)">
              <line x1="0" y1="20" x2="12" y2="-20" stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" className="glow-path" />
              <line x1="0" y1="20" x2="12" y2="-20" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="-5" y1="12" x2="10" y2="17" stroke="#475569" strokeWidth="3" />
              <circle cx="0" cy="20" r="3" fill="#f43f5e" />
            </g>
          )}

          {activeClass === 'chronomancer' && (
            // Floating Runic Star
            <g className="weapon-anim" transform="translate(25, 78)">
              <circle cx="0" cy="0" r="8" fill="none" stroke="#00ffcc" strokeWidth="1.5" strokeDasharray="3 3" className="glow-path" />
              <polygon points="0,-9 7,7 -7,7" fill="#00ffcc" className="glow-path" opacity="0.6" />
              <polygon points="0,9 -7,-7 7,-7" fill="#00ffcc" className="glow-path" opacity="0.6" />
              <circle cx="0" cy="0" r="2.5" fill="#fff" />
            </g>
          )}

          {activeClass === 'alchemist' && (
            // Bubbling cyber flask next to character
            <g className="weapon-anim-right" transform="translate(90, 80)">
              <path d="M -5,5 L 5,5 L 8,18 L -8,18 Z" fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" strokeWidth="1.5" className="glow-path" />
              <line x1="-3" y1="2" x2="3" y2="2" stroke="#eab308" strokeWidth="2" />
              <circle cx="0" cy="11" r="3" fill="#fff" opacity="0.8" />
              <circle cx="-3" cy="14" r="1.5" fill="#fff" opacity="0.8" />
            </g>
          )}

          {/* 4. COSMETICS OVERLAYS */}

          {/* Item: Retro Shades (🕶️) */}
          {equippedCosmeticId === 'retro_shades' && (
            <g transform="translate(43, 39)">
              {/* Left Lens */}
              <rect x="2" y="4" width="14" height="8" fill="#ec4899" rx="1" stroke="#fff" strokeWidth="1" />
              <rect x="4" y="6" width="3" height="4" fill="#fff" />
              {/* Bridge */}
              <rect x="16" y="6" width="3" height="2" fill="#ec4899" />
              {/* Right Lens */}
              <rect x="19" y="4" width="14" height="8" fill="#ec4899" rx="1" stroke="#fff" strokeWidth="1" />
              <rect x="21" y="6" width="3" height="4" fill="#fff" />
            </g>
          )}

          {/* Item: Chapéu de Mago Neon (🧙‍♂️) */}
          {equippedCosmeticId === 'neon_hat' && (
            <g transform="translate(60, 27)">
              <path
                d="M -30,0 Q -25,-12 0,-35 Q 25,-12 30,0 Z"
                fill="rgba(168, 85, 247, 0.85)"
                stroke="#a855f7"
                strokeWidth="2"
                className="glow-path"
              />
              <ellipse cx="0" cy="0" rx="33" ry="4.5" fill="#a855f7" />
              <ellipse cx="0" cy="-9" rx="16" ry="2.5" fill="#fff" opacity="0.5" />
            </g>
          )}

          {/* Item: Coroa Glitch (👑) */}
          {equippedCosmeticId === 'glitch_crown' && (
            <g transform="translate(60, 23)">
              <path
                d="M -18,0 L -23,-13 L -9,-6 L 0,-17 L 9,-6 L 23,-13 L 18,0 Z"
                fill="url(#gold-grad-glow-crown-chibi)"
                stroke="#facc15"
                strokeWidth="2"
                className="glow-path"
              />
              <circle cx="0" cy="-17" r="2" fill="#ef4444" />
              <circle cx="-23" cy="-13" r="1.5" fill="#3b82f6" />
              <circle cx="23" cy="-13" r="1.5" fill="#3b82f6" />
              <defs>
                <linearGradient id="gold-grad-glow-crown-chibi" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
            </g>
          )}

          {/* Item: Varinha Cyber (🪄) */}
          {equippedCosmeticId === 'cyber_wand' && (
            <g className="weapon-anim" transform="translate(26, 86)">
              {/* Staff stick */}
              <line x1="0" y1="15" x2="-10" y2="-9" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
              <line x1="0" y1="15" x2="-10" y2="-9" stroke="#00ffcc" strokeWidth="1.2" strokeLinecap="round" />
              {/* Glowing tip orb */}
              <circle cx="-10" cy="-9" r="5" fill="#00ffcc" className="glow-path" />
              <circle cx="-10" cy="-9" r="2" fill="#fff" />
              {/* Star sparkles */}
              <path d="M -15,-9 L -5,-9 M -10,-14 L -10,-4" stroke="#00ffcc" strokeWidth="0.8" />
            </g>
          )}

          {/* Item: Visor Holográfico (🥽) */}
          {equippedCosmeticId === 'cyber_visor' && (
            <g transform="translate(40, 42)">
              <rect x="0" y="0" width="40" height="9" fill="rgba(6, 182, 212, 0.75)" rx="2" stroke="#fff" strokeWidth="1" className="glow-path" />
              <line x1="4" y1="4.5" x2="36" y2="4.5" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" />
            </g>
          )}

          {/* Item: Sabre Voltaico (⚔️) */}
          {equippedCosmeticId === 'laser_blade' && (
            <g className="weapon-anim-right" transform="translate(90, 85)">
              <line x1="0" y1="10" x2="15" y2="-25" stroke="#eab308" strokeWidth="4" strokeLinecap="round" className="glow-path" />
              <line x1="0" y1="10" x2="15" y2="-25" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="-4" y="6" width="8" height="3" fill="#334155" />
            </g>
          )}

          {/* Item: Asas de Fênix Digital (🪶) */}
          {equippedCosmeticId === 'cosmic_wings' && (
            <g className="glow-path" opacity="0.9">
              <g className="wing-left">
                <path d="M 40,65 L 5,30 Q 15,60 25,75 Z" fill="rgba(168, 85, 247, 0.4)" stroke="#a855f7" strokeWidth="1.5" />
              </g>
              <g className="wing-right">
                <path d="M 80,65 L 115,30 Q 105,60 95,75 Z" fill="rgba(168, 85, 247, 0.4)" stroke="#a855f7" strokeWidth="1.5" />
              </g>
            </g>
          )}

          {/* Item: Escudo Voxel (🛡️) */}
          {equippedCosmeticId === 'pixel_shield' && (
            <g className="weapon-anim" transform="translate(25, 92)">
              <polygon points="0,-10 10,-5 10,8 0,13 -10,8 -10,-5" fill="rgba(34, 397, 94, 0.4)" stroke="#22c55e" strokeWidth="2" className="glow-path" />
              <circle cx="0" cy="0" r="3" fill="#fff" />
            </g>
          )}

          {/* Item: Capa da Nebulosa (🧥) */}
          {equippedCosmeticId === 'nebula_cloak' && (
            <path d="M 42,75 L 20,105 L 100,105 L 78,75 Z" fill="rgba(236, 72, 153, 0.3)" stroke="#ec4899" strokeWidth="1.5" className="glow-path" />
          )}

          {/* Item: Orbe Projetora (🔮) */}
          {equippedCosmeticId === 'hologram_orb' && (
            <g className="weapon-anim-right" transform="translate(92, 70)">
              <circle cx="0" cy="0" r="6" fill="rgba(0, 255, 204, 0.6)" stroke="#00ffcc" strokeWidth="1.5" className="glow-path" />
              <circle cx="0" cy="0" r="2" fill="#fff" />
              <line x1="0" y1="6" x2="0" y2="15" stroke="rgba(0, 255, 204, 0.3)" strokeWidth="1" strokeDasharray="2 2" />
            </g>
          )}

          {/* Item: Mochila de Fórmulas (🎒) */}
          {equippedCosmeticId === 'math_backpack' && (
            <g transform="translate(48, 75)">
              <rect x="0" y="0" width="24" height="25" rx="4" fill="#64748b" stroke="#a1a1aa" strokeWidth="1.5" />
              <rect x="4" y="6" width="16" height="12" rx="2" fill="#475569" />
              <text x="12" y="15" textAnchor="middle" fontSize="8px" fill="#fff" fontWeight="bold">∑</text>
            </g>
          )}

          {/* Item: Anel da Aurora (💍) */}
          {equippedCosmeticId === 'aurora_ring' && (
            <g className="weapon-anim" transform="translate(34, 92)">
              <circle cx="0" cy="0" r="3" fill="none" stroke="#f97316" strokeWidth="1" />
              <circle cx="0" cy="-3" r="2.5" fill="#fff" className="glow-path" />
            </g>
          )}
        </g>
      </svg>
    );
  }

  // 2. RENDER MONSTER SPRITES
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      style={{ overflow: 'visible', ...style }}
    >
      <style>
        {`
          @keyframes pulse-slime {
            0% { transform: scale(1) translateY(0); }
            50% { transform: scale(1.08, 0.92) translateY(4px); }
            100% { transform: scale(1) translateY(0); }
          }
          @keyframes crawl-spider {
            0% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0); }
          }
          @keyframes hover-drone {
            0% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(2deg); }
            100% { transform: translateY(0) rotate(0deg); }
          }
          @keyframes rotate-radar {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes burn-flames {
            0% { transform: scale(1) skewX(0deg); opacity: 0.85; }
            50% { transform: scale(1.05) skewX(4deg); opacity: 1; }
            100% { transform: scale(1) skewX(0deg); opacity: 0.85; }
          }
          @keyframes flap-wings {
            0% { transform: rotate(0deg); }
            50% { transform: rotate(-8deg) translateY(-2px); }
            100% { transform: rotate(0deg); }
          }
          @keyframes glitch-sweep {
            0% { clip-path: inset(0 0 0 0); filter: hue-rotate(0deg); }
            10% { clip-path: inset(10% 0 80% 0); transform: translate(-3px, 2px); }
            20% { clip-path: inset(80% 0 5% 0); transform: translate(3px, -2px); filter: hue-rotate(90deg); }
            30% { clip-path: inset(0 0 0 0); transform: translate(0, 0); }
            100% { clip-path: inset(0 0 0 0); }
          }
          .m-slime { animation: pulse-slime 2.2s infinite ease-in-out; transform-origin: 60px 95px; }
          .m-spider { animation: crawl-spider 1.6s infinite ease-in-out; transform-origin: 60px 60px; }
          .m-robo { animation: hover-drone 3s infinite ease-in-out; transform-origin: 60px 50px; }
          .m-radar { animation: rotate-radar 6s linear infinite; transform-origin: 60px 45px; }
          .m-flames { animation: burn-flames 0.8s infinite ease-in-out; transform-origin: 60px 90px; }
          .m-wings { animation: flap-wings 1.5s infinite ease-in-out; transform-origin: 60px 55px; }
          .m-glitch { animation: glitch-sweep 2.5s infinite steps(2); }
        `}
      </style>

      {/* A. SLIME MONSTER */}
      {monsterSubtype === 'slime' && (
        <g className="m-slime">
          {renderDefs('#22c55e')}
          {/* Slime Base Shadow */}
          <ellipse cx="60" cy="98" rx="35" ry="8" fill="rgba(3,7,18,0.5)" />

          {/* Slime Body */}
          <path
            d="M 25,90 Q 20,50 60,40 Q 100,50 95,90 Q 90,100 60,98 Q 30,100 25,90 Z"
            fill="rgba(34, 197, 94, 0.25)"
            stroke="#22c55e"
            strokeWidth="3.5"
            filter={`url(#${filterId})`}
          />

          {/* Cyber grid overlay inside slime */}
          <path
            d="M 35,80 Q 60,75 85,80 M 40,65 Q 60,60 80,65 M 60,45 L 60,95"
            stroke="rgba(34, 197, 94, 0.3)"
            strokeWidth="1.5"
            fill="none"
          />

          {/* Glowing Eyes */}
          <rect x="44" y="60" width="8" height="3" fill="#fff" rx="1.5" filter={`url(#${filterId})`} />
          <rect x="68" y="60" width="8" height="3" fill="#fff" rx="1.5" filter={`url(#${filterId})`} />

          {/* Digital Mouth */}
          <path d="M 52,78 L 68,78" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {/* B. SPIDER VIRUS */}
      {monsterSubtype === 'spider' && (
        <g className="m-spider">
          {renderDefs('#a855f7')}
          {/* Ground shadow */}
          <ellipse cx="60" cy="100" rx="30" ry="6" fill="rgba(3,7,18,0.5)" />

          {/* Legs Left */}
          <path d="M 45,55 L 20,40 L 15,65" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 45,60 L 15,60 L 10,85" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 45,65 L 20,80 L 25,100" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />

          {/* Legs Right */}
          <path d="M 75,55 L 100,40 L 105,65" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 75,60 L 105,60 L 110,85" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 75,65 L 100,80 L 95,100" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />

          {/* Core/Chassis */}
          <circle
            cx="60"
            cy="60"
            r="18"
            fill="rgba(168, 85, 247, 0.3)"
            stroke="#a855f7"
            strokeWidth="3"
            filter={`url(#${filterId})`}
          />

          {/* Pulse Core Core */}
          <circle cx="60" cy="60" r="8" fill="#f43f5e" filter={`url(#${filterId})`} />

          {/* Glowing mechanical visor */}
          <path d="M 48,52 L 72,52" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {/* C. ROBO SPY */}
      {monsterSubtype === 'robo' && (
        <g className="m-robo">
          {renderDefs('#3b82f6')}
          {/* Hovering shadow */}
          <ellipse cx="60" cy="105" rx="20" ry="4" fill="rgba(3,7,18,0.4)" />

          {/* Radar Circles */}
          <circle
            cx="60"
            cy="45"
            r="38"
            fill="none"
            stroke="rgba(59, 130, 246, 0.2)"
            strokeWidth="1"
            strokeDasharray="4 8"
            className="m-radar"
          />

          {/* Side Thrusters */}
          <path d="M 22,45 L 35,45 L 35,55 L 22,55 Z" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <path d="M 98,45 L 85,45 L 85,55 L 98,55 Z" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          {/* Thruster Fire */}
          <path d="M 24,55 L 28,68 L 32,55" fill="#facc15" />
          <path d="M 88,55 L 92,68 L 96,55" fill="#facc15" />

          {/* Drone Body */}
          <rect
            x="35"
            y="30"
            width="50"
            height="32"
            rx="16"
            fill="rgba(59, 130, 246, 0.25)"
            stroke="#3b82f6"
            strokeWidth="3.5"
            filter={`url(#${filterId})`}
          />

          {/* Large camera lens eye */}
          <circle cx="60" cy="45" r="10" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="60" cy="45" r="5" fill="#e11d48" filter={`url(#${filterId})`} />
          <circle cx="58" cy="43" r="1.5" fill="#fff" />

          {/* Antennas */}
          <line x1="45" y1="30" x2="38" y2="15" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="38" cy="15" r="2.5" fill="#3b82f6" />
          <line x1="75" y1="30" x2="82" y2="15" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="82" cy="15" r="2.5" fill="#3b82f6" />
        </g>
      )}

      {/* D. FIRE TROJAN / HORSE */}
      {monsterSubtype === 'trojan' && (
        <g className="m-flames">
          {renderDefs('#f97316')}
          {/* Ground shadow */}
          <ellipse cx="60" cy="100" rx="38" ry="7" fill="rgba(3,7,18,0.5)" />

          {/* Digital Fire Mane */}
          <path
            d="M 30,85 Q 15,55 35,30 Q 30,55 45,45 Q 40,65 55,55 Q 50,75 75,70 Q 55,90 30,85 Z"
            fill="rgba(249, 115, 22, 0.4)"
            stroke="#f97316"
            strokeWidth="2.5"
            filter={`url(#${filterId})`}
          />

          {/* Trojan Horse Body Head shape */}
          <path
            d="M 40,85 L 45,55 L 70,30 L 85,32 L 80,48 L 70,54 L 75,85 Z"
            fill="rgba(239, 68, 68, 0.25)"
            stroke="#ef4444"
            strokeWidth="3.5"
            filter={`url(#${filterId})`}
          />

          {/* Inner Trojan Circuits */}
          <path d="M 50,55 L 70,55 M 60,40 L 70,48" stroke="#facc15" strokeWidth="2" fill="none" />

          {/* Glowing Red visor eye */}
          <polygon points="72,38 80,39 77,43 71,42" fill="#fff" filter={`url(#${filterId})`} />
        </g>
      )}

      {/* E. GLITCH DRAGON */}
      {monsterSubtype === 'dragon' && (
        <g className="m-wings">
          {renderDefs('#06b6d4')}
          {/* Ground Shadow */}
          <ellipse cx="60" cy="102" rx="40" ry="7" fill="rgba(3,7,18,0.5)" />

          {/* Cyber Wings Left & Right */}
          <path
            d="M 45,55 L 10,25 L 15,65 Q 35,70 45,55 Z"
            fill="rgba(6, 182, 212, 0.15)"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          <path
            d="M 75,55 L 110,25 L 105,65 Q 85,70 75,55 Z"
            fill="rgba(6, 182, 212, 0.15)"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="3 3"
          />

          {/* Dragon Head / Neck */}
          <path
            d="M 50,90 L 50,60 L 35,42 L 55,22 L 72,25 L 85,15 L 80,38 L 70,50 L 70,90 Z"
            fill="rgba(6, 182, 212, 0.25)"
            stroke="#06b6d4"
            strokeWidth="3.5"
            filter={`url(#${filterId})`}
          />

          {/* Dragon glowing spine horns */}
          <polygon points="46,60 40,55 48,50" fill="#ec4899" />
          <polygon points="48,45 42,40 50,35" fill="#ec4899" />
          <polygon points="52,30 46,25 54,22" fill="#ec4899" />

          {/* Core chest energy */}
          <circle cx="60" cy="72" r="6" fill="#fff" filter={`url(#${filterId})`} />
          <circle cx="60" cy="72" r="3" fill="#ec4899" />

          {/* Cyber Eye */}
          <circle cx="70" cy="30" r="3" fill="#fff" filter={`url(#${filterId})`} />
        </g>
      )}

      {/* F. REI GLITCH CORE */}
      {monsterSubtype === 'rei' && (
        <g className="m-glitch">
          {renderDefs('#ec4899')}
          {/* Shadow */}
          <ellipse cx="60" cy="105" rx="35" ry="6" fill="rgba(3,7,18,0.6)" />

          {/* Outer Glitch Ring horizontal */}
          <ellipse
            cx="60"
            cy="65"
            rx="45"
            ry="12"
            fill="none"
            stroke="#ec4899"
            strokeWidth="2"
            strokeDasharray="5 5"
            className="m-radar"
          />

          {/* Segmented Core Sphere */}
          <circle
            cx="60"
            cy="65"
            r="28"
            fill="rgba(15, 23, 42, 0.85)"
            stroke="#ec4899"
            strokeWidth="3.5"
            filter={`url(#${filterId})`}
          />

          {/* Glitch Matrix Fractures */}
          <path
            d="M 42,50 L 52,65 L 68,58 L 78,75 M 48,72 L 64,68 L 72,80"
            stroke="#fff"
            strokeWidth="2.5"
            fill="none"
            filter={`url(#${filterId})`}
          />

          {/* Glowing Core center */}
          <circle cx="60" cy="65" r="10" fill="#a855f7" filter={`url(#${filterId})`} />
          <circle cx="60" cy="65" r="4" fill="#00ffcc" />

          {/* Hologram Crown above Core */}
          <path
            d="M 45,28 L 40,15 L 50,22 L 60,10 L 70,22 L 80,15 L 75,28 Z"
            fill="rgba(236, 72, 153, 0.5)"
            stroke="#ec4899"
            strokeWidth="2"
            filter={`url(#${filterId})`}
          />
        </g>
      )}

      {/* G. FALLBACK CYBER ORB */}
      {monsterSubtype === 'fallback' && (
        <g className="m-robo">
          {renderDefs('#00ffcc')}
          <circle
            cx="60"
            cy="60"
            r="32"
            fill="rgba(15,23,42,0.8)"
            stroke="#00ffcc"
            strokeWidth="3"
            filter={`url(#${filterId})`}
          />
          <circle
            cx="60"
            cy="60"
            r="28"
            fill="none"
            stroke="rgba(0, 255, 204, 0.3)"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="m-radar"
          />
          {/* Fallback Emoji inside the Orb */}
          <text
            x="60"
            y="70"
            textAnchor="middle"
            fontSize="2.2rem"
            style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.8))' }}
          >
            {name === '' ? '👾' : name.slice(0, 2)}
          </text>
        </g>
      )}
    </svg>
  );
};
