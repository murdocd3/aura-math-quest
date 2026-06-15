import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { mockDb, PET_TYPES, COSMETIC_ITEMS, SKILL_TREE, getPetEvolutionEmoji } from '../services/mockDb';
import type { User, GameState } from '../services/mockDb';
import { backendService } from '../services/backendService';
import { ParticleCanvas } from './ParticleCanvas';
import { Leaderboard } from './Leaderboard';
import type { LeaderboardEntry } from './Leaderboard';
import { audioEngine } from './AudioEngine';
import { CyberSprite } from './CyberSprite';
import { AuraPass } from './AuraPass';

const HubClans = lazy(() => import('./HubClans').then(m => ({ default: m.HubClans })));
const HubGincana = lazy(() => import('./HubGincana').then(m => ({ default: m.HubGincana })));
const HubShop = lazy(() => import('./HubShop').then(m => ({ default: m.HubShop })));

const TabLoadingSpinner = () => (
  <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <div className="cyber-btn" style={{ animation: 'pulse-ring 1s infinite alternate' }}>
      Carregando Dados...
    </div>
  </div>
);


export interface CampaignStage {
  id: number;
  name: string;
  npc: string;
  npcEmoji: string;
  color: string;
  op: string;
  desc: string;
  dialogues: string[];
  victoryDialogues: string[];
}

export const getCampaignStages = (currentStageId: number): CampaignStage[] => {
  const stages: CampaignStage[] = [];
  
  // Show all cleared stages, the currently active unlocked stage, plus one locked stage as preview
  const maxStageToShow = Math.max(5, currentStageId + 1);

  for (let id = 1; id <= maxStageToShow; id++) {
    const cycle = Math.floor((id - 1) / 5) + 1;
    const stageIndex = (id - 1) % 5;
    
    let name = "";
    let npc = "";
    let npcEmoji = "";
    let color = "";
    let op = "";
    let desc = "";
    let dialogues: string[] = [];
    let victoryDialogues: string[] = [];

    switch (stageIndex) {
      case 0:
        name = `Fase ${id}: O Despertar da Adição (Ciclo ${cycle})`;
        npc = "Alquimista Orion";
        npcEmoji = "🧙‍♂️";
        color = "var(--neon-cyan)";
        op = "Adição (+)";
        desc = `O código da Adição no Ciclo ${cycle} está instável. Purifique os dados corrompidos!`;
        dialogues = [
          `Orion: Saudações! A Grande Aura de Adição foi corrompida por vírus Glitch no Ciclo ${cycle}!`,
          "Mago: O que eu preciso fazer, Orion?",
          "Orion: Você deve canalizar sua energia de Adição. Resolva as equações para expurgar o Slime de Código!"
        ];
        victoryDialogues = [
          "Orion: Incrível! Você purificou o Slime de Código e estabilizou a Adição!",
          "Mago: Obrigado, Orion.",
          "Orion: Siga para a próxima dimensão. Kael precisa de sua ajuda com a Subtração!"
        ];
        break;
      case 1:
        name = `Fase ${id}: As Sombras Binárias (Ciclo ${cycle})`;
        npc = "Mago Kael";
        npcEmoji = "🔮";
        color = "var(--neon-purple)";
        op = "Subtração (-)";
        desc = `Os glitches de Subtração do Ciclo ${cycle} estão drenando os dados do reino.`;
        dialogues = [
          `Kael: Cuidado! Os glitches de Subtração do Ciclo ${cycle} estão roubando nossos dados!`,
          "Mago: Como posso detê-los?",
          "Kael: Equilibre a equação retirando a energia corrompida. Derrote o Bug de Subtração!"
        ];
        victoryDialogues = [
          "Kael: Fantástico! O Bug de Subtração foi neutralizado e as sombras binárias recuaram.",
          "Mago: A subtração agora está em equilíbrio.",
          "Kael: Excelente. Vá falar com o Robô Pi na dimensão da Divisão!"
        ];
        break;
      case 2:
        name = `Fase ${id}: O Mistério da Divisão (Ciclo ${cycle})`;
        npc = "Robô Pi";
        npcEmoji = "🤖";
        color = "var(--neon-blue)";
        op = "Divisão (÷)";
        desc = `Um erro crítico causou uma divisão ilegal no Ciclo ${cycle}. Restaure o equilíbrio!`;
        dialogues = [
          `Pi: BEEP-BOOP! Erro catastrófico de Divisão no Ciclo ${cycle}!`,
          "Mago: Robô Pi, me diga como reequilibrar!",
          "Pi: Divida a carga de dados igualmente para neutralizar o Trojan Divisor!"
        ];
        victoryDialogues = [
          "Pi: BEEP-BOOP! Sucesso! O Trojan Divisor foi apagado!",
          "Mago: Fico feliz em ajudar, Pi.",
          "Pi: Stella está enfrentando uma multiplicação infinita no Vulcão!"
        ];
        break;
      case 3:
        name = `Fase ${id}: O Domínio da Multiplicação (Ciclo ${cycle})`;
        npc = "Guerreira Stella";
        npcEmoji = "⚔️";
        color = "var(--neon-yellow)";
        op = "Multiplicação (×)";
        desc = `Os inimigos do Ciclo ${cycle} estão se multiplicando de forma geométrica!`;
        dialogues = [
          `Stella: Bem-vindo ao Vulcão! Os glitches no Ciclo ${cycle} estão se multiplicando rápido!`,
          "Mago: Eles estão ficando mais rápidos?",
          "Stella: Sim! Precisamos canalizar o poder da Multiplicação para conter o Dragão Corrupto!"
        ];
        victoryDialogues = [
          "Stella: Excelente combate! O Dragão Corrupto foi derrotado!",
          "Mago: Estamos quase lá.",
          "Stella: Sim. O Rei Glitch está no núcleo com operações mistas. Destrua-o!"
        ];
        break;
      case 4:
        name = `Fase ${id}: O Núcleo do Glitch (Ciclo ${cycle})`;
        npc = "Rei Glitch";
        npcEmoji = "👑";
        color = "var(--neon-pink)";
        op = "Operações Mistas (+, -, ×, ÷)";
        desc = `O núcleo está prestes a entrar em colapso no Ciclo ${cycle}. Derrote o Rei Glitch!`;
        dialogues = [
          `Rei Glitch: Tolos... Vocês acham que podem salvar este mundo de dados no Ciclo ${cycle}?`,
          "Mago: Nós vamos restaurar a ordem na Aura Central!",
          "Rei Glitch: Veremos! Sintam o poder de todas as operações combinadas!"
        ];
        victoryDialogues = [
          "Rei Glitch: Não... Impossível! Minha matriz de corrupção... Desfeita por equações?!",
          "Mago: A harmonia da matemática sempre prevalece contra o caos!",
          cycle === 1
            ? "Orion: Você conseguiu, Mago! A Grande Aura foi salva. Como recompensa, receba a lendária Coruja Cósmica!"
            : `Orion: Incrível! A Aura Central do Ciclo ${cycle} foi totalmente purificada. Continue sua jornada!`
        ];
        break;
    }

    stages.push({ id, name, npc, npcEmoji, color, op, desc, dialogues, victoryDialogues });
  }

  return stages;
};

interface HubWorldProps {
  playerUser: User;
  onSelectZone: (zone: 'forest' | 'volcano' | 'unified') => void;
  onSelectCampaignStage: (stageId: number) => void;
  onNavigateToPetShop: () => void;
  onNavigateToRunner: () => void;
  onNavigateToOlympics: () => void;
  onNavigateToSanctum: () => void;
  onLogout: () => void;
  gameState: GameState;
  onStateUpdate: (newState: GameState) => void;
}

export const HubWorld: React.FC<HubWorldProps> = ({
  playerUser,
  onSelectZone,
  onSelectCampaignStage,
  onNavigateToPetShop,
  onNavigateToRunner,
  onNavigateToOlympics,
  onNavigateToSanctum,
  onLogout,
  gameState,
  onStateUpdate,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedColor, setSelectedColor] = useState(gameState.auraColor || '#00ffcc');
  const [activeHubTab, setActiveHubTab] = useState<'maps' | 'campaign' | 'rpg' | 'clans' | 'gincana' | 'shop' | 'aurapass'>('maps');

  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Campaign dialogue states
  const [selectedCampaignStage, setSelectedCampaignStage] = useState<any | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  // RPG & Skill Tree feedback states
  const [rpgSuccess, setRpgSuccess] = useState<string | null>(null);
  const [rpgError, setRpgError] = useState<string | null>(null);



  const handleSelectClass = async (classId: 'warrior' | 'chronomancer' | 'alchemist') => {
    audioEngine.playLevelUp();
    const updated = await backendService.updateGameState(playerUser.id, { classId, unlockedSkills: [], skillPoints: 0 });
    if (updated) {
      onStateUpdate(updated);
      setRpgSuccess(`Você escolheu a classe ${classId === 'warrior' ? 'Guerreiro Crítico ⚔️' : classId === 'chronomancer' ? 'Mago do Tempo 🔮' : 'Alquimista de Aura 🧪'}!`);
      setTimeout(() => { setRpgSuccess(null); }, 4000);
    } else {
      audioEngine.playError();
      setRpgError('Erro ao escolher a classe. Tente novamente.');
      setTimeout(() => { setRpgError(null); }, 4000);
    }
  };

  const handleBuySkill = async (skillId: string, skillName: string) => {
    audioEngine.playCorrect();
    const skill = SKILL_TREE.find(s => s.id === skillId);
    if (!skill) return;
    
    const spentPoints = gameState.unlockedSkills.reduce((acc, sid) => {
      const sk = SKILL_TREE.find(s => s.id === sid);
      return acc + (sk ? sk.cost : 0);
    }, 0);
    const availablePoints = gameState.rebirths - spentPoints;
    
    if (availablePoints < skill.cost) {
      audioEngine.playError();
      setRpgError('Pontos de Rebirth insuficientes para comprar esta habilidade!');
      setTimeout(() => { setRpgError(null); }, 4000);
      return;
    }

    const updated = await backendService.updateGameState(playerUser.id, {
      unlockedSkills: [...gameState.unlockedSkills, skillId]
    });
    if (updated) {
      onStateUpdate(updated);
      setRpgSuccess(`Habilidade "${skillName}" desbloqueada com sucesso!`);
      setTimeout(() => { setRpgSuccess(null); }, 4000);
    } else {
      audioEngine.playError();
      setRpgError('Erro ao desbloquear habilidade. Tente novamente.');
      setTimeout(() => { setRpgError(null); }, 4000);
    }
  };



  const refreshLeaderboard = async () => {
    try {
      const board = await backendService.getLeaderboard();
      setLeaderboard(prev => {
        if (JSON.stringify(prev) === JSON.stringify(board)) {
          return prev;
        }
        return board;
      });
    } catch (err) {
      console.error('Error refreshing leaderboard:', err);
    }
  };

  // Load leaderboard and trigger playtime tracking
  useEffect(() => {
    const initHeartbeatAndLoad = async () => {
      try {
        const freshState = await backendService.getGameState(playerUser.id);
        if (freshState) {
          const updated = await backendService.updateGameState(playerUser.id, {
            totalPlayTimeSeconds: freshState.totalPlayTimeSeconds || 0
          });
          if (updated) {
            onStateUpdate(updated);
          }
        }
      } catch (err) {
        console.error('Error in initial heartbeat update:', err);
      }
      // Load leaderboard after marking status as active
      refreshLeaderboard();
    };

    void initHeartbeatAndLoad();
    
    // Playtime tracker: Increment play time in database every 30 seconds
    const interval = setInterval(() => {
      void (async () => {
        const freshState = await backendService.getGameState(playerUser.id);
        if (freshState) {
          const nextTime = (freshState.totalPlayTimeSeconds || 0) + 30;
          const updated = await backendService.updateGameState(playerUser.id, {
            totalPlayTimeSeconds: nextTime
          });
          if (updated) {
            onStateUpdate(updated);
          }
        }
      })();
    }, 30000);

    return () => { clearInterval(interval); };
  }, [playerUser.id]);

  // Periodic Leaderboard Refresh (Optimized with visibility check and 45s interval)
  useEffect(() => {
    const leaderboardInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshLeaderboard();
      }
    }, 45000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshLeaderboard();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(leaderboardInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);




  const handleColorChange = async (color: string) => {
    audioEngine.playHatchRoll();
    const updated = await backendService.updateGameState(playerUser.id, { auraColor: color });
    if (updated) {
      onStateUpdate(updated);
      setSelectedColor(color);
      // Refresh rankings
      refreshLeaderboard();
    }
  };

  const handleRebirth = async () => {
    if (gameState.auraLevel < 100) {
      audioEngine.playError();
      alert('Você precisa atingir o Nível de Aura 100 para fazer um Renascimento (Rebirth)!');
      return;
    }

    if (
      window.confirm(
        'Deseja fazer um Rebirth? Seu nível voltará ao 1, mas você ganhará: \n• Uma estrela ⭐ dourada permanente no ranking. \n• Multiplicador de Aura permanente (+20%). \n• Opção de usar Cores Cósmicas da Aura!'
      )
    ) {
      audioEngine.playLevelUp();
      const updated = await backendService.updateGameState(playerUser.id, {
        auraLevel: 1,
        auraXp: 0,
        rebirths: gameState.rebirths + 1,
        gems: gameState.gems + 20, // Rebirth bonus gems
        activeAuras: [],
      });

      if (updated) {
        onStateUpdate(updated);
        refreshLeaderboard();
      }
    }
  };





  // Claim Quest rewards handler
  const handleClaimQuest = async (questId: string, rewardGems: number) => {
    try {
      const updated = await backendService.claimQuestReward(playerUser.id, questId, rewardGems);
      if (updated) {
        audioEngine.playHatchSuccess();
        onStateUpdate(updated);
        refreshLeaderboard();
      } else {
        audioEngine.playError();
        alert('Erro ao resgatar a recompensa da missão!');
      }
    } catch (err: any) {
      audioEngine.playError();
      alert('Erro no resgate (Transação Segura RPC):\n' + (err.message || err));
    }
  };

  const handleOperationChange = async (op: 'addition' | 'subtraction' | 'multiplication' | 'division') => {
    audioEngine.playHatchRoll();
    const updated = await backendService.updateGameState(playerUser.id, { selectedOperation: op });
    if (updated) {
      onStateUpdate(updated);
    }
  };



  // Get active pet information
  const getActivePetInfo = () => {
    if (!gameState.equippedPetId) return null;
    const pets = mockDb.getPets(playerUser.id);
    const equipped = pets.find(p => p.id === gameState.equippedPetId);
    if (!equipped) return null;
    const petType = PET_TYPES.find(pt => pt.id === equipped.petTypeId);
    return {
      ...equipped,
      emoji: getPetEvolutionEmoji(petType?.emoji || '🐶', equipped.level),
      color: petType?.color || '#fff',
    };
  };

  const activePet = getActivePetInfo();

  // XP calculation
  const getXpNeeded = (lvl: number) => {
    return Math.round(100 * Math.pow(1.15, lvl - 1));
  };
  const xpNeeded = getXpNeeded(gameState.auraLevel);
  const xpPercentage = Math.min(100, Math.round((gameState.auraXp / xpNeeded) * 100));

  // Determine active visual features
  const getVisualAuraTier = () => {
    if (gameState.rebirths > 0) return 'Cósmica (Rebirth)';
    if (gameState.auraLevel >= 60) return 'Asas de Energia (Lvl 60+)';
    if (gameState.auraLevel >= 30) return 'Anel de Luz (Lvl 30+)';
    if (gameState.auraLevel >= 10) return 'Rastro Brilhante (Lvl 10+)';
    return 'Nenhum efeito visual (Suba para o Lvl 10)';
  };

  const getRebirthStars = (count: number) => {
    if (count <= 0) return '';
    return '⭐'.repeat(count);
  };

  const statsSummary = useMemo(() => {
    try {
      const stats = mockDb.getMathStats(playerUser.id);
      const a = stats.filter(s => s.questionKey.includes('+')).reduce((sum, s) => sum + s.correctCount, 0);
      const s = stats.filter(s => s.questionKey.includes('-')).reduce((sum, s) => sum + s.correctCount, 0);
      const m = stats.filter(s => s.questionKey.includes('x') || s.questionKey.includes('*')).reduce((sum, s) => sum + s.correctCount, 0);
      const d = stats.filter(s => s.questionKey.includes('/') || s.questionKey.includes('÷')).reduce((sum, s) => sum + s.correctCount, 0);
      const petCount = mockDb.getPets(playerUser.id).length;
      return {
        addCount: a,
        subCount: s,
        multCount: m,
        divCount: d,
        petCount,
        showNudgeBanner: a > 30 && (s < 15 || m < 15 || d < 15)
      };
    } catch (e) {
      return { addCount: 0, subCount: 0, multCount: 0, divCount: 0, petCount: 0, showNudgeBanner: false };
    }
  }, [playerUser.id, gameState]);

  const { addCount, subCount, multCount, divCount, showNudgeBanner } = statsSummary;

  const getUnlocks = useCallback(() => {
    return [
      { id: 'aura_beginner', label: '🔰 Iniciante', desc: 'Alcançou Nível 5 de Aura', active: gameState.auraLevel >= 5, color: '#4ade80' },
      { id: 'aura_master', label: '🔮 Mestre', desc: 'Alcançou Nível 30 de Aura', active: gameState.auraLevel >= 30, color: 'var(--neon-purple)' },
      { id: 'aura_legend', label: '🏆 Lendário', desc: 'Alcançou Nível 60 de Aura', active: gameState.auraLevel >= 60, color: 'var(--neon-yellow)' },
      { id: 'rebirth_celestial', label: '⭐ Celestial', desc: 'Efetuou pelo menos 1 Rebirth', active: gameState.rebirths >= 1, color: 'var(--neon-pink)' },
      { id: 'gem_tycoon', label: '💰 Magnata', desc: 'Acumulou 50 ou mais Gemas', active: gameState.gems >= 50, color: 'var(--neon-cyan)' },
      { id: 'pet_tamer', label: '🐾 Domador', desc: 'Adquiriu 3 ou mais Pets no total', active: statsSummary.petCount >= 3, color: '#f59e0b' },
    ];
  }, [gameState.auraLevel, gameState.rebirths, gameState.gems, statsSummary.petCount]);

  return (
    <div style={{ padding: '20px', minHeight: '90vh' }}>
      
      {/* Top Navbar */}
      <div className="hub-navbar">
        <div>
          <h1
            className="text-glow-cyan"
            style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}
          >
            HUB WORLD 🌌 AURA MATH QUEST
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Prepare-se para o combate, selecione seu mapa e gerencie seus companheiros pets!</p>
        </div>
        <div className="hub-navbar-right">
          <div className="hub-navbar-buttons">
            <button className="cyber-btn" onClick={onNavigateToPetShop} style={{ padding: '10px 18px', borderColor: 'var(--neon-yellow)' }}>
              🏪 Ir para Loja de Pets
            </button>
            <button className="cyber-btn" onClick={onNavigateToSanctum} style={{ padding: '10px 18px', borderColor: 'var(--neon-purple)' }}>
              🏠 Meu Santuário
            </button>
            <button className="cyber-btn cyber-btn-pink" onClick={onLogout} style={{ padding: '10px 18px' }}>
              Sair do Jogo ➔
            </button>
          </div>
          <div 
            style={{ 
              fontSize: '0.75rem', 
              color: (backendService.isCloudConnected() && isOnline) ? '#22c55e' : '#f59e0b',
              background: (backendService.isCloudConnected() && isOnline) ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${(backendService.isCloudConnected() && isOnline) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textShadow: (backendService.isCloudConnected() && isOnline) ? '0 0 6px rgba(34, 197, 94, 0.4)' : '0 0 6px rgba(245, 158, 11, 0.4)'
            }}
          >
            {(backendService.isCloudConnected() && isOnline) ? '⚡ Nuvem Ativa' : '🔌 Offline Mode'}
          </div>
        </div>
      </div>


      {/* Main Content Layout: Profile & Map Select (Left) vs Leaderboard (Right) */}
      <div className="main-layout-grid">
        
        {/* Left Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          
          {/* Pedagogical Nudge Banner */}
          {showNudgeBanner && (
            <div
              className="cyber-card border-glow-pink"
              style={{
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1.5px solid var(--neon-pink)',
                boxShadow: '0 0 15px rgba(244, 63, 94, 0.25)',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                color: '#fff',
                lineHeight: '1.4',
              }}
            >
              <div style={{ fontSize: '2rem' }}>💡</div>
              <div>
                <strong style={{ color: 'var(--neon-pink)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>
                  Dica do Orientador Pedagógico:
                </strong>
                Você já domina a Adição! Pratique as outras operações (Subtração, Multiplicação, Divisão) no Cyber Runner ou jogue no modo <strong>Olimpíada dos Deuses</strong> para ganhar <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>2x XP de Bônus de Estudo</span>!
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '6px' }}>
                  ⚠️ Atenção: Contas de Adição que você já domina darão apenas metade do XP e nenhuma Gema.
                </div>
              </div>
            </div>
          )}

          {/* Player Profile & Avatar Showcase */}
          <div className="cyber-card profile-card-grid">
            
            {/* Avatar Canvas */}
            <div
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '12px',
                backgroundColor: 'rgba(3, 7, 18, 0.6)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Particles Overlay */}
              <ParticleCanvas
                level={gameState.auraLevel}
                rebirths={gameState.rebirths}
                color={selectedColor}
                active={true}
                width={150}
                height={150}
              />
              
              <CyberSprite
                type="player"
                equippedCosmeticId={gameState.equippedCosmeticId}
                equippedCosmetics={gameState.equippedCosmetics}
                auraColor={selectedColor}
                width={110}
                height={110}
                style={{ zIndex: 2 }}
                classId={gameState.classId}
                rebirths={gameState.rebirths}
                level={gameState.auraLevel}
              />

              {/* Equiped Pet floating next to player */}
              {activePet && (
                <span
                  className="animate-float"
                  style={{
                    fontSize: '2rem',
                    position: 'absolute',
                    bottom: '15px',
                    right: '15px',
                    zIndex: 3,
                    filter: `drop-shadow(0 0 8px ${activePet.color})`,
                  }}
                >
                  {activePet.emoji}
                </span>
              )}
            </div>

            {/* Profile Statistics details */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#fff', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {playerUser.username}
                   {(() => {
                    const titleId = gameState.equippedCosmetics?.title || (gameState.equippedCosmeticId?.startsWith('title_') ? gameState.equippedCosmeticId : null);
                    const titleItem = titleId ? COSMETIC_ITEMS.find(c => c.id === titleId) : null;
                    if (titleItem) {
                      return (
                        <span style={{ fontSize: '0.85rem', color: titleItem.color, fontWeight: 900, textShadow: `0 0 6px ${titleItem.color}80`, letterSpacing: '0.5px' }}>
                          {titleItem.name.replace('Título: ', '')}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </h2>
                {gameState.rebirths > 0 && (
                  <span style={{ fontSize: '1rem', color: 'var(--neon-yellow)', filter: 'drop-shadow(0 0 4px var(--neon-yellow))' }}>
                    {getRebirthStars(gameState.rebirths)}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                Status Visual da Aura: <strong style={{ color: selectedColor }}>{getVisualAuraTier()}</strong>
              </div>

              {/* XP Progress Bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span>Progresso do Nível {gameState.auraLevel}</span>
                  <span style={{ fontWeight: 600 }}>{gameState.auraXp} / {xpNeeded} XP</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div
                    style={{
                      width: `${xpPercentage}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, var(--neon-cyan) 0%, ${selectedColor} 100%)`,
                      boxShadow: `0 0 10px ${selectedColor}`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Currency & Rebirth Panel */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Gemas</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>💎 {gameState.gems}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Rebirths</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--neon-pink)' }}>⭐ {gameState.rebirths}</div>
                  </div>
                  {activePet && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Pet Equipado</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: activePet.color }}>{activePet.emoji} {activePet.nickname}</div>
                    </div>
                  )}
                </div>

                {/* Rebirth Button triggers */}
                {gameState.auraLevel >= 100 ? (
                  <button
                    className="cyber-btn"
                    onClick={handleRebirth}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)',
                      borderColor: 'var(--neon-pink)',
                      animation: 'pulse-ring 1s infinite alternate',
                    }}
                  >
                    ⭐ EFETUAR REBIRTH!
                  </button>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', textAlign: 'right' }}>
                    Alce o Nível 100 para dar Rebirth!
                  </div>
                )}
              </div>
            </div>

            {/* Badges/Achievements Section */}
            <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '12px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                🏅 Conquistas e Medalhas de Aura:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {getUnlocks().map(badge => (
                  <div
                    key={badge.id}
                    title={badge.desc}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: badge.active ? `${badge.color}15` : 'rgba(255,255,255,0.01)',
                      border: badge.active ? `1px solid ${badge.color}35` : '1px solid rgba(255,255,255,0.03)',
                      opacity: badge.active ? 1 : 0.35,
                      transition: 'all 0.2s ease',
                      boxShadow: badge.active ? `0 0 6px ${badge.color}15` : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: badge.active ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                        {badge.label}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: badge.active ? badge.color : 'rgba(255,255,255,0.3)', marginTop: '2px', fontWeight: 'bold' }}>
                        {badge.active ? '✔️ ATIVADO' : '🔒 BLOQUEADO'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Operations Selector Card */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fff' }}>🧮 Operação de Treino</h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
              Selecione qual tipo de contas você quer enfrentar nas Zonas de Combate:
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { id: 'addition', label: 'Adição (+)', emoji: '➕' },
                { id: 'subtraction', label: 'Subtração (-)', emoji: '➖' },
                { id: 'multiplication', label: 'Multiplicação (×)', emoji: '✖️' },
                { id: 'division', label: 'Divisão (÷)', emoji: '➗' },
              ].map(op => {
                const isSelected = (gameState.selectedOperation || 'multiplication') === op.id;
                const isLocked = gameState.lockedOperations?.includes(op.id);
                let opBadge = null;
                if (isLocked) {
                  opBadge = <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--neon-pink)', fontWeight: 'bold', marginTop: '2px' }}>🔒 Bloqueado</span>;
                } else if (addCount > 30) {
                  if (op.id === 'addition') {
                    opBadge = <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--neon-pink)', fontWeight: 'bold', marginTop: '2px' }}>⚠️ 0.5x XP</span>;
                  } else {
                    const count = op.id === 'subtraction' ? subCount : op.id === 'multiplication' ? multCount : divCount;
                    if (count < 15) {
                      opBadge = <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--neon-yellow)', fontWeight: 'bold', marginTop: '2px' }}>💡 2x XP</span>;
                    }
                  }
                }
                return (
                  <button
                    key={op.id}
                    className="cyber-btn"
                    disabled={isLocked}
                    onClick={() => { handleOperationChange(op.id as any); }}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      fontSize: '0.8rem',
                      background: isSelected ? 'rgba(0, 255, 204, 0.15)' : 'rgba(15,23,42,0.6)',
                      borderColor: isLocked ? 'rgba(244,63,94,0.3)' : (isSelected ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)'),
                      color: isLocked ? 'rgba(255,255,255,0.25)' : (isSelected ? '#fff' : 'rgba(255,255,255,0.7)'),
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minHeight: '62px',
                      justifyContent: 'center',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '1rem', marginRight: '4px' }}>{op.emoji}</span>
                      {op.label.split(' ')[0]}
                    </div>
                    {opBadge}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Achievements / Quests Board */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fff' }}>🎯 Desafios Diários de Aura</h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
              Complete desafios em combate e resgate gemas extras para comprar pets!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'quest_wins', target: 3, reward: 8, label: 'Caçador de Glitches', desc: 'Vencer 3 batalhas', current: gameState.questWins || 0 },
                { id: 'quest_criticals', target: 5, reward: 10, label: 'Mestre dos Críticos', desc: 'Efetuar 5 Acertos Críticos', current: gameState.questCriticals || 0 },
                { id: 'quest_streak', target: 5, reward: 5, label: 'Super Sequência', desc: 'Atingir 5 acertos seguidos', current: gameState.questStreak || 0 },
              ].map(quest => {
                const claimed = (gameState.claimedQuests || []).includes(quest.id);
                const progress = Math.min(quest.target, quest.current);
                const percentage = Math.round((progress / quest.target) * 100);
                const isComplete = progress >= quest.target;

                return (
                  <div
                    key={quest.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(15,23,42,0.4)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800 }}>
                        <span>{quest.label} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>({quest.desc})</span></span>
                        <span>{progress} / {quest.target}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: claimed ? 'rgba(255,255,255,0.2)' : 'var(--neon-purple)',
                            boxShadow: claimed ? 'none' : '0 0 6px var(--neon-purple)',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      {claimed ? (
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800 }}>RESGATADO</span>
                      ) : isComplete ? (
                        <button
                          className="cyber-btn"
                          onClick={() => handleClaimQuest(quest.id, quest.reward)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            borderColor: 'var(--neon-cyan)',
                            background: 'rgba(0, 255, 204, 0.2)',
                            boxShadow: '0 0 8px rgba(0, 255, 204, 0.4)',
                            animation: 'pulse-ring 1s infinite alternate',
                          }}
                        >
                          Resgatar 💎 {quest.reward}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>Em progresso</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Aura Pass Progress Widget */}
          <div className="cyber-card" style={{
            borderColor: 'var(--neon-purple)',
            boxShadow: '0 0 15px rgba(168,85,247,0.15)',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🌌 Passe de Aura Sazonal
              </h3>
              {gameState.hasElitePass ? (
                <span style={{
                  background: 'rgba(250,204,21,0.15)',
                  border: '1px solid var(--neon-yellow)',
                  color: 'var(--neon-yellow)',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  textShadow: '0 0 4px rgba(234,179,8,0.4)'
                }}>
                  ⭐ ELITE ATIVO
                </span>
              ) : (
                <span style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 800
                }}>
                  PADRÃO
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
              Suba de nível resolvendo missões e resgate recompensas incríveis na aba do Passe.
            </p>
            <div style={{
              background: 'rgba(15,23,42,0.4)',
              border: '1px solid rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 800 }}>
                  Nível do Passe: <span style={{ color: 'var(--neon-purple)', textShadow: '0 0 6px rgba(168,85,247,0.3)' }}>{Math.floor((gameState.auraPassXp || 0) / 100) + 1}</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>
                  {(gameState.auraPassXp || 0)} XP Total
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                <div style={{ width: `${Math.min(100, (gameState.auraPassXp || 0) % 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-purple), var(--neon-pink))', transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)' }}>
                  {100 - ((gameState.auraPassXp || 0) % 100)} XP para Nvl {Math.floor((gameState.auraPassXp || 0) / 100) + 2}
                </span>
                <button
                  className="cyber-btn"
                  onClick={() => { audioEngine.playCorrect(); setActiveHubTab('aurapass'); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.7rem',
                    borderColor: 'var(--neon-purple)',
                    background: 'rgba(168, 85, 247, 0.1)',
                    color: '#fff',
                    fontWeight: 800
                  }}
                >
                  Ver Recompensas 🎁
                </button>
              </div>
            </div>
          </div>

          {/* Aura Customizer color selector */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fff' }}>🎨 Escolha a Cor de sua Aura</h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
              Suba de nível para desbloquear as cores cósmicas do ranking!
            </p>
            <div style={{ display: 'flex', gap: '14px' }}>
              {[
                { hex: '#00ffcc', name: 'Neon Cyan', minLevel: 1 },
                { hex: '#a855f7', name: 'Electro Purple', minLevel: 10 },
                { hex: '#3b82f6', name: 'Sonic Blue', minLevel: 30 },
                { hex: '#f43f5e', name: 'Cosmic Pink', minLevel: 60 },
                { hex: '#eab308', name: 'Aura Gold', minRebirth: 1 },
              ].map(opt => {
                const levelLocked = opt.minLevel ? gameState.auraLevel < opt.minLevel : false;
                const rebirthLocked = opt.minRebirth ? gameState.rebirths < opt.minRebirth : false;
                const isLocked = levelLocked || rebirthLocked;
                
                const isSelected = selectedColor === opt.hex;
                const requirementLabel = opt.minRebirth 
                  ? `Reb. ${opt.minRebirth}` 
                  : `Lvl ${opt.minLevel}`;

                return (
                  <div key={opt.hex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <button
                      disabled={isLocked}
                      onClick={() => { handleColorChange(opt.hex); }}
                      style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '50%',
                        backgroundColor: opt.hex,
                        border: isSelected ? '4px solid #fff' : '2px solid rgba(0,0,0,0.4)',
                        boxShadow: isSelected ? `0 0 14px ${opt.hex}` : 'none',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked ? 0.25 : 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={opt.name + (isLocked ? ' (Bloqueado)' : '')}
                    >
                      {isLocked && <span style={{ fontSize: '0.8rem' }}>🔒</span>}
                    </button>
                    <span style={{ fontSize: '0.65rem', color: isLocked ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.7)', fontWeight: isSelected ? 'bold' : 'normal' }}>
                      {requirementLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabs Selector for Maps vs Cosmetics Shop */}
          <div role="tablist" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              className="cyber-btn"
              role="tab"
              aria-selected={activeHubTab === 'maps'}
              aria-controls="hub-tab-panel"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('maps'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'maps' ? 'rgba(0, 255, 204, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'maps' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
              }}
            >
              ⚔️ Mapas
            </button>
            <button
              className="cyber-btn"
              role="tab"
              aria-selected={activeHubTab === 'campaign'}
              aria-controls="hub-tab-panel"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('campaign'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'campaign' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'campaign' ? '#ec4899' : 'rgba(255,255,255,0.1)',
              }}
            >
              📖 Campanha
            </button>
            <button
              className="cyber-btn"
              role="tab"
              aria-selected={activeHubTab === 'rpg'}
              aria-controls="hub-tab-panel"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('rpg'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'rpg' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'rpg' ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)',
              }}
            >
              🔮 Classes/Talentos {(gameState.auraLevel < 10 && gameState.rebirths === 0) ? '🔒' : ''}
            </button>
            <button
              className="cyber-btn"
              role="tab"
              aria-selected={activeHubTab === 'clans'}
              aria-controls="hub-tab-panel"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('clans'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'clans' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'clans' ? 'var(--neon-pink)' : 'rgba(255,255,255,0.1)',
              }}
            >
              🛡️ Clãs {(gameState.auraLevel < 15 && gameState.rebirths === 0) ? '🔒' : ''}
            </button>
            <button
              className="cyber-btn"
              role="tab"
              aria-selected={activeHubTab === 'gincana'}
              aria-controls="hub-tab-panel"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('gincana'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'gincana' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'gincana' ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.1)',
              }}
            >
              🏫 Gincanas {(gameState.auraLevel < 5 && gameState.rebirths === 0) ? '🔒' : ''}
            </button>
            <button
              className="cyber-btn"
              role="tab"
              aria-selected={activeHubTab === 'shop'}
              aria-controls="hub-tab-panel"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('shop'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'shop' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'shop' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.1)',
              }}
            >
              🎨 Avatar Shop
            </button>
            <button
              className="cyber-btn"
              role="tab"
              aria-selected={activeHubTab === 'aurapass'}
              aria-controls="hub-tab-panel"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('aurapass'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'aurapass' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'aurapass' ? '#a855f7' : 'rgba(255,255,255,0.1)',
              }}
            >
              🌌 Passe de Aura
            </button>
          </div>

          <div id="hub-tab-panel" role="tabpanel" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tab: Cosmic Campaign */}
            {activeHubTab === 'campaign' && (
            <div className="cyber-card" style={{ borderColor: '#ec4899', boxShadow: '0 0 15px rgba(236,72,153,0.1)' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#fff', textAlign: 'center' }}>📖 Campanha Cósmica (Modo História)</h3>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '24px' }}>
                Viaje pelas 5 dimensões matemáticas do reino para purificar a Grande Aura Central do ataque do Rei Glitch!
              </p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                position: 'relative',
                padding: '10px 0',
                maxWidth: '650px',
                margin: '0 auto'
              }}>
                {/* Connecting lines vertical indicator */}
                <div style={{
                  position: 'absolute',
                  left: '28px',
                  top: '40px',
                  bottom: '40px',
                  width: '4px',
                  background: 'linear-gradient(to bottom, var(--neon-cyan), var(--neon-purple), var(--neon-blue), var(--neon-yellow), var(--neon-pink))',
                  zIndex: 0,
                  opacity: 0.4
                }} />

                {getCampaignStages(gameState.campaignStage || 1).map((stage) => {
                  const currentCampaignStage = gameState.campaignStage || 1;
                  const isLocked = stage.id > currentCampaignStage;
                  const isCompleted = stage.id < currentCampaignStage;

                  return (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        zIndex: 1,
                        opacity: isLocked ? 0.5 : 1,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {/* Node Indicator */}
                      <div
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.6rem',
                          background: isLocked
                            ? 'rgba(15,23,42,0.8)'
                            : isCompleted
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(236, 72, 153, 0.2)',
                          border: `3px solid ${
                            isLocked
                              ? 'rgba(255,255,255,0.1)'
                              : isCompleted
                                ? '#22c55e'
                                : '#ec4899'
                          }`,
                          boxShadow: isLocked
                            ? 'none'
                            : `0 0 15px ${isCompleted ? '#22c55e' : '#ec4899'}`,
                          color: '#fff',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}
                      >
                        {isCompleted ? '✓' : stage.npcEmoji}
                      </div>

                      {/* Stage Card */}
                      <div
                        className="cyber-card"
                        style={{
                          flex: 1,
                          margin: 0,
                          padding: '16px',
                          border: `1.5px solid ${isLocked ? 'rgba(255,255,255,0.1)' : stage.color}`,
                          background: isLocked ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0.7)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '1.1rem', color: isLocked ? 'rgba(255,255,255,0.65)' : stage.color, margin: 0 }}>
                              {stage.name}
                            </h4>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              background: isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                              color: isLocked ? 'rgba(255,255,255,0.65)' : '#fff',
                              fontWeight: 800
                            }}>
                              {stage.op}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '6px 0 0 0' }}>
                            {stage.desc}
                          </p>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: '8px' }}>
                            Guia: <strong>{stage.npc}</strong>
                          </div>
                        </div>

                        <div>
                          {isLocked ? (
                            <button className="cyber-btn" disabled style={{ padding: '8px 12px', fontSize: '0.8rem', opacity: 0.6 }}>
                              🔒 Bloqueada (Complete fases anteriores)
                            </button>
                          ) : (
                            <button
                              className="cyber-btn"
                              style={{
                                padding: '8px 16px',
                                fontSize: '0.8rem',
                                borderColor: stage.color,
                                background: 'rgba(255,255,255,0.05)'
                              }}
                              onClick={() => {
                                audioEngine.playCorrect();
                                setSelectedCampaignStage(stage);
                                setDialogueIndex(0);
                              }}
                            >
                              {isCompleted ? '📖 Rejogar História' : '⚔️ Entrar na Fase'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 1: Zone Selector Maps */}
          {activeHubTab === 'maps' && (
            <div className="cyber-card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#fff' }}>⚔️ Mapas de Combate e Desafios</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                {/* Unified Adaptive World Card */}
                <div
                  className="cyber-card"
                  style={{
                    gridColumn: 'span 2',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1.5px solid rgba(0, 255, 204, 0.4)',
                    background: 'linear-gradient(135deg, rgba(0, 255, 204, 0.08) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(3, 7, 18, 0.75) 100%)',
                    boxShadow: '0 0 20px rgba(0, 255, 204, 0.1), inset 0 0 15px rgba(168, 85, 247, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '12px' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 className="text-glow-cyan" style={{ fontSize: '1.5rem', color: 'var(--neon-cyan)', margin: 0, fontFamily: 'Share Tech Mono', letterSpacing: '0.5px' }}>
                          🌌 Nexo Dimensional (Arena Adaptativa)
                        </h4>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(0, 255, 204, 0.2)', padding: '4px 10px', borderRadius: '10px', color: 'var(--neon-cyan)', fontWeight: 800 }}>ADAPTATIVO</span>
                      </div>
                      
                      <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4rem', marginBottom: '14px' }}>
                        O simulador quântico analisa seu desempenho matemático e gera desafios na medida certa!
                        As contas começam fáceis e ficam mais complexas conforme você as domina, revisando erros anteriores de forma inteligente.
                      </p>

                      {/* Display current operation and dynamic tier progress */}
                      {(() => {
                        try {
                          const op = gameState.selectedOperation || 'multiplication';
                          const progress = mockDb.getMathProgress(gameState.userId, op);
                          
                          let tierName = '';
                          if (op === 'multiplication') tierName = `Tabuada: Casa do ${progress.currentTier}`;
                          else if (op === 'division') tierName = `Divisão: Divisor ${progress.currentTier}`;
                          else if (op === 'addition') tierName = `Adição: Complexidade Tier ${progress.currentTier}/5`;
                          else tierName = `Subtração: Complexidade Tier ${progress.currentTier}/5`;

                          return (
                            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                                <span>Progresso da Operação:</span>
                                <strong style={{ color: 'var(--neon-yellow)' }}>{tierName}</strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${progress.percentToNext}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))', boxShadow: '0 0 8px var(--neon-cyan)' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 'bold', minWidth: '35px', textAlign: 'right' }}>{progress.percentToNext}%</span>
                              </div>
                              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                <span>🔓 Liberados: {progress.unlockedList.join(', ')}</span>
                                <span>•</span>
                                <span>🏆 Dominados: {progress.masteredList.length}</span>
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>

                    <div style={{ width: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '24px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        💎 **Multiplicador de XP:**
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--neon-yellow)', marginTop: '4px' }}>
                          Até 3.0x XP por resposta
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        🛡️ **Desafios:**
                        <div style={{ color: '#fff', marginTop: '2px' }}>
                          Inimigos adaptam sua energia ao seu nível matemático!
                        </div>
                      </div>
                      <button
                        className="cyber-btn cyber-btn-cyan"
                        onClick={() => {
                          audioEngine.playCorrect();
                          onSelectZone('unified');
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          marginTop: '8px',
                          fontWeight: 'bold',
                        }}
                      >
                        Entrar no Nexo ➔
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cyber Runner (Minigame) */}
                <div
                  className="cyber-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1.5px solid rgba(0, 255, 204, 0.3)',
                    background: 'linear-gradient(180deg, rgba(0, 255, 204, 0.05) 0%, rgba(3, 7, 18, 0.6) 100%)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)' }}>⚡ Cyber Runner 2D</h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {addCount > 30 && (
                          (gameState.selectedOperation || 'multiplication') === 'addition' ? (
                            <span style={{ fontSize: '0.7rem', background: 'rgba(244, 63, 94, 0.2)', padding: '2px 6px', borderRadius: '6px', color: 'var(--neon-pink)', fontWeight: 'bold' }}>⚠️ 0.5x XP</span>
                          ) : (
                            ((gameState.selectedOperation === 'subtraction' && subCount < 15) ||
                             (gameState.selectedOperation === 'multiplication' && multCount < 15) ||
                             (gameState.selectedOperation === 'division' && divCount < 15)) && (
                              <span style={{ fontSize: '0.7rem', background: 'rgba(234, 179, 8, 0.2)', padding: '2px 6px', borderRadius: '6px', color: 'var(--neon-yellow)', fontWeight: 'bold' }}>💡 2x XP</span>
                            )
                          )
                        )}
                        <span style={{ fontSize: '0.8rem', background: 'rgba(0, 255, 204, 0.2)', padding: '2px 8px', borderRadius: '10px', color: 'var(--neon-cyan)', fontWeight: 800 }}>MINIJOGO</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.3rem', marginBottom: '14px' }}>
                      Corra infinitamente em uma arena neon de alta velocidade! Desvie de espinhos usando W/S e cruze os portais com os resultados corretos da tabuada!
                    </p>
                  </div>
                  <button
                    className="cyber-btn"
                    onClick={() => {
                      audioEngine.playCorrect();
                      onNavigateToRunner();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderColor: 'var(--neon-cyan)',
                      background: 'rgba(0,255,204,0.1)',
                    }}
                  >
                    Iniciar Corrida ➔
                  </button>
                </div>

                {/* Olimipadas dos Deuses Zone Card */}
                <div
                  className="cyber-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1.5px solid var(--neon-yellow)',
                    background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.05) 0%, rgba(3, 7, 18, 0.6) 100%)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '1.2rem', color: 'var(--neon-yellow)' }}>🏆 Olimpíadas dos Deuses</h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {addCount > 30 && (subCount < 15 || multCount < 15 || divCount < 15) && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(234, 179, 8, 0.2)', padding: '2px 6px', borderRadius: '6px', color: 'var(--neon-yellow)', fontWeight: 'bold' }}>💡 2x XP</span>
                        )}
                        <span style={{ fontSize: '0.8rem', background: 'rgba(234, 179, 8, 0.2)', padding: '2px 8px', borderRadius: '10px', color: 'var(--neon-yellow)', fontWeight: 800 }}>OLÍMPICO</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.3rem', marginBottom: '14px' }}>
                      Preparatório OBMEP, OBM e competições nacionais! 100 níveis adaptativos avaliando Raciocínio Lógico, Padrões, Geometria e Lógica.
                    </p>
                  </div>
                  <button
                    className="cyber-btn"
                    onClick={() => {
                      audioEngine.playCorrect();
                      onNavigateToOlympics();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderColor: 'var(--neon-yellow)',
                      background: 'rgba(234,179,8,0.1)',
                      fontWeight: 'bold'
                    }}
                  >
                    Iniciar Simulador Olímpico ➔
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Tab: RPG Classes & Talent Tree */}
          {activeHubTab === 'rpg' && (
            (() => {
              const isRpgLocked = gameState.auraLevel < 10 && gameState.rebirths === 0;
              if (isRpgLocked) {
                return (
                  <div className="cyber-card" style={{ borderColor: 'var(--neon-purple)', textAlign: 'center', padding: '40px 20px', background: 'rgba(168, 85, 247, 0.03)' }}>
                    <h3 className="text-glow-purple" style={{ fontSize: '1.4rem', color: 'var(--neon-purple)', marginBottom: '14px' }}>
                      🔒 Classes e Talentos RPG (Bloqueado)
                    </h3>
                    <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', lineHeight: '1.5rem' }}>
                      Esta funcionalidade secreta requer **Nível de Aura 10** ou pelo menos **1 Rebirth** para ser despertada.
                    </p>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(15,23,42,0.4)', padding: '12px 24px', borderRadius: '8px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.05)' }}>
                      Sua Aura Atual: <strong style={{ color: 'var(--neon-purple)' }}>Nível {gameState.auraLevel}</strong> • Rebirths: <strong style={{ color: 'var(--neon-pink)' }}>{gameState.rebirths}</strong>
                    </div>
                  </div>
                );
              }
              return (
                <div className="cyber-card" style={{ borderColor: 'var(--neon-purple)' }}>
              <h3 className="text-glow-purple" style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--neon-purple)' }}>
                🔮 Sistema de Classes e Talentos RPG
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                Escolha a sua classe heroica para ganhar vantagens especiais em combate! Consiga <strong>Pontos de Rebirth (1 por Rebirth)</strong> para comprar talentos passivos e potencializar seus poderes de matemática.
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
                  🔮 Como Funcionam as Classes e Rebirth?
                </strong>
                1. <strong>Escolha de Classe:</strong> Ao escolher uma classe (Guerreiro, Chronomancer ou Alquimista), você ativa uma habilidade passiva permanente que ajuda significativamente nas batalhas na Arena.
                <br />
                2. <strong>Rebirth (Renascimento):</strong> Ao realizar um Rebirth na tela de Perfil, seu nível de Aura volta para o 1, mas você ganha <strong>★ Estrelas de Rebirth</strong> e <strong>Pontos de Talento</strong>!
                <br />
                3. <strong>Árvore de Talentos:</strong> Gaste seus Pontos de Talento abaixo para desbloquear habilidades adicionais que aumentam multiplicadores de XP e o poder de seus acertos críticos.
              </div>

              {rpgSuccess && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
                  {rpgSuccess}
                </div>
              )}

              {rpgError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
                  {rpgError}
                </div>
              )}

              {/* Class Selection Block (if player has no class) */}
              {!gameState.classId ? (
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '16px', textAlign: 'center' }}>🛡️ Selecione uma Classe para começar:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    
                    {/* Warrior */}
                    <div className="cyber-card hover-glow" style={{ border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.02)', textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => { handleSelectClass('warrior'); }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚔️</div>
                      <h5 style={{ fontSize: '1.2rem', color: 'var(--neon-pink)', fontWeight: 800, marginBottom: '8px' }}>Guerreiro Crítico</h5>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.2rem' }}>
                        Focado em responder rápido para conseguir acertos críticos devastadores. Começa com mais Escudos em combate.
                      </p>
                    </div>

                    {/* Chronomancer */}
                    <div className="cyber-card hover-glow" style={{ border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.02)', textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => { handleSelectClass('chronomancer'); }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔮</div>
                      <h5 style={{ fontSize: '1.2rem', color: 'var(--neon-purple)', fontWeight: 800, marginBottom: '8px' }}>Mago do Tempo</h5>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.2rem' }}>
                        Controla as correntes temporais da matemática. Aumenta o cronômetro para resolver contas com calma.
                      </p>
                    </div>

                    {/* Alchemist */}
                    <div className="cyber-card hover-glow" style={{ border: '1px solid rgba(234, 179, 8, 0.3)', background: 'rgba(234, 179, 8, 0.02)', textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => { handleSelectClass('alchemist'); }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧪</div>
                      <h5 style={{ fontSize: '1.2rem', color: 'var(--neon-yellow)', fontWeight: 800, marginBottom: '8px' }}>Alquimista de Aura</h5>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.2rem' }}>
                        Mestre do gacha e da transmutação de riquezas. Ganha bônus de gemas e maior chance de pets lendários.
                      </p>
                    </div>

                  </div>
                </div>
              ) : (
                /* Class is Selected: Show Skill Tree */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '2.5rem' }}>
                        {gameState.classId === 'warrior' ? '⚔️' : gameState.classId === 'chronomancer' ? '🔮' : '🧪'}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>Sua Classe</div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: gameState.classId === 'warrior' ? 'var(--neon-pink)' : gameState.classId === 'chronomancer' ? 'var(--neon-purple)' : 'var(--neon-yellow)' }}>
                          {gameState.classId === 'warrior' ? 'Guerreiro Crítico' : gameState.classId === 'chronomancer' ? 'Mago do Tempo' : 'Alquimista de Aura'}
                        </h4>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>Pontos de Rebirth (Disponíveis / Total)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                        🌟 {(() => {
                          const spent = (gameState.unlockedSkills || []).reduce((acc, sid) => {
                            const sk = SKILL_TREE.find(s => s.id === sid);
                            return acc + (sk ? sk.cost : 0);
                          }, 0);
                          return gameState.rebirths - spent;
                        })()} / {gameState.rebirths} Pts
                      </div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '12px' }}>🌳 Árvore de Talentos da Classe:</h4>
                  <div className="grid-cols-2">
                    {SKILL_TREE.filter(s => s.classId === gameState.classId).map(skill => {
                      const isUnlocked = (gameState.unlockedSkills || []).includes(skill.id);
                      const spent = (gameState.unlockedSkills || []).reduce((acc, sid) => {
                        const sk = SKILL_TREE.find(s => s.id === sid);
                        return acc + (sk ? sk.cost : 0);
                      }, 0);
                      const availablePoints = gameState.rebirths - spent;
                      const canAfford = availablePoints >= skill.cost;

                      return (
                        <div
                          key={skill.id}
                          className="cyber-card"
                          style={{
                            padding: '16px',
                            border: isUnlocked ? '1.5px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.08)',
                            background: isUnlocked ? 'rgba(0, 255, 204, 0.05)' : 'rgba(15, 23, 42, 0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <h5 style={{ fontSize: '1.05rem', fontWeight: 800, color: isUnlocked ? 'var(--neon-cyan)' : '#fff' }}>{skill.name}</h5>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isUnlocked ? 'var(--neon-cyan)' : 'var(--neon-purple)', background: isUnlocked ? 'rgba(0,255,204,0.1)' : 'rgba(168,85,247,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                {isUnlocked ? 'DESBLOQUEADO' : `Custo: ${skill.cost} Pt`}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.25rem' }}>{skill.description}</p>
                          </div>

                          <div style={{ marginTop: '16px' }}>
                            {isUnlocked ? (
                              <div style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', fontWeight: 700, textAlign: 'center' }}>
                                ✔️ Ativado Permanentemente
                              </div>
                            ) : (
                              <button
                                className="cyber-btn"
                                disabled={!canAfford}
                                onClick={() => { handleBuySkill(skill.id, skill.name); }}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  fontSize: '0.8rem',
                                  borderColor: canAfford ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
                                  background: canAfford ? 'rgba(0, 255, 204, 0.15)' : 'rgba(255,255,255,0.05)',
                                  color: canAfford ? '#fff' : 'rgba(255,255,255,0.3)',
                                  cursor: canAfford ? 'pointer' : 'not-allowed',
                                }}
                              >
                                {canAfford ? `Adquirir Habilidade (-${skill.cost} Pt)` : 'Requisitos Insuficientes'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button
                      className="cyber-btn cyber-btn-pink"
                      onClick={async () => {
                        if (window.confirm('Deseja resetar sua classe? Suas habilidades serão bloqueadas e seus pontos serão devolvidos.')) {
                          audioEngine.playLevelUp();
                          const updated = await backendService.updateGameState(playerUser.id, { classId: null, unlockedSkills: [] });
                          if (updated) {
                            onStateUpdate(updated);
                            setRpgSuccess('Classe resetada com sucesso!');
                            setTimeout(() => { setRpgSuccess(null); }, 4000);
                          }
                        }
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                    >
                      🔄 Resetar Escolha de Classe
                    </button>
                  </div>
                </div>
              )}
            </div>
            );
          })()
        )}

          {/* Tab: Clans Panel */}
          {activeHubTab === 'clans' && (
            <Suspense fallback={<TabLoadingSpinner />}>
              <HubClans
                playerUser={playerUser}
                gameState={gameState}
                onStateUpdate={onStateUpdate}
                onSelectZone={onSelectZone}
              />
            </Suspense>
          )}

          {/* Tab: Gincanas */}
          {activeHubTab === 'gincana' && (
            <Suspense fallback={<TabLoadingSpinner />}>
              <HubGincana gameState={gameState} />
            </Suspense>
          )}

          {/* Tab 2: Cosmetics Avatar Shop */}
          {activeHubTab === 'shop' && (
            <Suspense fallback={<TabLoadingSpinner />}>
              <HubShop
                playerUser={playerUser}
                gameState={gameState}
                onStateUpdate={onStateUpdate}
                refreshLeaderboard={refreshLeaderboard}
              />
            </Suspense>
          )}

          {/* Tab 3: Aura Pass */}
          {activeHubTab === 'aurapass' && (
            <AuraPass
              userId={playerUser.id}
              gameState={gameState}
              onStateUpdate={onStateUpdate}
              onNavigateToRunner={onNavigateToRunner}
              onNavigateToOlympics={onNavigateToOlympics}
              onNavigateToSanctum={onNavigateToSanctum}
              onSelectZone={onSelectZone}
            />
          )}
          </div>
        </div>

        {/* Right Section: Leaderboard ranking side bar */}
        <div>
          <Leaderboard entries={leaderboard} currentUsername={playerUser.username} />
        </div>
      </div>

      {/* Campaign Dialogue Modal Overlay */}
      {selectedCampaignStage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.9)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
        >
          <div
            className="cyber-card"
            style={{
              width: '90%',
              maxWidth: '550px',
              border: `2px solid ${selectedCampaignStage.color}`,
              boxShadow: `0 0 25px ${selectedCampaignStage.color}`,
              padding: '24px',
              position: 'relative'
            }}
          >
            {/* Stage Title */}
            <h3 style={{ margin: '0 0 16px 0', color: selectedCampaignStage.color, fontSize: '1.2rem', textAlign: 'center' }}>
              {selectedCampaignStage.name}
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
                marginBottom: '20px'
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
                {selectedCampaignStage.dialogues[dialogueIndex].startsWith("Mago:") ? "🧙‍♂️" : selectedCampaignStage.npcEmoji}
              </div>

              {/* Dialogue Text */}
              <div style={{ flex: 1, color: '#fff', fontSize: '0.95rem', lineHeight: '1.4rem' }}>
                <strong style={{ color: selectedCampaignStage.color, display: 'block', marginBottom: '6px' }}>
                  {selectedCampaignStage.dialogues[dialogueIndex].split(':')[0]}
                </strong>
                <span>
                  {selectedCampaignStage.dialogues[dialogueIndex].split(':').slice(1).join(':')}
                </span>
              </div>
            </div>

            {/* Modal Controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="cyber-btn"
                onClick={() => {
                  audioEngine.playHatchRoll();
                  setSelectedCampaignStage(null);
                }}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Fechar
              </button>

              {dialogueIndex < selectedCampaignStage.dialogues.length - 1 ? (
                <button
                  className="cyber-btn"
                  style={{ borderColor: selectedCampaignStage.color, padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={() => {
                    audioEngine.playHatchRoll();
                    setDialogueIndex(prev => prev + 1);
                  }}
                >
                  Próximo ➔
                </button>
              ) : (
                <button
                  className="cyber-btn cyber-btn-cyan"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={() => {
                    audioEngine.playHatchSuccess();
                    onSelectCampaignStage(selectedCampaignStage.id);
                    setSelectedCampaignStage(null);
                  }}
                >
                  Iniciar Batalha Mágica ⚔️
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
