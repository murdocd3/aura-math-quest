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

  // Advanced Curriculum & Settings State
  const [timeLimitInput, setTimeLimitInput] = useState<number>(15);
  const [masteryThresholdInput, setMasteryThresholdInput] = useState<number>(5);
  const [lockedOpsList, setLockedOpsList] = useState<string[]>([]);
  const [levelAdjustment, setLevelAdjustment] = useState<string>('1');
  const [customFactKey, setCustomFactKey] = useState('');
  const [customFactState, setCustomFactState] = useState<'mastered' | 'weak'>('weak');

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

      if (state) {
        setTimeLimitInput(state.customTimeLimit !== undefined ? state.customTimeLimit : 15);
        setMasteryThresholdInput(state.masteryThreshold !== undefined ? state.masteryThreshold : 5);
        setLockedOpsList(state.lockedOperations || []);
        setLevelAdjustment(String(state.auraLevel || 1));
      }
    };

    fetchStats();
  }, [selectedUserId, users]);

  const handleSaveCurriculum = async () => {
    if (!selectedUserId) return;
    const success = await backendService.updateGameState(selectedUserId, {
      customTimeLimit: Number(timeLimitInput),
      masteryThreshold: Number(masteryThresholdInput),
      lockedOperations: lockedOpsList,
    });
    if (success) {
      alert('Parâmetros curriculares salvos com sucesso!');
      audioEngine.playCorrect();
      await loadUsers();
    } else {
      alert('Erro ao salvar os parâmetros.');
    }
  };

  const toggleLockedOp = (opId: string) => {
    setLockedOpsList(prev => 
      prev.includes(opId) ? prev.filter(o => o !== opId) : [...prev, opId]
    );
  };

  const handleAdjustGems = async (amount: number) => {
    if (!selectedUserId || !activeStats?.state) return;
    const newGems = Math.max(0, activeStats.state.gems + amount);
    const success = await backendService.updateGameState(selectedUserId, {
      gems: newGems
    });
    if (success) {
      audioEngine.playCorrect();
      await loadUsers();
    }
  };

  const handleAdjustLevel = async () => {
    if (!selectedUserId || !activeStats?.state) return;
    const newLvl = Math.max(1, Math.min(100, Number(levelAdjustment)));
    const success = await backendService.updateGameState(selectedUserId, {
      auraLevel: newLvl,
      auraXp: 0 // Reset XP on manual level jump
    });
    if (success) {
      audioEngine.playCorrect();
      await loadUsers();
    }
  };

  const handleResetMathStats = async () => {
    if (!selectedUserId) return;
    if (window.confirm('Deseja realmente RESETAR todas as estatísticas e histórico de erros/acertos do aluno? Esta ação não pode ser desfeita.')) {
      await backendService.resetMathStats(selectedUserId);
      audioEngine.playCorrect();
      await loadUsers();
    }
  };

  const handleForceSrsState = async (questionKey: string, targetState: 'mastered' | 'weak') => {
    if (!selectedUserId) return;
    await backendService.forceMathStatsState(selectedUserId, questionKey, targetState);
    audioEngine.playCorrect();
    await loadUsers();
  };

  const handleAddCustomFactOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !customFactKey.trim()) return;
    const cleanKey = customFactKey.replace(/\s+/g, '').toLowerCase(); // Remove spaces
    // Verify format (e.g. 7x8 or 5+5)
    if (!/^\d+[\+\-x\/]\d+$/.test(cleanKey)) {
      alert('Formato inválido. Use formatos como: 7x8, 5+5, 12-4, 15/3');
      return;
    }
    await backendService.forceMathStatsState(selectedUserId, cleanKey, customFactState);
    setCustomFactKey('');
    audioEngine.playCorrect();
    await loadUsers();
  };

  const handlePrintPdf = async () => {
    if (!selectedUserId || !activeStats) return;
    
    // Fetch chronological timeline entries
    const timeline = await backendService.getTimeline(selectedUserId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Group timeline entries by date (DD/MM/YYYY)
    const groupedByDate: Record<string, { total: number; correct: number; timeSum: number; categories: Record<string, { total: number; correct: number }> }> = {};
    
    timeline.forEach(t => {
      const dateStr = new Date(t.timestamp).toLocaleDateString('pt-BR');
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = { total: 0, correct: 0, timeSum: 0, categories: {} };
      }
      const day = groupedByDate[dateStr];
      day.total++;
      if (t.correct) day.correct++;
      day.timeSum += t.timeMs;
      
      if (!day.categories[t.category]) {
        day.categories[t.category] = { total: 0, correct: 0 };
      }
      day.categories[t.category].total++;
      if (t.correct) day.categories[t.category].correct++;
    });

    const datesSorted = Object.keys(groupedByDate).sort((a, b) => {
      const partsA = a.split('/');
      const partsB = b.split('/');
      return new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0])).getTime() - 
             new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0])).getTime();
    });

    // Generate timeline rows and visualization
    let timelineHtml = '';
    let progressionAnalysis = '';
    
    if (datesSorted.length > 0) {
      timelineHtml = datesSorted.slice(-7).map(date => {
        const d = groupedByDate[date];
        const accuracy = Math.round((d.correct / d.total) * 100);
        const avgTimeSec = (d.timeSum / d.total / 1000).toFixed(1);
        
        return `
          <div style="margin-bottom: 12px; border-bottom: 1px dashed #e5e7eb; padding-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 12px; margin-bottom: 4px;">
              <span>📅 ${date}</span>
              <span style="color: #4b5563; font-weight: 500;">${d.total} resolvidas • Tempo Médio: ${avgTimeSec}s</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="flex-grow: 1; background-color: #e5e7eb; height: 16px; border-radius: 8px; overflow: hidden; position: relative;">
                <div style="background: linear-gradient(90deg, #7c3aed, #4f46e5); width: ${accuracy}%; height: 100%; border-radius: 8px;"></div>
                <span style="position: absolute; width: 100%; text-align: center; left: 0; top: 0; font-size: 9px; color: ${accuracy > 50 ? '#fff' : '#1f2937'}; font-weight: bold; line-height: 16px;">
                  Precisão: ${accuracy}%
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Pedagogy diagnostics
      const firstDay = groupedByDate[datesSorted[0]];
      const lastDay = groupedByDate[datesSorted[datesSorted.length - 1]];
      const firstAccuracy = Math.round((firstDay.correct / firstDay.total) * 100);
      const lastAccuracy = Math.round((lastDay.correct / lastDay.total) * 100);
      const firstTime = firstDay.timeSum / firstDay.total / 1000;
      const lastTime = lastDay.timeSum / lastDay.total / 1000;

      let accuracyTrend = '';
      if (lastAccuracy > firstAccuracy) {
        accuracyTrend = `📈 A precisão geral do aluno subiu de <strong>${firstAccuracy}%</strong> para <strong>${lastAccuracy}%</strong> no período analisado, o que indica consolidação gradual dos fatos numéricos.`;
      } else if (lastAccuracy === firstAccuracy) {
        accuracyTrend = `⚖️ A precisão se manteve estável em <strong>${lastAccuracy}%</strong>, sugerindo estabilização do aprendizado.`;
      } else {
        accuracyTrend = `⚠️ Houve uma oscilação na precisão (de ${firstAccuracy}% para ${lastAccuracy}%). Isso é esperado ao introduzir operações de maior complexidade (como tabuadas mais altas).`;
      }

      let speedTrend = '';
      if (lastTime < firstTime) {
        speedTrend = `⚡ O tempo médio de resposta caiu de <strong>${firstTime.toFixed(1)} segundos</strong> para <strong>${lastTime.toFixed(1)} segundos</strong>. Essa aceleração indica que o processo de raciocínio está se tornando automatizado (memória de trabalho liberada).`;
      } else {
        speedTrend = `⏱️ O tempo médio de resposta se manteve estável em cerca de <strong>${lastTime.toFixed(1)} segundos</strong>. Recomenda-se estimular a agilidade no modo Cyber Runner.`;
      }

      progressionAnalysis = `
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; font-size: 12px; line-height: 1.5; margin-top: 10px;">
          <h3 style="margin-top: 0; color: #4c1d95; font-size: 13px; font-weight: 700;">📈 Análise da Curva de Aprendizagem</h3>
          <p style="margin: 0 0 8px 0;">${accuracyTrend}</p>
          <p style="margin: 0;">${speedTrend}</p>
        </div>
      `;
    } else {
      timelineHtml = '<p style="color: #6b7280; font-style: italic; font-size: 12px;">Nenhum histórico temporal de linha de tempo registrado ainda.</p>';
      progressionAnalysis = '';
    }

    // Category summary aggregation
    const categoryTotals: Record<string, { correct: number, total: number, timeSum: number }> = {};
    timeline.forEach(t => {
      if (!categoryTotals[t.category]) {
        categoryTotals[t.category] = { correct: 0, total: 0, timeSum: 0 };
      }
      categoryTotals[t.category].total++;
      if (t.correct) categoryTotals[t.category].correct++;
      categoryTotals[t.category].timeSum += t.timeMs;
    });

    const categoryHtml = Object.entries(categoryTotals).map(([cat, val]) => {
      const accuracy = Math.round((val.correct / val.total) * 100);
      const avgTime = (val.timeSum / val.total / 1000).toFixed(1);
      
      let badgeClass = 'success';
      if (accuracy < 60) badgeClass = 'danger';
      else if (accuracy < 80) badgeClass = 'warning';

      return `
        <tr>
          <td style="font-weight: bold;">${cat}</td>
          <td>${val.total}</td>
          <td>${val.correct}</td>
          <td>${val.total - val.correct}</td>
          <td>
            <span class="badge ${badgeClass}">${accuracy}%</span>
          </td>
          <td>${avgTime}s</td>
        </tr>
      `;
    }).join('');

    // Formulate custom educational tips based on weaknesses
    let weakestOp = 'Nenhuma';
    let minAccuracy = 100;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      const acc = Math.round((val.correct / val.total) * 100);
      if (acc < minAccuracy) {
        minAccuracy = acc;
        weakestOp = cat;
      }
    });

    let customizedTip = '';
    if (minAccuracy < 70 && weakestOp !== 'Nenhuma') {
      customizedTip = `Recomendamos dar atenção especial à operação de <strong>${weakestOp}</strong> (precisão de ${minAccuracy}%). O jogo continuará ativando a repetição espaçada (SRS) nessas contas para auxiliar a memorização.`;
    } else {
      customizedTip = 'O aluno demonstra ótimo equilíbrio e precisão geral consistente nas operações básicas de matemática. Continue incentivando a prática contínua.';
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Pedagógico - ${activeStats.user.username}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; padding: 40px; line-height: 1.5; }
            h1 { color: #4c1d95; font-size: 24px; margin: 0 0 5px 0; font-weight: 800; }
            .header-info { margin-bottom: 25px; font-size: 13px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; background-color: #faf5ff; border: 1px solid #f3e8ff; padding: 15px; border-radius: 8px; }
            .info-item { display: flex; justify-content: space-between; border-bottom: 1px solid #f3e8ff; padding-bottom: 4px; }
            .info-label { color: #6b7280; font-weight: 500; }
            .info-val { font-weight: 700; color: #4c1d95; }
            h2 { color: #1e1b4b; font-size: 14px; margin: 25px 0 10px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th, td { padding: 8px 10px; text-align: left; font-size: 12px; border-bottom: 1px solid #e5e7eb; }
            th { background-color: #f9fafb; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 10px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-align: center; }
            .danger { background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
            .warning { background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
            .success { background-color: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
            .tip-box { margin-top: 25px; background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 15px; border-radius: 6px; font-size: 12px; }
            .grid-layout { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 24px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Progresso Pedagógico 🌌</h1>
          <p style="margin: 0 0 20px 0; font-size: 13px; color: #4b5563;">Acompanhamento pedagógico temporal do estudante e estatísticas cognitivas de matemática.</p>
          
          <div class="header-info">
            <div class="info-item">
              <span class="info-label">Estudante:</span>
              <span class="info-val">${activeStats.user.username}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Data de Emissão:</span>
              <span class="info-val">${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Nível de Aura:</span>
              <span class="info-val">Lvl ${activeStats.state?.auraLevel || 1}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tempo Total de Prática:</span>
              <span class="info-val">${formatTime(activeStats.state?.totalPlayTimeSeconds || 0)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Gemas Coletadas:</span>
              <span class="info-val">💎 ${activeStats.state?.gems || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Rebirths (Reinícios):</span>
              <span class="info-val">✨ ${activeStats.state?.rebirths || 0}</span>
            </div>
          </div>

          <div class="grid-layout">
            <div>
              <h2>📊 Resumo de Desempenho por Categoria</h2>
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Respondidas</th>
                    <th>Acertos</th>
                    <th>Erros</th>
                    <th>Precisão</th>
                    <th>Tempo Médio</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryHtml || '<tr><td colspan="6" style="text-align: center; color: #6b7280; font-style: italic;">Nenhum dado registrado para esta categoria.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div>
              <h2>📈 Linha do Tempo de Evolução</h2>
              ${timelineHtml}
            </div>
          </div>

          ${progressionAnalysis}

          <div class="tip-box">
            <h3 style="margin-top: 0; color: #7c3aed; font-size: 13px; font-weight: 700;">💡 Dicas Pedagógicas & Recomendações de Treino</h3>
            <p style="margin: 0; line-height: 1.5; color: #374151;">${customizedTip}</p>
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

      {activeTab === 'analytics' && (() => {
        const raw = localStorage.getItem('amq_stats');
        const parsed = raw ? JSON.parse(raw) : [];
        const players = users.filter(u => u.role === 'player');
        const playerIds = players.map(p => p.id);

        let avgLevel = 1;
        let totalGems = 0;
        let overallAccuracy = 0;
        let topWeakFacts: any[] = [];

        if (playerIds.length > 0) {
          const totalLevel = playerIds.reduce((sum, id) => sum + (gameStatesMap[id]?.auraLevel || 1), 0);
          avgLevel = Math.round(totalLevel / playerIds.length);
          totalGems = playerIds.reduce((sum, id) => sum + (gameStatesMap[id]?.gems || 0), 0);

          const playerStats = parsed.filter((s: any) => playerIds.includes(s.userId));
          const totalCorrect = playerStats.reduce((sum: number, s: any) => sum + s.correctCount, 0);
          const totalError = playerStats.reduce((sum: number, s: any) => sum + s.errorCount, 0);
          overallAccuracy = (totalCorrect + totalError) > 0 
            ? Math.round((totalCorrect / (totalCorrect + totalError)) * 100)
            : 0;

          const factErrorsMap: Record<string, { key: string; errors: number; correct: number }> = {};
          playerStats.forEach((s: any) => {
            const key = s.questionKey;
            if (!factErrorsMap[key]) {
              factErrorsMap[key] = { key, errors: 0, correct: 0 };
            }
            factErrorsMap[key].errors += s.errorCount;
            factErrorsMap[key].correct += s.correctCount;
          });

          topWeakFacts = Object.values(factErrorsMap)
            .filter((f: any) => f.errors > 0)
            .sort((a: any, b: any) => b.errors - a.errors)
            .slice(0, 5);
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Classroom Analytics Header Cards */}
            <div className="grid-cols-4" style={{ gap: '16px' }}>
              <div className="cyber-card" style={{ padding: '16px', textAlign: 'center', borderColor: 'var(--neon-purple)', background: 'rgba(168, 85, 247, 0.05)' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Nível Médio da Turma</div>
                <div className="text-glow-purple" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--neon-purple)', marginTop: '4px' }}>
                  ⭐ {avgLevel}
                </div>
              </div>

              <div className="cyber-card" style={{ padding: '16px', textAlign: 'center', borderColor: 'var(--neon-cyan)', background: 'rgba(0, 255, 204, 0.05)' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Precisão Geral (Média)</div>
                <div className="text-glow-cyan" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--neon-cyan)', marginTop: '4px' }}>
                  🎯 {overallAccuracy}%
                </div>
              </div>

              <div className="cyber-card" style={{ padding: '16px', textAlign: 'center', borderColor: 'var(--neon-yellow)', background: 'rgba(234, 179, 8, 0.05)' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Total de Gemas Coletadas</div>
                <div className="text-glow-yellow" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--neon-yellow)', marginTop: '4px' }}>
                  💎 {totalGems}
                </div>
              </div>

              <div className="cyber-card" style={{ padding: '16px', borderColor: 'var(--neon-pink)', background: 'rgba(244, 63, 94, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '4px' }}>Dificuldades Críticas (Turma)</div>
                {topWeakFacts.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '6px' }}>Nenhuma falha crítica registrada.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                    {topWeakFacts.map((f: any) => (
                      <span key={f.key} style={{ fontSize: '0.7rem', background: 'rgba(244, 63, 94, 0.2)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-pink)', fontWeight: 'bold' }}>
                        {f.key.replace('x', '×')}: {f.errors}❌
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

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

                  {/* Ajustes Rápidos Card */}
                  <div className="cyber-card" style={{ marginBottom: '28px' }}>
                    <h4 style={{ fontSize: '1.1rem', color: 'var(--neon-cyan)', marginBottom: '16px' }}>⚙️ Ajustes Rápidos de Progresso</h4>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      
                      {/* Gems Control */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Gemas Matemáticas</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="cyber-btn cyber-btn-pink" onClick={() => handleAdjustGems(-10)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>-10 💎</button>
                          <button type="button" className="cyber-btn cyber-btn-cyan" onClick={() => handleAdjustGems(10)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>+10 💎</button>
                          <button type="button" className="cyber-btn cyber-btn-cyan" onClick={() => handleAdjustGems(50)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>+50 💎</button>
                        </div>
                      </div>

                      {/* Level Control */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Alterar Nível do Aluno</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            value={levelAdjustment}
                            onChange={(e) => setLevelAdjustment(e.target.value)}
                            min="1"
                            max="100"
                            style={{
                              width: '70px',
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.15)',
                              backgroundColor: 'rgba(15,23,42,0.8)',
                              color: '#fff',
                            }}
                          />
                          <button type="button" className="cyber-btn" onClick={handleAdjustLevel} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Atualizar Nível</button>
                        </div>
                      </div>

                      {/* Stats Reset */}
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button type="button" className="cyber-btn cyber-btn-pink" onClick={handleResetMathStats} style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          🗑️ Resetar Estatísticas de Contas
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Controle Curricular Card */}
                  <div className="cyber-card" style={{ marginBottom: '28px' }}>
                    <h4 style={{ fontSize: '1.1rem', color: 'var(--neon-purple)', marginBottom: '16px' }}>🎯 Parâmetros Curriculares do Aluno</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
                      {/* Parameters settings */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Tempo Limite (Segundos)</label>
                            <input
                              type="number"
                              value={timeLimitInput}
                              onChange={(e) => setTimeLimitInput(Number(e.target.value))}
                              min="3"
                              max="60"
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
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Acertos para Domínio (Threshold)</label>
                            <input
                              type="number"
                              value={masteryThresholdInput}
                              onChange={(e) => setMasteryThresholdInput(Number(e.target.value))}
                              min="2"
                              max="20"
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
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Bloquear Operações de Treino</label>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {[
                              { id: 'addition', label: 'Adição (+)' },
                              { id: 'subtraction', label: 'Subtração (-)' },
                              { id: 'multiplication', label: 'Multiplicação (×)' },
                              { id: 'division', label: 'Divisão (÷)' },
                            ].map(op => {
                              const isLocked = lockedOpsList.includes(op.id);
                              return (
                                <button
                                  type="button"
                                  key={op.id}
                                  className={`cyber-btn ${isLocked ? 'cyber-btn-pink' : ''}`}
                                  onClick={() => toggleLockedOp(op.id)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    background: isLocked ? 'rgba(244,63,94,0.15)' : 'rgba(15,23,42,0.6)',
                                    borderColor: isLocked ? 'var(--neon-pink)' : 'rgba(255,255,255,0.1)',
                                    color: isLocked ? '#fff' : 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {isLocked ? '🔒 ' : '🔓 '} {op.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Save button and instructions */}
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(168, 85, 247, 0.03)', border: '1px dashed rgba(168, 85, 247, 0.2)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.2rem', margin: 0 }}>
                          💡 O limitador de tempo encurta ou estende a contagem na Arena. O limiar de domínio regula quantas vezes o aluno deve acertar uma conta para que ela dê recompensa reduzida. Bloquear operações impede que o aluno as selecione no Hub.
                        </p>
                        <button type="button" className="cyber-btn cyber-btn-purple" onClick={handleSaveCurriculum} style={{ width: '100%', padding: '10px', marginTop: '12px', fontWeight: 'bold' }}>
                          💾 Aplicar Parâmetros
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fila SRS e Estatísticas Re-Treino */}
                  <div className="cyber-card" style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <h4 style={{ fontSize: '1.1rem', color: 'var(--neon-yellow)' }}>🔄 Auditoria de Repetição Espaçada (SRS Queue)</h4>
                      
                      {/* Custom override form */}
                      <form onSubmit={handleAddCustomFactOverride} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={customFactKey}
                          onChange={(e) => setCustomFactKey(e.target.value)}
                          placeholder="Nova conta (ex: 7x8)"
                          style={{
                            width: '130px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            backgroundColor: 'rgba(15,23,42,0.8)',
                            color: '#fff',
                            fontSize: '0.8rem',
                          }}
                        />
                        <select
                          value={customFactState}
                          onChange={(e) => setCustomFactState(e.target.value as 'mastered' | 'weak')}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            backgroundColor: 'rgba(15,23,42,0.8)',
                            color: '#fff',
                            fontSize: '0.8rem',
                          }}
                        >
                          <option value="weak">Forçar Re-Treino</option>
                          <option value="mastered">Forçar Domínio</option>
                        </select>
                        <button type="submit" className="cyber-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Injetar</button>
                      </form>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                      Visualize o estado das equações na fila adaptativa. Você pode forçar de forma manual a revisão ou o domínio de qualquer conta.
                    </p>

                    {/* Columns: Weak (SRS Review Queue) vs Mastered */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      
                      {/* Left: Review Queue (Weak Facts) */}
                      <div style={{ background: 'rgba(244, 63, 94, 0.02)', border: '1px solid rgba(244, 63, 94, 0.15)', borderRadius: '8px', padding: '12px' }}>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--neon-pink)', margin: '0 0 10px 0', borderBottom: '1px solid rgba(244, 63, 94, 0.1)', paddingBottom: '4px' }}>
                          🚨 Fila de Re-Treino (Dificuldades)
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '25vh', overflowY: 'auto' }}>
                          {(() => {
                            const weakList = activeStats.stats.filter((s: any) => s.errorCount >= 2 || (s.correctCount + s.errorCount > 0 && (s.correctCount / (s.correctCount + s.errorCount)) < 0.7));
                            if (weakList.length === 0) return <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', padding: '10px 0', textAlign: 'center' }}>Nenhuma dificuldade crítica registrada.</div>;
                            return weakList.map((s: any) => (
                              <div key={s.questionKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(244, 63, 94, 0.05)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
                                <span style={{ fontFamily: 'Share Tech Mono', fontWeight: 'bold', fontSize: '1rem', color: 'var(--neon-pink)' }}>{s.questionKey.replace('x', '×')}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>({s.errorCount}❌)</span>
                                  <button type="button" className="cyber-btn" onClick={() => handleForceSrsState(s.questionKey, 'mastered')} style={{ padding: '2px 6px', fontSize: '0.65rem', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}>Forçar Domínio</button>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Right: Mastered Facts */}
                      <div style={{ background: 'rgba(0, 255, 204, 0.02)', border: '1px solid rgba(0, 255, 204, 0.15)', borderRadius: '8px', padding: '12px' }}>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--neon-cyan)', margin: '0 0 10px 0', borderBottom: '1px solid rgba(0, 255, 204, 0.1)', paddingBottom: '4px' }}>
                          ✔️ Contas Dominadas (Diminuídas)
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '25vh', overflowY: 'auto' }}>
                          {(() => {
                            const threshold = activeStats.state?.masteryThreshold !== undefined ? activeStats.state.masteryThreshold : 5;
                            const masteredList = activeStats.stats.filter((s: any) => s.correctCount >= threshold && s.errorCount === 0);
                            if (masteredList.length === 0) return <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', padding: '10px 0', textAlign: 'center' }}>Nenhuma conta dominada ainda.</div>;
                            return masteredList.map((s: any) => (
                              <div key={s.questionKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 255, 204, 0.05)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(0, 255, 204, 0.1)' }}>
                                <span style={{ fontFamily: 'Share Tech Mono', fontWeight: 'bold', fontSize: '1rem', color: 'var(--neon-cyan)' }}>{s.questionKey.replace('x', '×')}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>({s.correctCount}✔️)</span>
                                  <button type="button" className="cyber-btn cyber-btn-pink" onClick={() => handleForceSrsState(s.questionKey, 'weak')} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Forçar Re-Treino</button>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
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
      </div>
    );
  })()}
</div>
  );
};

