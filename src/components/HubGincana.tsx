import React from 'react';
import { type GameState } from '../services/mockDb';

interface HubGincanaProps {
  gameState: GameState;
}

export const HubGincana: React.FC<HubGincanaProps> = ({ gameState }) => {
  const isGincanaLocked = gameState.auraLevel < 5 && gameState.rebirths === 0;
  if (isGincanaLocked) {
    return (
      <div className="cyber-card" style={{ borderColor: 'var(--neon-yellow)', textAlign: 'center', padding: '40px 20px', background: 'rgba(234, 179, 8, 0.03)' }}>
        <h3 className="text-glow-yellow" style={{ fontSize: '1.4rem', color: 'var(--neon-yellow)', marginBottom: '14px' }}>
          🔒 Gincanas Escolares (Bloqueado)
        </h3>
        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', lineHeight: '1.5rem' }}>
          Esta funcionalidade cooperativa requer **Nível de Aura 5** ou pelo menos **1 Rebirth** para ser despertada.
        </p>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(15,23,42,0.4)', padding: '12px 24px', borderRadius: '8px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.05)' }}>
          Sua Aura Atual: <strong style={{ color: 'var(--neon-yellow)' }}>Nível {gameState.auraLevel}</strong> • Rebirths: <strong style={{ color: 'var(--neon-pink)' }}>{gameState.rebirths}</strong>
        </div>
      </div>
    );
  }

  return (
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
  );
};
