import React, { useState, useEffect } from 'react';
import type { User, GameState, MathStatistic } from '../services/mockDb';
import { audioEngine } from './AudioEngine';
import { backendService } from '../services/backendService';

interface AdminDashboardProps {
  adminUser: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminUser, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Game states map for user listing in sidebar
  const [gameStatesMap, setGameStatesMap] = useState<Record<string, GameState>>({});
  
  // Active stats state for selected user
  const [activeStats, setActiveStats] = useState<any>(null);

  // Form states for creating/editing
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'player'>('player');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('users');

  const loadUsers = async () => {
    const allUsers = await backendService.getUsers();
    setUsers(allUsers);
    
    // Load game states for player list sidebars
    const playerUsers = allUsers.filter(u => u.role === 'player');
    const statesMap: Record<string, GameState> = {};
    for (const player of playerUsers) {
      const state = await backendService.getGameState(player.id);
      if (state) {
        statesMap[player.id] = state;
      }
    }
    setGameStatesMap(statesMap);

    if (allUsers.length > 0 && !selectedUserId) {
      // Select the first player by default for analytics
      const firstPlayer = allUsers.find(u => u.role === 'player');
      if (firstPlayer) {
        setSelectedUserId(firstPlayer.id);
      } else {
        setSelectedUserId(allUsers[0].id);
      }
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Fetch selected user details asynchronously
  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedUserId) {
        setActiveStats(null);
        return;
      }
      const user = users.find(u => u.id === selectedUserId);
      if (!user) {
        setActiveStats(null);
        return;
      }

      const state = await backendService.getGameState(selectedUserId);
      const stats = await backendService.getMathStats(selectedUserId);

      setActiveStats({
        user,
        state,
        stats: stats.sort((a, b) => b.errorCount - a.errorCount),
      });
    };

    fetchStats();
  }, [selectedUserId, users]);

  const handlePrintPdf = () => {
    if (!activeStats) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statsRows = activeStats.stats.map((s: any) => {
      const total = s.correctCount + s.errorCount;
      const rate = total > 0 ? Math.round((s.correctCount / total) * 100) : 0;
      return `
        <tr>
          <td>${s.questionKey}</td>
          <td>${s.correctCount}</td>
          <td>${s.errorCount}</td>
          <td>${rate}%</td>
          <td>${s.correctCount + s.errorCount > 0 ? Math.round(s.averageTimeMs / 1000) : 0}s</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Pedagógico - ${activeStats.user.username}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
            h1 { color: #4c1d95; font-size: 24px; margin-bottom: 5px; }
            .header-info { margin-bottom: 30px; font-size: 14px; border-bottom: 2px solid #ddd; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f3f4f6; color: #374151; font-weight: bold; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .danger { background-color: #fee2e2; color: #991b1b; }
            .success { background-color: #d1fae5; color: #065f46; }
            .tip-box { margin-top: 30px; background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 15px; border-radius: 4px; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Progresso Matemático 🌌</h1>
          <div class="header-info">
            <strong>Aluno(a):</strong> ${activeStats.user.username}<br>
            <strong>Nível de Aura:</strong> ${activeStats.state?.auraLevel || 1}<br>
            <strong>Rebirths:</strong> ${activeStats.state?.rebirths || 0}<br>
            <strong>Tempo de Jogo:</strong> ${formatTime(activeStats.state?.totalPlayTimeSeconds || 0)}<br>
            <strong>Gemas:</strong> ${activeStats.state?.gems || 0}<br>
            <strong>Data do Relatório:</strong> ${new Date().toLocaleDateString('pt-BR')}
          </div>

          <h2>Detalhamento por Equação</h2>
          <table>
            <thead>
              <tr>
                <th>Operação</th>
                <th>Acertos</th>
                <th>Erros</th>
                <th>Taxa de Precisão</th>
                <th>Tempo Médio</th>
              </tr>
            </thead>
            <tbody>
              ${statsRows || '<tr><td colspan="5">Nenhum dado registrado para este aluno ainda.</td></tr>'}
            </tbody>
          </table>

          <div class="tip-box">
            <h3>💡 Dicas Pedagógicas Personalizadas</h3>
            ${activeStats.stats.length > 0 && activeStats.stats[0].errorCount > 0
              ? `O aluno apresenta maior índice de dificuldade na operação <strong>${activeStats.stats[0].questionKey}</strong> (com ${activeStats.stats[0].errorCount} erros registrados). Recomendamos jogos físicos rápidos de fixação para esta tabuada específica.`
              : 'O aluno está progredindo de forma consistente. Continue incentivando a prática para aumentar a velocidade de raciocínio!'
            }
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getOpStats = (stats: any[]) => {
    const ops = [
      { name: 'Adição (+)', correct: 0, error: 0, time: 0, count: 0 },
      { name: 'Subtração (-)', correct: 0, error: 0, time: 0, count: 0 },
      { name: 'Multiplicação (×)', correct: 0, error: 0, time: 0, count: 0 },
      { name: 'Divisão (÷)', correct: 0, error: 0, time: 0, count: 0 },
    ];

    stats.forEach(s => {
      let op = ops[2]; // Default to Mult
      if (s.questionKey.includes('+')) op = ops[0];
      else if (s.questionKey.includes('-')) op = ops[1];
      else if (s.questionKey.includes('/') || s.questionKey.includes('÷')) op = ops[3];

      op.correct += s.correctCount;
      op.error += s.errorCount;
      if (s.correctCount + s.errorCount > 0) {
        op.time += s.averageTimeMs * (s.correctCount + s.errorCount);
        op.count += (s.correctCount + s.errorCount);
      }
    });

    return ops;
  };

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!usernameInput.trim() || (!isEditing && !passwordInput.trim())) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      audioEngine.playError();
      return;
    }

    if (isEditing) {
      const success = await backendService.updateUser(editId, {
        username: usernameInput,
        passwordHash: passwordInput || undefined,
      });

      if (success) {
        setFormSuccess('Usuário atualizado com sucesso!');
        audioEngine.playCorrect();
        resetForm();
        await loadUsers();
      } else {
        setFormError('Erro ao atualizar usuário. Nome de usuário já existe.');
        audioEngine.playError();
      }
    } else {
      const newUser = await backendService.createUser(usernameInput, passwordInput, roleInput);
      if (newUser) {
        setFormSuccess(`Usuário ${usernameInput} criado com sucesso!`);
        audioEngine.playCorrect();
        resetForm();
        await loadUsers();
        setSelectedUserId(newUser.id);
      } else {
        setFormError('Nome de usuário já existe.');
        audioEngine.playError();
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === adminUser.id) {
      setFormError('Você não pode excluir sua própria conta de administrador.');
      audioEngine.playError();
      return;
    }

    if (window.confirm('Tem certeza de que deseja excluir este usuário? Todos os dados de jogo serão perdidos permanentemente.')) {
      const success = await backendService.deleteUser(id);
      if (success) {
        audioEngine.playCorrect();
        await loadUsers();
        if (selectedUserId === id) {
          setSelectedUserId(null);
        }
      }
    }
  };

  const startEdit = (user: User) => {
    setIsEditing(true);
    setEditId(user.id);
    setUsernameInput(user.username);
    setPasswordInput('');
    setRoleInput(user.role);
    setFormError(null);
    setFormSuccess(null);
    audioEngine.playHatchRoll();
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId('');
    setUsernameInput('');
    setPasswordInput('');
    setRoleInput('player');
  };

  // Stats formatting helpers
  const formatTime = (seconds: number = 0) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };



  return (
    <div style={{ padding: '24px', minHeight: '90vh', color: '#f3f4f6' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <h1
            className="text-glow-purple"
            style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--neon-purple)' }}
          >
            PAINEL DO ADMINISTRADOR
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            Olá, <strong style={{ color: 'var(--neon-cyan)' }}>{adminUser.username}</strong>! Gerencie contas e acompanhe o desempenho dos alunos.
          </p>
        </div>
        <button className="cyber-btn cyber-btn-pink" onClick={onLogout} style={{ padding: '10px 20px' }}>
          Sair do Painel ➔
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          className={`cyber-btn ${activeTab === 'users' ? 'border-glow-purple' : ''}`}
          onClick={() => {
            audioEngine.playHatchRoll();
            setActiveTab('users');
          }}
          style={{
            padding: '12px 24px',
            background: activeTab === 'users' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(15,23,42,0.6)',
          }}
        >
          👥 Contas dos Alunos
        </button>
        <button
          className={`cyber-btn ${activeTab === 'analytics' ? 'border-glow-purple' : ''}`}
          onClick={() => {
            audioEngine.playHatchRoll();
            setActiveTab('analytics');
          }}
          style={{
            padding: '12px 24px',
            background: activeTab === 'analytics' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(15,23,42,0.6)',
          }}
        >
          📊 Desempenho e Estatísticas
        </button>
      </div>

      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
          {/* Left panel: List of users */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#fff' }}>Usuários Cadastrados</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                    <th style={{ padding: '12px 8px' }}>Usuário</th>
                    <th style={{ padding: '12px 8px' }}>Tipo</th>
                    <th style={{ padding: '12px 8px' }}>Criação</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: selectedUserId === u.id ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                        {u.username} {u.id === adminUser.id && '👑'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: u.role === 'admin' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 255, 204, 0.2)',
                            color: u.role === 'admin' ? 'var(--neon-purple)' : 'var(--neon-cyan)',
                          }}
                        >
                          {u.role === 'admin' ? 'ADMIN' : 'PLAYER'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => startEdit(u)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--neon-cyan)',
                            marginRight: '12px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--neon-pink)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          disabled={u.id === adminUser.id}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel: Add / Edit form */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--neon-cyan)' }}>
              {isEditing ? '📝 Editar Usuário' : '➕ Novo Aluno / Admin'}
            </h3>

            <form onSubmit={handleCreateOrUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Nome de Usuário</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Nome de login (ex: sophia)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(15,23,42,0.8)',
                    color: '#fff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>
                  Senha {isEditing && '(Deixe em branco para não alterar)'}
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={isEditing ? 'Nova senha opcional' : 'Senha de acesso'}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(15,23,42,0.8)',
                    color: '#fff',
                  }}
                />
              </div>

              {!isEditing && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Cargo</label>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as 'admin' | 'player')}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      backgroundColor: 'rgba(15,23,42,0.8)',
                      color: '#fff',
                    }}
                  >
                    <option value="player">Jogador (Aluno)</option>
                    <option value="admin">Administrador (Professor/Responsável)</option>
                  </select>
                </div>
              )}

              {formError && (
                <div style={{ color: 'var(--neon-pink)', fontSize: '0.85rem', fontWeight: 600 }}>
                  ❌ {formError}
                </div>
              )}
              {formSuccess && (
                <div style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✓ {formSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="cyber-btn" style={{ flex: 1, padding: '12px' }}>
                  {isEditing ? 'Salvar Edições' : 'Criar Conta'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    className="cyber-btn cyber-btn-pink"
                    onClick={resetForm}
                    style={{ padding: '12px' }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', gap: '24px' }}>
          {/* User selector list */}
          <div className="cyber-card" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'rgba(255,255,255,0.8)' }}>
              Selecione o Aluno
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users
                .filter(u => u.role === 'player')
                .map(player => {
                  const state = gameStatesMap[player.id];
                  return (
                    <button
                      key={player.id}
                      onClick={() => {
                        audioEngine.playHatchRoll();
                        setSelectedUserId(player.id);
                      }}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1.5px solid',
                        borderColor: selectedUserId === player.id ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
                        backgroundColor: selectedUserId === player.id ? 'rgba(0, 255, 204, 0.1)' : 'rgba(15,23,42,0.4)',
                        color: selectedUserId === player.id ? '#fff' : 'rgba(255,255,255,0.7)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>{player.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                          Aura Nível {state?.auraLevel || 1} • Rebirths: {state?.rebirths || 0}
                        </div>
                      </div>
                      <span style={{ fontSize: '1.2rem' }}>➔</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Details Dashboard */}
          <div className="cyber-card">
            {activeStats ? (
              activeStats.user.role !== 'player' ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                  A conta selecionada ({activeStats.user.username}) é de Administrador. Contas de Administrador não possuem estatísticas de jogabilidade.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3
                      className="text-glow-cyan"
                      style={{ fontSize: '1.6rem', color: 'var(--neon-cyan)', margin: 0 }}
                    >
                      Painel do Aluno: {activeStats.user.username}
                    </h3>
                    <button
                      className="cyber-btn cyber-btn-cyan"
                      onClick={() => handlePrintPdf()}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 800 }}
                    >
                      📄 Exportar Relatório PDF
                    </button>
                  </div>

                  {/* Summary Stat Grid */}
                  <div className="grid-cols-3" style={{ marginBottom: '28px' }}>
                    <div
                      className="cyber-card"
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        borderColor: 'rgba(168, 85, 247, 0.3)',
                        background: 'rgba(168, 85, 247, 0.05)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                        Nível de Aura
                      </div>
                      <div
                        className="text-glow-purple"
                        style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neon-purple)', marginTop: '4px' }}
                      >
                        {activeStats.state?.auraLevel || 1}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                        Rebirths: {activeStats.state?.rebirths || 0}
                      </div>
                    </div>

                    <div
                      className="cyber-card"
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        borderColor: 'rgba(0, 255, 204, 0.3)',
                        background: 'rgba(0, 255, 204, 0.05)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                        Gemas Obtidas
                      </div>
                      <div
                        className="text-glow-cyan"
                        style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neon-cyan)', marginTop: '4px' }}
                      >
                        💎 {activeStats.state?.gems || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                        Gemas Atuais
                      </div>
                    </div>

                    <div
                      className="cyber-card"
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        borderColor: 'rgba(244, 63, 94, 0.3)',
                        background: 'rgba(244, 63, 94, 0.05)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                        Tempo de Jogo
                      </div>
                      <div
                        className="text-glow-pink"
                        style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--neon-pink)', marginTop: '10px' }}
                      >
                        ⏱ {formatTime(activeStats.state?.totalPlayTimeSeconds || 0)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                        Tempo decorrido ativo
                      </div>
                    </div>
                  </div>

                  {/* Operator Performance Grid */}
                  <h4 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '12px', marginTop: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                    📊 Desempenho por Operação
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {getOpStats(activeStats.stats).map((op) => {
                      const total = op.correct + op.error;
                      const accuracy = total > 0 ? Math.round((op.correct / total) * 100) : 0;
                      const averageTime = op.count > 0 ? ((op.time / op.count) / 1000).toFixed(1) : '-';

                      return (
                        <div
                          key={op.name}
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '6px' }}>
                            {op.name}
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                            {total} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>itens</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: accuracy > 80 ? 'var(--neon-cyan)' : accuracy > 50 ? 'var(--neon-yellow)' : 'var(--neon-pink)', marginTop: '4px' }}>
                            {accuracy}% precisão
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                            Tempo: {averageTime}s
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Math Analytics Section */}
                  <div>
                    <h4
                      style={{
                        fontSize: '1.2rem',
                        color: '#fff',
                        marginBottom: '12px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '6px',
                      }}
                    >
                      ❌ Tabuadas com Mais Erros
                    </h4>

                    {activeStats.stats.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', padding: '20px 0' }}>
                        Nenhuma resposta registrada ainda para este aluno. As estatísticas aparecerão após o combate!
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '35vh', overflowY: 'auto' }}>
                        {activeStats.stats.map((stat: MathStatistic) => {
                          const total = stat.correctCount + stat.errorCount;
                          const accuracy = total > 0 ? Math.round((stat.correctCount / total) * 100) : 0;
                          const hasHighError = stat.errorCount >= 3;

                          return (
                            <div
                              key={stat.questionKey}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: hasHighError ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255,255,255,0.08)',
                                background: hasHighError ? 'rgba(244, 63, 94, 0.08)' : 'rgba(15, 23, 42, 0.3)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span
                                  style={{
                                    fontFamily: 'Share Tech Mono',
                                    fontSize: '1.3rem',
                                    fontWeight: 'bold',
                                    color: hasHighError ? 'var(--neon-pink)' : 'var(--neon-cyan)',
                                    width: '80px',
                                  }}
                                >
                                  {stat.questionKey.replace('x', ' × ')}
                                </span>
                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                  Acertos: <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>{stat.correctCount}</span> | 
                                  Erros: <span style={{ color: 'var(--neon-pink)', fontWeight: 600 }}>{stat.errorCount}</span>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: accuracy > 80 ? 'var(--neon-cyan)' : accuracy > 50 ? 'var(--neon-yellow)' : 'var(--neon-pink)',
                                  }}
                                >
                                  {accuracy}% de precisão
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                  Tempo médio: {(stat.averageTimeMs / 1000).toFixed(1)}s
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                Selecione um aluno na barra lateral para visualizar seu progresso e taxas de erro.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
