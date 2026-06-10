import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { HubWorld } from './components/HubWorld';
import { PetShop } from './components/PetShop';
import { CombatArena } from './components/CombatArena';
import { CyberRunner } from './components/CyberRunner';
import { Olympics } from './components/Olympics';
import { seedDatabase } from './services/mockDb';
import { backendService } from './services/backendService';
import type { User, GameState } from './services/mockDb';
import { audioEngine } from './components/AudioEngine';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<'login' | 'hub' | 'admin' | 'pet_shop' | 'combat' | 'runner' | 'olympics'>('login');
  const [selectedZone, setSelectedZone] = useState<'forest' | 'volcano' | 'unified'>('unified');
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Popups/notifications
  const [battleReward, setBattleReward] = useState<{ xp: number; gems: number } | null>(null);
  const [selectedCampaignStageId, setSelectedCampaignStageId] = useState<number | null>(null);
  const [showLevelUpCelebration, setShowLevelUpCelebration] = useState<number | null>(null);
  const [lastLevel, setLastLevel] = useState<number | null>(null);

  // Global Level Up Detection Effect
  useEffect(() => {
    if (gameState) {
      if (lastLevel !== null && gameState.auraLevel > lastLevel) {
        setShowLevelUpCelebration(gameState.auraLevel);
        audioEngine.playLevelUp();
      }
      setLastLevel(gameState.auraLevel);
    }
  }, [gameState?.auraLevel]);

  // Ensure DB is seeded on startup
  useEffect(() => {
    seedDatabase();
  }, []);

  // Sync screen changes to correct dynamic AudioEngine soundtrack theme
  useEffect(() => {
    if (user && screen !== 'login' && screen !== 'admin') {
      if (screen === 'combat' || screen === 'runner') {
        audioEngine.startSoundtrack('combat');
      } else if (screen === 'pet_shop') {
        audioEngine.startSoundtrack('pet_shop');
      } else if (screen === 'olympics') {
        audioEngine.startSoundtrack('olympics');
      } else {
        audioEngine.startSoundtrack('hub');
      }
    } else {
      audioEngine.stopSoundtrack();
    }
  }, [screen, user]);

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    
    // Sync data from Supabase to LocalStorage if connected
    if (backendService.isCloudConnected()) {
      try {
        console.log('🔄 Sincronizando dados do Supabase para o armazenamento local...');
        const state = await backendService.getGameState(loggedInUser.id);
        const pets = await backendService.getPets(loggedInUser.id);
        const stats = await backendService.getMathStats(loggedInUser.id);

        if (state) {
          const localStates = localStorage.getItem('amq_game_states') 
            ? JSON.parse(localStorage.getItem('amq_game_states')!) 
            : [];
          const filteredStates = localStates.filter((s: any) => s.userId !== loggedInUser.id);
          filteredStates.push(state);
          localStorage.setItem('amq_game_states', JSON.stringify(filteredStates));
        }

        if (pets) {
          const localPets = localStorage.getItem('amq_pets')
            ? JSON.parse(localStorage.getItem('amq_pets')!)
            : [];
          const filteredPets = localPets.filter((p: any) => p.userId !== loggedInUser.id);
          filteredPets.push(...pets);
          localStorage.setItem('amq_pets', JSON.stringify(filteredPets));
        }

        if (stats) {
          const localStats = localStorage.getItem('amq_stats')
            ? JSON.parse(localStorage.getItem('amq_stats')!)
            : [];
          const filteredStats = localStats.filter((s: any) => s.userId !== loggedInUser.id);
          filteredStats.push(...stats);
          localStorage.setItem('amq_stats', JSON.stringify(filteredStats));
        }
      } catch (err) {
        console.error('❌ Falha ao sincronizar dados com o Supabase no login:', err);
      }
    }

    if (loggedInUser.role === 'admin') {
      setScreen('admin');
    } else {
      const state = await backendService.getGameState(loggedInUser.id);
      if (state) {
        setGameState(state);
      }
      setScreen('hub');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setGameState(null);
    setScreen('login');
    audioEngine.playHatchRoll();
  };

  const handleSelectZone = (zone: 'forest' | 'volcano' | 'unified') => {
    setSelectedZone(zone);
    setScreen('combat');
  };

  const handleBattleFinished = async (xpGained: number, gemsGained: number, isVictory?: boolean) => {
    if (user) {
      if (selectedCampaignStageId !== null) {
        if (isVictory) {
          await backendService.completeCampaignStage(user.id, selectedCampaignStageId, xpGained, gemsGained);
        }
        setSelectedCampaignStageId(null);
      }
      // Reload game state
      const freshState = await backendService.getGameState(user.id);
      if (freshState) {
        setGameState(freshState);
      }
    }
    setBattleReward({ xp: xpGained, gems: gemsGained });
  };

  const handleRewardClose = () => {
    setBattleReward(null);
    setScreen('hub');
  };

  const handleAudioToggle = () => {
    const muted = audioEngine.toggleMute();
    setIsAudioMuted(muted);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Global Mute Toggle Floating Button */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleAudioToggle}
          className="cyber-btn cyber-btn-cyan"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            padding: 0,
            fontSize: '1.2rem',
          }}
          title={isAudioMuted ? 'Desmutar Som' : 'Mutar Som'}
        >
          {isAudioMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Screen Router */}
      <main style={{ flex: 1 }}>
        {screen === 'login' && (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}

        {screen === 'admin' && user && (
          <AdminDashboard adminUser={user} onLogout={handleLogout} />
        )}

        {screen === 'hub' && user && gameState && (
          <HubWorld
            playerUser={user}
            gameState={gameState}
            onStateUpdate={setGameState}
            onSelectZone={handleSelectZone}
            onSelectCampaignStage={(stageId) => {
              setSelectedCampaignStageId(stageId);
              setScreen('combat');
            }}
            onNavigateToPetShop={() => setScreen('pet_shop')}
            onNavigateToRunner={() => setScreen('runner')}
            onNavigateToOlympics={() => setScreen('olympics')}
            onLogout={handleLogout}
          />
        )}

        {screen === 'pet_shop' && user && gameState && (
          <PetShop
            userId={user.id}
            gameState={gameState}
            onStateUpdate={setGameState}
            onBack={() => setScreen('hub')}
          />
        )}

        {screen === 'combat' && user && gameState && (
          <CombatArena
            playerUser={user}
            zone={selectedZone}
            campaignStageId={selectedCampaignStageId}
            gameState={gameState}
            onBattleFinished={handleBattleFinished}
            onBack={() => {
              setSelectedCampaignStageId(null);
              setScreen('hub');
            }}
          />
        )}

        {screen === 'runner' && user && gameState && (
          <CyberRunner
            playerUser={user}
            gameState={gameState}
            onBack={() => setScreen('hub')}
            onStateUpdate={setGameState}
          />
        )}

        {screen === 'olympics' && user && gameState && (
          <Olympics
            gameState={gameState}
            onBack={() => setScreen('hub')}
            onStateUpdate={setGameState}
          />
        )}
      </main>

      {/* Consolation / Loot Popup on game finish */}
      {battleReward && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            className="cyber-card"
            style={{
              width: '90%',
              maxWidth: '400px',
              textAlign: 'center',
              padding: '30px',
              borderColor: 'var(--neon-purple)',
              boxShadow: '0 0 25px rgba(168,85,247,0.3)',
            }}
          >
            <h2 className="text-glow-purple" style={{ color: 'var(--neon-purple)', marginBottom: '16px' }}>
              Relatório de Combate
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Aura XP recebido:</span>
                <strong style={{ color: 'var(--neon-purple)' }}>+{battleReward.xp} XP</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gemas recebidas:</span>
                <strong style={{ color: 'var(--neon-cyan)' }}>💎 +{battleReward.gems}</strong>
              </div>
            </div>
            <button className="cyber-btn" onClick={handleRewardClose} style={{ width: '100%', padding: '12px' }}>
              Retornar ao Hub de Aura
            </button>
          </div>
        </div>
      )}

      {/* Global Level Up Celebration Overlay */}
      {showLevelUpCelebration !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.95)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          {/* Confetti simulation (standard CSS elements) */}
          <div style={{ pointerEvents: 'none', position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}>
            {Array.from({ length: 25 }).map((_, idx) => {
              const delay = Math.random() * 3;
              const left = Math.random() * 100;
              const color = ['var(--neon-yellow)', 'var(--neon-cyan)', 'var(--neon-purple)', 'var(--neon-pink)'][idx % 4];
              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    left: `${left}%`,
                    width: '10px',
                    height: '10px',
                    backgroundColor: color,
                    borderRadius: '20%',
                    boxShadow: `0 0 6px ${color}`,
                    animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                    animationDelay: `${delay}s`,
                  }}
                />
              );
            })}
          </div>

          <div
            className="cyber-card animate-float"
            style={{
              width: '90%',
              maxWidth: '440px',
              textAlign: 'center',
              padding: '40px 30px',
              borderColor: 'var(--neon-yellow)',
              boxShadow: '0 0 45px rgba(234, 179, 8, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 0 15px var(--neon-yellow))', animation: 'pulse-ring 1s infinite alternate' }}>⚡</div>
            
            <h1
              className="text-glow-yellow"
              style={{
                color: 'var(--neon-yellow)',
                fontSize: '2.3rem',
                fontWeight: 900,
                letterSpacing: '1px',
                margin: 0,
              }}
            >
              NÍVEL DE AURA ELEVADO!
            </h1>
            
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.15rem', margin: 0 }}>
              Sua energia ciber-matemática se expandiu! Você alcançou o:
            </p>
            
            <div
              style={{
                fontSize: '2.8rem',
                fontWeight: 900,
                color: 'var(--neon-cyan)',
                textShadow: '0 0 15px var(--neon-cyan)',
                background: 'rgba(0, 255, 204, 0.08)',
                padding: '12px 36px',
                borderRadius: '12px',
                border: '1.8px solid var(--neon-cyan)',
              }}
            >
              Nível {showLevelUpCelebration}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
              "Os Glitches do Sistema tremem perante o seu poder de raciocínio!"
            </p>

            <button
              className="cyber-btn cyber-btn-cyan"
              onClick={() => {
                setShowLevelUpCelebration(null);
                audioEngine.playCorrect();
              }}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(0, 255, 204, 0.3)',
              }}
            >
              Continuar a Aventura 🚀
            </button>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.4)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          marginTop: 'auto',
        }}
      >
        Aura Math Quest 🌠 RPG Gamificado de Tabuada • Criado para o Ensino Fundamental • Foco em 9 Anos
      </footer>
    </div>
  );
}

export default App;
