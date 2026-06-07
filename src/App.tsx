import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { HubWorld } from './components/HubWorld';
import { PetShop } from './components/PetShop';
import { CombatArena } from './components/CombatArena';
import { CyberRunner } from './components/CyberRunner';
import { seedDatabase } from './services/mockDb';
import { backendService } from './services/backendService';
import type { User, GameState } from './services/mockDb';
import { audioEngine } from './components/AudioEngine';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<'login' | 'hub' | 'admin' | 'pet_shop' | 'combat' | 'runner'>('login');
  const [selectedZone, setSelectedZone] = useState<'forest' | 'volcano'>('forest');
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Popups/notifications
  const [battleReward, setBattleReward] = useState<{ xp: number; gems: number } | null>(null);
  const [selectedCampaignStageId, setSelectedCampaignStageId] = useState<number | null>(null);

  // Ensure DB is seeded on startup
  useEffect(() => {
    seedDatabase();
  }, []);

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    audioEngine.startSoundtrack(); // Inicia trilha sonora com a interação
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

  const handleSelectZone = (zone: 'forest' | 'volcano') => {
    setSelectedZone(zone);
    setScreen('combat');
  };

  const handleBattleFinished = async (xpGained: number, gemsGained: number, isVictory?: boolean) => {
    if (user) {
      if (selectedCampaignStageId !== null) {
        if (isVictory) {
          await backendService.completeCampaignStage(user.id, selectedCampaignStageId);
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
