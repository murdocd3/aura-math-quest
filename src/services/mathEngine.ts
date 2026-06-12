import { mockDb } from './mockDb';

export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface Question {
  num1: number;
  num2: number;
  answer: number;
  choices: number[];
  key: string;
  isWeakPoint?: boolean;
  op?: Operation;
}

export const getOperationSymbol = (op: Operation): string => {
  switch (op) {
    case 'addition': return '+';
    case 'subtraction': return '-';
    case 'multiplication': return '×';
    case 'division': return '÷';
    default: return '×';
  }
};

export const getCampaignOp = (stageId: number): Operation => {
  const stageIndex = (stageId - 1) % 5;
  switch (stageIndex) {
    case 0: return 'addition';
    case 1: return 'subtraction';
    case 2: return 'division';
    case 3: return 'multiplication';
    case 4: {
      const ops: Operation[] = ['addition', 'subtraction', 'multiplication', 'division'];
      return ops[Math.floor(Math.random() * ops.length)];
    }
    default: return 'multiplication';
  }
};

export const generateQuestion = (
  userId: string,
  selectedOperation: Operation,
  currentStreak: number,
  campaignStageId?: number | null,
  bossOp?: Operation | null
): Question => {
  let num1 = 2;
  let num2 = 2;
  let isWeakPoint = false;
  let op: Operation = (bossOp || selectedOperation || 'multiplication');
  if (campaignStageId && !bossOp) {
    op = getCampaignOp(campaignStageId);
  }
  const opSym = getOperationSymbol(op);

  // If campaignStageId is active, fall back to cycle-based stage question generation
  if (campaignStageId) {
    const cycle = Math.floor((campaignStageId - 1) / 5) + 1;
    const streakBonus = 1 + Math.floor(currentStreak / 3) * 0.15;
    let opLevelBonus = 1.0;
    try {
      const stats = mockDb.getMathStats(userId);
      const opStats = stats.filter(s => {
        const hasLegacyX = s.questionKey.includes('x') && op === 'multiplication';
        const hasOpSym = s.questionKey.includes(opSym);
        return hasLegacyX || hasOpSym;
      });
      const totalCorrect = opStats.reduce((sum: number, s: any) => sum + s.correctCount, 0);
      const opLevel = Math.min(10, 1 + Math.floor(totalCorrect / 15));
      opLevelBonus = 1 + (opLevel - 1) * 0.15;
    } catch (e) {
      console.warn('Error calculating opLevel:', e);
    }

    const difficultyMultiplier = (1 + (cycle - 1) * 0.5) * streakBonus * opLevelBonus;
    let answer = 0;

    if (op === 'addition') {
      const maxVal = Math.round(15 * difficultyMultiplier);
      num1 = Math.floor(Math.random() * (maxVal - 1)) + 2;
      num2 = Math.floor(Math.random() * (maxVal - 1)) + 2;
      answer = num1 + num2;
    } else if (op === 'subtraction') {
      const maxVal = Math.round(30 * difficultyMultiplier);
      num1 = Math.floor(Math.random() * (maxVal - 4)) + 5;
      num2 = Math.floor(Math.random() * (num1 - 2)) + 2;
      answer = num1 - num2;
    } else if (op === 'division') {
      const divisors = [2, 3, 4, 5].map(d => Math.round(d * (1 + (cycle - 1) * 0.2)));
      const divisor = divisors[Math.floor(Math.random() * divisors.length)];
      const maxQuotient = Math.round(10 * difficultyMultiplier);
      const quotient = Math.floor(Math.random() * (maxQuotient - 1)) + 2;
      num1 = divisor * quotient;
      num2 = divisor;
      answer = quotient;
    } else {
      const tables = [2, 3, 4, 5].map(t => Math.round(t * (1 + (cycle - 1) * 0.2)));
      num1 = tables[Math.floor(Math.random() * tables.length)];
      const maxFactor = Math.round(9 * difficultyMultiplier);
      num2 = Math.floor(Math.random() * (maxFactor - 1)) + 2;
      answer = num1 * num2;
    }

    const key = op === 'multiplication' ? `${num1}x${num2}` : `${num1}${opSym}${num2}`;
    const choices = new Set<number>([answer]);
    while (choices.size < 4) {
      let fakeAnswer = 0;
      if (op === 'multiplication') {
        const offset = (Math.floor(Math.random() * 5) - 2) * num1;
        fakeAnswer = answer + (offset === 0 ? num1 : offset);
      } else if (op === 'division') {
        const offset = Math.floor(Math.random() * 5) - 2;
        fakeAnswer = answer + (offset === 0 ? 3 : offset);
      } else if (op === 'addition' || op === 'subtraction') {
        const offset = Math.floor(Math.random() * 7) - 3;
        fakeAnswer = answer + (offset === 0 ? 4 : offset);
      } else {
        fakeAnswer = answer + Math.floor(Math.random() * 15) + 1;
      }

      if (fakeAnswer > 0 && fakeAnswer !== answer) {
        choices.add(fakeAnswer);
      } else {
        choices.add(answer + Math.floor(Math.random() * 15) + 1);
      }
    }

    return {
      num1,
      num2,
      answer,
      choices: Array.from(choices).sort(() => Math.random() - 0.5),
      key,
      isWeakPoint: false,
      op,
    };
  }

  // Unified Adaptive World logic!
  try {
    const stats = mockDb.getMathStats(userId);
    const progress = mockDb.getMathProgress(userId, op);
    const rand = Math.random();

    // 40% Chance: Active Difficulties (SRS Review Queue)
    if (rand < 0.40) {
      const weakSpots = stats.filter(s => {
        const isMatchOp = op === 'addition' ? s.questionKey.includes('+') :
                          op === 'subtraction' ? s.questionKey.includes('-') :
                          op === 'multiplication' ? (s.questionKey.includes('x') || s.questionKey.includes('*')) :
                          (s.questionKey.includes('/') || s.questionKey.includes('÷'));
        if (!isMatchOp) return false;
        
        const parts = s.questionKey.split(/[\+\-\*x\/÷]/);
        const n1 = parseInt(parts[0]);
        const n2 = parseInt(parts[1] || '0');
        if (isNaN(n1)) return false;

        let isUnlocked = false;
        if (op === 'multiplication' || op === 'division') {
          const h = op === 'multiplication' ? n1 : n2;
          isUnlocked = progress.unlockedList.includes(h);
        } else {
          if (op === 'addition') {
            const sum = n1 + n2;
            const tier = sum <= 20 ? 1 : sum <= 50 ? 2 : sum <= 100 ? 3 : sum <= 200 ? 4 : 5;
            isUnlocked = progress.unlockedList.includes(tier);
          } else {
            const tier = n1 <= 10 ? 1 : n1 <= 30 ? 2 : n1 <= 60 ? 3 : n1 <= 120 ? 4 : 5;
            isUnlocked = progress.unlockedList.includes(tier);
          }
        }

        const total = s.correctCount + s.errorCount;
        const isWeak = s.errorCount >= 2 || (total > 0 && (s.correctCount / total) < 0.70);
        return isWeak && isUnlocked;
      });

      if (weakSpots.length > 0) {
        const chosen = weakSpots[Math.floor(Math.random() * weakSpots.length)];
        const parts = chosen.questionKey.split(/[\+\-\*x\/÷]/);
        num1 = parseInt(parts[0]);
        num2 = parseInt(parts[1]);
        isWeakPoint = true;
      }
    }

    // 20% Chance: Retention Checks (from masteredList)
    let isRetention = false;
    if (!isWeakPoint && rand >= 0.40 && rand < 0.60 && progress.masteredList.length > 0) {
      const masteredVal = progress.masteredList[Math.floor(Math.random() * progress.masteredList.length)];
      if (op === 'multiplication') {
        num1 = masteredVal;
        num2 = Math.floor(Math.random() * 8) + 2; // 2..9
        isRetention = true;
      } else if (op === 'division') {
        num2 = masteredVal; // divisor
        num1 = num2 * (Math.floor(Math.random() * 8) + 2); // dividend
        isRetention = true;
      } else if (op === 'addition') {
        const rangeMax = masteredVal === 1 ? 20 : masteredVal === 2 ? 50 : masteredVal === 3 ? 100 : masteredVal === 4 ? 200 : 1000;
        const rangeMin = masteredVal === 1 ? 4 : masteredVal === 2 ? 21 : masteredVal === 3 ? 51 : masteredVal === 4 ? 101 : 201;
        const sumTarget = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
        num1 = Math.floor(Math.random() * (sumTarget - 2)) + 2;
        num2 = sumTarget - num1;
        isRetention = true;
      } else if (op === 'subtraction') {
        const rangeMax = masteredVal === 1 ? 10 : masteredVal === 2 ? 30 : masteredVal === 3 ? 60 : masteredVal === 4 ? 120 : 1000;
        const rangeMin = masteredVal === 1 ? 4 : masteredVal === 2 ? 11 : masteredVal === 3 ? 31 : masteredVal === 4 ? 61 : 121;
        num1 = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
        num2 = Math.floor(Math.random() * (num1 - 2)) + 2;
        isRetention = true;
      }
    }

    // 40% Chance (Learning Frontier) or Fallback
    if (!isWeakPoint && !isRetention) {
      const active = progress.currentTier;
      const masteredAll = progress.masteredList.length >= (op === 'multiplication' || op === 'division' ? 9 : 5); // 2..10 are 9 houses, 1..5 are 5 tiers

      if (op === 'multiplication') {
        if (masteredAll) {
          num1 = Math.floor(Math.random() * 10) + 11; // 11..20
          num2 = Math.floor(Math.random() * 11) + 2;  // 2..12
        } else {
          num1 = active;
          num2 = Math.floor(Math.random() * 8) + 2;  // 2..9
        }
      } else if (op === 'division') {
        if (masteredAll) {
          num2 = Math.floor(Math.random() * 10) + 11;
          num1 = num2 * (Math.floor(Math.random() * 11) + 2);
        } else {
          num2 = active;
          num1 = num2 * (Math.floor(Math.random() * 8) + 2);
        }
      } else if (op === 'addition') {
        const rangeMax = active === 1 ? 20 : active === 2 ? 50 : active === 3 ? 100 : active === 4 ? 200 : masteredAll ? 5000 : 1000;
        const rangeMin = active === 1 ? 4 : active === 2 ? 21 : active === 3 ? 51 : active === 4 ? 101 : 201;
        const sumTarget = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
        num1 = Math.floor(Math.random() * (sumTarget - 2)) + 2;
        num2 = sumTarget - num1;
      } else if (op === 'subtraction') {
        const rangeMax = active === 1 ? 10 : active === 2 ? 30 : active === 3 ? 60 : active === 4 ? 120 : masteredAll ? 5000 : 1000;
        const rangeMin = active === 1 ? 4 : active === 2 ? 11 : active === 3 ? 31 : active === 4 ? 61 : 121;
        num1 = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
        num2 = Math.floor(Math.random() * (num1 - 2)) + 2;
      }
    }
  } catch (e) {
    console.warn('Error generating adaptive question, using basic fallback:', e);
    num1 = Math.floor(Math.random() * 8) + 2;
    num2 = Math.floor(Math.random() * 8) + 2;
  }

  let answer = 0;
  if (op === 'addition') answer = num1 + num2;
  else if (op === 'subtraction') answer = num1 - num2;
  else if (op === 'division') answer = Math.round(num1 / num2);
  else answer = num1 * num2;

  const key = op === 'multiplication' ? `${num1}x${num2}` : `${num1}${opSym}${num2}`;

  const choices = new Set<number>([answer]);
  while (choices.size < 4) {
    let fakeAnswer = 0;
    if (op === 'multiplication') {
      const offset = (Math.floor(Math.random() * 5) - 2) * num1;
      fakeAnswer = answer + (offset === 0 ? num1 : offset);
    } else if (op === 'division') {
      const offset = Math.floor(Math.random() * 5) - 2;
      fakeAnswer = answer + (offset === 0 ? 3 : offset);
    } else if (op === 'addition' || op === 'subtraction') {
      const offset = Math.floor(Math.random() * 7) - 3;
      fakeAnswer = answer + (offset === 0 ? 4 : offset);
    } else {
      fakeAnswer = answer + Math.floor(Math.random() * 15) + 1;
    }

    if (fakeAnswer > 0 && fakeAnswer !== answer) {
      choices.add(fakeAnswer);
    } else {
      choices.add(answer + Math.floor(Math.random() * 15) + 1);
    }
  }

  return {
    num1,
    num2,
    answer,
    choices: Array.from(choices).sort(() => Math.random() - 0.5),
    key,
    isWeakPoint,
    op,
  };
};

export const getPedagogicalExplanation = (q: Question): string => {
  const op = q.op || 'multiplication';
  if (op === 'addition') {
    return `💡 Explicando: Para somar ${q.num1} e ${q.num2}, junte as duas partes. Pense em começar no ${q.num1} e contar mais ${q.num2} números adiante: ${q.num1} + ${q.num2} = ${q.answer}.`;
  }
  if (op === 'subtraction') {
    return `💡 Explicando: Subtrair significa diminuir ou tirar. Se você tem ${q.num1} e retira ${q.num2}, restam ${q.answer}. Você pode testar somando: ${q.answer} + ${q.num2} = ${q.num1}.`;
  }
  if (op === 'multiplication') {
    const sumRepresentation = Array(Math.min(q.num1, 10)).fill(q.num2).join(' + ') + (q.num1 > 10 ? ' + ...' : '');
    return `💡 Explicando: Multiplicação é somar parcelas iguais! ${q.num1} × ${q.num2} quer dizer somar o número ${q.num2} por ${q.num1} vezes consecutivas: ${sumRepresentation} = ${q.answer}.`;
  }
  if (op === 'division') {
    return `💡 Explicando: Dividir é repartir de forma justa! Se você dividir ${q.num1} em ${q.num2} partes iguais, cada uma terá exatamente ${q.answer}. Lembre-se: ${q.answer} × ${q.num2} = ${q.num1}!`;
  }
  return '';
};

export const getPedagogicalHint = (q: Question): string => {
  const op = q.op || 'multiplication';
  if (op === 'addition') {
    if (q.num1 % 10 === 9 || q.num2 % 10 === 9 || q.num1 % 10 === 8 || q.num2 % 10 === 8) {
      return `💡 Dica de Raciocínio: Um dos números está quase terminando em 10! Tente arredondar ele para a dezena mais próxima somando 1 ou 2, some os números, e depois subtraia essa mesma quantidade no final.`;
    }
    return `💡 Dica de Raciocínio: Use a decomposição! Some primeiro as dezenas de cada número (ex: ${Math.floor(q.num1/10)*10} + ${Math.floor(q.num2/10)*10}) e depois as unidades (${q.num1 % 10} + ${q.num2 % 10}). Depois, junte as duas somas!`;
  }
  if (op === 'subtraction') {
    return `💡 Dica de Raciocínio: Pense de trás para frente! Comece no número menor (${q.num2}) e conte quanto falta para chegar no número maior (${q.num1}). Primeiro vá até a dezena mais próxima, depois até o valor final.`;
  }
  if (op === 'multiplication') {
    if (q.num1 === 9 || q.num2 === 9) {
      return `💡 Dica de Raciocínio: Multiplicar por 9 é o mesmo que multiplicar por 10 e depois tirar o outro número uma vez! Exemplo: para 9 x X, pense em (10 x X) - X.`;
    }
    if (q.num1 % 2 === 0) {
      return `💡 Dica de Raciocínio: Truque da metade! Se você achar difícil multiplicar ${q.num1} por ${q.num2}, pense em multiplicar a metade de ${q.num1} (que é ${q.num1 / 2}) por ${q.num2}, e depois dobre o resultado!`;
    }
    if (q.num2 % 2 === 0) {
      return `💡 Dica de Raciocínio: Truque da metade! Se você achar difícil multiplicar ${q.num1} por ${q.num2}, pense em multiplicar ${q.num1} pela metade de ${q.num2} (que é ${q.num2 / 2}), e depois dobre o resultado!`;
    }
    return `💡 Dica de Raciocínio: Use um ponto de partida conhecido. Por exemplo, use a tabuada do 5 (que é mais fácil) e depois adicione as partes que faltam!`;
  }
  if (op === 'division') {
    return `💡 Dica de Raciocínio: Use a operação inversa! Pergunte a si mesmo: qual número que, se multiplicado por ${q.num2}, resulta exatamente in ${q.num1}? (Pense na tabuada de multiplicação de ${q.num2}!)`;
  }
  return '';
};
