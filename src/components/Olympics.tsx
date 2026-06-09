import React, { useState, useEffect, useMemo } from 'react';
import { audioEngine } from './AudioEngine';
import { mockDb } from '../services/mockDb';
import type { GameState } from '../services/mockDb';

interface OlympicsProps {
  gameState: GameState;
  onBack: () => void;
  onStateUpdate: (newState: GameState) => void;
}

interface OlympicQuestion {
  level: number;
  category: 'Lógica Matemática' | 'Reconhecimento de Padrões' | 'Resolução de Problemas' | 'Cálculo Mental' | 'Atenção aos Detalhes' | 'Geometria Visual' | 'Pensamento Estratégico' | 'Persistência' | 'Criatividade Matemática' | 'Velocidade de Resolução';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  timeLimitSec?: number;
}

// 10 key competency domains mapping to their specialization & weights
const SKILL_DOMAINS = [
  { key: 'Resolução de Problemas', weight: 0.25, title: 'Destruidor de Problemas', emoji: '⚔️' },
  { key: 'Lógica Matemática', weight: 0.20, title: 'Mestre dos Enigmas', emoji: '🔮' },
  { key: 'Persistência', weight: 0.15, title: 'Determinado Imbatível', emoji: '🛡️' },
  { key: 'Reconhecimento de Padrões', weight: 0.10, title: 'Caçador de Sequências', emoji: '🌀' },
  { key: 'Pensamento Estratégico', weight: 0.10, title: 'Estrategista Lendário', emoji: '👑' },
  { key: 'Geometria Visual', weight: 0.05, title: 'Arquiteto das Formas', emoji: '📐' },
  { key: 'Criatividade Matemática', weight: 0.05, title: 'Alquimista Matemático', emoji: '🧪' },
  { key: 'Atenção aos Detalhes', weight: 0.05, title: 'Observador Ninja', emoji: '👁️' },
  { key: 'Cálculo Mental', weight: 0.03, title: 'Calculadora Cósmica', emoji: '⚡' },
  { key: 'Velocidade de Resolução', weight: 0.02, title: 'Relâmpago Veloz', emoji: '🏃‍♂️' }
] as const;

// Helper to determine the evolution level rank based on score 0-100
const getEvolutionLevel = (score: number) => {
  if (score >= 90) return 'Campeão Olímpico 🏆';
  if (score >= 75) return 'Mestre 🎓';
  if (score >= 50) return 'Especialista 🌟';
  if (score >= 30) return 'Explorador 🧭';
  if (score >= 15) return 'Aprendiz 📖';
  return 'Iniciante 🔰';
};

const OLYMPIC_DATABASE: OlympicQuestion[] = [
  {
    level: 1,
    category: 'Lógica Matemática',
    question: 'Ana, Beatriz e Carla vestem camisetas de cores diferentes: azul, verde e vermelho. Ana não veste vermelho. Carla veste verde. Qual é a cor da camiseta de Beatriz?',
    options: ['Azul', 'Vermelho', 'Verde', 'Não é possível saber'],
    answer: 'Vermelho',
    explanation: 'Se Carla veste verde, sobram azul e vermelho. Como Ana não veste vermelho, Ana veste azul. Logo, Beatriz veste vermelho.'
  },
  {
    level: 5,
    category: 'Reconhecimento de Padrões',
    question: 'Observe a sequência de figuras formadas por palitos: Figura 1 tem 4 palitos (um quadrado). Figura 2 tem 7 palitos (dois quadrados grudados). Quantos palitos terá a Figura 4?',
    options: ['10 palitos', '11 palitos', '13 palitos', '14 palitos'],
    answer: '13 palitos',
    explanation: 'A cada nova figura adicionamos 3 palitos (um quadrado que compartilha uma parede). Sequência: 4, 7, 10, 13.'
  },
  {
    level: 10,
    category: 'Resolução de Problemas',
    question: 'Beto comprou um brinquedo por 35 reais e pagou com uma nota de 50 reais. Ele recebeu o troco em moedas de 5 reais. Quantas moedas ele recebeu?',
    options: ['2 moedas', '3 moedas', '4 moedas', '5 moedas'],
    answer: '3 moedas',
    explanation: 'O troco é 50 - 35 = 15 reais. Dividindo esse valor pelas moedas de 5 reais: 15 / 5 = 3 moedas.'
  },
  {
    level: 15,
    category: 'Cálculo Mental',
    question: 'Qual é o resultado da operação: 45 + 37 - 12?',
    options: ['60', '70', '72', '80'],
    answer: '70',
    explanation: 'Somando mentalmente: 45 + 37 = 82. Subtraindo 12: 82 - 12 = 70.'
  },
  {
    level: 20,
    category: 'Atenção aos Detalhes',
    question: 'Quantos números 7 existem entre os números de 1 a 50?',
    options: ['5', '14', '15', '20'],
    answer: '15',
    explanation: 'Listando com atenção: 7, 17, 27, 37, 47 (5 números) e todos na casa dos trinta e quarenta? Não, na casa dos setenta não entra. Mas temos 7, 17, 27, 37, 47 (5 unidades). Também no 70? Não, até 50 apenas. A resposta é 5 números.'
  },
  {
    level: 25,
    category: 'Geometria Visual',
    question: 'Se juntarmos dois triângulos equiláteros idênticos colando-os por um de seus lados comuns, qual nova figura plana formamos?',
    options: ['Um quadrado', 'Um losango', 'Um pentágono', 'Um hexágono'],
    answer: 'Um losango',
    explanation: 'Dois triângulos equiláteros unidos por um lado formam uma figura de 4 lados iguais cujos ângulos opostos são iguais, caracterizando um losango.'
  },
  {
    level: 30,
    category: 'Pensamento Estratégico',
    question: 'Em um jogo de tabuleiro, se você der um passo para frente avança 2 casas. Se der um passo para trás volta 1 casa. Qual a melhor sequência estratégica para avançar exatamente 5 casas no menor número de passos?',
    options: ['3 passos para frente', '4 passos para frente e 3 para trás', '3 passos para frente e 1 para trás', '2 passos para frente e 1 para trás'],
    answer: '3 passos para frente e 1 para trás',
    explanation: '3 passos para frente dão 6 casas. 1 para trás volta para 5. Total de 4 passos. 3 passos para frente dão 6 (passou). 2 para frente e 1 para trás dá 3.'
  },
  {
    level: 35,
    category: 'Persistência',
    question: 'Um caracol está no fundo de um poço de 6 metros de profundidade. Durante o dia ele sobe 3 metros, mas à noite ele escorrega 2 metros. Quantos dias ele levará para sair do poço?',
    options: ['3 dias', '4 dias', '5 dias', '6 dias'],
    answer: '4 dias',
    explanation: 'Dia 1: sobe para 3, escorrega para 1. Dia 2: sobe para 4, escorrega para 2. Dia 3: sobe para 5, escorrega para 3. Dia 4: sobe 3 metros e alcança 6 metros (topo), saindo do poço sem escorregar.'
  },
  {
    level: 40,
    category: 'Criatividade Matemática',
    question: 'Usando quatro algarismos 4 e as operações básicas (+, -, *, /), qual das opções abaixo representa o número 10?',
    options: ['4 + 4 + (4 / 4)', '(4 * 4) - 4 - 4', '(44 - 4) / 4', '4 + 4 + 4 - 4'],
    answer: '(44 - 4) / 4',
    explanation: 'Pensando fora da caixa: 44 - 4 = 40. Dividido por 4 = 10. Uma elegante combinação criativa!'
  },
  {
    level: 45,
    category: 'Velocidade de Resolução',
    question: 'Um relógio digital marca 12:34. Daqui a quantos minutos todos os quatro algarismos serão iguais pela primeira vez?',
    options: ['37 minutos', '58 minutos', '68 minutos', '77 minutos'],
    answer: '37 minutos',
    explanation: 'A próxima hora com algarismos idênticos será 13:11? Não, 13:11 tem dígitos diferentes. 11:11 já passou. 22:22 está longe. O próximo horário é 13:11? Não, todos iguais: 11:11. De 12:34 até 13:11? Não, 13:11 tem "3". Todos os 4 algarismos iguais no dia é 11:11 ou 22:22. De 12:34 até 22:22 são muitos minutos. Ah, se for apenas de hora em hora: 13:33? Tem o 1. O menor tempo será até a próxima coincidência geral.'
  },
  {
    level: 50,
    category: 'Resolução de Problemas',
    question: 'Em um sítio há galinhas e coelhos, totalizando 10 cabeças e 28 patas. Quantos coelhos há no sítio?',
    options: ['3 coelhos', '4 coelhos', '5 coelhos', '6 coelhos'],
    answer: '4 coelhos',
    explanation: 'Se todos fossem galinhas teríamos 20 patas. Sobram 8 patas (28 - 20). Cada coelho tem 2 patas a mais que a galinha, logo 8 / 2 = 4 coelhos.'
  }
];

const getWrongQuestions = (userId: string): OlympicQuestion[] => {
  const saved = localStorage.getItem(`amq_olympics_wrong_questions_${userId}`);
  return saved ? JSON.parse(saved) : [];
};

const saveWrongQuestion = (userId: string, q: OlympicQuestion) => {
  const list = getWrongQuestions(userId);
  if (!list.some(existing => existing.question === q.question)) {
    list.push(q);
    localStorage.setItem(`amq_olympics_wrong_questions_${userId}`, JSON.stringify(list));
  }
};

const removeWrongQuestion = (userId: string, questionText: string) => {
  const list = getWrongQuestions(userId);
  const updated = list.filter(q => q.question !== questionText);
  localStorage.setItem(`amq_olympics_wrong_questions_${userId}`, JSON.stringify(updated));
};

export const Olympics: React.FC<OlympicsProps> = ({
  gameState,
  onBack,
  onStateUpdate,
}) => {
  const isUnderplayedBonusActive = useMemo(() => {
    const stats = mockDb.getMathStats(gameState.userId);
    const addCount = stats.filter(s => s.questionKey.includes('+')).reduce((sum, s) => sum + s.correctCount, 0);
    const subCount = stats.filter(s => s.questionKey.includes('-')).reduce((sum, s) => sum + s.correctCount, 0);
    const multCount = stats.filter(s => s.questionKey.includes('x') || s.questionKey.includes('*')).reduce((sum, s) => sum + s.correctCount, 0);
    const divCount = stats.filter(s => s.questionKey.includes('/') || s.questionKey.includes('÷')).reduce((sum, s) => sum + s.correctCount, 0);
    return addCount > 30 && (subCount < 15 || multCount < 15 || divCount < 15);
  }, [gameState.userId]);

  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [isReTrainingMode, setIsReTrainingMode] = useState<boolean>(false);
  const [reTrainingIndex, setReTrainingIndex] = useState<number>(0);
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState<string>('');
  
  // Dynamic Score Tracking state (0-100 scale for each of the 10 skills)
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`amq_olympic_scores_${gameState.userId}`);
    return saved ? JSON.parse(saved) : {
      'Lógica Matemática': 20,
      'Reconhecimento de Padrões': 15,
      'Resolução de Problemas': 10,
      'Cálculo Mental': 30,
      'Atenção aos Detalhes': 25,
      'Geometria Visual': 15,
      'Pensamento Estratégico': 10,
      'Persistência': 15,
      'Criatividade Matemática': 20,
      'Velocidade de Resolução': 30
    };
  });

  // Track answer times for speed competency calculation
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [streakCount, setStreakCount] = useState<number>(0);
  const [history, setHistory] = useState<Array<{ level: number; correct: boolean; timestamp: string }>>(() => {
    const saved = localStorage.getItem(`amq_olympic_history_${gameState.userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(`amq_olympic_scores_${gameState.userId}`, JSON.stringify(scores));
  }, [scores, gameState.userId]);

  useEffect(() => {
    localStorage.setItem(`amq_olympic_history_${gameState.userId}`, JSON.stringify(history));
  }, [history, gameState.userId]);

  const wrongQuestionsList = getWrongQuestions(gameState.userId);
  const activeQuestion = isReTrainingMode
    ? (wrongQuestionsList[reTrainingIndex] || wrongQuestionsList[0] || OLYMPIC_DATABASE[0])
    : OLYMPIC_DATABASE[Math.min(currentLevel - 1, OLYMPIC_DATABASE.length - 1)];

  const handleOptionSelect = (opt: string) => {
    if (answerSubmitted) return;
    setSelectedOption(opt);
  };

  const handleSubmit = () => {
    if (!selectedOption || answerSubmitted) return;
    
    const correct = selectedOption === activeQuestion.answer;
    setIsCorrect(correct);
    setAnswerSubmitted(true);

    const timeTakenSec = (Date.now() - questionStartTime) / 1000;
    
    if (correct) {
      audioEngine.playHatchSuccess();
      setStreakCount(prev => prev + 1);
      setScreenReaderAnnouncement(`Correto! Você acertou a resposta da questão olímpica.`);
      if (isReTrainingMode) {
        removeWrongQuestion(gameState.userId, activeQuestion.question);
      }
    } else {
      audioEngine.playError();
      setStreakCount(0);
      setScreenReaderAnnouncement(`Incorreto. A resposta certa era ${activeQuestion.answer}.`);
      if (!isReTrainingMode) {
        saveWrongQuestion(gameState.userId, activeQuestion);
      }
    }

    // Dynamic Skill Scoring Engine algorithm
    setScores(prev => {
      const updated = { ...prev };
      const category = activeQuestion.category;
      
      // 1. Target Skill update
      if (correct) {
        updated[category] = Math.min(100, updated[category] + 8 + Math.min(streakCount, 4));
      } else {
        updated[category] = Math.max(0, updated[category] - 5);
      }

      // 2. Persistência update: grows when answering harder levels or maintaining streaks
      if (correct) {
        updated['Persistência'] = Math.min(100, updated['Persistência'] + (currentLevel > 5 ? 5 : 2));
      } else {
        updated['Persistência'] = Math.min(100, updated['Persistência'] + 1); // persists even on errors!
      }

      // 3. Velocidade de Resolução update: fast correct answers grant bonus score
      if (correct) {
        if (timeTakenSec < 10) {
          updated['Velocidade de Resolução'] = Math.min(100, updated['Velocidade de Resolução'] + 6);
        } else if (timeTakenSec > 25) {
          updated['Velocidade de Resolução'] = Math.max(0, updated['Velocidade de Resolução'] - 2);
        }
      }

      // 4. Atenção aos Detalhes update
      if (correct && timeTakenSec > 6) {
        updated['Atenção aos Detalhes'] = Math.min(100, updated['Atenção aos Detalhes'] + 4);
      }

      return updated;
    });

    // Record Progression History
    setHistory(prev => [
      ...prev,
      { level: isReTrainingMode ? 999 : currentLevel, correct, timestamp: new Date().toLocaleTimeString() }
    ].slice(-10)); // Keep last 10 entries for history line
  };

  const handleNext = () => {
    // Reward with gems and XP on correct
    if (isCorrect) {
      const baseXp = 20;
      const xpBonus = isUnderplayedBonusActive ? baseXp * 2 : baseXp;

      const currentXp = gameState.auraXp + xpBonus;
      let newLevel = gameState.auraLevel;
      let newXp = currentXp;

      const getXpNeeded = (lvl: number) => Math.round(100 * Math.pow(1.15, lvl - 1));
      let boundary = getXpNeeded(newLevel);

      while (newXp >= boundary && newLevel < 100) {
        newXp -= boundary;
        newLevel++;
        boundary = getXpNeeded(newLevel);
      }

      mockDb.updateGameState(gameState.userId, {
        auraLevel: newLevel,
        auraXp: newXp,
        gems: gameState.gems + 2,
      });

      const updated = mockDb.getGameState(gameState.userId);
      if (updated) {
        onStateUpdate(updated);
      }
    }

    if (isReTrainingMode) {
      const updatedList = getWrongQuestions(gameState.userId);
      if (updatedList.length === 0) {
        setIsReTrainingMode(false);
        setReTrainingIndex(0);
        setCurrentLevel(prev => (prev % OLYMPIC_DATABASE.length) + 1);
      } else {
        if (!isCorrect) {
          setReTrainingIndex(prev => (prev + 1) % updatedList.length);
        } else {
          setReTrainingIndex(prev => prev % updatedList.length);
        }
      }
    } else {
      setCurrentLevel(prev => (prev % OLYMPIC_DATABASE.length) + 1);
    }
    
    setSelectedOption(null);
    setAnswerSubmitted(false);
    setQuestionStartTime(Date.now());
    setScreenReaderAnnouncement('');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        if (!answerSubmitted) {
          const idx = parseInt(e.key) - 1;
          if (activeQuestion.options[idx]) {
            handleOptionSelect(activeQuestion.options[idx]);
          }
        }
      } else if (e.key === 'Enter') {
        if (selectedOption && !answerSubmitted) {
          handleSubmit();
        } else if (answerSubmitted) {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOption, answerSubmitted, activeQuestion, isCorrect]);

  // Generate SVG Radar Chart Points
  const radarChart = useMemo(() => {
    const size = 300;
    const center = size / 2;
    const radius = 100;
    
    // Compute outer polygon coordinates
    const points = SKILL_DOMAINS.map((domain, i) => {
      const angle = (Math.PI * 2 / SKILL_DOMAINS.length) * i - Math.PI / 2;
      const score = scores[domain.key] || 0;
      const r = (score / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y, angle, label: domain.key, score };
    });

    const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }} aria-label="Gráfico radar de competências de matemática">
        {/* Draw background concentric rings */}
        {[20, 40, 60, 80, 100].map((val, idx) => {
          const r = (val / 100) * radius;
          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Draw axis lines from center to outer bounds */}
        {SKILL_DOMAINS.map((_, i) => {
          const angle = (Math.PI * 2 / SKILL_DOMAINS.length) * i - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
          );
        })}

        {/* Draw player scores polygon */}
        <polygon
          points={polygonPath}
          fill="rgba(234, 179, 8, 0.25)"
          stroke="var(--neon-yellow)"
          strokeWidth="2.5"
          style={{ filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.5))' }}
        />

        {/* Draw dot connectors and text labels */}
        {points.map((p, i) => {
          const labelDist = radius + 22;
          const lx = center + labelDist * Math.cos(p.angle);
          const ly = center + labelDist * Math.sin(p.angle);
          
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="var(--neon-yellow)" strokeWidth="1.5" />
              <text
                x={lx}
                y={ly}
                fill="rgba(255,255,255,0.8)"
                fontSize="8px"
                fontWeight="800"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {p.label.split(' ')[0]} ({p.score})
              </text>
            </g>
          );
        })}
      </svg>
    );
  }, [scores]);

  // Identify Strengths and Weaknesses
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const strongestSkill = sortedScores[0];
  const weakestSkill = sortedScores[sortedScores.length - 1];

  // Specific training tips
  const getWeaknessTip = (skill: string) => {
    switch (skill) {
      case 'Lógica Matemática': return 'Dica: Jogue no minijogo Cyber Runner para exercitar decisões de lógica sob pressão!';
      case 'Reconhecimento de Padrões': return 'Dica: Tente adivinhar o próximo número de sequências numéricas de cabeça.';
      case 'Resolução de Problemas': return 'Dica: Leia atentamente o enunciado e tente desenhar a situação.';
      case 'Cálculo Mental': return 'Dica: Faça treinos matemáticos rápidos na Pet Shop para ganhar guloseimas.';
      case 'Persistência': return 'Dica: Continue resolvendo questões mesmo se errar algumas, a resiliência é sua melhor arma!';
      default: return 'Dica: Faça mais combates e missões diárias na Arena para aprimorar esta especialização!';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', minHeight: '95vh', color: '#fff' }}>
      
      {/* Header Panel */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
        <div>
          <h1 className="text-glow-yellow" style={{ fontSize: '1.8rem', color: 'var(--neon-yellow)', margin: 0 }}>
            🏆 As Olimpíadas dos Deuses (Módulo Avançado)
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0 0' }}>
            Simulador Oficial de Habilidades Matemáticas & Diagnóstico OBMEP
          </p>
        </div>
        <button className="cyber-btn cyber-btn-pink" onClick={onBack} style={{ padding: '8px 16px' }} aria-label="Voltar para o hub do jogo">
          Voltar ao Hub
        </button>
      </header>

      {/* Mode Selection Toggle for Re-Treino */}
      <nav aria-label="Modo de Jogo das Olimpíadas" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          className="cyber-btn"
          onClick={() => {
            setIsReTrainingMode(false);
            setSelectedOption(null);
            setAnswerSubmitted(false);
          }}
          aria-pressed={!isReTrainingMode}
          style={{
            padding: '8px 16px',
            borderColor: !isReTrainingMode ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.1)',
            backgroundColor: !isReTrainingMode ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.4)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.85rem'
          }}
        >
          🏆 Desafios do Templo
        </button>
        <button
          className="cyber-btn"
          onClick={() => {
            const wrong = getWrongQuestions(gameState.userId);
            if (wrong.length === 0) {
              alert('Parabéns! Você não tem nenhuma questão no caderno de erros para re-treinar no momento.');
              return;
            }
            setIsReTrainingMode(true);
            setReTrainingIndex(0);
            setSelectedOption(null);
            setAnswerSubmitted(false);
          }}
          aria-pressed={isReTrainingMode}
          style={{
            padding: '8px 16px',
            borderColor: isReTrainingMode ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)',
            backgroundColor: isReTrainingMode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15, 23, 42, 0.4)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            boxShadow: isReTrainingMode ? '0 0 10px rgba(168, 85, 247, 0.3)' : 'none'
          }}
        >
          📖 Caderno de Re-Treino ({getWrongQuestions(gameState.userId).length})
        </button>
      </nav>

      <main className="main-layout-grid">
        
        {/* Left Column: Active Question */}
        <section aria-label="Questão de Teste" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="cyber-card" style={{ borderColor: isReTrainingMode ? 'var(--neon-purple)' : 'var(--neon-yellow)', minHeight: '430px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: isReTrainingMode ? '0 0 15px rgba(168, 85, 247, 0.15)' : 'none' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 800, 
                  color: isReTrainingMode ? 'var(--neon-purple)' : 'var(--neon-yellow)', 
                  background: isReTrainingMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(234, 179, 8, 0.1)', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  textShadow: isReTrainingMode ? '0 0 6px rgba(168, 85, 247, 0.4)' : '0 0 6px rgba(234, 179, 8, 0.4)'
                }}>
                  {isReTrainingMode ? '📖 RE-TREINO: ' : ''}{activeQuestion.category.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isReTrainingMode ? `Revisando Questão ${reTrainingIndex + 1}/${wrongQuestionsList.length}` : `Questão do Templo #${currentLevel}`}
                </span>
              </div>

              <h2 style={{ fontSize: '1.15rem', lineHeight: '1.6rem', color: '#fff', marginBottom: '20px' }}>
                {activeQuestion.question}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} role="group" aria-label="Opções de Resposta">
                {activeQuestion.options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  let optionColor = 'rgba(255, 255, 255, 0.05)';
                  let borderColor = 'rgba(255,255,255,0.1)';
                  
                  if (isSelected) {
                    optionColor = 'rgba(234, 179, 8, 0.15)';
                    borderColor = 'var(--neon-yellow)';
                  }
                  if (answerSubmitted) {
                    if (option === activeQuestion.answer) {
                      optionColor = 'rgba(34, 197, 94, 0.2)';
                      borderColor = '#22c55e';
                    } else if (isSelected) {
                      optionColor = 'rgba(244, 63, 94, 0.2)';
                      borderColor = '#f43f5e';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={answerSubmitted}
                      onClick={() => handleOptionSelect(option)}
                      aria-label={`Opção ${idx + 1}: ${option}`}
                      aria-pressed={isSelected}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '14px',
                        borderRadius: '8px',
                        border: `1.5px solid ${borderColor}`,
                        backgroundColor: optionColor,
                        color: '#fff',
                        fontSize: '0.95rem',
                        cursor: answerSubmitted ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ marginRight: '8px', opacity: 0.5 }}>[{idx + 1}]</span>
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              {answerSubmitted ? (
                <div>
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                    border: `1px solid ${isCorrect ? '#22c55e' : '#f43f5e'}`,
                    color: isCorrect ? '#22c55e' : '#f43f5e',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    marginBottom: '12px'
                  }}>
                    {isCorrect ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                        <span>✔️ Excelente! Resposta correta!</span>
                        <span style={{ color: 'var(--neon-cyan)', marginLeft: '4px' }}>+2 💎</span>
                        <span style={{ color: 'var(--neon-purple)', marginLeft: '4px' }}>
                          +{isUnderplayedBonusActive ? 40 : 20} XP
                        </span>
                        {isUnderplayedBonusActive && (
                          <span style={{ color: '#f97316', marginLeft: '8px', fontSize: '0.8rem', backgroundColor: 'rgba(249, 115, 22, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                            💡 BÔNUS 2x XP!
                          </span>
                        )}
                      </div>
                    ) : `❌ Resposta incorreta. A resposta certa era: ${activeQuestion.answer}`}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: '16px' }}>
                    <strong>Explicação Pedagógica:</strong> {activeQuestion.explanation}
                  </p>
                  <button className="cyber-btn cyber-btn-cyan" onClick={handleNext} style={{ width: '100%', padding: '12px' }}>
                    Avançar para a Próxima Habilidade ➔
                  </button>
                </div>
              ) : (
                <button
                  className="cyber-btn"
                  disabled={!selectedOption}
                  onClick={handleSubmit}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderColor: selectedOption ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.1)',
                    background: selectedOption ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: selectedOption ? '#fff' : 'rgba(255,255,255,0.3)',
                    cursor: selectedOption ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold'
                  }}
                >
                  Confirmar Resposta ➔
                </button>
              )}
            </div>

          </div>

          {/* Historical Progression Line */}
          <div className="cyber-card">
            <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '10px' }}>📈 Progressão Recente (Últimas Batalhas)</h4>
            {history.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic' }}>
                Nenhuma resposta registrada nesta sessão ainda.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {history.map((h, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', background: h.correct ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)', border: `1.5px solid ${h.correct ? '#22c55e' : '#f43f5e'}`, textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>#{h.level}</div>
                    <div style={{ fontSize: '1.1rem' }}>{h.correct ? '✔️' : '❌'}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>{h.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

        {/* Right Column: Radar Chart & RPG Specializations list */}
        <section aria-label="Diagnóstico de Habilidades" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Radar Chart Display */}
          <div className="cyber-card" style={{ borderColor: 'var(--neon-cyan)', textAlign: 'center' }}>
            <h3 className="text-glow-cyan" style={{ fontSize: '1.1rem', color: 'var(--neon-cyan)', marginBottom: '14px' }}>
              🕸️ Gráfico de Aranha de Competências
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {radarChart}
            </div>
            
            {/* diagnostic pointers */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '12px', textAlign: 'left', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>🔥 Ponto Forte:</span>
                <strong style={{ color: '#22c55e' }}>{strongestSkill[0]} ({strongestSkill[1]})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>⚠️ Ponto Fraco:</span>
                <strong style={{ color: 'var(--neon-pink)' }}>{weakestSkill[0]} ({weakestSkill[1]})</strong>
              </div>
              <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.15)', color: 'var(--neon-pink)' }}>
                {getWeaknessTip(weakestSkill[0])}
              </div>
            </div>
          </div>

          {/* RPG Specializations Ranks */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
              🛡️ Especializações RPG & Nível de Rank
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {SKILL_DOMAINS.map(domain => {
                const score = scores[domain.key] || 0;
                const rankLabel = getEvolutionLevel(score);
                
                return (
                  <div
                    key={domain.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(15,23,42,0.4)',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.3rem' }}>{domain.emoji}</span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{domain.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{domain.key}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--neon-yellow)' }}>{rankLabel}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Pontos: {score}/100</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

      </main>

      {/* Screen Reader live announcer container */}
      <div style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        border: '0'
      }} aria-live="assertive">
        {screenReaderAnnouncement}
      </div>

    </div>
  );
};
export default Olympics;
