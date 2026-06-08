import React, { useState, useEffect, useRef } from 'react';
import { mockDb, PET_TYPES } from '../services/mockDb';
import { backendService } from '../services/backendService';
import type { User, GameState } from '../services/mockDb';
import { audioEngine } from './AudioEngine';
import { getCampaignStages } from './HubWorld';
import { CyberSprite } from './CyberSprite';
import { CombatVfxCanvas } from './CombatVfxCanvas';
import type { CombatVfxCanvasRef } from './CombatVfxCanvas';

interface CombatArenaProps {
  playerUser: User;
  zone: 'forest' | 'volcano';
  gameState: GameState;
  onBattleFinished: (xpGained: number, gemsGained: number, isVictory?: boolean) => void;
  onBack: () => void;
  campaignStageId?: number | null;
}

interface Question {
  num1: number;
  num2: number;
  answer: number;
  choices: number[];
  key: string;
  isWeakPoint?: boolean;
  op?: 'addition' | 'subtraction' | 'multiplication' | 'division';
}

const MONSTERS = {
  forest: [
    { name: 'Slime Glitch', emoji: '👾', maxHp: 3 },
    { name: 'Spider Virus', emoji: '🕷️', maxHp: 3 },
    { name: 'Robo Spy', emoji: '🤖', maxHp: 3 },
  ],
  volcano: [
    { name: 'Fire Trojan', emoji: '🔥', maxHp: 4 },
    { name: 'Glitch Dragon', emoji: '🐉', maxHp: 4 },
    { name: 'Mega Crash Worm', emoji: '🐛', maxHp: 5 },
  ],
};

const getOperationSymbol = (op: 'addition' | 'subtraction' | 'multiplication' | 'division') => {
  switch (op) {
    case 'addition': return '+';
    case 'subtraction': return '-';
    case 'multiplication': return '×';
    case 'division': return '÷';
    default: return '×';
  }
};

const getCampaignOp = (stageId: number): 'addition' | 'subtraction' | 'multiplication' | 'division' => {
  const stageIndex = (stageId - 1) % 5;
  switch (stageIndex) {
    case 0: return 'addition';
    case 1: return 'subtraction';
    case 2: return 'division';
    case 3: return 'multiplication';
    case 4: {
      const ops: Array<'addition' | 'subtraction' | 'multiplication' | 'division'> = ['addition', 'subtraction', 'multiplication', 'division'];
      return ops[Math.floor(Math.random() * ops.length)];
    }
    default: return 'multiplication';
  }
};

const getCampaignRewards = (stageId: number, currentCampaignStage: number) => {
  const cycle = Math.floor((stageId - 1) / 5) + 1;
  const stageIndex = (stageId - 1) % 5;

  let baseXP = 0;
  let baseGems = 0;
  switch (stageIndex) {
    case 0: baseXP = 100; baseGems = 15; break;
    case 1: baseXP = 150; baseGems = 20; break;
    case 2: baseXP = 200; baseGems = 25; break;
    case 3: baseXP = 250; baseGems = 30; break;
    case 4: baseXP = 500; baseGems = 50; break;
  }

  const isFirstTime = stageId === currentCampaignStage;

  if (isFirstTime) {
    return { xp: baseXP * cycle, gems: baseGems * cycle };
  } else {
    // 10% rewards for replaying
    return {
      xp: Math.max(10, Math.round((baseXP * cycle) * 0.1)),
      gems: Math.max(1, Math.round((baseGems * cycle) * 0.1))
    };
  }
};

export const CombatArena: React.FC<CombatArenaProps> = ({
  playerUser,
  zone,
  gameState,
  onBattleFinished,
  onBack,
  campaignStageId,
}) => {
  const userId = playerUser.id;

  const getPetElement = () => {
    if (gameState.equippedPetId) {
      const pets = mockDb.getPets(userId);
      const pet = pets.find(p => p.id === gameState.equippedPetId);
      if (pet) {
        if (pet.nickname.includes('🔥') || pet.nickname.includes('Flamejante')) return 'fire';
        if (pet.nickname.includes('⚡') || pet.nickname.includes('Voltaico')) return 'electric';
        if (pet.nickname.includes('❄️') || pet.nickname.includes('Glacial')) return 'ice';
        if (pet.nickname.includes('🌌') || pet.nickname.includes('Cósmico')) return 'cosmic';
      }
    }
    return null;
  };

  const getMonsterElement = (mName: string, mEmoji: string) => {
    const combined = (mName + ' ' + mEmoji).toLowerCase();
    if (combined.includes('🔥') || combined.includes('fire') || combined.includes('fogo') || combined.includes('dragão')) return 'fire';
    if (combined.includes('❄️') || combined.includes('ice') || combined.includes('glacial') || combined.includes('sapo') || combined.includes('slime')) return 'ice';
    if (combined.includes('⚡') || combined.includes('raio') || combined.includes('voltaico') || combined.includes('cão') || combined.includes('spy')) return 'electric';
    if (combined.includes('🌌') || combined.includes('cósmico') || combined.includes('cosmic') || combined.includes('glitch') || combined.includes('👾') || combined.includes('bug')) return 'cosmic';
    return null;
  };
  // Battle Config & Constants
  const baseTimeLimit = zone === 'forest' ? 9 : 6; // seconds
  const isVolcano = zone === 'volcano';

  // Clan Bonus state
  const [clanBonus, setClanBonus] = useState<{ xpMultiplier: number, gemMultiplier: number }>({ xpMultiplier: 1, gemMultiplier: 1 });

  useEffect(() => {
    const fetchBonus = async () => {
      if (gameState.clanId) {
        const bonus = await backendService.getClanBonus(gameState.clanId);
        setClanBonus(bonus);
      }
    };
    fetchBonus();
  }, [gameState.clanId]);

  // Apply Pet Buffs
  const getPetBuffs = () => {
    let extraTime = 0;
    let xpMultiplier = 1;
    let gemMultiplier = 1;

    if (gameState.equippedPetId) {
      const pets = mockDb.getPets(userId);
      const pet = pets.find(p => p.id === gameState.equippedPetId);
      if (pet) {
        const isFed = gameState.fedBonusUntil ? (new Date(gameState.fedBonusUntil) > new Date()) : false;
        
        // Find pet details from PET_TYPES catalog to support hybrid/combined buffs
        const petType = PET_TYPES.find(pt => pt.id === pet.petTypeId);
        if (petType) {
          // If the pet has composite parameters defined in PET_TYPES catalog
          if (petType.extraTime) {
            extraTime += petType.extraTime * pet.level;
          }
          if (petType.xpMultiplier) {
            xpMultiplier += (petType.xpMultiplier - 1) * pet.level * (isFed ? 1.5 : 1);
          }
          if (petType.gemMultiplier) {
            gemMultiplier += (petType.gemMultiplier - 1) * pet.level * (isFed ? 1.5 : 1);
          }

          // Fallback to legacy single buff columns
          if (!petType.extraTime && !petType.xpMultiplier && !petType.gemMultiplier) {
            if (pet.buffType === 'time_bonus') {
              extraTime = pet.buffValue;
            } else if (pet.buffType === 'aura_multiplier') {
              xpMultiplier = isFed ? 1 + (pet.buffValue - 1) * 1.5 : pet.buffValue;
            } else if (pet.buffType === 'gem_multiplier') {
              gemMultiplier = isFed ? 1 + (pet.buffValue - 1) * 1.5 : pet.buffValue;
            }
          }
        }
      }
    }
    return { extraTime, xpMultiplier, gemMultiplier };
  };

  const { extraTime, xpMultiplier: petXpMult, gemMultiplier: petGemMult } = getPetBuffs();
  const xpMultiplier = petXpMult * clanBonus.xpMultiplier;
  const gemMultiplier = petGemMult * clanBonus.gemMultiplier;
  const timeLimit = baseTimeLimit + extraTime;

  // Helper to scale monster HP dynamically
  const scaleMonsterHp = (baseHp: number, bMode: 'solo' | 'pvp' | 'coop' | 'campaign') => {
    let adjustedBase = baseHp;
    if (bMode === 'solo' || bMode === 'campaign') {
      if (zone === 'forest') {
        adjustedBase = baseHp + 3; // e.g. 3 becomes 6
      } else {
        adjustedBase = baseHp + 6; // e.g. 4 becomes 10
      }
    } else if (bMode === 'coop') {
      adjustedBase = 25; // Raids should have much higher health!
    } else if (bMode === 'pvp') {
      adjustedBase = zone === 'forest' ? 8 : 14;
    }

    const levelFactor = 1 + Math.floor(gameState.auraLevel / 10) * 0.15;
    const rebirthFactor = 1 + gameState.rebirths * 0.35;
    const finalHp = Math.round(adjustedBase * levelFactor * rebirthFactor);
    return Math.max(5, finalHp);
  };

  // Interpolates background grid color between corruption (magenta) and purity (cyan)
  const getGridColor = (ratio: number) => {
    const r = Math.round(236 * ratio + 0 * (1 - ratio));
    const g = Math.round(72 * ratio + 255 * (1 - ratio));
    const b = Math.round(153 * ratio + 204 * (1 - ratio));
    return `rgba(${r}, ${g}, ${b}, 0.25)`;
  };

  // Battle state
  const [battleMode, setBattleMode] = useState<'select' | 'solo' | 'pvp' | 'coop' | 'campaign'>('select');
  const [matchmaking, setMatchmaking] = useState<boolean>(false);
  const [matchedOpponent, setMatchedOpponent] = useState<{ username: string; level: number; rebirths: number; emoji: string } | null>(null);
  const [victoryRewards, setVictoryRewards] = useState<{ xp: number; gems: number }>({ xp: 0, gems: 0 });

  const [monster, setMonster] = useState({ name: '', emoji: '', maxHp: 3, hp: 3 });
  const [playerHp, setPlayerHp] = useState(3); // 3 shields
  const [maxPlayerHp] = useState(3);
  const [battleState, setBattleState] = useState<'intro' | 'fighting' | 'won' | 'lost'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Campaign Victory Dialogue index
  const [victoryDialogueIndex, setVictoryDialogueIndex] = useState<number | null>(null);

  // Input states
  const [textAnswer, setTextAnswer] = useState('');
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [timerActive, setTimerActive] = useState(false);
  const [isFeedbackActive, setIsFeedbackActive] = useState(false);
  const timerRef = useRef<any | null>(null);
  const vfxCanvasRef = useRef<CombatVfxCanvasRef | null>(null);

  // Anim stats
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [flashEffect, setFlashEffect] = useState<'correct' | 'critical' | 'incorrect' | null>(null);
  const [monsterShake, setMonsterShake] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);

  // Simulated PvP Opponent AI Loop
  useEffect(() => {
    if (battleState !== 'fighting' || battleMode !== 'pvp') return;

    const pvpInterval = setInterval(() => {
      const isOpponentCorrect = Math.random() < 0.75;
      const opponentName = matchedOpponent?.username || 'Oponente';

      if (isOpponentCorrect) {
        nextTurnLog(`Oponente ${opponentName} respondeu rápido e atacou!`);
        vfxCanvasRef.current?.fireProjectile('monster', () => {
          vfxCanvasRef.current?.triggerExplosion('player', 'error');
          audioEngine.playError();
          setPerfectBattle(false);
          spawnHitSplat(`DANO! -1 🛡️`, true, 'error');
          
          setPlayerHp(prev => {
            const next = prev - 1;
            if (next <= 0) {
              handleDefeat();
            }
            return next;
          });
          triggerFlashEffect('incorrect');
          triggerPlayerShake();
        });
      } else {
        nextTurnLog(`Oponente ${opponentName} hesitou e errou a resposta!`);
        spawnHitSplat('Oponente Errou!', false, 'normal');
      }
    }, 6500);

    return () => clearInterval(pvpInterval);
  }, [battleState, battleMode, matchedOpponent]);

  // Simulated Co-op Party Loop
  useEffect(() => {
    if (battleState !== 'fighting' || battleMode !== 'coop') return;

    const coopInterval = setInterval(() => {
      const ally = Math.random() < 0.5 ? 'Sofia 🧪' : 'Gabriel 🤖';
      nextTurnLog(`Aliado ${ally} lançou um feitiço de tabuada!`);
      const allyOp = currentQuestion?.op || gameState.selectedOperation || 'multiplication';
      vfxCanvasRef.current?.fireProjectile('player', () => {
        vfxCanvasRef.current?.triggerExplosion('monster', 'normal', allyOp);
        audioEngine.playCorrect();
        spawnHitSplat('-1 HP (Aliado)', false, 'normal');
        
        setMonster(prev => {
          const nextHp = prev.hp - 1;
          if (nextHp <= 0) {
            handleVictory();
          }
          return { ...prev, hp: Math.max(0, nextHp) };
        });
        triggerMonsterShake();
      }, false, allyOp);
    }, 5500);

    return () => clearInterval(coopInterval);
  }, [battleState, battleMode]);

  const triggerMatchmaking = () => {
    setMatchmaking(true);
    audioEngine.playHatchRoll();

    setTimeout(() => {
      const activePlayers = mockDb.getUsers().filter(u => u.role === 'player' && u.username !== playerUser.username);
      const randomOpponent = (activePlayers.length > 0 ? activePlayers[Math.floor(Math.random() * activePlayers.length)] : { id: 'player-lucas', username: 'lucas', role: 'player' }) as any;
      const opponentEmoji = randomOpponent.username === 'sofia' ? '🧪' : randomOpponent.username === 'beatriz' ? '👑' : '🧙‍♂️';
      
      setMatchedOpponent({
        username: randomOpponent.username,
        level: mockDb.getGameState(randomOpponent.id || 'player-lucas')?.auraLevel || 40,
        rebirths: mockDb.getGameState(randomOpponent.id || 'player-lucas')?.rebirths || 1,
        emoji: opponentEmoji,
      });

      setMatchmaking(false);
      audioEngine.playHatchSuccess();
      startBattle('pvp');
    }, 2000);
  };

  // Stats trackers
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [perfectBattle, setPerfectBattle] = useState(true);

  // Spells / Hitsplats
  const [hitSplats, setHitSplats] = useState<Array<{ id: string; text: string; isPlayer: boolean; type: 'critical' | 'normal' | 'error' }>>([]);

  // Quest Counters in this battle
  const [battleCriticals, setBattleCriticals] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const spawnHitSplat = (text: string, isPlayer: boolean, type: 'critical' | 'normal' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setHitSplats(prev => [...prev, { id, text, isPlayer, type }]);
    setTimeout(() => {
      setHitSplats(prev => prev.filter(hs => hs.id !== id));
    }, 1200);
  };

  // Generate question
  const generateQuestion = (): Question => {
    let num1 = 2;
    let num2 = 2;
    let isWeakPoint = false;
    let op = gameState.selectedOperation || 'multiplication';
    if (campaignStageId) {
      op = getCampaignOp(campaignStageId);
    }
    const opSym = getOperationSymbol(op);

    try {
      const stats = mockDb.getMathStats(userId);
      const weakSpots = stats.filter(stat => {
        const hasLegacyX = stat.questionKey.includes('x') && op === 'multiplication';
        const hasOpSym = stat.questionKey.includes(opSym);
        if (!hasLegacyX && !hasOpSym) return false;

        const parts = hasLegacyX ? stat.questionKey.split('x') : stat.questionKey.split(opSym);
        const n1 = parseInt(parts[0]);
        if (isNaN(n1)) return false;

        let zoneMatches = false;
        if (op === 'multiplication') {
          const isForestTable = [2, 3, 4, 5].includes(n1);
          const isVolcanoTable = [6, 7, 8, 9].includes(n1);
          zoneMatches = (zone === 'forest' && isForestTable) || (zone === 'volcano' && isVolcanoTable);
        } else if (op === 'addition') {
          if (zone === 'forest') {
            zoneMatches = n1 >= 2 && n1 <= 15;
          } else {
            zoneMatches = n1 >= 10 && n1 <= 50;
          }
        } else if (op === 'subtraction') {
          if (zone === 'forest') {
            zoneMatches = n1 >= 5 && n1 <= 30;
          } else {
            zoneMatches = n1 >= 15 && n1 <= 100;
          }
        } else if (op === 'division') {
          const divisor = parseInt(parts[1]);
          if (!isNaN(divisor)) {
            const isForestDiv = [2, 3, 4, 5].includes(divisor);
            const isVolcanoDiv = [6, 7, 8, 9].includes(divisor);
            zoneMatches = (zone === 'forest' && isForestDiv) || (zone === 'volcano' && isVolcanoDiv);
          }
        }
        return stat.errorCount >= 2 && zoneMatches;
      });

      // 35% chance to trigger an adaptive review question if weak spots exist
      if (weakSpots.length > 0 && Math.random() < 0.35) {
        const spot = weakSpots[Math.floor(Math.random() * weakSpots.length)];
        const parts = spot.questionKey.includes('x') ? spot.questionKey.split('x') : spot.questionKey.split(opSym);
        num1 = parseInt(parts[0]);
        num2 = parseInt(parts[1]);
        isWeakPoint = true;
      }
    } catch (e) {
      console.warn('Error fetching adaptive stats:', e);
    }

    let answer = 0;
    if (!isWeakPoint) {
      // Calculate cycle factor for campaign mode difficulty scaling
      const cycle = campaignStageId ? Math.floor((campaignStageId - 1) / 5) + 1 : 1;
      const difficultyMultiplier = 1 + (cycle - 1) * 0.5; // increases range by 50% each cycle

      if (op === 'addition') {
        if (zone === 'forest' || campaignStageId) {
          const maxVal = Math.round(15 * difficultyMultiplier);
          num1 = Math.floor(Math.random() * (maxVal - 1)) + 2;
          num2 = Math.floor(Math.random() * (maxVal - 1)) + 2;
        } else {
          num1 = Math.floor(Math.random() * 41) + 10;
          num2 = Math.floor(Math.random() * 41) + 10;
        }
        answer = num1 + num2;
      } else if (op === 'subtraction') {
        if (zone === 'forest' || campaignStageId) {
          const maxVal = Math.round(30 * difficultyMultiplier);
          num1 = Math.floor(Math.random() * (maxVal - 4)) + 5;
          num2 = Math.floor(Math.random() * (num1 - 2)) + 2;
        } else {
          num1 = Math.floor(Math.random() * 86) + 15;
          num2 = Math.floor(Math.random() * (num1 - 2)) + 2;
        }
        answer = num1 - num2;
      } else if (op === 'division') {
        let divisor = 2;
        let quotient = 2;
        if (zone === 'forest' || campaignStageId) {
          const divisors = [2, 3, 4, 5].map(d => Math.round(d * (1 + (cycle - 1) * 0.2)));
          divisor = divisors[Math.floor(Math.random() * divisors.length)];
        } else {
          const divisors = [6, 7, 8, 9];
          divisor = divisors[Math.floor(Math.random() * divisors.length)];
        }
        const maxQuotient = Math.round(10 * difficultyMultiplier);
        quotient = Math.floor(Math.random() * (maxQuotient - 1)) + 2;
        num1 = divisor * quotient;
        num2 = divisor;
        answer = quotient;
      } else {
        if (zone === 'forest' || campaignStageId) {
          const tables = [2, 3, 4, 5].map(t => Math.round(t * (1 + (cycle - 1) * 0.2)));
          num1 = tables[Math.floor(Math.random() * tables.length)];
        } else {
          const tables = [6, 7, 8, 9];
          num1 = tables[Math.floor(Math.random() * tables.length)];
        }
        const maxFactor = Math.round(9 * difficultyMultiplier);
        num2 = Math.floor(Math.random() * (maxFactor - 1)) + 2;
        answer = num1 * num2;
      }
    } else {
      if (op === 'addition') answer = num1 + num2;
      else if (op === 'subtraction') answer = num1 - num2;
      else if (op === 'division') answer = Math.round(num1 / num2);
      else answer = num1 * num2;
    }

    const key = op === 'multiplication' ? `${num1}x${num2}` : `${num1}${opSym}${num2}`;

    // Generate multiple choice options
    const choices = new Set<number>([answer]);
    while (choices.size < 4) {
      let fakeAnswer = 0;
      if (op === 'multiplication') {
        const offset = (Math.floor(Math.random() * 5) - 2) * num1;
        fakeAnswer = answer + (offset === 0 ? num1 : offset);
      } else if (op === 'division') {
        const offset = Math.floor(Math.random() * 5) - 2;
        fakeAnswer = answer + (offset === 0 ? 3 : offset);
      } else if (op === 'addition' || op === 'subtraction') {
        const offset = Math.floor(Math.random() * 7) - 3;
        fakeAnswer = answer + (offset === 0 ? 4 : offset);
      } else {
        fakeAnswer = answer + Math.floor(Math.random() * 15) + 1;
      }

      if (fakeAnswer > 0 && fakeAnswer !== answer) {
        choices.add(fakeAnswer);
      } else {
        choices.add(answer + Math.floor(Math.random() * 15) + 1);
      }
    }

    return {
      num1,
      num2,
      answer,
      choices: Array.from(choices).sort(() => Math.random() - 0.5),
      key,
      isWeakPoint,
      op,
    };
  };

  // Start battle
  const startBattle = (mode: 'solo' | 'pvp' | 'coop') => {
    setBattleMode(mode);

    let baseMaxHp = 3;
    let monsterName = '';
    let monsterEmoji = '';

    if (mode === 'coop') {
      monsterName = 'Mega Glitch Titan 👾';
      monsterEmoji = '👾';
      baseMaxHp = 12;
    } else if (mode === 'pvp') {
      const opponentName = matchedOpponent?.username || 'lucas';
      monsterName = `Duelo: ${opponentName}`;
      monsterEmoji = matchedOpponent?.emoji || '🧙‍♂️';
      baseMaxHp = 4;
    } else {
      const list = MONSTERS[zone];
      const template = list[Math.floor(Math.random() * list.length)];
      monsterName = template.name;
      monsterEmoji = template.emoji;
      baseMaxHp = template.maxHp;
    }

    const scaledMaxHp = scaleMonsterHp(baseMaxHp, mode);

    setMonster({
      name: monsterName,
      emoji: monsterEmoji,
      maxHp: scaledMaxHp,
      hp: scaledMaxHp,
    });

    setPlayerHp(maxPlayerHp);
    setPerfectBattle(true);
    setQuestionsAnswered(0);
    setBattleCriticals(0);
    setCurrentStreak(0);
    setMaxStreak(0);

    if (mode === 'pvp') {
      setBattleLogs([`Duelo PvP Iniciado! Enfrente ${monsterName} (${monsterEmoji})!`]);
    } else if (mode === 'coop') {
      setBattleLogs([`Raid Co-op Iniciada! Junte-se a Sofia e Gabriel para derrotar ${monsterName}!`]);
    } else {
      setBattleLogs([`A batalha começou! Um ${monsterName} (${monsterEmoji}) surgiu!`]);
    }

    setBattleState('fighting');

    // Generate first question
    const q = generateQuestion();
    setCurrentQuestion(q);
    setTextAnswer('');
    setTimeLeft(timeLimit);
    setTimerActive(true);
  };

  const startCampaignBattle = (stageId: number) => {
    setBattleMode('campaign');

    const cycle = Math.floor((stageId - 1) / 5) + 1;
    const stageIndex = (stageId - 1) % 5;

    let baseMaxHp = 3;
    let monsterName = '';
    let monsterEmoji = '';

    switch (stageIndex) {
      case 0:
        monsterName = `Slime de Código (Ciclo ${cycle})`;
        monsterEmoji = '🧪';
        baseMaxHp = 3 + (cycle - 1) * 2;
        break;
      case 1:
        monsterName = `Bug de Subtração (Ciclo ${cycle})`;
        monsterEmoji = '🕷️';
        baseMaxHp = 4 + (cycle - 1) * 2;
        break;
      case 2:
        monsterName = `Trojan Divisor (Ciclo ${cycle})`;
        monsterEmoji = '👾';
        baseMaxHp = 4 + (cycle - 1) * 2;
        break;
      case 3:
        monsterName = `Dragão Corrupto (Ciclo ${cycle})`;
        monsterEmoji = '🐉';
        baseMaxHp = 5 + (cycle - 1) * 3;
        break;
      case 4:
        monsterName = `Rei Glitch Core (Ciclo ${cycle})`;
        monsterEmoji = '🔮';
        baseMaxHp = 6 + (cycle - 1) * 4;
        break;
      default:
        monsterName = `Glitch Core (Ciclo ${cycle})`;
        monsterEmoji = '👾';
        baseMaxHp = 3;
        break;
    }

    const scaledMaxHp = scaleMonsterHp(baseMaxHp, 'campaign');

    setMonster({
      name: monsterName,
      emoji: monsterEmoji,
      maxHp: scaledMaxHp,
      hp: scaledMaxHp,
    });

    setPlayerHp(maxPlayerHp);
    setPerfectBattle(true);
    setQuestionsAnswered(0);
    setBattleCriticals(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setVictoryDialogueIndex(null);

    setBattleLogs([`Batalha de Campanha Iniciada! Enfrente ${monsterName} (${monsterEmoji})!`]);

    setBattleState('fighting');

    // Generate first question
    const q = generateQuestion();
    setCurrentQuestion(q);
    setTextAnswer('');
    setTimeLeft(timeLimit);
    setTimerActive(true);
  };

  // Initialize
  useEffect(() => {
    if (campaignStageId) {
      startCampaignBattle(campaignStageId);
    }
    return () => stopTimer();
  }, [campaignStageId]);

  // Timer loop
  useEffect(() => {
    if (!timerActive || battleState !== 'fighting') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return Math.round((prev - 0.1) * 10) / 10;
      });
    }, 100);

    return () => stopTimer();
  }, [timerActive, battleState, currentQuestion]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Handle Timeout
  const handleTimeout = () => {
    if (!currentQuestion) return;
    
    mockDb.recordMathAnswer(userId, currentQuestion.key, false, timeLimit * 1000);

    setCurrentStreak(0);
    vfxCanvasRef.current?.fireProjectile('monster', () => {
      vfxCanvasRef.current?.triggerExplosion('player', 'error');
      audioEngine.playError();
      setPerfectBattle(false);
      spawnHitSplat('ESCUDO DANO! -1 🛡️', true, 'error');
      setPlayerHp(prev => {
        const next = prev - 1;
        if (next <= 0) {
          handleDefeat();
        }
        return next;
      });
      triggerFlashEffect('incorrect');
      triggerPlayerShake();
    });

    nextTurnLog(`O tempo acabou! O monstro te atacou. Perdemos 1 Escudo.`);
    
    if (playerHp - 1 > 0) {
      setIsFeedbackActive(true);
      setTimeout(() => {
        setIsFeedbackActive(false);
        nextQuestion();
      }, 3500);
    }
  };

  // Handle Answer Submission
  const handleAnswerSubmit = (submittedValue: number) => {
    if (!currentQuestion || battleState !== 'fighting' || isFeedbackActive) return;
    
    stopTimer();
    const timeTakenMs = (timeLimit - timeLeft) * 1000;
    const isCorrect = submittedValue === currentQuestion.answer;
    const opSym = getOperationSymbol(currentQuestion.op || gameState.selectedOperation || 'multiplication');

    mockDb.recordMathAnswer(userId, currentQuestion.key, isCorrect, timeTakenMs);

    if (isCorrect) {
      setCurrentStreak(prev => {
        const next = prev + 1;
        setMaxStreak(curr => Math.max(curr, next));
        return next;
      });

      const isCritical = timeLeft > (timeLimit * 0.6);

      if (isCritical) {
        setBattleCriticals(prev => prev + 1);
      }

      const petElem = getPetElement();
      const monsterElem = getMonsterElement(monster.name, monster.emoji);
      let isElementAdvantage = false;
      if (petElem && monsterElem) {
        if (
          (petElem === 'fire' && monsterElem === 'ice') ||
          (petElem === 'ice' && monsterElem === 'electric') ||
          (petElem === 'electric' && monsterElem === 'fire') ||
          (petElem === 'cosmic')
        ) {
          isElementAdvantage = true;
        }
      }

      const baseDamage = isCritical ? 2 : 1;
      const damageDealt = isElementAdvantage ? baseDamage + 1 : baseDamage;

      const op = currentQuestion.op || gameState.selectedOperation || 'multiplication';
      vfxCanvasRef.current?.fireProjectile('player', () => {
        vfxCanvasRef.current?.triggerExplosion('monster', isCritical ? 'critical' : 'normal', op);
        if (isCritical) {
          audioEngine.playCritical();
          triggerFlashEffect('critical');
          spawnHitSplat(`💥 CRITICAL! -${damageDealt} HP${isElementAdvantage ? ' ⚡BÔNUS!' : ''}`, false, 'critical');
          setMonster(prev => {
            const nextHp = prev.hp - damageDealt;
            if (nextHp <= 0) {
              handleVictory();
            }
            return { ...prev, hp: Math.max(0, nextHp) };
          });
        } else {
          audioEngine.playCorrect();
          triggerFlashEffect('correct');
          spawnHitSplat(`-${damageDealt} HP${isElementAdvantage ? ' ⚡BÔNUS!' : ''}`, false, 'normal');
          setMonster(prev => {
            const nextHp = prev.hp - damageDealt;
            if (nextHp <= 0) {
              handleVictory();
            }
            return { ...prev, hp: Math.max(0, nextHp) };
          });
        }
        triggerMonsterShake();
      }, isCritical, op);

      if (isCritical) {
        nextTurnLog(`Ataque Crítico! Acerto super rápido de ${currentQuestion.num1}${opSym}${currentQuestion.num2}. Causou ${damageDealt} de dano! ${isElementAdvantage ? '🔥 Vantagem Elemental!' : ''}`);
      } else {
        nextTurnLog(`Acerto normal! Resposta correta para ${currentQuestion.num1}${opSym}${currentQuestion.num2}. Causou ${damageDealt} de dano! ${isElementAdvantage ? '🔥 Vantagem Elemental!' : ''}`);
      }
      
      if (gameState.clanId) {
        backendService.damageClanBoss(userId, gameState.clanId, damageDealt).then(res => {
          if (res && res.defeated) {
            audioEngine.playLevelUp();
            alert(`🎉 Incrível! O Chefe do Clã foi derrotado!\nTodos os membros ganharam +${res.rewardGems} Gemas!\nO Chefe renasceu no Nível ${res.bossLevel}!`);
          }
        }).catch(err => console.error('Error damaging clan boss:', err));
      }

      if (monster.hp - damageDealt > 0) {
        nextQuestion();
      }
    } else {
      setCurrentStreak(0);
      vfxCanvasRef.current?.fireProjectile('monster', () => {
        vfxCanvasRef.current?.triggerExplosion('player', 'error');
        audioEngine.playError();
        setPerfectBattle(false);
        spawnHitSplat('ERRO! -1 🛡️', true, 'error');
        setPlayerHp(prev => {
          const next = prev - 1;
          if (next <= 0) {
            handleDefeat();
          }
          return next;
        });
        triggerFlashEffect('incorrect');
        triggerPlayerShake();
      });

      nextTurnLog(`Erro! A resposta de ${currentQuestion.num1}${opSym}${currentQuestion.num2} era ${currentQuestion.answer}. Perdemos 1 Escudo.`);

      if (playerHp - 1 > 0) {
        setIsFeedbackActive(true);
        setTimeout(() => {
          setIsFeedbackActive(false);
          nextQuestion();
        }, 3500);
      }
    }
  };

  const nextQuestion = () => {
    setQuestionsAnswered(prev => prev + 1);
    const q = generateQuestion();
    const opSym = getOperationSymbol(q.op || gameState.selectedOperation || 'multiplication');
    if (q.isWeakPoint) {
      nextTurnLog(`⚠️ Zona Instável! Inimigo explorando sua fraqueza em ${q.num1}${opSym}${q.num2}!`);
    }
    setCurrentQuestion(q);
    setTextAnswer('');
    setTimeLeft(timeLimit);
    setTimerActive(true);
  };

  const nextTurnLog = (message: string) => {
    setBattleLogs(prev => [message, ...prev.slice(0, 4)]);
  };

  // Victory / Defeat Transitions
  const handleVictory = () => {
    stopTimer();
    audioEngine.playLevelUp();

    if (campaignStageId) {
      setVictoryDialogueIndex(0);
      setBattleState('won');
      return;
    }

    setBattleState('won');

    // Reward math calculations
    const baseXP = isVolcano ? 75 : 30;
    const baseGems = isVolcano ? 4 : 1;
    const perfectBonusGems = perfectBattle ? 3 : 0;

    // Apply multiplier buffs
    const rebirthXpMult = 1 + (gameState.rebirths * 0.2);

    let xpGained = Math.round(baseXP * xpMultiplier * rebirthXpMult);
    let gemsGained = Math.round((baseGems + perfectBonusGems) * gemMultiplier);

    // Apply PvP or Co-op mode multipliers
    if (battleMode === 'pvp') {
      xpGained = Math.round(xpGained * 1.5);
      gemsGained = Math.round(gemsGained * 1.5);
    } else if (battleMode === 'coop') {
      xpGained = Math.round(xpGained * 2.0);
      gemsGained = Math.round(gemsGained * 2.0);
    }

    setVictoryRewards({ xp: xpGained, gems: gemsGained });

    // Update database GameState
    const currentXp = gameState.auraXp + xpGained;
    let newLevel = gameState.auraLevel;
    let newXp = currentXp;

    const getXpNeeded = (lvl: number) => Math.round(100 * Math.pow(1.15, lvl - 1));
    
    let boundary = getXpNeeded(newLevel);
    let leveledUp = false;

    while (newXp >= boundary && newLevel < 100) {
      newXp -= boundary;
      newLevel++;
      boundary = getXpNeeded(newLevel);
      leveledUp = true;
    }

    if (leveledUp) {
      nextTurnLog(`🎉 SUBIU DE NÍVEL! Agora você está no Nível de Aura ${newLevel}!`);
    }

    // Sync quest stats upon victory
    const newQuestWins = (gameState.questWins || 0) + 1;
    const newQuestCriticals = (gameState.questCriticals || 0) + battleCriticals;
    const newQuestStreak = Math.max(gameState.questStreak || 0, maxStreak);

    mockDb.updateGameState(userId, {
      auraLevel: newLevel,
      auraXp: newXp,
      gems: gameState.gems + gemsGained,
      questWins: newQuestWins,
      questCriticals: newQuestCriticals,
      questStreak: newQuestStreak,
    });

    onBattleFinished(xpGained, gemsGained, true);
  };

  const handleDefeat = () => {
    stopTimer();
    setBattleState('lost');
    audioEngine.playError();
    // 10 consolation XP
    mockDb.updateGameState(userId, {
      auraXp: gameState.auraXp + 10,
    });
    onBattleFinished(10, 0, false);
  };

  // Keyboard listener for typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (battleState !== 'fighting' || isFeedbackActive) return;

      if (e.key === 'Enter') {
        const val = parseInt(textAnswer);
        if (!isNaN(val)) {
          handleAnswerSubmit(val);
        }
      } else if (e.key === 'Backspace') {
        setTextAnswer(prev => prev.slice(0, -1));
      } else if (/^[0-9]$/.test(e.key)) {
        if (textAnswer.length < 4) {
          setTextAnswer(prev => prev + e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [textAnswer, battleState, currentQuestion]);

  // Flash UI screen triggers
  const triggerFlashEffect = (type: 'correct' | 'critical' | 'incorrect') => {
    setFlashEffect(type);
    setTimeout(() => setFlashEffect(null), 400);
  };

  const triggerMonsterShake = () => {
    setMonsterShake(true);
    setScreenShake(true);
    setTimeout(() => {
      setMonsterShake(false);
      setScreenShake(false);
    }, 400);
  };

  const triggerPlayerShake = () => {
    setPlayerShake(true);
    setScreenShake(true);
    setTimeout(() => {
      setPlayerShake(false);
      setScreenShake(false);
    }, 400);
  };

  const handleNumpadClick = (num: string) => {
    audioEngine.playHatchRoll();
    if (textAnswer.length < 4) {
      setTextAnswer(prev => prev + num);
    }
  };

  const handleNumpadClear = () => {
    audioEngine.playHatchRoll();
    setTextAnswer('');
  };

  const handleNumpadSend = () => {
    const val = parseInt(textAnswer);
    if (!isNaN(val)) {
      handleAnswerSubmit(val);
    }
  };

  // UI helpers
  const getTimerColor = () => {
    const percentage = timeLeft / timeLimit;
    if (percentage > 0.5) return 'var(--neon-cyan)';
    if (percentage > 0.25) return 'var(--neon-yellow)';
    return 'var(--neon-pink)';
  };

  const getFlashColor = () => {
    if (flashEffect === 'critical') return 'rgba(234, 179, 8, 0.25)'; // Golden
    if (flashEffect === 'correct') return 'rgba(34, 197, 94, 0.25)'; // Green
    if (flashEffect === 'incorrect') return 'rgba(244, 63, 94, 0.25)'; // Pink/Red
    return 'transparent';
  };

  if (battleMode === 'select') {
    return (
      <div style={{ padding: '20px', minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        <div className="cyber-card" style={{ width: '100%', maxWidth: '600px', textAlign: 'center', border: '2px solid rgba(0, 255, 204, 0.25)', boxShadow: '0 0 25px rgba(0, 255, 204, 0.15)' }}>
          <h1 className="text-glow-cyan" style={{ fontSize: '2.2rem', color: 'var(--neon-cyan)', marginBottom: '10px' }}>
            ⚔️ SELECIONE O MODO DE BATALHA
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
            Escolha como você quer treinar a tabuada de **{getOperationSymbol(gameState.selectedOperation || 'multiplication')}** nesta zona!
          </p>

          {matchmaking ? (
            <div style={{ padding: '40px 0' }}>
              <div className="animate-float" style={{ fontSize: '4rem', marginBottom: '20px' }}>🌐</div>
              <h3 className="text-glow-purple" style={{ color: 'var(--neon-purple)', fontSize: '1.4rem', fontWeight: 800 }}>Procurando Oponente...</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>Conectando com o servidor de treino...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <button
                className="cyber-btn cyber-btn-cyan"
                onClick={() => startBattle('solo')}
                style={{ padding: '16px', fontSize: '1.1rem', justifyContent: 'space-between', width: '100%' }}
              >
                <span>Solo (Treino Tradicional)</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Recompensa Normal ➔</span>
              </button>

              <button
                className="cyber-btn"
                onClick={triggerMatchmaking}
                style={{ padding: '16px', fontSize: '1.1rem', justifyContent: 'space-between', width: '100%', borderColor: 'var(--neon-purple)', background: 'rgba(168, 85, 247, 0.1)' }}
              >
                <span>Duelo PvP 1v1 (Oponente Online)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--neon-purple)', fontWeight: 800 }}>+50% Recompensa ➔</span>
              </button>

              <button
                className="cyber-btn"
                onClick={() => startBattle('coop')}
                style={{ padding: '16px', fontSize: '1.1rem', justifyContent: 'space-between', width: '100%', borderColor: 'var(--neon-yellow)', background: 'rgba(234, 179, 8, 0.1)' }}
              >
                <span>Raid Co-op (Desafio de Chefe)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--neon-yellow)', fontWeight: 800 }}>+100% Recompensa ➔</span>
              </button>

              <button className="cyber-btn cyber-btn-pink" onClick={onBack} style={{ padding: '10px', marginTop: '10px', width: '100%' }}>
                Voltar ao Hub
              </button>

            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        transition: 'background-color 0.2s',
        backgroundColor: getFlashColor(),
      }}
    >
      
      {/* Header Info */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
          Local: <strong style={{ color: isVolcano ? 'var(--neon-pink)' : '#22c55e' }}>{isVolcano ? '🌋 Vulcão Glitch' : '🌲 Floresta Encantada'}</strong>
        </span>
        <button
          className="cyber-btn cyber-btn-pink"
          onClick={() => {
            if (window.confirm('Deseja fugir do combate? Você não ganhará recompensas.')) {
              onBack();
            }
          }}
          style={{ padding: '8px 16px' }}
        >
          🏳️ Fugir
        </button>
      </div>

      {battleState === 'fighting' && currentQuestion && (() => {
        const corruptionRatio = monster.hp / (monster.maxHp || 1);
        return (
          <div className={screenShake ? 'animate-shake' : ''} style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top Panel: HP Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Player Shields as RAM memory slots */}
              <div
                className={`cyber-card ${playerShake ? 'animate-shake' : ''}`}
                style={{
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                  background: 'rgba(59, 130, 246, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <CyberSprite
                  type="player"
                  equippedCosmeticId={gameState.equippedCosmeticId}
                  equippedCosmetics={gameState.equippedCosmetics}
                  auraColor={gameState.auraColor || '#00ffcc'}
                  width={45}
                  height={45}
                  classId={gameState.classId}
                  rebirths={gameState.rebirths}
                  level={gameState.auraLevel}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', textTransform: 'capitalize' }}>
                    {playerUser.username}
                  </div>
                  {(() => {
                    if (gameState.equippedPetId) {
                      const pets = mockDb.getPets(userId);
                      const pet = pets.find(p => p.id === gameState.equippedPetId);
                      if (pet) {
                        const pt = PET_TYPES.find(x => x.id === pet.petTypeId);
                        const emoji = pt?.emoji || '🐾';
                        const pElem = getPetElement();
                        const elementLabel = pElem === 'fire' ? '🔥 Fogo' : pElem === 'ice' ? '❄️ Gelo' : pElem === 'electric' ? '⚡ Raio' : pElem === 'cosmic' ? '🌌 Cósmico' : null;
                        const elementColor = pElem === 'fire' ? 'var(--neon-pink)' : pElem === 'ice' ? 'var(--neon-cyan)' : pElem === 'electric' ? 'var(--neon-yellow)' : 'var(--neon-purple)';
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                              Ajudante: {emoji} {pet.nickname}
                            </span>
                            {elementLabel && (
                              <span style={{ alignSelf: 'flex-start', fontSize: '0.65rem', background: elementColor + '20', color: elementColor, border: `1px solid ${elementColor}40`, padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                {elementLabel}
                              </span>
                            )}
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                  {/* RAM health HUD slots */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {[...Array(maxPlayerHp)].map((_, idx) => {
                      const isActive = idx < playerHp;
                      return (
                        <div
                          key={idx}
                          title={`RAM HP Slot ${idx + 1}`}
                          style={{
                            width: '45px',
                            height: '18px',
                            backgroundColor: isActive ? '#22c55e' : 'rgba(255,255,255,0.05)',
                            border: isActive ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '2px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-around',
                            padding: '0 2px',
                            boxShadow: isActive ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {/* RAM gold connectors on bottom */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '-2px',
                              left: '4px',
                              right: '4px',
                              height: '2px',
                              background: isActive ? 'linear-gradient(90deg, #eab308 50%, transparent 50%)' : 'rgba(255,255,255,0.1)',
                              backgroundSize: '4px 2px',
                            }}
                          />
                          {/* Micro chips on the stick */}
                          <div style={{ width: '6px', height: '8px', backgroundColor: isActive ? '#0f172a' : 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                          <div style={{ width: '6px', height: '8px', backgroundColor: isActive ? '#0f172a' : 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                          <div style={{ width: '6px', height: '8px', backgroundColor: isActive ? '#0f172a' : 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Monster HP */}
              <div
                className={`cyber-card ${monsterShake ? 'animate-shake' : ''}`}
                style={{
                  borderColor: 'rgba(244, 63, 94, 0.3)',
                  background: 'rgba(244, 63, 94, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--neon-pink)' }}>
                    {monster.name}
                  </div>
                  {(() => {
                    const mElem = getMonsterElement(monster.name, monster.emoji);
                    if (mElem) {
                      const badge = mElem === 'fire' ? '🔥 Fogo' : mElem === 'ice' ? '❄️ Gelo' : mElem === 'electric' ? '⚡ Raio' : '🌌 Cósmico';
                      const badgeColor = mElem === 'fire' ? 'var(--neon-pink)' : mElem === 'ice' ? 'var(--neon-cyan)' : mElem === 'electric' ? 'var(--neon-yellow)' : 'var(--neon-purple)';
                      return (
                        <div style={{ display: 'inline-block', fontSize: '0.65rem', background: badgeColor + '20', color: badgeColor, border: `1px solid ${badgeColor}40`, padding: '1px 6px', borderRadius: '4px', marginTop: '2px', fontWeight: 'bold' }}>
                          Elemento: {badge}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {/* Monster HP Progress Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%', marginTop: '6px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                      HP: <strong style={{ color: 'var(--neon-pink)' }}>{monster.hp}</strong> / {monster.maxHp}
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px', maxWidth: '200px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                      <div
                        style={{
                          width: `${(monster.hp / monster.maxHp) * 100}%`,
                          height: '100%',
                          backgroundColor: 'var(--neon-pink)',
                          boxShadow: '0 0 6px var(--neon-pink)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
                <CyberSprite type="monster" name={monster.name} width={45} height={45} />
              </div>

            </div>

            {/* Element Advantage Guide */}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', color: '#fff' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--neon-yellow)' }}>🌲 Dicas de Elementos:</span>
              <span>🔥 Ganha de ❄️</span>
              <span>•</span>
              <span>❄️ Ganha de ⚡</span>
              <span>•</span>
              <span>⚡ Ganha de 🔥</span>
              <span>•</span>
              <span>🌌 Cósmico Ganha de Todos! (+1 Dano)</span>
            </div>

            {/* Core Arena Canvas Area */}
            <div
              className="cyber-card"
              style={{
                height: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                background: 'radial-gradient(circle at center, #0f172a 0%, #030712 100%)',
                borderColor: 'rgba(168, 85, 247, 0.2)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Parallax Forest background: falling binary streams */}
              {!isVolcano && (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
                  <div style={{ position: 'absolute', top: 0, left: '10%', fontSize: '0.65rem', color: '#22c55e', opacity: 0.15, animation: 'fall 8s linear infinite', animationDelay: '0s' }}>010110</div>
                  <div style={{ position: 'absolute', top: 0, left: '35%', fontSize: '0.7rem', color: '#22c55e', opacity: 0.1, animation: 'fall 11s linear infinite', animationDelay: '3s' }}>100101</div>
                  <div style={{ position: 'absolute', top: 0, left: '60%', fontSize: '0.6rem', color: '#22c55e', opacity: 0.15, animation: 'fall 9s linear infinite', animationDelay: '1.5s' }}>110010</div>
                  <div style={{ position: 'absolute', top: 0, left: '85%', fontSize: '0.7rem', color: '#22c55e', opacity: 0.1, animation: 'fall 13s linear infinite', animationDelay: '5s' }}>011011</div>
                  <div style={{ position: 'absolute', top: 0, left: '20%', fontSize: '0.85rem', color: '#00ffcc', opacity: 0.25, animation: 'fall 6s linear infinite', animationDelay: '2s' }}>1010</div>
                  <div style={{ position: 'absolute', top: 0, left: '50%', fontSize: '0.9rem', color: '#00ffcc', opacity: 0.2, animation: 'fall 7.5s linear infinite', animationDelay: '0.5s' }}>0101</div>
                  <div style={{ position: 'absolute', top: 0, left: '75%', fontSize: '0.8rem', color: '#00ffcc', opacity: 0.25, animation: 'fall 5s linear infinite', animationDelay: '4s' }}>1100</div>
                  <div style={{ position: 'absolute', top: 0, left: '40%', fontSize: '1.2rem', color: '#4ade80', opacity: 0.35, filter: 'blur(1px)', animation: 'fall 3.5s linear infinite', animationDelay: '1s' }}>10</div>
                  <div style={{ position: 'absolute', top: 0, left: '80%', fontSize: '1.1rem', color: '#4ade80', opacity: 0.3, filter: 'blur(1px)', animation: 'fall 4.2s linear infinite', animationDelay: '2.5s' }}>01</div>
                </div>
              )}

              {/* Parallax Volcano background: rising magma bubbles & circuits */}
              {isVolcano && (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
                  <div style={{ position: 'absolute', bottom: 0, left: '15%', fontSize: '0.7rem', opacity: 0.2, animation: 'float-up 9s linear infinite', animationDelay: '0s' }}>🔴</div>
                  <div style={{ position: 'absolute', bottom: 0, left: '45%', fontSize: '0.6rem', opacity: 0.15, animation: 'float-up 11s linear infinite', animationDelay: '3s' }}>🔸</div>
                  <div style={{ position: 'absolute', bottom: 0, left: '70%', fontSize: '0.8rem', opacity: 0.2, animation: 'float-up 8s linear infinite', animationDelay: '1.5s' }}>🔴</div>
                  <div style={{ position: 'absolute', bottom: 0, left: '30%', fontSize: '1.1rem', opacity: 0.3, animation: 'float-up 6s linear infinite', animationDelay: '2s' }}>🔥</div>
                  <div style={{ position: 'absolute', bottom: 0, left: '60%', fontSize: '0.9rem', opacity: 0.25, animation: 'float-up 7s linear infinite', animationDelay: '4.5s' }}>🔸</div>
                  <div style={{ position: 'absolute', bottom: 0, left: '85%', fontSize: '1.2rem', opacity: 0.3, animation: 'float-up 5.2s linear infinite', animationDelay: '1s' }}>🔥</div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '10%',
                      width: '60px',
                      height: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
                      animation: 'float-up 15s linear infinite',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '60px',
                      left: '75%',
                      width: '80px',
                      height: '8px',
                      backgroundColor: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      boxShadow: '0 0 10px rgba(244, 63, 94, 0.2)',
                      animation: 'float-up 18s linear infinite',
                      animationDelay: '4s',
                    }}
                  />
                </div>
              )}

              {/* Visual background grid effect (color shifts based on purification ratio) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.2,
                  backgroundImage: `linear-gradient(${getGridColor(corruptionRatio)} 1px, transparent 1px), linear-gradient(90deg, ${getGridColor(corruptionRatio)} 1px, transparent 1px)`,
                  backgroundSize: '24px 24px',
                  transition: 'background-image 0.3s ease',
                  zIndex: 2,
                }}
              />

              {/* Scanline overlay (fades as purified) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
                  backgroundSize: '100% 4px',
                  opacity: 0.1 + corruptionRatio * 0.3,
                  zIndex: 3,
                }}
              />

              {/* Canvas Particle VFX System */}
              <CombatVfxCanvas ref={vfxCanvasRef} />

              {/* Hit Splats rendering */}
              {hitSplats.map(hs => (
                <div
                  key={hs.id}
                  className={`hit-splat hit-splat-${hs.type}`}
                  style={{
                    left: hs.isPlayer ? '20%' : '70%',
                    top: '25%',
                    zIndex: 10,
                  }}
                >
                  {hs.text}
                </div>
              ))}

              {/* Critical notification flashes */}
              {flashEffect === 'critical' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    color: 'var(--neon-yellow)',
                    fontWeight: 900,
                    fontSize: '1.8rem',
                    textShadow: '0 0 10px var(--neon-yellow)',
                    animation: 'pulse-ring 0.3s infinite alternate',
                    zIndex: 10,
                  }}
                >
                  💥 ATAQUE CRÍTICO! 💥
                </div>
              )}

              {/* Characters visualization */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', position: 'relative', zIndex: 4 }}>
                <div
                  className={playerShake ? 'animate-shake' : ''}
                  style={{
                    transform: 'scaleX(-1)',
                    transition: 'transform 0.2s',
                    zIndex: 2,
                  }}
                >
                  <CyberSprite
                    type="player"
                    equippedCosmeticId={gameState.equippedCosmeticId}
                    equippedCosmetics={gameState.equippedCosmetics}
                    auraColor={gameState.auraColor || '#00ffcc'}
                    width={110}
                    height={110}
                    classId={gameState.classId}
                    rebirths={gameState.rebirths}
                    level={gameState.auraLevel}
                  />
                </div>
                {battleMode === 'coop' && (
                  <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '10px', zIndex: 3, marginTop: '-15px' }}>
                    <CyberSprite type="monster" name="slime" width={22} height={22} />
                    <CyberSprite type="monster" name="robo" width={22} height={22} />
                  </div>
                )}
              </div>

              {/* Versus Spark */}
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: 'rgba(255,255,255,0.2)',
                  fontStyle: 'italic',
                  fontFamily: 'Share Tech Mono',
                  zIndex: 2,
                }}
              >
                VS
              </div>

              <div
                className={monsterShake ? 'animate-shake' : 'animate-float'}
                style={{
                  transition: 'transform 0.2s, filter 0.3s ease',
                  zIndex: 4,
                  filter: `
                    hue-rotate(${corruptionRatio * 90}deg)
                    saturate(${100 + corruptionRatio * 150}%)
                    contrast(${100 + corruptionRatio * 50}%)
                    drop-shadow(0 0 ${8 + corruptionRatio * 12}px ${corruptionRatio > 0.5 ? 'var(--neon-pink)' : 'var(--neon-cyan)'})
                  `,
                }}
              >
                <CyberSprite
                  type="monster"
                  name={monster.name}
                  width={120}
                  height={120}
                />
              </div>
            </div>

            {/* Equation & Answering Section */}
            <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              
              {/* Equation Header */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '1.1rem',
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Resolva para atacar! {currentStreak > 0 && <span style={{ color: 'var(--neon-pink)', marginLeft: '8px' }}>🔥 {currentStreak}</span>}
                </div>
                <div
                  style={{
                    fontFamily: 'Share Tech Mono',
                    fontSize: '3.5rem',
                    fontWeight: 'bold',
                    color: isFeedbackActive ? 'var(--neon-pink)' : 'var(--neon-cyan)',
                    textShadow: isFeedbackActive ? '0 0 15px rgba(244, 63, 94, 0.4)' : '0 0 15px rgba(0, 255, 204, 0.4)',
                    marginTop: '6px',
                  }}
                >
                  {currentQuestion.num1} {getOperationSymbol(currentQuestion.op || gameState.selectedOperation || 'multiplication')} {currentQuestion.num2} = {isFeedbackActive ? currentQuestion.answer : (textAnswer || '?')}
                </div>

                {isFeedbackActive && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1.5px solid var(--neon-pink)',
                      color: '#fff',
                      textAlign: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      boxShadow: '0 0 10px rgba(244, 63, 94, 0.2)'
                    }}
                  >
                    ❌ Resposta Incorreta! A resposta correta é: <span style={{ color: 'var(--neon-cyan)', fontSize: '1.4rem', fontFamily: 'Share Tech Mono' }}>{currentQuestion.answer}</span>
                  </div>
                )}
              </div>

              {/* Answering Timer Bar (Fiber Optic Design) */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                  <span>Cabo de Fibra Óptica (Tempo Restante)</span>
                  <span style={{ color: getTimerColor(), fontWeight: 'bold' }}>{timeLeft.toFixed(1)}s</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '14px',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '7px',
                    position: 'relative',
                    overflow: 'visible',
                    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.8)',
                  }}
                >
                  {/* Fiber core back shadow */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      left: '6px',
                      right: '6px',
                      bottom: '4px',
                      borderRadius: '3px',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                  />
                  
                  {/* Glowing fiber signal */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      left: '6px',
                      height: '6px',
                      width: `calc(${(timeLeft / timeLimit) * 100}% - 12px)`,
                      minWidth: '2px',
                      borderRadius: '3px',
                      background: `linear-gradient(90deg, transparent, ${getTimerColor()})`,
                      boxShadow: `0 0 10px ${getTimerColor()}, 0 0 4px #fff`,
                      transition: 'width 0.1s linear',
                    }}
                  />

                  {/* Short-circuit optical spark at the tip of the light */}
                  {timeLeft > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        left: `calc(${(timeLeft / timeLimit) * 100}% - 14px)`,
                        fontSize: '1.2rem',
                        textShadow: '0 0 8px #facc15',
                        animation: timeLeft / timeLimit < 0.3 ? 'animate-shake 0.15s infinite' : 'none',
                        transition: 'left 0.1s linear',
                        pointerEvents: 'none',
                        zIndex: 10,
                      }}
                    >
                      {timeLeft / timeLimit < 0.3 ? (Math.random() < 0.5 ? '⚡' : '🔥') : '✨'}
                    </div>
                  )}
                </div>
              </div>

            {/* Answer Control Modes: Multiple Choice (L) vs Numerical Keyboard (R) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', width: '100%' }}>
              
              {/* Multiple Choice Card */}
              <div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                  Opções Rápidas (Escolha uma)
                </div>
                <div className="grid-cols-2">
                  {currentQuestion.choices.map((choice) => (
                    <button
                      key={choice}
                      className="cyber-btn"
                      disabled={isFeedbackActive}
                      onClick={() => handleAnswerSubmit(choice)}
                      style={{
                        padding: '14px',
                        fontSize: '1.4rem',
                        fontFamily: 'Share Tech Mono',
                        opacity: isFeedbackActive ? 0.6 : 1,
                        cursor: isFeedbackActive ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>

              {/* Physical/On-Screen Typing Card */}
              <div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                  Teclado Numérico (Ou digite no teclado)
                </div>
                
                {/* Micro Numpad grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(num => (
                      <button
                        key={num}
                        className="cyber-btn cyber-btn-cyan"
                        disabled={isFeedbackActive}
                        onClick={() => handleNumpadClick(num)}
                        style={{ padding: '8px', fontSize: '1rem', fontFamily: 'Share Tech Mono', opacity: isFeedbackActive ? 0.6 : 1, cursor: isFeedbackActive ? 'not-allowed' : 'pointer' }}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      className="cyber-btn cyber-btn-pink"
                      disabled={isFeedbackActive}
                      onClick={handleNumpadClear}
                      style={{ padding: '8px', fontSize: '0.9rem', gridColumn: 'span 2', opacity: isFeedbackActive ? 0.6 : 1, cursor: isFeedbackActive ? 'not-allowed' : 'pointer' }}
                    >
                      Limpar
                    </button>
                  </div>
                  <button
                    className="cyber-btn"
                    onClick={handleNumpadSend}
                    disabled={!textAnswer || isFeedbackActive}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      borderColor: isFeedbackActive ? 'rgba(255,255,255,0.1)' : 'var(--neon-cyan)',
                      background: isFeedbackActive ? 'rgba(255,255,255,0.05)' : 'rgba(0, 255, 204, 0.1)',
                      opacity: (textAnswer && !isFeedbackActive) ? 1 : 0.5,
                      cursor: isFeedbackActive ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Enviar ➔
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Live Battle Log */}
          <div className="cyber-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Histórico de Combate
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
              {battleLogs.map((log, idx) => (
                <div key={idx} style={{ opacity: 1 - (idx * 0.2), color: idx === 0 ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>
        );
      })()}

      {/* Victory Screen */}
      {battleState === 'won' && (
        campaignStageId ? (
          (() => {
            const stages = getCampaignStages(gameState.campaignStage || 1);
            const stage = stages.find(s => s.id === campaignStageId);
            if (!stage) return null;
            const dialogues = stage.victoryDialogues || [];
            const currentDialogue = dialogues[victoryDialogueIndex ?? 0] || '';
            const isLast = (victoryDialogueIndex ?? 0) >= dialogues.length - 1;
            const speaker = currentDialogue.split(':')[0] || stage.npc;
            const text = currentDialogue.split(':').slice(1).join(':') || currentDialogue;
            const speakerEmoji = speaker.trim() === 'Mago' ? '🧙‍♂️' : stage.npcEmoji;

            return (
              <div
                className="cyber-card"
                style={{
                  width: '100%',
                  maxWidth: '550px',
                  border: `2px solid ${stage.color}`,
                  boxShadow: `0 0 25px ${stage.color}`,
                  padding: '30px',
                  marginTop: '40px',
                  textAlign: 'left'
                }}
              >
                <h3 style={{ margin: '0 0 20px 0', color: stage.color, fontSize: '1.3rem', textAlign: 'center', fontWeight: 800 }}>
                  🏆 FASE CONCLUÍDA!
                </h3>

                {/* Dialogue Box */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '20px',
                    minHeight: '120px',
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '24px'
                  }}
                >
                  {/* NPC Portrait */}
                  <div
                    style={{
                      fontSize: '3rem',
                      width: '70px',
                      height: '70px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {speakerEmoji}
                  </div>

                  {/* Dialogue Text */}
                  <div style={{ flex: 1, color: '#fff', fontSize: '1rem', lineHeight: '1.5rem' }}>
                    <strong style={{ color: stage.color, display: 'block', marginBottom: '6px' }}>
                      {speaker}
                    </strong>
                    <span>
                      {text}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {!isLast ? (
                    <button
                      className="cyber-btn"
                      style={{ borderColor: stage.color, padding: '12px 24px', fontSize: '0.95rem' }}
                      onClick={() => {
                        audioEngine.playHatchRoll();
                        setVictoryDialogueIndex(prev => (prev ?? 0) + 1);
                      }}
                    >
                      Próximo ➔
                    </button>
                  ) : (
                    <button
                      className="cyber-btn cyber-btn-cyan"
                      style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 800 }}
                      onClick={() => {
                        audioEngine.playHatchSuccess();
                        const rewards = getCampaignRewards(campaignStageId, gameState.campaignStage || 1);
                        onBattleFinished(rewards.xp, rewards.gems, true);
                      }}
                    >
                      Concluir e Resgatar Recompensas 🎁
                    </button>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div
            className="cyber-card"
            style={{
              width: '100%',
              maxWidth: '500px',
              textAlign: 'center',
              padding: '40px 30px',
              border: '2px solid var(--neon-cyan)',
              boxShadow: '0 0 35px rgba(0, 255, 204, 0.2)',
              marginTop: '40px',
            }}
          >
            <div style={{ fontSize: '5rem', marginBottom: '10px' }} className="animate-float">🏆</div>
            
            <h1 className="text-glow-cyan" style={{ color: 'var(--neon-cyan)', fontSize: '2.5rem', marginBottom: '6px' }}>
              VITÓRIA!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '24px' }}>
              Você purificou o **{monster.name}**!
            </p>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                Recompensas Obtidas:
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <span>Aura XP:</span>
                <span className="text-glow-purple" style={{ color: 'var(--neon-purple)', fontWeight: 800 }}>
                  +{victoryRewards.xp} XP
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <span>Questões Respondidas:</span>
                <strong style={{ color: 'var(--neon-cyan)' }}>{questionsAnswered}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <span>Gemas de Matemática:</span>
                <span className="text-glow-cyan" style={{ color: 'var(--neon-cyan)', fontWeight: 800 }}>
                  +🛡️ {victoryRewards.gems} Gemas
                </span>
              </div>

              {clanBonus.xpMultiplier > 1 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--neon-pink)', backgroundColor: 'rgba(244, 63, 94, 0.1)', padding: '6px', borderRadius: '4px', textAlign: 'center', marginTop: '12px' }}>
                  📈 Bônus de Clã Ativo (+{( (clanBonus.xpMultiplier - 1) * 100 ).toFixed(0)}%)
                </div>
              )}

              {perfectBattle && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--neon-yellow)',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    padding: '6px',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  ⭐ Bônus de Batalha Perfeita (+3 Gemas)! Sem dano levado.
                </div>
              )}
            </div>

            <button
              className="cyber-btn"
              onClick={onBack}
              style={{
                padding: '14px 40px',
                fontSize: '1.1rem',
                fontWeight: 800,
                width: '100%',
              }}
            >
              Retornar ao Hub ➔
            </button>
          </div>
        )
      )}

      {/* Defeat Screen */}
      {battleState === 'lost' && (
        <div
          className="cyber-card"
          style={{
            width: '100%',
            maxWidth: '500px',
            textAlign: 'center',
            padding: '40px 30px',
            border: '2px solid var(--neon-pink)',
            boxShadow: '0 0 35px rgba(244, 63, 94, 0.2)',
            marginTop: '40px',
          }}
        >
          <div style={{ fontSize: '5rem', marginBottom: '10px' }}>💀</div>
          
          <h1 className="text-glow-pink" style={{ color: 'var(--neon-pink)', fontSize: '2.5rem', marginBottom: '6px' }}>
            ESCUDO ZERADO
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '24px' }}>
            O **{monster.name}** esgotou seus escudos glitch.
          </p>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'left',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
              <span>Recompensa de Consolo:</span>
              <span className="text-glow-purple" style={{ color: 'var(--neon-purple)', fontWeight: 800 }}>
                +10 XP
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.2rem' }}>
              Não se preocupe! O erro faz parte do aprendizado. Tente jogar na Floresta Fácil para aquecer e tente novamente.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              className="cyber-btn"
              onClick={() => {
                if (campaignStageId) {
                  startCampaignBattle(campaignStageId);
                } else {
                  startBattle(battleMode as 'solo' | 'pvp' | 'coop');
                }
              }}
              style={{
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 800,
                flex: 1,
              }}
            >
              Tentar Novamente ↻
            </button>
            <button
              className="cyber-btn cyber-btn-pink"
              onClick={onBack}
              style={{
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 800,
                flex: 1,
              }}
            >
              Fugir para o Hub
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
