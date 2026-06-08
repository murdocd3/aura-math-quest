import React, { useState, useEffect } from 'react';
import { mockDb, PET_TYPES, COSMETIC_ITEMS, SKILL_TREE } from '../services/mockDb';
import type { User, GameState, Clan } from '../services/mockDb';
import { backendService } from '../services/backendService';
import { ParticleCanvas } from './ParticleCanvas';
import { Leaderboard } from './Leaderboard';
import { audioEngine } from './AudioEngine';
import { CyberSprite } from './CyberSprite';
import { AuraPass } from './AuraPass';

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
  onSelectZone: (zone: 'forest' | 'volcano') => void;
  onSelectCampaignStage: (stageId: number) => void;
  onNavigateToPetShop: () => void;
  onNavigateToRunner: () => void;
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
  onLogout,
  gameState,
  onStateUpdate,
}) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedColor, setSelectedColor] = useState(gameState.auraColor || '#00ffcc');
  const [activeHubTab, setActiveHubTab] = useState<'maps' | 'campaign' | 'rpg' | 'clans' | 'gincana' | 'shop' | 'aurapass'>('maps');
  const [serverNotification, setServerNotification] = useState<string | null>(null);

  // Campaign dialogue states
  const [selectedCampaignStage, setSelectedCampaignStage] = useState<any | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  // RPG & Skill Tree feedback states
  const [rpgSuccess, setRpgSuccess] = useState<string | null>(null);
  const [rpgError, setRpgError] = useState<string | null>(null);

  // Clan Management states
  const [clansList, setClansList] = useState<Clan[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [newClanMotto, setNewClanMotto] = useState('');
  const [newClanBadge, setNewClanBadge] = useState('🛡️');
  const [clanSuccess, setClanSuccess] = useState<string | null>(null);
  const [clanError, setClanError] = useState<string | null>(null);
  const [expandedClanId, setExpandedClanId] = useState<string | null>(null);

  const loadClans = async () => {
    const board = await backendService.getClanLeaderboard();
    setClansList(board);
    try {
      const users = await backendService.getUsers();
      setAllUsersList(users);
    } catch (err) {
      console.error('Error loading users in loadClans:', err);
    }
  };

  useEffect(() => {
    loadClans();
  }, [gameState.clanId, activeHubTab]);

  const handleSelectClass = (classId: 'warrior' | 'chronomancer' | 'alchemist') => {
    audioEngine.playLevelUp();
    const updated = mockDb.selectClass(playerUser.id, classId);
    if (updated) {
      onStateUpdate(updated);
      setRpgSuccess(`Você escolheu a classe ${classId === 'warrior' ? 'Guerreiro Crítico ⚔️' : classId === 'chronomancer' ? 'Mago do Tempo 🔮' : 'Alquimista de Aura 🧪'}!`);
      setTimeout(() => setRpgSuccess(null), 4000);
    } else {
      audioEngine.playError();
      setRpgError('Erro ao escolher a classe. Tente novamente.');
      setTimeout(() => setRpgError(null), 4000);
    }
  };

  const handleBuySkill = (skillId: string, skillName: string) => {
    audioEngine.playCorrect();
    const updated = mockDb.buySkill(playerUser.id, skillId);
    if (updated) {
      onStateUpdate(updated);
      setRpgSuccess(`Habilidade "${skillName}" desbloqueada com sucesso!`);
      setTimeout(() => setRpgSuccess(null), 4000);
    } else {
      audioEngine.playError();
      setRpgError('Pontos de Rebirth insuficientes para comprar esta habilidade!');
      setTimeout(() => setRpgError(null), 4000);
    }
  };

  const handleApplyToClan = async (clanId: string, clanName: string) => {
    if (window.confirm(`Deseja se candidatar para entrar no clã ${clanName}?`)) {
      audioEngine.playCorrect();
      await backendService.applyToClan(playerUser.id, clanId);
      await loadClans();
      setClanSuccess(`Candidatura enviada para ${clanName}!`);
      setTimeout(() => setClanSuccess(null), 4000);
    }
  };

  const handleAcceptApplication = async (clanId: string, candidateId: string) => {
    audioEngine.playCorrect();
    await backendService.acceptApplication(playerUser.id, clanId, candidateId);
    await loadClans();
  };

  const handleRejectApplication = async (clanId: string, candidateId: string) => {
    audioEngine.playError();
    await backendService.rejectApplication(playerUser.id, clanId, candidateId);
    await loadClans();
  };

  const handleKickMember = async (clanId: string, targetId: string) => {
    if (window.confirm('Tem certeza que deseja expulsar este membro?')) {
      audioEngine.playError();
      await backendService.kickMember(playerUser.id, clanId, targetId);
      await loadClans();
    }
  };

  const handleTransferLeadership = async (clanId: string, targetId: string) => {
    if (window.confirm('Tem certeza que deseja passar a liderança para este membro? Você voltará a ser um membro comum.')) {
      audioEngine.playCorrect();
      await backendService.transferLeadership(playerUser.id, clanId, targetId);
      await loadClans();
    }
  };

  const handleLeaveClan = async () => {
    if (window.confirm('Tem certeza de que deseja sair de seu clã atual?')) {
      audioEngine.playCorrect();
      const updated = await backendService.leaveClan(playerUser.id);
      if (updated) {
        onStateUpdate(updated);
        await loadClans();
        setClanSuccess('Você saiu do clã.');
        setTimeout(() => setClanSuccess(null), 4000);
      } else {
        audioEngine.playError();
        setClanError('Erro ao sair do clã.');
        setTimeout(() => setClanError(null), 4000);
      }
    }
  };

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClanName.trim() || !newClanTag.trim() || !newClanMotto.trim()) {
      audioEngine.playError();
      setClanError('Por favor, preencha todos os campos do clã.');
      setTimeout(() => setClanError(null), 4000);
      return;
    }

    if (newClanTag.trim().length > 4) {
      audioEngine.playError();
      setClanError('A TAG do clã deve ter no máximo 4 caracteres.');
      setTimeout(() => setClanError(null), 4000);
      return;
    }

    const updated = await backendService.createClan(playerUser.id, newClanName, newClanTag, newClanMotto, newClanBadge);
    if (updated) {
      onStateUpdate(updated);
      await loadClans();
      setClanSuccess(`Clã "${newClanName}" criado com sucesso!`);
      setNewClanName('');
      setNewClanTag('');
      setNewClanMotto('');
      setTimeout(() => setClanSuccess(null), 4000);
    } else {
      audioEngine.playError();
      setClanError('Erro ao criar clã. Nome ou TAG já podem estar em uso.');
      setTimeout(() => setClanError(null), 4000);
    }
  };

  const refreshLeaderboard = async () => {
    try {
      const board = await backendService.getLeaderboard();
      setLeaderboard(board);
    } catch (err) {
      console.error('Error refreshing leaderboard:', err);
    }
  };

  // Load leaderboard and trigger playtime tracking
  useEffect(() => {
    refreshLeaderboard();
    
    // Playtime tracker: Increment play time in database every 30 seconds
    const interval = setInterval(async () => {
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
    }, 30000);

    return () => clearInterval(interval);
  }, [playerUser.id]);

  // Dynamic Server Simulation interval
  useEffect(() => {
    const simulatorInterval = setInterval(() => {
      const fictitiousUserIds = ['player-lucas', 'player-sofia', 'player-gabriel', 'player-beatriz'];
      const activePlayers = mockDb.getUsers().filter(u => u.role === 'player' && u.id !== playerUser.id && !fictitiousUserIds.includes(u.id));
      if (activePlayers.length === 0) return;

      const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
      const pState = mockDb.getGameState(randomPlayer.id);
      if (!pState) return;

      const roll = Math.random();
      let alertMsg = '';

      if (roll < 0.4) {
        const nextLvl = pState.auraLevel + 1;
        mockDb.updateGameState(randomPlayer.id, { auraLevel: nextLvl });
        alertMsg = `O aluno ${randomPlayer.username} subiu para o Nível de Aura ${nextLvl}!`;
      } else if (roll < 0.6) {
        const nextRebirth = pState.rebirths + 1;
        mockDb.updateGameState(randomPlayer.id, { auraLevel: 1, rebirths: nextRebirth });
        alertMsg = `🌌 ${randomPlayer.username} realizou um REBIRTH e alcançou ★ ${nextRebirth}!`;
      } else if (roll < 0.8) {
        const pets = mockDb.getPets(randomPlayer.id);
        if (pets.length > 0) {
          const randPet = pets[Math.floor(Math.random() * pets.length)];
          mockDb.equipPet(randomPlayer.id, randPet.id);
          alertMsg = `${randomPlayer.username} equipou o Pet: ${randPet.nickname}!`;
        }
      } else {
        const nextGems = pState.gems + 5;
        mockDb.updateGameState(randomPlayer.id, { gems: nextGems });
        alertMsg = `💰 ${randomPlayer.username} ganhou 💎 5 Gemas em combate!`;
      }

      if (alertMsg) {
        audioEngine.playHatchRoll();
        setServerNotification(alertMsg);
        refreshLeaderboard();
        setTimeout(() => {
          setServerNotification(null);
        }, 4000);
      }
    }, 15000); // Ticks every 15 seconds

    return () => clearInterval(simulatorInterval);
  }, [playerUser.id]);



  const handleColorChange = (color: string) => {
    audioEngine.playHatchRoll();
    const updated = mockDb.updateGameState(playerUser.id, { auraColor: color });
    if (updated) {
      onStateUpdate(updated);
      setSelectedColor(color);
      // Refresh rankings
      refreshLeaderboard();
    }
  };

  const handleRebirth = () => {
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
      const updated = mockDb.updateGameState(playerUser.id, {
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



  const handleBuyCosmetic = async (cosmeticId: string) => {
    const cosmetic = COSMETIC_ITEMS.find(c => c.id === cosmeticId);
    if (!cosmetic) return;

    if (gameState.gems < cosmetic.cost) {
      audioEngine.playError();
      alert('Gemas insuficientes para comprar este cosmético!');
      return;
    }

    const purchased = gameState.purchasedCosmetics || [];
    if (purchased.includes(cosmeticId)) return;

    const updated = await backendService.updateGameState(playerUser.id, {
      gems: gameState.gems - cosmetic.cost,
      purchasedCosmetics: [...purchased, cosmeticId]
    });

    if (updated) {
      audioEngine.playHatchSuccess();
      onStateUpdate(updated);
      refreshLeaderboard();
    } else {
      audioEngine.playError();
      alert('Erro ao processar a compra do cosmético!');
    }
  };

  const handleEquipCosmetic = async (cosmeticId: string) => {
    audioEngine.playCorrect();
    const nextEquipId = gameState.equippedCosmeticId === cosmeticId ? null : cosmeticId;
    const updated = await backendService.updateGameState(playerUser.id, {
      equippedCosmeticId: nextEquipId
    });
    if (updated) {
      onStateUpdate(updated);
    }
  };

  // Claim Quest rewards handler
  const handleClaimQuest = (questId: string, rewardGems: number) => {
    const claimed = gameState.claimedQuests || [];
    if (claimed.includes(questId)) return;

    const updated = mockDb.updateGameState(playerUser.id, {
      gems: gameState.gems + rewardGems,
      claimedQuests: [...claimed, questId],
    });

    if (updated) {
      audioEngine.playHatchSuccess();
      onStateUpdate(updated);
      refreshLeaderboard();
    }
  };

  const handleOperationChange = (op: 'addition' | 'subtraction' | 'multiplication' | 'division') => {
    audioEngine.playHatchRoll();
    const updated = mockDb.updateGameState(playerUser.id, { selectedOperation: op });
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
      emoji: petType?.emoji || '🐶',
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

  return (
    <div style={{ padding: '20px', minHeight: '90vh' }}>
      
      {/* Top Navbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <h1
            className="text-glow-cyan"
            style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}
          >
            HUB WORLD 🌌 AURA MATH QUEST
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Prepare-se para o combate, selecione seu mapa e gerencie seus companheiros pets!</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="cyber-btn" onClick={onNavigateToPetShop} style={{ padding: '10px 18px', borderColor: 'var(--neon-yellow)' }}>
            🏪 Ir para Loja de Pets
          </button>
          <button className="cyber-btn cyber-btn-pink" onClick={onLogout} style={{ padding: '10px 18px' }}>
            Sair do Jogo ➔
          </button>
        </div>
      </div>

      {/* Floating Server Simulation Notification Alert */}
      {serverNotification && (
        <div
          className="cyber-card border-glow-purple"
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '12px 24px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '2px solid var(--neon-purple)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'float 2s ease-in-out infinite alternate',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>📣</span>
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
            {serverNotification}
          </span>
        </div>
      )}

      {/* Main Content Layout: Profile & Map Select (Left) vs Leaderboard (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        
        {/* Left Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Player Profile & Avatar Showcase */}
          <div className="cyber-card" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '24px', position: 'relative' }}>
            
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
                    const titleItem = COSMETIC_ITEMS.find(c => c.id === gameState.equippedCosmeticId && c.id.startsWith('title_'));
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
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
                    Alce o Nível 100 para dar Rebirth!
                  </div>
                )}
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
                return (
                  <button
                    key={op.id}
                    className="cyber-btn"
                    onClick={() => handleOperationChange(op.id as any)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '0.85rem',
                      background: isSelected ? 'rgba(0, 255, 204, 0.15)' : 'rgba(15,23,42,0.6)',
                      borderColor: isSelected ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
                      color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', marginRight: '4px' }}>{op.emoji}</span> {op.label.split(' ')[0]}
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
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>RESGATADO</span>
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
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Em progresso</span>
                      )}
                    </div>
                  </div>
                );
              })}
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

                return (
                  <button
                    key={opt.hex}
                    disabled={isLocked}
                    onClick={() => handleColorChange(opt.hex)}
                    style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      backgroundColor: opt.hex,
                      border: isSelected ? '4px solid #fff' : '2px solid rgba(0,0,0,0.4)',
                      boxShadow: isSelected ? `0 0 14px ${opt.hex}` : 'none',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.2 : 1,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={opt.name + (isLocked ? ' (Bloqueado)' : '')}
                  >
                    {isLocked && <span style={{ fontSize: '0.8rem' }}>🔒</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabs Selector for Maps vs Cosmetics Shop */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              className="cyber-btn"
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
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('rpg'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'rpg' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'rpg' ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)',
              }}
            >
              🔮 Classes/Talentos
            </button>
            <button
              className="cyber-btn"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('clans'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'clans' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'clans' ? 'var(--neon-pink)' : 'rgba(255,255,255,0.1)',
              }}
            >
              🛡️ Clãs
            </button>
            <button
              className="cyber-btn"
              onClick={() => { audioEngine.playHatchRoll(); setActiveHubTab('gincana'); }}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                fontSize: '0.85rem',
                background: activeHubTab === 'gincana' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15,23,42,0.6)',
                borderColor: activeHubTab === 'gincana' ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.1)',
              }}
            >
              🏫 Gincanas
            </button>
            <button
              className="cyber-btn"
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
                            <h4 style={{ fontSize: '1.1rem', color: isLocked ? 'rgba(255,255,255,0.4)' : stage.color, margin: 0 }}>
                              {stage.name}
                            </h4>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              background: isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                              color: isLocked ? 'rgba(255,255,255,0.4)' : '#fff',
                              fontWeight: 800
                            }}>
                              {stage.op}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '6px 0 0 0' }}>
                            {stage.desc}
                          </p>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
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
                
                {/* Forest (Easy) */}
                <div
                  className="cyber-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1.5px solid rgba(34, 197, 94, 0.3)',
                    background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.05) 0%, rgba(3, 7, 18, 0.6) 100%)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '1.2rem', color: '#22c55e' }}>🌲 Floresta Encantada</h4>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(34, 197, 94, 0.2)', padding: '2px 8px', borderRadius: '10px', color: '#22c55e', fontWeight: 800 }}>FÁCIL</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.3rem', marginBottom: '14px' }}>
                      Tabuadas: <strong style={{ color: '#22c55e' }}>2, 3, 4 e 5</strong>.<br />
                      Ideal para treinar a base de forma tranquila. Inimigos fracos e com mais tempo.
                    </p>
                  </div>
                  <button
                    className="cyber-btn"
                    onClick={() => {
                      audioEngine.playCorrect();
                      onSelectZone('forest');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderColor: '#22c55e',
                      background: 'rgba(34,197,94,0.1)',
                    }}
                  >
                    Entrar na Floresta ➔
                  </button>
                </div>

                {/* Volcano (Hard) */}
                <div
                  className="cyber-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1.5px solid rgba(244, 63, 94, 0.3)',
                    background: 'linear-gradient(180deg, rgba(244, 63, 94, 0.05) 0%, rgba(3, 7, 18, 0.6) 100%)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '1.2rem', color: 'var(--neon-pink)' }}>🌋 Vulcão Glitch</h4>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(244, 63, 94, 0.2)', padding: '2px 8px', borderRadius: '10px', color: 'var(--neon-pink)', fontWeight: 800 }}>DIFÍCIL</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.3rem', marginBottom: '14px' }}>
                      Tabuadas: <strong style={{ color: 'var(--neon-pink)' }}>6, 7, 8 e 9</strong>.<br />
                      Monstros fortes com tempos curtos, mas garantem **2.5x mais Aura** e chance de ovos!
                    </p>
                  </div>
                  <button
                    className="cyber-btn"
                    onClick={() => {
                      audioEngine.playCorrect();
                      onSelectZone('volcano');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderColor: 'var(--neon-pink)',
                      background: 'rgba(244,63,94,0.1)',
                    }}
                  >
                    Entrar no Vulcão ➔
                  </button>
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
                      <span style={{ fontSize: '0.8rem', background: 'rgba(0, 255, 204, 0.2)', padding: '2px 8px', borderRadius: '10px', color: 'var(--neon-cyan)', fontWeight: 800 }}>MINIJOGO</span>
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

              </div>
            </div>
          )}

          {/* Tab: RPG Classes & Talent Tree */}
          {activeHubTab === 'rpg' && (
            <div className="cyber-card" style={{ borderColor: 'var(--neon-purple)' }}>
              <h3 className="text-glow-purple" style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--neon-purple)' }}>
                🔮 Sistema de Classes e Talentos RPG
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
                Escolha a sua classe heroica para ganhar vantagens especiais em combate! Consiga <strong>Pontos de Rebirth (1 por Rebirth)</strong> para comprar talentos passivos e potencializar seus poderes de matemática.
              </p>

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
                    <div className="cyber-card hover-glow" style={{ border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.02)', textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => handleSelectClass('warrior')}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚔️</div>
                      <h5 style={{ fontSize: '1.2rem', color: 'var(--neon-pink)', fontWeight: 800, marginBottom: '8px' }}>Guerreiro Crítico</h5>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.2rem' }}>
                        Focado em responder rápido para conseguir acertos críticos devastadores. Começa com mais Escudos em combate.
                      </p>
                    </div>

                    {/* Chronomancer */}
                    <div className="cyber-card hover-glow" style={{ border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.02)', textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => handleSelectClass('chronomancer')}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔮</div>
                      <h5 style={{ fontSize: '1.2rem', color: 'var(--neon-purple)', fontWeight: 800, marginBottom: '8px' }}>Mago do Tempo</h5>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.2rem' }}>
                        Controla as correntes temporais da matemática. Aumenta o cronômetro para resolver contas com calma.
                      </p>
                    </div>

                    {/* Alchemist */}
                    <div className="cyber-card hover-glow" style={{ border: '1px solid rgba(234, 179, 8, 0.3)', background: 'rgba(234, 179, 8, 0.02)', textAlign: 'center', padding: '20px', cursor: 'pointer' }} onClick={() => handleSelectClass('alchemist')}>
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
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Sua Classe</div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: gameState.classId === 'warrior' ? 'var(--neon-pink)' : gameState.classId === 'chronomancer' ? 'var(--neon-purple)' : 'var(--neon-yellow)' }}>
                          {gameState.classId === 'warrior' ? 'Guerreiro Crítico' : gameState.classId === 'chronomancer' ? 'Mago do Tempo' : 'Alquimista de Aura'}
                        </h4>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Pontos de Rebirth (Disponíveis / Total)</div>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                                onClick={() => handleBuySkill(skill.id, skill.name)}
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
                      onClick={() => {
                        if (window.confirm('Deseja resetar sua classe? Suas habilidades serão bloqueadas e seus pontos serão devolvidos.')) {
                          audioEngine.playLevelUp();
                          mockDb.updateGameState(playerUser.id, { classId: null, unlockedSkills: [] });
                          onStateUpdate(mockDb.getGameState(playerUser.id)!);
                          setRpgSuccess('Classe resetada com sucesso!');
                          setTimeout(() => setRpgSuccess(null), 4000);
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
          )}

          {/* Tab: Clans Panel */}
          {activeHubTab === 'clans' && (
            <div className="cyber-card" style={{ borderColor: 'var(--neon-pink)' }}>
              <h3 className="text-glow-pink" style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--neon-pink)' }}>
                🛡️ Alianças e Clãs Estudantis
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
                Una forças com seus colegas de classe! Crie ou entre em um clã de matemática para acumular pontos coletivos e dominar os rankings escolares da gincana!
              </p>

              {clanSuccess && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
                  {clanSuccess}
                </div>
              )}

              {clanError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
                  {clanError}
                </div>
              )}

              {/* Clan Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                {/* Left side: Player's Current Clan or Join/Create tabs */}
                <div>
                  {(() => {
                    const myClan = gameState.clanId ? clansList.find(c => c.id === gameState.clanId) : null;
                    
                    if (myClan) {
                       const allUsers = allUsersList.length > 0 ? allUsersList : mockDb.getUsers();
                       const clanMembers = allUsers.filter(u => myClan.members.includes(u.id));

                       return (
                         <div className="cyber-card" style={{ borderColor: 'var(--neon-pink)', background: 'rgba(244, 63, 94, 0.03)', padding: '16px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                             <span style={{ fontSize: '3rem' }}>{myClan.badgeEmoji}</span>
                             <div>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{myClan.name}</h4>
                                 <span style={{ fontSize: '0.8rem', color: 'var(--neon-pink)', fontWeight: 800, border: '1px solid var(--neon-pink)', padding: '1px 6px', borderRadius: '4px' }}>
                                   [{myClan.tag}]
                                 </span>
                               </div>
                               <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>"{myClan.motto}"</p>
                             </div>
                           </div>

                           <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginBottom: '16px' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                               <h5 style={{ fontSize: '0.9rem', color: '#fff' }}>🛡️ Nível do Clã: {myClan.level || 1}</h5>
                               <span style={{ fontSize: '0.8rem', color: 'var(--neon-pink)', fontWeight: 'bold' }}>Bônus: +{( ((myClan.level || 1) * 0.02) * 100 ).toFixed(0)}% XP/Gemas</span>
                             </div>
                             <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '4px', height: '8px', width: '100%', marginBottom: '16px', overflow: 'hidden' }}>
                               <div style={{ height: '100%', width: `${Math.min(((myClan.xp || 0) / ((myClan.level || 1) * 500)) * 100, 100)}%`, background: 'var(--neon-pink)', transition: 'width 0.3s ease' }}></div>
                             </div>

                             <h5 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '10px' }}>👥 Membros do Clã ({clanMembers.length}):</h5>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                               {clanMembers.map(member => {
                                 const mState = mockDb.getGameState(member.id);
                                 const isLeader = myClan.leaderId === member.id;
                                 return (
                                   <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.4)' }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                       {isLeader && <span title="Líder do Clã">👑</span>}
                                       <span style={{ color: member.id === playerUser.id ? 'var(--neon-pink)' : '#fff', fontWeight: member.id === playerUser.id ? 800 : 500 }}>
                                         {member.username} {member.id === playerUser.id ? '(Você)' : ''}
                                       </span>
                                     </div>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                       <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                                         Nvl Aura {mState?.auraLevel || 1} • ⭐ {mState?.rebirths || 0}
                                       </span>
                                       {myClan.leaderId === playerUser.id && member.id !== playerUser.id && (
                                         <div style={{ display: 'flex', gap: '4px' }}>
                                           <button onClick={() => handleTransferLeadership(myClan.id, member.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }} title="Promover a Líder">👑</button>
                                           <button onClick={() => handleKickMember(myClan.id, member.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }} title="Expulsar">👢</button>
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>

                           {myClan.leaderId === playerUser.id && (
                             <div style={{ marginBottom: '16px', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '12px', borderRadius: '8px' }}>
                               <h5 style={{ fontSize: '0.85rem', color: 'var(--neon-yellow)', marginBottom: '8px' }}>👑 Painel do Líder / Candidaturas:</h5>
                               {(myClan.joinRequests?.length || 0) === 0 ? (
                                 <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 0 }}>
                                   Nenhum pedido de entrada pendente.
                                 </p>
                               ) : (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                   {myClan.joinRequests.map((reqId: string) => {
                                     const user = allUsersList.find(u => u.id === reqId) || mockDb.getUsers().find(u => u.id === reqId);
                                     if (!user) return null;
                                     return (
                                       <div key={reqId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                                         <span style={{ fontSize: '0.8rem', color: '#fff' }}>{user.username}</span>
                                         <div style={{ display: 'flex', gap: '6px' }}>
                                           <button onClick={() => handleAcceptApplication(myClan.id, reqId)} style={{ background: 'var(--neon-cyan)', color: '#000', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Aceitar</button>
                                           <button onClick={() => handleRejectApplication(myClan.id, reqId)} style={{ background: 'var(--neon-pink)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Recusar</button>
                                         </div>
                                       </div>
                                     );
                                   })}
                                 </div>
                               )}
                             </div>
                           )}
                           {/* Cooperative Boss Card */}
                           <div style={{ marginBottom: '16px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '12px', borderRadius: '8px' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                               <h5 style={{ fontSize: '0.85rem', color: 'var(--neon-purple)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 ⚔️ Chefe do Clã Cooperativo:
                               </h5>
                               <span style={{ fontSize: '0.75rem', color: '#fff', backgroundColor: 'var(--neon-purple)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                 Nvl {myClan.bossLevel || 1}
                               </span>
                             </div>

                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                               <span style={{ fontSize: '2rem' }}>
                                 {(myClan.bossLevel || 1) % 3 === 1 ? '🤖' : (myClan.bossLevel || 1) % 3 === 2 ? '🐉' : '👹'}
                               </span>
                               <div>
                                 <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>
                                   {(myClan.bossLevel || 1) % 3 === 1 ? 'Matemoticão de Ferro' : (myClan.bossLevel || 1) % 3 === 2 ? 'Dragão de Frações' : 'Monstro Algébrico'}
                                 </div>
                                 <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                   HP: {myClan.bossHp ?? 5000} / {myClan.bossMaxHp ?? 5000}
                                 </div>
                               </div>
                             </div>

                             {/* Health Bar */}
                             <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '4px', height: '10px', width: '100%', overflow: 'hidden', marginBottom: '10px' }}>
                               <div
                                 style={{
                                   height: '100%',
                                   width: `${Math.max(0, Math.min(100, (((myClan.bossHp ?? 5000) / (myClan.bossMaxHp ?? 5000)) * 100)))}%`,
                                   background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                                   transition: 'width 0.3s ease'
                                 }}
                               />
                             </div>

                             <button
                               className="cyber-btn"
                               onClick={() => {
                                 audioEngine.playCorrect();
                                 onSelectZone('volcano'); // Launching battle arena, which allows damaging the boss on correct hits.
                               }}
                               style={{
                                 width: '100%',
                                 padding: '8px',
                                 fontSize: '0.8rem',
                                 borderColor: 'var(--neon-purple)',
                                 background: 'rgba(168, 85, 247, 0.15)',
                                 marginBottom: '8px',
                                 fontWeight: 800
                               }}
                             >
                               ⚔️ Iniciar Combate na Arena
                             </button>

                             <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic' }}>
                               *Resolva contas na Arena de Combate para causar dano ao chefe cooperativo!
                             </p>
                           </div>

                           <button
                             className="cyber-btn cyber-btn-pink"
                             onClick={handleLeaveClan}
                             style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                           >
                             🚪 Sair do Clã
                           </button>
                         </div>
                      );
                    } else {
                      return (
                        /* Create Clan Form */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="cyber-card" style={{ background: 'rgba(15,23,42,0.4)', padding: '16px' }}>
                        <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          ➕ Criar um Novo Clã
                        </h4>
                        
                        <form onSubmit={handleCreateClan} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 2 }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Nome do Clã:</label>
                              <input type="text" value={newClanName} onChange={e => setNewClanName(e.target.value)} placeholder="Ex: Math Titans" maxLength={20} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>TAG (TNS):</label>
                              <input type="text" value={newClanTag} onChange={e => setNewClanTag(e.target.value)} placeholder="Ex: TNS" maxLength={4} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem', textTransform: 'uppercase' }} />
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Lema do Clã:</label>
                            <input type="text" value={newClanMotto} onChange={e => setNewClanMotto(e.target.value)} placeholder="Ex: Resolver até o infinito!" maxLength={40} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem' }} />
                          </div>

                          <div style={{ display: 'flex', justifyItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1.5 }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Emblema:</label>
                              <select value={newClanBadge} onChange={e => setNewClanBadge(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem' }}>
                                <option value="🛡️">🛡️ Escudo Cósmico</option>
                                <option value="🔥">🔥 Chama de Aura</option>
                                <option value="👑">👑 Coroa de Ouro</option>
                                <option value="⚡">⚡ Raio Elétrico</option>
                                <option value="🦄">🦄 Pégaso Mágico</option>
                              </select>
                            </div>
                            <button type="submit" className="cyber-btn" style={{ flex: 1, height: '36px', marginTop: '18px', padding: '0', fontSize: '0.85rem', borderColor: 'var(--neon-pink)', background: 'rgba(244,63,94,0.1)' }}>
                              Criar Clã
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>

                {/* Right side: Active Clans List & Leaderboard ranking */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                    🏆 Ranking Geral de Clãs
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                    {clansList.map((clan, index) => {
                      const isMyClan = gameState.clanId === clan.id;
                      const isExpanded = expandedClanId === clan.id;
                      const bossLvl = clan.bossLevel || 1;
                      
                      return (
                        <div
                          key={clan.id}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: isMyClan ? '1.5px solid var(--neon-pink)' : '1px solid rgba(255,255,255,0.05)',
                            background: isMyClan ? 'rgba(244, 63, 94, 0.08)' : 'rgba(15, 23, 42, 0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            cursor: 'pointer',
                          }}
                          onClick={() => setExpandedClanId(isExpanded ? null : clan.id)}
                        >
                          {/* Main Row / Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', minWidth: '20px' }}>
                                #{index + 1}
                              </span>
                              <span style={{ fontSize: '1.6rem' }}>{clan.badgeEmoji}</span>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>{clan.name}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--neon-pink)' }}>[{clan.tag}]</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                  {clan.members.length} {clan.members.length === 1 ? 'membro' : 'membros'}
                                </span>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                <strong style={{ fontSize: '0.8rem', color: 'var(--neon-pink)' }}>
                                  Nível {clan.level || 1}
                                </strong>
                                <strong style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                  ⭐ {clan.totalRebirths}
                                </strong>
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', userSelect: 'none' }}>
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Details Section */}
                          {isExpanded && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                paddingTop: '8px',
                                marginTop: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                cursor: 'default',
                              }}
                            >
                              {clan.motto && (
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: '0 0 2px 0' }}>
                                  "{clan.motto}"
                                </p>
                              )}

                              {/* Passive bonus info */}
                              <div style={{ fontSize: '0.7rem', color: '#fff', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px', borderLeft: '3px solid var(--neon-pink)' }}>
                                <span style={{ color: 'var(--neon-pink)', fontWeight: 'bold' }}>✨ Bônus de XP/Gemas:</span> +{((clan.level || 1) * 2)}% multiplicador de recompensa.
                              </div>

                              {/* Clan Boss Status */}
                              <div style={{ fontSize: '0.7rem', color: '#fff', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '6px', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: 'bold' }}>
                                  <span style={{ color: 'var(--neon-purple)' }}>⚔️ Chefe: Nvl {bossLvl}</span>
                                  <span>HP: {clan.bossHp ?? 5000} / {clan.bossMaxHp ?? 5000}</span>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '2px', height: '6px', width: '100%', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${Math.max(0, Math.min(100, (((clan.bossHp ?? 5000) / (clan.bossMaxHp ?? 5000)) * 100)))}%`,
                                      background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Conquistas (Achievements) */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {clan.level >= 5 && <span style={{ fontSize: '0.65rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-yellow)' }} title="Clã Nível 5+">🛡️ Guardião</span>}
                                {clan.level >= 10 && <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-cyan)' }} title="Clã Nível 10+">🔮 Mestre de Aura</span>}
                                {bossLvl > 1 && (
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-pink)' }} title={`Derrotou ${bossLvl - 1} chefes`}>
                                    ⚔️ {bossLvl - 1} Derrotado{(bossLvl - 1) > 1 ? 's' : ''}
                                  </span>
                                )}
                                {clan.totalRebirths >= 10 && <span style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-purple)' }} title="Mais de 10 Rebirths somados">⭐ Poder Coletivo</span>}
                              </div>

                              {/* Members list */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
                                  👥 Membros ({clan.members.length}):
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto' }}>
                                  {clan.members.map((memberId) => {
                                    const allUsers = allUsersList.length > 0 ? allUsersList : mockDb.getUsers();
                                    const member = allUsers.find(u => u.id === memberId);
                                    if (!member) return null;
                                    const mState = mockDb.getGameState(member.id);
                                    const isLeader = clan.leaderId === member.id;
                                    return (
                                      <div
                                        key={memberId}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          fontSize: '0.7rem',
                                          padding: '4px 6px',
                                          borderRadius: '4px',
                                          background: 'rgba(255, 255, 255, 0.02)',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          {isLeader && <span title="Líder do Clã">👑</span>}
                                          <span style={{ color: member.id === playerUser.id ? 'var(--neon-pink)' : '#fff', fontWeight: member.id === playerUser.id ? 800 : 500 }}>
                                            {member.username} {member.id === playerUser.id ? '(Você)' : ''}
                                          </span>
                                        </div>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                                          Nvl {mState?.auraLevel || 1} • ⭐ {mState?.rebirths || 0}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Application button if player is not in this clan and not in any clan */}
                              {(!gameState.clanId || !clansList.some(c => c.id === gameState.clanId)) && !isMyClan && (
                                <button
                                  className="cyber-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplyToClan(clan.id, clan.name);
                                  }}
                                  disabled={(clan.joinRequests || []).includes(playerUser.id)}
                                  style={{ padding: '6px 10px', fontSize: '0.75rem', height: '28px', width: '100%', marginTop: '4px', opacity: (clan.joinRequests || []).includes(playerUser.id) ? 0.5 : 1 }}
                                >
                                  {(clan.joinRequests || []).includes(playerUser.id) ? 'Candidatura Pendente ⏳' : 'Enviar Candidatura para o Clã 📝'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab: Gincanas Panel */}
          {activeHubTab === 'gincana' && (
            <div className="cyber-card" style={{ borderColor: 'var(--neon-yellow)' }}>
              <h3 className="text-glow-yellow" style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--neon-yellow)' }}>
                🏫 Painel de Gincanas da Escola
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
                Participe de desafios lançados pelos professores! Complete metas coletivas de sala de aula para liberar cupons de bônus e gemas mágicas para todos os alunos.
              </p>

              {/* Classroom Goals Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(15,23,42,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                  🎯 Desafios Coletivos da Turma (Gincana Escolar):
                </h4>

                {/* Target 1 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>🧮 <strong>Maratona da Tabuada</strong>: Resolver 500 questões corretas</span>
                    <strong style={{ color: 'var(--neon-yellow)' }}>387 / 500 (77%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '77%', height: '100%', background: 'var(--neon-yellow)', boxShadow: '0 0 6px var(--neon-yellow)' }} />
                  </div>
                </div>

                {/* Target 2 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>💀 <strong>Caçadores de Boss</strong>: Derrotar 15 chefões em Raids Co-op</span>
                    <strong style={{ color: 'var(--neon-pink)' }}>11 / 15 (73%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '73%', height: '100%', background: 'var(--neon-pink)', boxShadow: '0 0 6px var(--neon-pink)' }} />
                  </div>
                </div>

                {/* Target 3 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>🌌 <strong>Aura Coletiva</strong>: Alunos acumularem 100 níveis de aura</span>
                    <strong style={{ color: 'var(--neon-cyan)' }}>92 / 100 (92%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '92%', height: '100%', background: 'var(--neon-cyan)', boxShadow: '0 0 6px var(--neon-cyan)' }} />
                  </div>
                </div>
              </div>

              {/* Teacher homework or recommendations */}
              <div className="cyber-card" style={{ borderStyle: 'dashed', borderColor: 'rgba(234, 179, 8, 0.4)', background: 'rgba(234, 179, 8, 0.01)', padding: '16px' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--neon-yellow)', marginBottom: '8px' }}>
                  👩‍🏫 Tarefas Recomendadas pela Professora:
                </h4>
                <ul style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', paddingLeft: '20px', lineHeight: '1.4rem' }}>
                  <li>🏆 Pratique no <strong>Vulcão do Código Glitch</strong> tabuada de 7 e 8 para a prova de sexta! (Garante 2.5x mais XP).</li>
                  <li>⚔️ Participe do <strong>Modo PvP Multiplayer</strong> contra colegas para duelar tabuadas rápidas e treinar seu foco crítico.</li>
                  <li>🐾 Negocie seus pets repetidos no <strong>Mercado de Trocas Cósmicas</strong> para completar sua coleção.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 2: Cosmetics Avatar Shop */}
          {activeHubTab === 'shop' && (
            <div className="cyber-card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#fff' }}>🎨 Loja do Mago (Equipamentos e Cosméticos)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {COSMETIC_ITEMS.map(item => {
                  const purchased = gameState.purchasedCosmetics || [];
                  const isOwned = purchased.includes(item.id);
                  const isEquipped = gameState.equippedCosmeticId === item.id;

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
          )}

          {/* Tab 3: Aura Pass */}
          {activeHubTab === 'aurapass' && (
            <AuraPass
              userId={playerUser.id}
              gameState={gameState}
              onStateUpdate={onStateUpdate}
            />
          )}
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
