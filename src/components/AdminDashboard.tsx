import React, { useState, useEffect } from 'react';
import type { User, GameState, MathStatistic } from '../services/mockDb';
import { audioEngine } from './AudioEngine';
import { backendService } from '../services/backendService';
import { logger } from '../services/logger';

interface AdminDashboardProps {
  adminUser: User;
  onLogout: () => void;
}

interface ActiveStats {
  user: User;
  state: GameState | null;
  stats: MathStatistic[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminUser, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Game states map for user listing in sidebar
  const [gameStatesMap, setGameStatesMap] = useState<Record<string, GameState>>({});
  
  // Active stats state for selected user
  const [activeStats, setActiveStats] = useState<ActiveStats | null>(null);

  // Form states for creating/editing
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'player'>('player');
  const [isActiveInput, setIsActiveInput] = useState(true);
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
  const [classMathStats, setClassMathStats] = useState<MathStatistic[]>([]);

  const loadUsers = async () => {
    try {
      const allUsers = await backendService.getUsers();
      setUsers(allUsers);
      
      // Load game states for player list sidebars in parallel
      const playerUsers = allUsers.filter(u => u.role === 'player');
      const statesMap: Record<string, GameState> = {};
      const states = await Promise.all(playerUsers.map(p => backendService.getGameState(p.id)));
      playerUsers.forEach((p, i) => {
        if (states[i]) {
          statesMap[p.id] = states[i]!;
        }
      });
      setGameStatesMap(statesMap);

      const playerIds = playerUsers.map(p => p.id);
      if (playerIds.length > 0) {
        const allStats = await backendService.getAllMathStats(playerIds);
        setClassMathStats(allStats);
      } else {
        setClassMathStats([]);
      }

      if (allUsers.length > 0 && !selectedUserId) {
        // Select the first player by default for analytics
        const firstPlayer = allUsers.find(u => u.role === 'player');
        if (firstPlayer) {
          setSelectedUserId(firstPlayer.id);
        } else {
          setSelectedUserId(allUsers[0].id);
        }
      }
    } catch (err) {
      logger.error('[AdminDashboard] Falha ao carregar usuários:', err);
      setFormError('Não foi possível carregar os dados. Verifique a conexão.');
    }
  };

  const handleSingleUserUpdate = async (userId: string) => {
    const newState = await backendService.getGameState(userId);
    const newStats = await backendService.getMathStats(userId);
    
    setActiveStats(prev => prev && prev.user.id === userId 
      ? { ...prev, state: newState, stats: newStats.sort((a, b) => b.errorCount - a.errorCount) } 
      : prev
    );
    
    if (newState) {
      setGameStatesMap(prev => ({ ...prev, [userId]: newState }));
      if (userId === selectedUserId) {
        setTimeLimitInput(newState.customTimeLimit !== undefined ? newState.customTimeLimit : 15);
        setMasteryThresholdInput(newState.masteryThreshold !== undefined ? newState.masteryThreshold : 5);
        setLockedOpsList(newState.lockedOperations || []);
        setLevelAdjustment(String(newState.auraLevel || 1));
      }
    }
    
    setClassMathStats(prev => {
      const filtered = prev.filter(s => s.userId !== userId);
      return [...filtered, ...newStats];
    });
  };

  useEffect(() => {
    void loadUsers();
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

    void fetchStats();
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
      await handleSingleUserUpdate(selectedUserId);
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
      await handleSingleUserUpdate(selectedUserId);
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
      await handleSingleUserUpdate(selectedUserId);
    }
  };

  const handleResetMathStats = async () => {
    if (!selectedUserId) return;
    if (window.confirm('Deseja realmente RESETAR todas as estatísticas e histórico de erros/acertos do aluno? Esta ação não pode ser desfeita.')) {
      await backendService.resetMathStats(selectedUserId);
      audioEngine.playCorrect();
      await handleSingleUserUpdate(selectedUserId);
    }
  };

  const handleForceSrsState = async (questionKey: string, targetState: 'mastered' | 'weak') => {
    if (!selectedUserId) return;
    const actionText = targetState === 'mastered' ? 'como DOMINADO (mastered)' : 'para RE-TREINO (fraco)';
    if (window.confirm(`Tem certeza de que deseja forçar o fato "${questionKey}" ${actionText} para este aluno?`)) {
      await backendService.forceMathStatsState(selectedUserId, questionKey, targetState);
      audioEngine.playCorrect();
      await handleSingleUserUpdate(selectedUserId);
    }
  };

  const handleAddCustomFactOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !customFactKey.trim()) return;
    const cleanKey = customFactKey.replace(/\s+/g, '').toLowerCase(); // Remove spaces
    // Verify format (e.g. 7x8 or 5+5)
    if (!/^\d+[+\-x/÷]\d+$/.test(cleanKey)) {
      alert('Formato inválido. Use formatos como: 7x8, 5+5, 12-4, 15/3, 20÷4');
      return;
    }
    await backendService.forceMathStatsState(selectedUserId, cleanKey, customFactState);
    setCustomFactKey('');
    audioEngine.playCorrect();
    await handleSingleUserUpdate(selectedUserId);
  };

  const handlePrintPdf = async () => {
    if (!selectedUserId || !activeStats) return;
    
    // Fetch chronological timeline entries, math stats, and pets
    const timeline = await backendService.getTimeline(selectedUserId);
    const mathStats = await backendService.getMathStats(selectedUserId);
    const pets = await backendService.getPets(selectedUserId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Group timeline entries by date (YYYY-MM-DD)
    const groupedByDate: Record<string, { total: number; correct: number; timeSum: number; categories: Record<string, { total: number; correct: number }> }> = {};
    
    timeline.forEach(t => {
      let dateStr: string;
      try {
        dateStr = new Date(t.timestamp).toISOString().substring(0, 10);
      } catch (e) {
        if (typeof t.timestamp === 'string' && t.timestamp.length >= 10) {
          dateStr = t.timestamp.substring(0, 10);
        } else {
          dateStr = new Date().toISOString().substring(0, 10);
        }
      }
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

    const datesSorted = Object.keys(groupedByDate).sort();

    const generateEvolutionChartSvg = (dates: string[], groupedData: typeof groupedByDate) => {
      if (dates.length < 2) {
        return '<p style="color: #6b7280; font-style: italic; font-size: 11px; text-align: center; padding: 15px; border: 1px dashed #d1d5db; border-radius: 6px; margin-top: 10px;">Dados de histórico temporal insuficientes para gerar a curva de aprendizagem (mínimo de 2 dias de atividade necessários).</p>';
      }

      const width = 600;
      const height = 180;
      const padding = 35;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      const points = dates.slice(-7).map((date) => {
        const d = groupedData[date];
        const accuracy = Math.round((d.correct / d.total) * 100);
        const avgTime = d.timeSum / d.total / 1000;
        return { date, accuracy, avgTime };
      });

      const maxTime = Math.max(...points.map(p => p.avgTime), 5); // at least 5s scale

      const getX = (index: number) => padding + (index / (points.length - 1)) * chartWidth;
      const getYAcc = (acc: number) => padding + chartHeight - (acc / 100) * chartHeight;
      const getYTime = (t: number) => padding + chartHeight - (t / maxTime) * chartHeight;

      let gridLines = '';
      for (let i = 0; i <= 4; i++) {
        const y = padding + (i / 4) * chartHeight;
        const val = 100 - i * 25;
        gridLines += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="3" stroke-width="1" />`;
        gridLines += `<text x="${padding - 8}" y="${y + 3}" fill="#9ca3af" font-size="8px" text-anchor="end">${val}%</text>`;
      }

      const xLabels = points.map((p, idx) => {
        const x = getX(idx);
        const [, month, day] = p.date.split('-');
        const formattedDate = `${day}/${month}`;
        return `<text x="${x}" y="${height - padding + 15}" fill="#6b7280" font-size="8px" text-anchor="middle">${formattedDate}</text>
                <circle cx="${x}" cy="${height - padding}" r="2" fill="#d1d5db" />`;
      }).join('');

      let pathAccPoints = '';
      let pathTimePoints = '';
      let accCircles = '';
      let timeCircles = '';

      points.forEach((p, idx) => {
        const x = getX(idx);
        const yAcc = getYAcc(p.accuracy);
        const yTime = getYTime(p.avgTime);

        if (idx === 0) {
          pathAccPoints = `M ${x} ${yAcc}`;
          pathTimePoints = `M ${x} ${yTime}`;
        } else {
          pathAccPoints += ` L ${x} ${yAcc}`;
          pathTimePoints += ` L ${x} ${yTime}`;
        }

        accCircles += `<circle cx="${x}" cy="${yAcc}" r="4.5" fill="#7c3aed" stroke="#ffffff" stroke-width="1.5" />
                       <text x="${x}" y="${yAcc - 8}" fill="#4c1d95" font-size="8px" font-weight="700" text-anchor="middle">${p.accuracy}%</text>`;
        timeCircles += `<circle cx="${x}" cy="${yTime}" r="4.5" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5" />
                        <text x="${x}" y="${yTime + 12}" fill="#0891b2" font-size="8px" font-weight="700" text-anchor="middle">${p.avgTime.toFixed(1)}s</text>`;
      });

      return `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible; background-color: #fafbfd; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; margin-top: 10px;">
          <!-- Legend -->
          <g transform="translate(${width / 2 - 140}, 15)" font-size="9px" font-weight="600">
            <circle cx="0" cy="0" r="4" fill="#7c3aed" />
            <text x="8" y="3" fill="#4c1d95">Precisão Aritmética (%)</text>
            <circle cx="150" cy="0" r="4" fill="#06b6d4" />
            <text x="158" y="3" fill="#0891b2">Tempo Médio de Resposta (s)</text>
          </g>
          <!-- Grid -->
          ${gridLines}
          <!-- Paths -->
          <path d="${pathAccPoints}" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="${pathTimePoints}" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4,2" />
          <!-- Dots & Text Labels -->
          ${accCircles}
          ${timeCircles}
          <!-- X labels -->
          ${xLabels}
        </svg>
      `;
    };

    const evolutionChartHtml = generateEvolutionChartSvg(datesSorted, groupedByDate);

    const generateCognitiveHeatmapHtml = (stats: any[], selectedOp: string) => {
      let opSymbol = 'x';
      if (selectedOp === 'addition') opSymbol = '+';
      else if (selectedOp === 'subtraction') opSymbol = '-';
      else if (selectedOp === 'division') opSymbol = '÷';

      const statsMap: Record<string, any> = {};
      stats.forEach(s => {
        const isTargetOp = selectedOp === 'addition' ? s.questionKey.includes('+') :
                           selectedOp === 'subtraction' ? s.questionKey.includes('-') :
                           selectedOp === 'multiplication' ? (s.questionKey.includes('x') || s.questionKey.includes('*')) :
                           (s.questionKey.includes('/') || s.questionKey.includes('÷'));
        
        if (!isTargetOp) return;

        const parts = s.questionKey.split(/[+\-*x/÷]/);
        if (parts.length >= 2) {
          const n1 = parseInt(parts[0]);
          const n2 = parseInt(parts[1]);
          if (!isNaN(n1) && !isNaN(n2)) {
            statsMap[`${n1}_${n2}`] = s;
          }
        }
      });

      const range = Array.from({ length: 9 }, (_, i) => i + 2); // 2 to 10

      let gridHeadersHtml = `<th style="background-color: #faf5ff; font-weight: bold; text-align: center; border-right: 2px solid #e5e7eb; width: 35px; border-bottom: 2px solid #e5e7eb;">${opSymbol}</th>`;
      range.forEach(col => {
        gridHeadersHtml += `<th style="text-align: center; width: 35px; font-weight: bold; border-bottom: 2px solid #e5e7eb; background-color: #faf5ff;">${col}</th>`;
      });

      let gridRowsHtml = '';
      range.forEach(row => {
        let rowCells = `<td style="font-weight: bold; background-color: #faf5ff; text-align: center; border-right: 2px solid #e5e7eb; padding: 6px; font-size: 11px;">${row}</td>`;
        range.forEach(col => {
          const key = `${row}_${col}`;
          const stat = statsMap[key];

          let cellStyle = 'background-color: #f3f4f6; color: #9ca3af; border: 1px solid #e5e7eb;';
          let tooltipText = `Sem dados para ${row} ${opSymbol} ${col}`;
          let cellValue: string;

          if (selectedOp === 'addition') {
            cellValue = (row + col).toString();
          } else if (selectedOp === 'subtraction') {
            if (row >= col) {
              cellValue = (row - col).toString();
            } else {
              cellStyle = 'background-color: #f9fafb; color: #e5e7eb; border: 1px dashed #e5e7eb;';
              cellValue = '-';
            }
          } else if (selectedOp === 'division') {
            if (row % col === 0) {
              cellValue = (row / col).toString();
            } else {
              cellStyle = 'background-color: #f9fafb; color: #e5e7eb; border: 1px dashed #e5e7eb;';
              cellValue = '-';
            }
          } else {
            cellValue = (row * col).toString();
          }

          if (stat && cellValue !== '-') {
            const total = stat.correctCount + stat.errorCount;
            const accuracy = total > 0 ? Math.round((stat.correctCount / total) * 100) : 0;
            const avgTimeSec = (stat.averageTimeMs / total / 1000).toFixed(1);

            if (accuracy < 70 || stat.errorCount >= 2) {
              cellStyle = 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; font-weight: bold; cursor: help;';
              tooltipText = `${row} ${opSymbol} ${col}: ${accuracy}% acerto, ${avgTimeSec}s médio (${stat.errorCount} erros)`;
            } else if (accuracy >= 70 && (stat.averageTimeMs / total) > 4000) {
              cellStyle = 'background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d; cursor: help;';
              tooltipText = `${row} ${opSymbol} ${col}: ${accuracy}% acerto, ${avgTimeSec}s médio (Lento)`;
            } else {
              cellStyle = 'background-color: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; font-weight: bold; cursor: help;';
              tooltipText = `${row} ${opSymbol} ${col}: ${accuracy}% acerto, ${avgTimeSec}s médio (Domínio)`;
            }
          }

          rowCells += `<td title="${tooltipText}" style="${cellStyle} text-align: center; padding: 6px; font-size: 10px;">${cellValue}</td>`;
        });

        gridRowsHtml += `<tr>${rowCells}</tr>`;
      });

      const opName = selectedOp === 'addition' ? 'Adição' :
                     selectedOp === 'subtraction' ? 'Subtração' :
                     selectedOp === 'division' ? 'Divisão' : 'Multiplicação';

      return `
        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-top: 15px;">
          <h3 style="margin: 0 0 5px 0; color: #1e1b4b; font-size: 13px; font-weight: 700; text-transform: uppercase;">🗺️ Mapa Cognitivo de Lacunas (${opName})</h3>
          <p style="margin: 0 0 12px 0; font-size: 11px; color: #4b5563; line-height: 1.4;">Visualização da matriz de fatos numéricos. Células mostram o resultado das equações.</p>
          
          <table style="width: auto; border: 2px solid #e5e7eb; margin: 0 auto; border-collapse: collapse;">
            <thead>
              <tr>${gridHeadersHtml}</tr>
            </thead>
            <tbody>
              ${gridRowsHtml}
            </tbody>
          </table>

          <div style="display: flex; justify-content: center; gap: 15px; font-size: 9px; margin-top: 10px; font-weight: 600; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 10px; height: 10px; background-color: #d1fae5; border: 1px solid #6ee7b7; border-radius: 2px;"></div> Domínio (&lt;4s e &gt;70%)</div>
            <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 10px; height: 10px; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 2px;"></div> Resolução Lenta (&gt;4s)</div>
            <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 10px; height: 10px; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 2px;"></div> Lacuna Crítica (Erros frequentes)</div>
            <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 10px; height: 10px; background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 2px;"></div> Sem Dados</div>
          </div>
        </div>
      `;
    };

    const cognitiveHeatmapHtml = generateCognitiveHeatmapHtml(mathStats, activeStats.state?.selectedOperation || 'multiplication');

    // Generate timeline rows and visualization
    let timelineHtml: string;
    let progressionAnalysis: string;
    
    if (datesSorted.length > 0) {
      timelineHtml = datesSorted.slice(-7).map(date => {
        const d = groupedByDate[date];
        const accuracy = Math.round((d.correct / d.total) * 100);
        const avgTimeSec = (d.timeSum / d.total / 1000).toFixed(1);
        
        // Format to DD/MM/YYYY for presentation
        const [year, month, dayStr] = date.split('-');
        const formattedDate = `${dayStr}/${month}/${year}`;
        
        return `
          <div style="margin-bottom: 12px; border-bottom: 1px dashed #e5e7eb; padding-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
              <span>📅 Dia ${formattedDate}</span>
              <span class="badge ${accuracy >= 80 ? 'success' : accuracy >= 50 ? 'warning' : 'danger'}">${accuracy}% Precisão</span>
            </div>
            <div style="font-size: 10px; color: #4b5563; margin-top: 3px; display: flex; justify-content: space-between;">
              <span>Respondidas: <strong>${d.total}</strong> (Corretas: ${d.correct})</span>
              <span>Tempo Médio: <strong>${avgTimeSec}s</strong></span>
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

      let accuracyTrend: string;
      if (lastAccuracy > firstAccuracy) {
        accuracyTrend = `📈 A precisão geral do aluno subiu de <strong>${firstAccuracy}%</strong> para <strong>${lastAccuracy}%</strong> no período analisado, o que indica consolidação gradual dos fatos numéricos.`;
      } else if (lastAccuracy === firstAccuracy) {
        accuracyTrend = `⚖️ A precisão se manteve estável em <strong>${lastAccuracy}%</strong>, sugerindo estabilização do aprendizado.`;
      } else {
        accuracyTrend = `⚠️ Houve uma oscilação na precisão (de ${firstAccuracy}% para ${lastAccuracy}%). Isso é esperado ao introduzir operações de maior complexidade (como tabuadas mais altas).`;
      }

      let speedTrend: string;
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
    if (timeline.length > 0) {
      timeline.forEach(t => {
        if (!categoryTotals[t.category]) {
          categoryTotals[t.category] = { correct: 0, total: 0, timeSum: 0 };
        }
        categoryTotals[t.category].total++;
        if (t.correct) categoryTotals[t.category].correct++;
        categoryTotals[t.category].timeSum += t.timeMs;
      });
    } else {
      // Fallback: Populate categoryTotals using math stats
      mathStats.forEach(stat => {
        let category = 'Geral';
        if (stat.questionKey.includes('+')) category = 'Adição';
        else if (stat.questionKey.includes('-')) category = 'Subtração';
        else if (stat.questionKey.includes('x') || stat.questionKey.includes('*')) category = 'Multiplicação';
        else if (stat.questionKey.includes('/') || stat.questionKey.includes('÷')) category = 'Divisão';
        else if (stat.questionKey.startsWith('Olimpíadas')) category = 'Olimpíadas';

        if (!categoryTotals[category]) {
          categoryTotals[category] = { correct: 0, total: 0, timeSum: 0 };
        }
        const totalAnswers = stat.correctCount + stat.errorCount;
        categoryTotals[category].total += totalAnswers;
        categoryTotals[category].correct += stat.correctCount;
        categoryTotals[category].timeSum += (stat.averageTimeMs * totalAnswers);
      });
    }

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

    let customizedTip: string;
    if (minAccuracy < 70 && weakestOp !== 'Nenhuma') {
      customizedTip = `Recomendamos dar atenção especial à operação de <strong>${weakestOp}</strong> (precisão de ${minAccuracy}%). O jogo continuará ativando a repetição espaçada (SRS) nessas contas para auxiliar a memorização.`;
    } else {
      customizedTip = 'O aluno demonstra ótimo equilíbrio e precisão geral consistente nas operações básicas de matemática. Continue incentivando a prática contínua.';
    }

    // --- NEW SECTIONS DATA ---
    // Retrieve Olympic statistics and equipped runner board from game state
    const playerState = await backendService.getGameState(selectedUserId);
    const hasOlympicData = !!(playerState?.olympicScores && Object.keys(playerState.olympicScores).length > 0);
    const olympicScores: Record<string, number> = hasOlympicData ? playerState!.olympicScores! : {};

    const olympicWrongCount = playerState?.olympicWrongCount ?? 0;
    const olympicHistory = playerState?.olympicHistory ?? [];

    // Cyber Runner vehicles mapping
    const runnerBoard = playerState?.equippedRunnerBoard ?? 'light_skate';
    const boardNames: Record<string, string> = {
      'light_skate': '🛹 Skate de Luz (Básico)',
      'tron_bike': '🏍️ Moto Tron',
      'holo_board': '🛸 Prancha Holográfica',
    };
    const boardName = boardNames[runnerBoard] || runnerBoard;

    // Calculate General stats
    let overallTotalSolved = 0;
    let overallTotalCorrect = 0;
    let overallTimeMs = 0;
    Object.values(categoryTotals).forEach(val => {
      overallTotalSolved += val.total;
      overallTotalCorrect += val.correct;
      overallTimeMs += val.timeSum;
    });

    const generalAccuracy = overallTotalSolved > 0 ? Math.round((overallTotalCorrect / overallTotalSolved) * 100) : 0;
    const generalAvgTime = overallTotalSolved > 0 ? (overallTimeMs / overallTotalSolved / 1000).toFixed(1) : '0.0';

    const campaignZone = activeStats.state?.currentZone === 'volcano' ? '🌋 Vulcão de Fogo' : '🌲 Floresta Elemental';
    const classId = activeStats.state?.classId;
    const className = classId === 'warrior' ? '🛡️ Guerreiro' : classId === 'chronomancer' ? '⏳ Cronomante' : classId === 'alchemist' ? '🧪 Alquimista' : 'Nenhuma Selecionada';

    // Effort, Resilience & Engagement Metrics
    const weakQuestionsCorrected = mathStats.filter(s => s.errorCount > 0 && s.correctCount > s.errorCount).length;
    const totalWeakQuestions = mathStats.filter(s => s.errorCount > 0).length;
    const resilienceRatio = totalWeakQuestions > 0 ? Math.round((weakQuestionsCorrected / totalWeakQuestions) * 100) : 100;

    const activeDays = datesSorted.length || 1;
    const avgSessionTime = activeStats.state?.totalPlayTimeSeconds ? (activeStats.state.totalPlayTimeSeconds / activeDays) : 0;
    const petsCount = pets.length;
    const cosmeticsCount = activeStats.state?.purchasedCosmetics?.length || 0;

    const resilienceHtml = `
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-top: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #1e1b4b; font-size: 13px; font-weight: 700; text-transform: uppercase;">📊 Esforço, Resiliência e Consistência de Prática</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
          <div style="border: 1px solid #f3e8ff; padding: 12px; border-radius: 6px; background-color: #faf5ff;">
            <div style="font-size: 20px; font-weight: 800; color: #7c3aed;">${resilienceRatio}%</div>
            <div style="font-size: 11px; font-weight: 600; color: #5b21b6; margin-top: 3px;">Índice de Resiliência</div>
            <div style="font-size: 9px; color: #6b7280; margin-top: 5px; line-height: 1.3;">Porcentagem de dificuldades superadas através do treino contínuo.</div>
          </div>

          <div style="border: 1px solid #ecfdf5; padding: 12px; border-radius: 6px; background-color: #f0fdf4;">
            <div style="font-size: 20px; font-weight: 800; color: #10b981;">${activeDays} Dias</div>
            <div style="font-size: 11px; font-weight: 600; color: #047857; margin-top: 3px;">Consistência de Treino</div>
            <div style="font-size: 9px; color: #6b7280; margin-top: 5px; line-height: 1.3;">Média de ${(avgSessionTime / 60).toFixed(1)} min por dia de jogo ativo.</div>
          </div>

          <div style="border: 1px solid #fff7ed; padding: 12px; border-radius: 6px; background-color: #fff7ed;">
            <div style="font-size: 20px; font-weight: 800; color: #f97316;">${petsCount} 🐾 • ${cosmeticsCount} 👑</div>
            <div style="font-size: 11px; font-weight: 600; color: #c2410c; margin-top: 3px;">Engajamento de Gamificação</div>
            <div style="font-size: 9px; color: #6b7280; margin-top: 5px; line-height: 1.3;">Recompensas e companheiros coletados que incentivam o loop de estudo.</div>
          </div>
        </div>
      </div>
    `;

    // Render Olympic Skills
    const olympicSkillsHtml = Object.entries(olympicScores).map(([skill, val]) => {
      let badgeClass = 'danger';
      let status = 'Iniciante';
      if (val >= 80) {
        badgeClass = 'success';
        status = 'Mestrado';
      } else if (val >= 50) {
        badgeClass = 'warning';
        status = 'Intermediário';
      }

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-bottom: 5px;">
          <span style="font-weight: 600; color: #1e1b4b;">${skill}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 80px; background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; position: relative;">
              <div style="background-color: #d97706; width: ${val}%; height: 100%;"></div>
            </div>
            <span style="font-weight: 700; width: 40px; text-align: right;">${val}/100</span>
            <span class="badge ${badgeClass}" style="font-size: 8px; padding: 1px 4px;">${status}</span>
          </div>
        </div>
      `;
    }).join('');

    // Olympic Medals
    const medals = activeStats.state?.olympicMedals || {};
    const goldCount = Object.values(medals).filter(m => m === 'gold').length;
    const silverCount = Object.values(medals).filter(m => m === 'silver').length;
    const bronzeCount = Object.values(medals).filter(m => m === 'bronze').length;

    // Olympic history rows
    const olympicHistoryRowsHtml = olympicHistory.length > 0 ? olympicHistory.slice(-5).map(h => {
      const statusBadge = h.correct ? 'success' : 'danger';
      const statusText = h.correct ? 'Acerto' : 'Erro';
      return `
        <tr style="font-size: 11px;">
          <td>Nível ${h.level === 999 ? 'Re-Treino' : h.level}</td>
          <td><span class="badge ${statusBadge}">${statusText}</span></td>
          <td style="color: #6b7280;">${h.timestamp}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="3" style="text-align: center; color: #9ca3af; font-style: italic; font-size: 11px;">Nenhum histórico de olimpíadas registrado ainda.</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Pedagógico - ${activeStats.user.username}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; padding: 30px; line-height: 1.4; }
            h1 { color: #4c1d95; font-size: 22px; margin: 0 0 5px 0; font-weight: 800; }
            .header-info { margin-bottom: 20px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; background-color: #faf5ff; border: 1px solid #f3e8ff; padding: 12px; border-radius: 8px; }
            .info-item { display: flex; justify-content: space-between; border-bottom: 1px solid #f3e8ff; padding-bottom: 3px; }
            .info-label { color: #6b7280; font-weight: 500; }
            .info-val { font-weight: 700; color: #4c1d95; }
            
            h2 { color: #1e1b4b; font-size: 13px; margin: 20px 0 8px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 15px; }
            th, td { padding: 6px 8px; text-align: left; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
            th { background-color: #f9fafb; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 9px; }
            
            .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; text-align: center; }
            .danger { background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
            .warning { background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
            .success { background-color: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
            
            .tip-box { margin-top: 15px; background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 12px; border-radius: 6px; font-size: 11px; }
            .grid-layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; }
            .modules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; }
            .module-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; background-color: #f9fafb; }
            .stat-badge-inline { font-weight: bold; background-color: #ede9fe; color: #5b21b6; padding: 1px 4px; border-radius: 3px; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Progresso Pedagógico 🌌</h1>
          <p style="margin: 0 0 15px 0; font-size: 12px; color: #4b5563;">Acompanhamento pedagógico temporal do estudante e estatísticas cognitivas de matemática.</p>
          
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

          <h2>📈 Resumo Geral de Desempenho (Tudo Incluído)</h2>
          <table style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th>Total Respondido (Jogo)</th>
                <th>Total Acertos</th>
                <th>Acurácia Geral</th>
                <th>Tempo Médio Geral</th>
                <th>Classe Escolhida</th>
                <th>Progresso na Campanha</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: bold; font-size: 12px;">${overallTotalSolved}</td>
                <td style="font-size: 12px; color: #059669;">${overallTotalCorrect}</td>
                <td><span class="badge success" style="font-size: 11px;">${generalAccuracy}%</span></td>
                <td style="font-size: 12px;">${generalAvgTime}s</td>
                <td style="font-weight: 600;">${className}</td>
                <td>${campaignZone} (Fase ${activeStats.state?.campaignStage || 1})</td>
              </tr>
            </tbody>
          </table>

          <h2>📉 Gráficos de Tendência Temporal & Curvas de Aprendizado</h2>
          <div style="margin-bottom: 20px;">
            ${evolutionChartHtml}
          </div>

          ${cognitiveHeatmapHtml}

          ${resilienceHtml}

          <div class="grid-layout">
            <div>
              <h2>📊 Detalhado por Categoria Aritmética</h2>
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
              <h2>📅 Linha do Tempo de Evolução (Últimos 7 dias de treino)</h2>
              ${timelineHtml}
            </div>
          </div>

          ${progressionAnalysis}

          <h2>🎮 Métricas Avançadas por Módulo do Jogo</h2>
          <div class="modules-grid">
            <div class="module-card">
              <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #b45309; border-bottom: 1px solid #f59e0b; padding-bottom: 3px;">🏆 Olimpíadas dos Deuses (OBMEP & Lógica)</h3>
              
              ${hasOlympicData ? `
                <div style="display: flex; justify-content: space-around; margin-bottom: 10px; text-align: center; font-size: 11px;">
                  <div>🥇 <strong>${goldCount}</strong> Ouro</div>
                  <div>🥈 <strong>${silverCount}</strong> Prata</div>
                  <div>🥉 <strong>${bronzeCount}</strong> Bronze</div>
                </div>

                <div style="margin-top: 8px;">
                  <span style="font-size: 11px; font-weight: 500;">Perguntas na Fila de Re-Treino:</span>
                  <span class="stat-badge-inline" style="background-color: #fee2e2; color: #991b1b;">${olympicWrongCount} pendentes</span>
                </div>

                <h4 style="margin: 10px 0 5px 0; font-size: 10px; color: #4b5563; text-transform: uppercase;">Checklist de Especializações</h4>
                ${olympicSkillsHtml}

                <h4 style="margin: 12px 0 5px 0; font-size: 10px; color: #4b5563; text-transform: uppercase;">Histórico Olímpico Recente</h4>
                <table style="margin-top: 3px;">
                  <thead>
                    <tr>
                      <th>Nível</th>
                      <th>Resultado</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${olympicHistoryRowsHtml}
                  </tbody>
                </table>
              ` : `
                <p style="font-size: 11px; color: #6b7280; font-style: italic; text-align: center; margin: 20px 0;">
                  Este aluno ainda não participou do módulo de Olimpíadas.
                </p>
              `}
            </div>

            <div class="module-card">
              <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #0891b2; border-bottom: 1px solid #06b6d4; padding-bottom: 3px;">🛹 Cyber Runner (Agilidade & Tabuada)</h3>
              
              <div style="font-size: 11px; margin-bottom: 8px;">
                <strong>Veículo Equipado:</strong> <span style="font-weight: 600; color: #0891b2;">${boardName}</span>
              </div>
              <div style="font-size: 11px; line-height: 1.5; color: #4b5563;">
                Este módulo foca na automatização dos fatos básicos de matemática em velocidade limite. O uso do veículo e a resolução em pistas estimulam o raciocínio sob pressão de tempo (memória de trabalho livre).
              </div>
              
              <h3 style="margin: 15px 0 8px 0; font-size: 12px; color: #047857; border-bottom: 1px solid #10b981; padding-bottom: 3px;">🏟️ Arena de Combate e Sanctum</h3>
              <div style="font-size: 11px; line-height: 1.4; color: #4b5563; margin-bottom: 6px;">
                <strong>Mascote Equipado:</strong> <span style="font-weight: 600; color: #047857;">${activeStats.state?.equippedPetId ? '🐾 Ativo' : 'Nenhum'}</span>
              </div>
              <div style="font-size: 11px; line-height: 1.4; color: #4b5563;">
                O progresso do jogador na campanha principal ajuda a praticar operações desafiadoras (missões do templo, SRS espaçado e bosses da zona).
              </div>
            </div>
          </div>

          <div class="tip-box">
            <h3 style="margin-top: 0; color: #7c3aed; font-size: 12px; font-weight: 700;">💡 Dicas Pedagógicas & Recomendações de Treino</h3>
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
        isActive: isActiveInput,
        role: roleInput,
      });

      if (success) {
        setFormSuccess('Usuário atualizado com sucesso!');
        audioEngine.playCorrect();
        resetForm();
        await loadUsers();
      } else {
        setFormError('Erro ao atualizar usuário. Verifique se o nome de usuário já existe ou se há restrições de RLS/banco no Supabase.');
        audioEngine.playError();
      }
    } else {
      try {
        const newUser = await backendService.createUser(usernameInput, passwordInput, roleInput, isActiveInput);
        if (newUser) {
          setFormSuccess(`Usuário ${usernameInput} criado com sucesso!`);
          audioEngine.playCorrect();
          resetForm();
          await loadUsers();
          setSelectedUserId(newUser.id);
        } else {
          setFormError('Nome de usuário já existe ou ocorreu um erro.');
          audioEngine.playError();
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        if (errMsg.includes('Password should be')) {
          setFormError('A senha deve conter pelo menos 6 caracteres.');
        } else {
          setFormError(errMsg || 'Nome de usuário já existe ou ocorreu um erro.');
        }
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

  const handleToggleUserActive = async (id: string, currentActive: boolean) => {
    const success = await backendService.updateUser(id, { isActive: !currentActive });
    if (success) {
      audioEngine.playCorrect();
      await loadUsers();
    }
  };

  const startEdit = (user: User) => {
    setIsEditing(true);
    setEditId(user.id);
    setUsernameInput(user.username);
    setPasswordInput('');
    setRoleInput(user.role);
    setIsActiveInput(user.isActive !== false);
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
    setIsActiveInput(true);
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
                    <th style={{ padding: '12px 8px' }}>Status</th>
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
                      onClick={() => { setSelectedUserId(u.id); }}
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
                      <td style={{ padding: '12px 8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: u.isActive !== false ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                            color: u.isActive !== false ? '#22c55e' : '#f43f5e',
                          }}
                        >
                          {u.isActive !== false ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }} onClick={(e) => { e.stopPropagation(); }}>
                        {u.id !== adminUser.id && (
                          <button
                            onClick={() => handleToggleUserActive(u.id, u.isActive !== false)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: u.isActive !== false ? 'var(--neon-yellow)' : 'var(--neon-cyan)',
                              marginRight: '12px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {u.isActive !== false ? 'Inativar' : 'Ativar'}
                          </button>
                        )}
                        <button
                          onClick={() => { startEdit(u); }}
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
                  onChange={(e) => { setUsernameInput(e.target.value); }}
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
                  onChange={(e) => { setPasswordInput(e.target.value); }}
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

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Cargo</label>
                <select
                  value={roleInput}
                  onChange={(e) => { setRoleInput(e.target.value as 'admin' | 'player'); }}
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

              <div style={{ margin: '8px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  <input
                    type="checkbox"
                    checked={isActiveInput}
                    onChange={(e) => { setIsActiveInput(e.target.checked); }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  Conta Ativa (Permite login e visibilidade)
                </label>
              </div>

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

          const playerStats = classMathStats;
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
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: '6px' }}>Nenhuma falha crítica registrada.</div>
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
                      onClick={() => { void handlePrintPdf(); }}
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
                          <button type="button" className="cyber-btn cyber-btn-pink" onClick={() => { void handleAdjustGems(-10); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>-10 💎</button>
                          <button type="button" className="cyber-btn cyber-btn-cyan" onClick={() => { void handleAdjustGems(10); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>+10 💎</button>
                          <button type="button" className="cyber-btn cyber-btn-cyan" onClick={() => { void handleAdjustGems(50); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>+50 💎</button>
                        </div>
                      </div>

                      {/* Level Control */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Alterar Nível do Aluno</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            value={levelAdjustment}
                            onChange={(e) => { setLevelAdjustment(e.target.value); }}
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
                          <button type="button" className="cyber-btn" onClick={() => { void handleAdjustLevel(); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Atualizar Nível</button>
                        </div>
                      </div>

                      {/* Stats Reset */}
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button type="button" className="cyber-btn cyber-btn-pink" onClick={() => { void handleResetMathStats(); }} style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 'bold' }}>
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
                              onChange={(e) => { setTimeLimitInput(Number(e.target.value)); }}
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
                              onChange={(e) => { setMasteryThresholdInput(Number(e.target.value)); }}
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
                                  onClick={() => { toggleLockedOp(op.id); }}
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
                        <button type="button" className="cyber-btn cyber-btn-purple" onClick={() => { void handleSaveCurriculum(); }} style={{ width: '100%', padding: '10px', marginTop: '12px', fontWeight: 'bold' }}>
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
                      <form onSubmit={(e) => { void handleAddCustomFactOverride(e); }} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={customFactKey}
                          onChange={(e) => { setCustomFactKey(e.target.value); }}
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
                          onChange={(e) => { setCustomFactState(e.target.value as 'mastered' | 'weak'); }}
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
                            const weakList = activeStats.stats.filter((s: MathStatistic) => s.errorCount >= 2 || (s.correctCount + s.errorCount > 0 && (s.correctCount / (s.correctCount + s.errorCount)) < 0.7));
                            if (weakList.length === 0) return <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', padding: '10px 0', textAlign: 'center' }}>Nenhuma dificuldade crítica registrada.</div>;
                            return weakList.map((s: MathStatistic) => (
                              <div key={s.questionKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(244, 63, 94, 0.05)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
                                <span style={{ fontFamily: 'Share Tech Mono', fontWeight: 'bold', fontSize: '1rem', color: 'var(--neon-pink)' }}>{s.questionKey.replace('x', '×')}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>({s.errorCount}❌)</span>
                                  <button type="button" className="cyber-btn" onClick={() => void handleForceSrsState(s.questionKey, 'mastered')} style={{ padding: '2px 6px', fontSize: '0.65rem', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}>Forçar Domínio</button>
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
                            const masteredList = activeStats.stats.filter((s: MathStatistic) => s.correctCount >= threshold && s.errorCount === 0);
                            if (masteredList.length === 0) return <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', padding: '10px 0', textAlign: 'center' }}>Nenhuma conta dominada ainda.</div>;
                            return masteredList.map((s: MathStatistic) => (
                              <div key={s.questionKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 255, 204, 0.05)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(0, 255, 204, 0.1)' }}>
                                <span style={{ fontFamily: 'Share Tech Mono', fontWeight: 'bold', fontSize: '1rem', color: 'var(--neon-cyan)' }}>{s.questionKey.replace('x', '×')}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>({s.correctCount}✔️)</span>
                                  <button type="button" className="cyber-btn cyber-btn-pink" onClick={() => { void handleForceSrsState(s.questionKey, 'weak'); }} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Forçar Re-Treino</button>
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
                            {total} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgba(255,255,255,0.65)' }}>itens</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: accuracy > 80 ? 'var(--neon-cyan)' : accuracy > 50 ? 'var(--neon-yellow)' : 'var(--neon-pink)', marginTop: '4px' }}>
                            {accuracy}% precisão
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>
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

