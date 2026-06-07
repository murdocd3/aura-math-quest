import React, { useState } from 'react';
import type { User } from '../services/mockDb';
import { audioEngine } from './AudioEngine';
import { backendService } from '../services/backendService';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      triggerError();
      return;
    }

    const authenticatedUser = await backendService.login(username, password);
    if (authenticatedUser) {
      audioEngine.playCorrect();
      onLoginSuccess(authenticatedUser);
    } else {
      setError('Usuário ou senha incorretos.');
      triggerError();
    }
  };

  const triggerError = () => {
    audioEngine.playError();
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '20px',
      }}
    >
      <div className="animate-float" style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1
          className="text-glow-cyan"
          style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            letterSpacing: '2px',
            color: 'var(--neon-cyan)',
            marginBottom: '4px',
            textTransform: 'uppercase',
          }}
        >
          Aura Math Quest
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem' }}>
          Derrote os Glitches. Colecione Pets. Eleve sua Aura. 🌌
        </p>
      </div>

      <div
        className={`cyber-card ${shake ? 'animate-shake' : ''}`}
        style={{
          width: '100%',
          maxWidth: '420px',
          border: '2px solid rgba(168, 85, 247, 0.2)',
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.1)',
          position: 'relative',
        }}
      >
        <h2
          className="text-glow-purple"
          style={{
            fontSize: '1.8rem',
            textAlign: 'center',
            marginBottom: '24px',
            color: 'var(--neon-purple)',
          }}
        >
          Acesso Restrito
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              Usuário (Criança ou Admin)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite o nome de usuário"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--neon-cyan)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--neon-purple)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
            />
          </div>

          {error && (
            <div
              style={{
                color: 'var(--neon-pink)',
                fontSize: '0.9rem',
                fontWeight: 600,
                textAlign: 'center',
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="cyber-btn"
            style={{
              padding: '14px',
              fontSize: '1.1rem',
              fontWeight: 800,
              marginTop: '10px',
            }}
          >
            Entrar no Portal ➔
          </button>
        </form>
      </div>

      {/* Demo Credentials Helper */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          onClick={() => {
            audioEngine.playHatchRoll();
            setShowDemoAccounts(!showDemoAccounts);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--neon-cyan)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          {showDemoAccounts ? 'Ocultar Contas de Demonstração' : 'Ver Contas de Demonstração (Para Testes)'}
        </button>

        {showDemoAccounts && (
          <div
            className="cyber-card"
            style={{
              marginTop: '12px',
              padding: '16px',
              maxWidth: '380px',
              textAlign: 'left',
              fontSize: '0.85rem',
              borderColor: 'rgba(0, 255, 204, 0.3)',
              lineHeight: '1.4rem',
            }}
          >
            <div style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
              <strong>Admin Account (Criar usuários e ver estatísticas):</strong><br />
              • Usuário: <span style={{ color: 'var(--neon-purple)', fontFamily: 'Share Tech Mono' }}>admin</span><br />
              • Senha: <span style={{ color: 'var(--neon-purple)', fontFamily: 'Share Tech Mono' }}>auraadmin123</span>
            </div>
            <div>
              <strong>Contas de Jogadores Seedadas (Para testar o game loop):</strong><br />
              • Lucas: <span style={{ color: 'var(--neon-cyan)' }}>lucas</span> / <span style={{ color: 'var(--neon-cyan)' }}>lucas123</span> (Aura Alta, Pets)<br />
              • Sofia: <span style={{ color: 'var(--neon-cyan)' }}>sofia</span> / <span style={{ color: 'var(--neon-cyan)' }}>sofia123</span> (Erros na tabuada do 7)<br />
              • Gabriel: <span style={{ color: 'var(--neon-cyan)' }}>gabriel</span> / <span style={{ color: 'var(--neon-cyan)' }}>gabriel123</span> (Nível inicial)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
