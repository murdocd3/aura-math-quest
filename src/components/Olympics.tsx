import React, { useState } from 'react';
import { audioEngine } from './AudioEngine';
import type { GameState } from '../services/mockDb';

interface OlympicsProps {
  gameState: GameState;
  onBack: () => void;
  onStateUpdate: (newState: GameState) => void;
}

interface OlympicQuestion {
  level: number;
  category: 'Cálculo' | 'Lógica' | 'Padrões' | 'Geometria' | 'Problemas';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  visualIcon?: string;
}

// 100 Adaptive levels configuration (representative sample of progressive levels)
const OLYMPIC_DATABASE: OlympicQuestion[] = [
  // Levels 1-20: Nível 1 - Básico (8-10 anos)
  {
    level: 1,
    category: 'Cálculo',
    question: 'Ana tem 5 figurinhas. Ela ganha mais 3 de sua mãe e dá 2 para o seu irmão. Com quantas figurinhas ela ficou?',
    options: ['4', '5', '6', '8'],
    answer: '6',
    explanation: 'Somamos as figurinhas ganhas (5 + 3 = 8) e depois subtraímos as que ela deu (8 - 2 = 6).'
  },
  {
    level: 2,
    category: 'Padrões',
    question: 'Descubra qual número completa a sequência lógica: 2, 5, 8, 11, __',
    options: ['12', '13', '14', '15'],
    answer: '14',
    explanation: 'A sequência aumenta de 3 em 3. Portanto, 11 + 3 = 14.'
  },
  {
    level: 3,
    category: 'Lógica',
    question: 'João é mais alto que Pedro. Pedro é mais alto que Maria. Quem é o mais baixo de todos?',
    options: ['João', 'Pedro', 'Maria', 'Não dá para saber'],
    answer: 'Maria',
    explanation: 'Se João > Pedro e Pedro > Maria, então João > Pedro > Maria. Logo, Maria é a mais baixa.'
  },
  {
    level: 4,
    category: 'Geometria',
    question: 'Uma folha quadrada de papel é dobrada ao meio. Que formato de figura geométrica ela assume agora?',
    options: ['Um triângulo ou retângulo', 'Um círculo', 'Um losango', 'Sempre um quadrado'],
    answer: 'Um triângulo ou retângulo',
    explanation: 'Dobrando um quadrado ao meio na diagonal obtemos um triângulo; dobrando paralelo aos lados obtemos um retângulo.'
  },
  {
    level: 5,
    category: 'Problemas',
    question: 'Tenho algumas moedas. Se eu der 3 moedas para você, nós dois ficaremos com a mesma quantidade. Quantas moedas eu tenho a mais que você?',
    options: ['3 moedas', '4 moedas', '6 moedas', '9 moedas'],
    answer: '6 moedas',
    explanation: 'Se ao dar 3 moedas ficamos iguais, significa que eu tinha a quantidade que doei mais a mesma quantidade sobrando para equilibrar, ou seja: 3 + 3 = 6.'
  },
  {
    level: 6,
    category: 'Cálculo',
    question: 'Qual é o menor número inteiro positivo de três algarismos diferentes?',
    options: ['100', '101', '102', '123'],
    answer: '102',
    explanation: 'O menor número de 3 dígitos começa com 1. O próximo dígito menor possível é 0. O terceiro menor dígito diferente é 2. Logo, 102.'
  },
  {
    level: 7,
    category: 'Padrões',
    question: 'Complete a sequência de bolinhas: 1, 3, 6, 10, 15, __',
    options: ['18', '20', '21', '25'],
    answer: '21',
    explanation: 'A diferença entre os números aumenta de 1 em 1: +2, +3, +4, +5... O próximo acréscimo será +6. Assim, 15 + 6 = 21.'
  },
  {
    level: 8,
    category: 'Geometria',
    question: 'Quantos lados tem um hexágono regular?',
    options: ['5', '6', '7', '8'],
    answer: '6',
    explanation: 'Hexa representa seis. Portanto, um hexágono possui 6 lados.'
  },
  {
    level: 9,
    category: 'Lógica',
    question: 'Em uma caixa temos 3 meias vermelhas e 3 meias azuis. No escuro, quantas meias no mínimo preciso tirar para ter certeza de formar um par de mesma cor?',
    options: ['2', '3', '4', '5'],
    answer: '3',
    explanation: 'Se tirar 2, podem ser uma de cada cor. A 3ª meia obrigatoriamente fará par com uma das duas primeiras.'
  },
  {
    level: 10,
    category: 'Problemas',
    question: 'Um bolo é cortado em 4 pedaços iguais. Depois, cada um desses pedaços é cortado na metade. Quantos pedaços temos no total?',
    options: ['6 pedaços', '8 pedaços', '10 pedaços', '12 pedaços'],
    answer: '8 pedaços',
    explanation: 'Temos 4 fatias. Ao partir cada uma em 2 (metade), multiplicamos: 4 x 2 = 8.'
  },
  // Levels 20-50: Nível 2 - Intermediário
  {
    level: 20,
    category: 'Cálculo',
    question: 'A soma de dois números é 60. Um deles é o dobro do outro. Quais são esses números?',
    options: ['20 e 40', '15 e 45', '30 e 30', '10 e 50'],
    answer: '20 e 40',
    explanation: 'Dividimos o total em 3 partes iguais (pois um é o dobro: 1 parte + 2 partes = 3 partes). 60 / 3 = 20. As partes são 20 e 40.'
  },
  {
    level: 30,
    category: 'Geometria',
    question: 'Um retângulo de 6 cm de largura e 8 cm de comprimento é cortado ao meio seguindo uma linha diagonal. Qual é a área de cada um dos triângulos resultantes?',
    options: ['12 cm²', '24 cm²', '48 cm²', '14 cm²'],
    answer: '24 cm²',
    explanation: 'A área do retângulo é largura x comprimento = 6 x 8 = 48 cm². Cortado ao meio pela diagonal, cada triângulo terá metade da área: 48 / 2 = 24 cm².'
  },
  {
    level: 40,
    category: 'Lógica',
    question: 'Quatro amigos estão em fila. Lucas não é o primeiro. Sofia está logo atrás de Lucas. Pedro é o último. Onde está o Gabriel?',
    options: ['Primeiro', 'Segundo', 'Terceiro', 'Quarto'],
    answer: 'Primeiro',
    explanation: 'Pedro é o 4º. Lucas não é o 1º, e Sofia está atrás dele, então Lucas só pode ser o 2º e Sofia a 3ª. Sobra o 1º lugar para Gabriel.'
  },
  {
    level: 50,
    category: 'Problemas',
    question: 'Em uma olimpíada, cada resposta certa soma 5 pontos e cada resposta errada retira 2 pontos. Se Bia respondeu 10 questões e obteve 29 pontos, quantas ela acertou?',
    options: ['5', '6', '7', '8'],
    answer: '7',
    explanation: 'Se acertasse 7 e errasse 3: (7 x 5) - (3 x 2) = 35 - 6 = 29 pontos. Perfeito!'
  },
  // Levels 50-100: Nível 3 - Olímpico (OBMEP Nível Inicial)
  {
    level: 60,
    category: 'Problemas',
    question: 'Um sapo sobe uma escada de 10 degraus. A cada movimento, ele sobe 2 degraus e escorrega 1 degrau para baixo. Quantos movimentos ele fará para pisar no topo?',
    options: ['8 movimentos', '9 movimentos', '10 movimentos', '18 movimentos'],
    answer: '9 movimentos',
    explanation: 'A cada salto ele sobe de fato 1 degrau (2 - 1 = 1). No 8º salto ele estará no degrau 8. No 9º salto, ele pula 2 degraus, atinge o degrau 10 (topo) e não escorrega mais.'
  },
  {
    level: 70,
    category: 'Padrões',
    question: 'Uma tira de papel quadriculado tem números de 1 a 100. Dobramos ela de modo que o número 3 fique exatamente em cima do 97. Qual número ficará em cima do 20?',
    options: ['70', '77', '80', '83'],
    answer: '80',
    explanation: 'A dobra espelha os números cuja soma é igual: 3 + 97 = 100. Para o 20, procuramos o par que somado dê 100: 100 - 20 = 80.'
  },
  {
    level: 80,
    category: 'Geometria',
    question: 'Em uma caixa cúbica de tamanho 3x3x3 cabem quantos cubinhos pequenos de tamanho 1x1x1?',
    options: ['9', '18', '27', '36'],
    answer: '27',
    explanation: 'Calculamos o volume multiplicando as três dimensões: 3 x 3 x 3 = 27 cubinhos.'
  },
  {
    level: 90,
    category: 'Lógica',
    question: 'Três caixas contêm doces. Uma tem apenas balas, outra apenas chocolates, e a terceira tem balas e chocolates misturados. Todas as etiquetas das caixas estão trocadas. Para descobrir o conteúdo correto de todas, quantas balas você precisa tirar no mínimo de uma caixa?',
    options: ['1 bala da caixa misturada', '1 bala de qualquer caixa', '3 balas de caixas diferentes', 'Não há como descobrir'],
    answer: '1 bala da caixa misturada',
    explanation: 'Como todas as etiquetas estão erradas, se você abrir a caixa com a etiqueta "Misto" e tirar um doce (por exemplo, bala), ela obrigatoriamente é a caixa de balas pura. As outras duas são deduzidas por eliminação.'
  },
  {
    level: 100,
    category: 'Problemas',
    question: 'A soma de 5 números inteiros consecutivos é igual a 100. Qual é o maior desses cinco números?',
    options: ['20', '21', '22', '24'],
    answer: '22',
    explanation: 'Se a soma de 5 números consecutivos é 100, a média deles (o termo do meio) é 100 / 5 = 20. Sendo consecutivos, os números são 18, 19, 20, 21 e 22. O maior é 22.'
  }
];

export const Olympics: React.FC<OlympicsProps> = ({
  gameState,
  onBack,
  onStateUpdate,
}) => {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  
  // Statistics and Report parameters
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [dimensionScores, setDimensionScores] = useState<Record<string, { total: number; correct: number }>>({
    'Cálculo': { total: 0, correct: 0 },
    'Lógica': { total: 0, correct: 0 },
    'Padrões': { total: 0, correct: 0 },
    'Geometria': { total: 0, correct: 0 },
    'Problemas': { total: 0, correct: 0 }
  });
  
  // Track start time for Average time metric
  const [startTime] = useState<number>(Date.now());
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);

  // Find question matching the active level range
  const getQuestionForLevel = (lvl: number): OlympicQuestion => {
    // Sort database by proximity to active level
    const sorted = [...OLYMPIC_DATABASE].sort((a, b) => Math.abs(a.level - lvl) - Math.abs(b.level - lvl));
    return sorted[0];
  };

  const activeQuestion = getQuestionForLevel(currentLevel);

  const handleOptionSelect = (opt: string) => {
    if (answerSubmitted) return;
    setSelectedOption(opt);
  };

  const handleSubmit = () => {
    if (!selectedOption || answerSubmitted) return;
    
    const correct = selectedOption === activeQuestion.answer;
    setIsCorrect(correct);
    setAnswerSubmitted(true);
    setTotalAnswered(prev => prev + 1);
    
    if (correct) {
      audioEngine.playHatchSuccess();
      setCorrectAnswers(prev => prev + 1);
    } else {
      audioEngine.playError();
    }

    // Update Dimensions statistics
    setDimensionScores(prev => {
      const cat = activeQuestion.category;
      return {
        ...prev,
        [cat]: {
          total: prev[cat].total + 1,
          correct: prev[cat].correct + (correct ? 1 : 0)
        }
      };
    });
  };

  const handleNext = () => {
    // Accumulate time spent
    setTotalTimeSpent(prev => prev + Math.round((Date.now() - startTime) / 1000));
    
    // Reward player with gems for progress
    if (isCorrect) {
      const rewardGems = Math.max(1, Math.round(activeQuestion.level * 0.1));
      onStateUpdate({
        ...gameState,
        gems: gameState.gems + rewardGems
      });
    }

    // Advance level
    if (currentLevel < 100) {
      setCurrentLevel(prev => prev + 5); // Skip levels for rapid prototype simulation
    }
    
    // Reset state
    setSelectedOption(null);
    setAnswerSubmitted(false);
  };

  // Dimension Calculations
  const calculateDimensionPercentage = (cat: string) => {
    const score = dimensionScores[cat];
    if (score.total === 0) return 100; // default initial score
    return Math.round((score.correct / score.total) * 100);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', minHeight: '90vh', color: '#fff' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="text-glow-yellow" style={{ fontSize: '1.8rem', color: 'var(--neon-yellow)', margin: 0 }}>
            🏆 Olimpíadas dos Deuses
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0 0' }}>
            Preparatório Oficial OBMEP & Olimpíadas Científicas Nacionais
          </p>
        </div>
        <button className="cyber-btn cyber-btn-pink" onClick={onBack} style={{ padding: '8px 16px' }}>
          Voltar ao Hub
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        
        {/* Left Section: Active Olympic Question */}
        <div>
          {currentLevel > 100 ? (
            <div className="cyber-card" style={{ borderColor: 'var(--neon-yellow)', textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>👑</div>
              <h2 className="text-glow-yellow" style={{ color: 'var(--neon-yellow)', fontSize: '1.6rem' }}>Olimpíada Concluída!</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                Parabéns! Você concluiu todos os níveis preparatórios da Olimpíada dos Deuses!
              </p>
            </div>
          ) : (
            <div className="cyber-card" style={{ borderColor: 'var(--neon-yellow)', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              
              {/* Question Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--neon-yellow)', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    {activeQuestion.category.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                    Nível do Templo: <strong>{currentLevel} / 100</strong>
                  </span>
                </div>

                {/* Question Text */}
                <h3 style={{ fontSize: '1.15rem', lineHeight: '1.6rem', color: '#fff', marginBottom: '20px' }}>
                  {activeQuestion.question}
                </h3>

                {/* Interactive Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedbacks and Submission action */}
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
                      {isCorrect ? '✔️ Excelente! Resposta correta!' : `❌ Resposta incorreta. A resposta certa era: ${activeQuestion.answer}`}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: '16px' }}>
                      <strong>Explicação Pedagógica:</strong> {activeQuestion.explanation}
                    </p>
                    <button className="cyber-btn cyber-btn-cyan" onClick={handleNext} style={{ width: '100%', padding: '12px' }}>
                      Avançar para o Próximo Templo ➔
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
          )}
        </div>

        {/* Right Section: Olympic Competency Metrics & Report Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Diagnostic report card */}
          <div className="cyber-card" style={{ borderColor: 'var(--neon-cyan)', background: 'rgba(6, 182, 212, 0.02)' }}>
            <h3 className="text-glow-cyan" style={{ fontSize: '1.1rem', color: 'var(--neon-cyan)', borderBottom: '1px solid rgba(6, 182, 212, 0.2)', paddingBottom: '8px', marginBottom: '16px' }}>
              📊 Relatório de Desempenho
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { name: 'Cálculo', weight: 20 },
                { name: 'Padrões', weight: 20 },
                { name: 'Lógica', weight: 25 },
                { name: 'Geometria', weight: 15 },
                { name: 'Problemas', weight: 20 }
              ].map(dim => {
                const percentage = calculateDimensionPercentage(dim.name);
                let color = 'var(--neon-cyan)';
                if (percentage < 50) color = 'var(--neon-pink)';
                else if (percentage < 80) color = 'var(--neon-yellow)';

                return (
                  <div key={dim.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span>{dim.name} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>({dim.weight}%)</span></span>
                      <strong style={{ color }}>{percentage}%</strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* General stats metrics */}
            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Respondido:</span>
                <strong style={{ color: '#fff' }}>{totalAnswered} questões</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taxa de Acertos:</span>
                <strong style={{ color: 'var(--neon-yellow)' }}>
                  {totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0}%
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tempo Médio por Questão:</span>
                <strong style={{ color: 'var(--neon-cyan)' }}>
                  {totalAnswered > 0 ? Math.round(totalTimeSpent / totalAnswered) : 0} segundos
                </strong>
              </div>
            </div>

          </div>

          {/* Guidelines details */}
          <div className="cyber-card" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '8px' }}>💡 Dica do Templo</h4>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.2rem', margin: 0 }}>
              Diferente da escola tradicional, as olimpíadas exigem modelagem e criatividade! Não tenha pressa para chutar; analise o padrão ou desenhe a situação se necessário.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
export default Olympics;
