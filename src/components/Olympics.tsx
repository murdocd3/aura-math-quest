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
  origin?: string;
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
    explanation: 'Vamos desvendar esse enigma juntos! 🕵️‍♂️\n1) A Carla veste verde. Então, as cores azul e vermelha sobram para a Ana e a Beatriz.\n2) O enigma diz que a Ana não veste vermelho. Se ela não veste vermelho, ela só pode vestir azul!\n3) Agora só sobrou a cor vermelha para a Beatriz. Que legal!'
  },
  {
    level: 2,
    category: 'Geometria Visual',
    question: 'Nícolas tem duas peças de papelão formato retangular com medidas 3 cm por 4 cm. Ele junta essas duas peças de várias formas sem sobreposição. Qual das seguintes figuras NÃO pode ser formada por essas duas peças?',
    options: ['Retângulo de 3 cm por 8 cm', 'Retângulo de 6 cm por 4 cm', 'Retângulo de 6 cm por 8 cm', 'Uma figura em formato de L com lados alternados'],
    answer: 'Retângulo de 6 cm por 8 cm',
    explanation: 'Imagine que cada pedacinho de papelão é feito de quadradinhos! ⬜\n1) Um retângulo de 3 cm por 4 cm tem 12 quadradinhos (3 x 4 = 12).\n2) Como temos duas peças, temos no total 12 + 12 = 24 quadradinhos para brincar.\n3) Se tentarmos montar um retângulo grande de 6 cm por 8 cm, precisaríamos de 48 quadradinhos (6 x 8 = 48).\n4) Como só temos 24 quadradinhos no total, é impossível montar essa figura gigante!',
    origin: 'OBMEP 2023 (Nível 1)'
  },
  {
    level: 3,
    category: 'Cálculo Mental',
    question: 'Um sorvete custa 6 reais. Se você comprar 4 sorvetes e pagar com uma nota de 50 reais, quanto receberá de troco?',
    options: ['24 reais', '26 reais', '30 reais', '34 reais'],
    answer: '26 reais',
    explanation: 'Vamos calcular as moedas no bolso! 🍦\n1) Se cada sorvete custa 6 reais e você compra 4, o total gasto é: 6 + 6 + 6 + 6 = 24 reais (ou 4 x 6 = 24).\n2) Você pagou com uma nota de 50 reais.\n3) Para descobrir o troco, fazemos a continha de menos: 50 - 24 = 26 reais. Prontinho!',
    origin: 'Canguru Matemático'
  },
  {
    level: 4,
    category: 'Resolução de Problemas',
    question: 'Vítor tem uma fita adesiva de 1 metro de comprimento. Ele usou pedaços de 15 centímetros para fechar caixas de presente. Qual é o maior número de caixas de presente que ele conseguiu fechar com essa fita?',
    options: ['5 caixas', '6 caixas', '7 caixas', '8 caixas'],
    answer: '6 caixas',
    explanation: 'Vamos medir com atenção! 📏\n1) Primeiro, lembre-se de que 1 metro é a mesma coisa que 100 centímetros.\n2) Cada caixa de presente precisa de 15 centímetros de fita.\n3) Vamos somando de 15 em 15 para ver quantas caixas conseguimos fechar: 15, 30, 45, 60, 75, 90... Se tentarmos mais uma, daria 105 centímetros, o que passa do tamanho da fita!\n4) Então conseguimos fechar exatamente 6 caixas de presente e ainda sobram 10 centímetros de fita.',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 5,
    category: 'Reconhecimento de Padrões',
    question: 'Observe a sequência de figuras formadas por palitos: Figura 1 tem 4 palitos (um quadrado). Figura 2 tem 7 palitos (dois quadrados grudados). Quantos palitos terá a Figura 4?',
    options: ['10 palitos', '11 palitos', '13 palitos', '14 palitos'],
    answer: '13 palitos',
    explanation: 'Vamos contar os palitos com cuidado! 🥢\n1) A Figura 1 tem 4 palitos (forma 1 quadrado).\n2) Para fazer a Figura 2, grudamos mais um quadrado ao lado. Como eles compartilham uma parede de palito, precisamos só de mais 3 palitos (4 + 3 = 7).\n3) Para a Figura 3, somamos mais 3 palitos: 7 + 3 = 10.\n4) E para a Figura 4, somamos mais 3 palitos: 10 + 3 = 13 palitos!'
  },
  {
    level: 6,
    category: 'Reconhecimento de Padrões',
    question: 'Em uma fila de 10 pessoas, cada um a partir do segundo na fila tem 2 anos a mais que o anterior. Se a primeira pessoa da fila tem 8 anos, qual é a idade da última pessoa da fila?',
    options: ['24 anos', '26 anos', '28 anos', '30 anos'],
    answer: '26 anos',
    explanation: 'Vamos contar as idades na fila! 🧑‍🤝‍🧑\n1) A primeira pessoa tem 8 anos.\n2) A cada passo na fila, a próxima pessoa tem 2 anos a mais: a 2ª tem 10 anos, a 3ª tem 12 anos, e assim por diante.\n3) Para chegar até a 10ª pessoa (o último da fila), nós damos 9 pulos de 2 anos a partir do primeiro.\n4) Multiplicamos esses pulos: 9 x 2 = 18 anos de diferença.\n5) Somamos isso à idade do primeiro: 8 + 18 = 26 anos!',
    origin: 'OBMEP 2017 (Nível 1)'
  },
  {
    level: 7,
    category: 'Resolução de Problemas',
    question: 'Para pintar um muro, 3 pintores levam 6 dias. Quantos dias levariam 9 pintores para pintar o mesmo muro no mesmo ritmo?',
    options: ['2 dias', '3 dias', '4 dias', '18 dias'],
    answer: '2 dias',
    explanation: 'Pense em trabalho em equipe! 🎨\n1) 3 pintores trabalhando juntos levam 6 dias.\n2) Se tivermos 9 pintores, temos 3 vezes mais mãos ajudando (pois 3 x 3 = 9).\n3) Como há muito mais gente ajudando, o trabalho será feito 3 vezes mais rápido!\n4) Dividimos o tempo inicial por 3: 6 dias dividido por 3 é igual a 2 dias.',
    origin: 'Olimpíada de Maio'
  },
  {
    level: 8,
    category: 'Geometria Visual',
    question: 'Na malha quadriculada de quadradinhos de 1 cm x 1 cm, desenhamos uma letra O estilizada constituída por uma moldura externa de 4 cm x 4 cm de onde foi retirado um quadrado central de 2 cm x 2 cm. Qual é a área dessa letra O?',
    options: ['8 cm²', '12 cm²', '14 cm²', '16 cm²'],
    answer: '12 cm²',
    explanation: 'Vamos montar essa letra O cortando papel! ✂️\n1) Imagine um quadrado de papelão grande de 4 cm por 4 cm. A área dele é: 4 x 4 = 16 quadradinhos (ou cm²).\n2) Agora, recortamos um quadrado menor bem no meio dele de 2 cm por 2 cm. A área recortada é: 2 x 2 = 4 quadradinhos.\n3) Para saber a área que sobrou (que forma a letra O), tiramos o quadradinho do meio: 16 - 4 = 12 cm².',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 9,
    category: 'Resolução de Problemas',
    question: 'Um suco de laranja é feito misturando-se 2 copos de suco concentrado com 5 copos de água. Para fazer uma jarra maior mantendo o mesmo sabor, quantos copos de água devem ser misturados com 6 copos de suco concentrado?',
    options: ['10 copos de água', '12 copos de água', '15 copos de água', '18 copos de água'],
    answer: '15 copos de água',
    explanation: 'Vamos preparar um suco delicioso! 🍹\n1) A receita diz que para cada 2 copos de suco concentrado, precisamos de 5 copos de água.\n2) Se agora vamos usar 6 copos de suco concentrado, isso é o triplo da receita original (pois 2 x 3 = 6).\n3) Para manter o sabor gostoso sem ficar fraco nem forte, precisamos triplicar a água também!\n4) Multiplicamos a água por 3: 5 copos x 3 = 15 copos de água.',
    origin: 'OBMEP 2018 (Nível A)'
  },
  {
    level: 10,
    category: 'Resolução de Problemas',
    question: 'Beto comprou um brinquedo por 35 reais and pagou com uma nota de 50 reais. Ele recebeu o troco em moedas de 5 reais. Quantas moedas ele recebeu?',
    options: ['2 moedas', '3 moedas', '4 moedas', '5 moedas'],
    answer: '3 moedas',
    explanation: 'Vamos fazer compras! 🪙\n1) Beto pagou 50 reais por um brinquedo de 35 reais.\n2) O troco que ele deve receber é: 50 - 35 = 15 reais.\n3) Como ele recebeu todo o troco em moedas de 5 reais, vamos contar de 5 em 5 até chegar a 15: 5, 10, 15! Isso dá exatamente 3 moedas de 5 reais (15 dividido por 5 = 3).'
  },
  {
    level: 11,
    category: 'Reconhecimento de Padrões',
    question: 'Sofia escreveu uma palavra repetidamente: AURAURAURA... seguindo o mesmo padrão de repetição. Qual será a 50ª letra escrita por Sofia?',
    options: ['A', 'U', 'R', 'Não é possível saber'],
    answer: 'U',
    explanation: 'Olha que padrão legal! 🌀\n1) Sofia repete sempre o mesmo grupinho de 3 letras: "A", "U", "R".\n2) Para saber qual é a 50ª letra, dividimos 50 por 3. Isso dá 16 repetições completas do grupinho e sobram 2 letras de resto (16 x 3 = 48 letras, mais as 2 de sobra = 50).\n3) Essas 2 letras que sobram representam o início do próximo grupo: a 1ª letra é "A" e a 2ª letra é "U".\n4) Portanto, a 50ª letra é "U"!',
    origin: 'OBMEP 2021 (Nível A)'
  },
  {
    level: 12,
    category: 'Lógica Matemática',
    question: 'A formiguinha da OBMEP quer andar do ponto A (canto inferior esquerdo) ao ponto B (canto superior direito) seguindo as linhas de uma grade de 2x2. Ela só pode andar para a direita ou para cima. De quantas maneiras diferentes ela pode fazer esse trajeto?',
    options: ['4 caminhos', '6 caminhos', '8 caminhos', '10 caminhos'],
    answer: '6 caminhos',
    explanation: 'Imagine o caminho da formiguinha como setas! Ela só pode andar para a Direita (👉) e para Cima (👆) e precisa dar exatamente 4 passos no total.\nVamos listar todas as opções de caminhos possíveis:\n1. 👉👉👆👆 (Direita, Direita, Cima, Cima)\n2. 👉👆👉👆 (Direita, Cima, Direita, Cima)\n3. 👉👆👆👉 (Direita, Cima, Cima, Direita)\n4. 👆👉👉👆 (Cima, Direita, Direita, Cima)\n5. 👆👉👆👉 (Cima, Direita, Cima, Direita)\n6. 👆👆👉👉 (Cima, Cima, Direita, Direita)\nContando todas elas, são exatamente 6 caminhos divertidos!',
    origin: 'OBMEP 2022 (Nível 1)'
  },
  {
    level: 13,
    category: 'Reconhecimento de Padrões',
    question: 'Qual é o próximo número na sequência numérica: 2, 4, 8, 16, 32, ...?',
    options: ['40', '48', '64', '80'],
    answer: '64',
    explanation: 'Essa sequência é um jogo de dobrar! ✖️2\n1) O primeiro número é 2.\n2) O próximo é o dobro dele: 2 x 2 = 4.\n3) O próximo é o dobro de 4: 4 x 2 = 8.\n4) O próximo é o dobro de 8: 8 x 2 = 16.\n5) O próximo é o dobro de 16: 16 x 2 = 32.\n6) Para achar o próximo, dobramos o 32: 32 x 2 = 64!',
    origin: 'Canguru Matemático'
  },
  {
    level: 14,
    category: 'Atenção aos Detalhes',
    question: 'Joãozinho escreveu os números de 1 a 20 em uma folha. Ele apagou todos os números pares e, em seguida, apagou todos os múltiplos de 3 que restaram. Quantos números sobraram escritos na folha?',
    options: ['7 números', '8 números', '9 números', '10 números'],
    answer: '7 números',
    explanation: 'Vamos brincar de detetive de números! 🔍\n1) Primeiro, escrevemos todos os números de 1 a 20.\n2) Apagamos os pares (2, 4, 6, 8, 10, 12, 14, 16, 18, 20). Sobram os ímpares: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19 (10 números).\n3) Agora, desses ímpares que sobraram, apagamos os múltiplos de 3 (os que estão na tabuada do 3: 3, 9, 15).\n4) Sobram na folha: 1, 5, 7, 11, 13, 17, 19. Se você contar, são exatamente 7 números!',
    origin: 'OBMEP 2021 (Nível 1)'
  },
  {
    level: 15,
    category: 'Cálculo Mental',
    question: 'Qual é o resultado da operação: 45 + 37 - 12?',
    options: ['60', '70', '72', '80'],
    answer: '70',
    explanation: 'Vamos fazer essa conta na mente por partes! ⚡\n1) Primeiro, somamos 45 + 37. Dica: 40 + 30 = 70, e 5 + 7 = 12. Então, 70 + 12 = 82.\n2) Agora, subtraímos 12 do resultado: 82 - 12 = 70. Muito bem!'
  },
  {
    level: 16,
    category: 'Resolução de Problemas',
    question: 'Um vaso cheio de água pesa 900 gramas. Se jogarmos metade da água fora, o vaso com o restante da água passa a pesar 500 gramas. Quanto pesa o vaso vazio?',
    options: ['100 gramas', '200 gramas', '300 gramas', '400 gramas'],
    answer: '100 gramas',
    explanation: 'Vamos desvendar esse mistério dos pesos! 🏺\n1) O vaso cheio de água pesa 900 gramas. Se tirarmos a metade da água, o peso cai para 500 gramas.\n2) A diferença de peso foi de: 900 - 500 = 400 gramas. Essa diferença é exatamente o peso da metade da água que jogamos fora!\n3) Se metade da água pesa 400 gramas, a água toda pesa: 400 + 400 = 800 gramas.\n4) Agora, para descobrir o peso do vaso vazio, pegamos o peso total e tiramos toda a água: 900 - 800 = 100 gramas!',
    origin: 'OBMEP 2022 (Nível A)'
  },
  {
    level: 17,
    category: 'Criatividade Matemática',
    question: 'Em uma caixa temos 5 bolas azuis, 5 bolas vermelhas e 5 bolas amarelas. Retiramos bolas de olhos vendados. Qual é o menor número de bolas que devemos retirar para ter certeza de que pegamos pelo menos duas da mesma cor?',
    options: ['3 bolas', '4 bolas', '5 bolas', '6 bolas'],
    answer: '4 bolas',
    explanation: 'Vamos imaginar o pior caso possível! 🔮\n1) Você quer tirar duas bolas de cores iguais de olhos vendados. Imagine que você tem muito "azar":\n- A 1ª bola que você tira é azul.\n- A 2ª bola que você tira é vermelha.\n- A 3ª bola que você tira é amarela.\nNesse momento, você tem 1 bola de cada cor na mão.\n2) A próxima bola (a 4ª) necessariamente terá que ser azul, vermelha ou amarela, pois só existem essas três cores! Então, não importa qual você tirar, ela vai fazer par com uma das três primeiras.\n3) Por isso, precisamos retirar no mínimo 4 bolas para termos certeza absoluta de formar um par!',
    origin: 'OBMEP 2019 (Nível A)'
  },
  {
    level: 18,
    category: 'Pensamento Estratégico',
    question: 'Três cartões numerados com 1, 2 e 3 são colocados em uma linha. Podemos trocar a posição de dois cartões vizinhos por vez. Qual é o número mínimo de trocas necessárias para inverter completamente a ordem dos cartões, deixando-os como 3, 2, 1?',
    options: ['2 trocas', '3 trocas', '4 trocas', '5 trocas'],
    answer: '3 trocas',
    explanation: 'Vamos fazer os cartões dançarem passo a passo! 🃏\nComeçamos com os cartões na ordem: [1, 2, 3]\n1) Primeiro, trocamos os vizinhos 1 e 2. A ordem fica: [2, 1, 3]\n2) Depois, trocamos os vizinhos 1 e 3 (que agora estão no meio e na ponta). A ordem fica: [2, 3, 1]\n3) Por fim, trocamos os vizinhos 2 e 3. A ordem fica: [3, 2, 1]\nConseguimos inverter tudo com exatamente 3 trocas!',
    origin: 'OBMEP 2019 (Nível 1)'
  },
  {
    level: 19,
    category: 'Lógica Matemática',
    question: 'Uma pizza foi cortada em 8 fatias iguais. Se você comer 3 fatias, que fração da pizza restará no prato?',
    options: ['3/8', '5/8', '1/2', '8/5'],
    answer: '5/8',
    explanation: 'Hora do lanche! 🍕\n1) Uma pizza inteira foi dividida em 8 fatias iguais. Isso significa que o total de fatias é 8.\n2) Se você comer 3 fatias, as fatias que sobram são: 8 - 3 = 5 fatias.\n3) Para representar isso como fração, colocamos as fatias que restaram em cima e o total de fatias embaixo: 5 de 8, que escrevemos como 5/8!',
    origin: 'Canguru Matemático'
  },
  {
    level: 20,
    category: 'Atenção aos Detalhes',
    question: 'Quantos números contendo o algarismo 7 existem entre os números de 1 a 50?',
    options: ['5', '14', '15', '20'],
    answer: '5',
    explanation: 'Vamos procurar os números que têm o algarismo 7! 🕵️‍♂️\nListamos todos eles de 1 a 50:\n- O número 7\n- O número 17\n- O número 27\n- O número 37\n- O número 47\nNão há dezenas inteiras de 70 porque paramos no 50. Contando na nossa lista, são exatamente 5 números!'
  },
  {
    level: 21,
    category: 'Pensamento Estratégico',
    question: 'Teresa quer preencher uma tabela 3x3 com os números 1, 2 e 3 de forma que a soma de cada linha e de cada coluna seja a mesma. Qual deve ser o valor da soma de cada linha e coluna?',
    options: ['5', '6', '7', '9'],
    answer: '6',
    explanation: 'Vamos preencher a tabelinha mágica! 🧮\n1) Temos uma tabela de 3 por 3 de espaço e precisamos usar os números 1, 2 e 3.\n2) Em cada linha e cada coluna, devemos colocar esses três números sem repetir nenhum.\n3) Então, cada linha e cada coluna vai ter exatamente os números 1, 2 e 3.\n4) Para descobrir a soma de cada linha e coluna, basta somar esses três números: 1 + 2 + 3 = 6!',
    origin: 'OBMEP 2024 (Nível 1)'
  },
  {
    level: 22,
    category: 'Lógica Matemática',
    question: 'Manuela quer pintar as quatro regiões de uma bandeira em linha (R1, R2, R3, R4) usando três cores: azul, vermelho e amarelo. Regiões vizinhas não podem ter a mesma cor. Se ela pintar R1 de azul, de quantas maneiras pode pintar o resto?',
    options: ['4 maneiras', '6 maneiras', '8 maneiras', '12 maneiras'],
    answer: '8 maneiras',
    explanation: 'Vamos colorir a bandeira sem repetir cores vizinhas! 🎨\nTemos 3 cores (Azul, Vermelho, Amarelo) e 4 regiões (R1, R2, R3, R4) em linha:\n1) R1 já está pintada de Azul (1 possibilidade).\n2) Para R2, não podemos usar Azul. Então sobram 2 opções (Vermelho ou Amarelo).\n3) Para R3, não podemos usar a cor que escolhemos para R2. Sobram 2 opções (uma das outras duas).\n4) Para R4, não podemos usar a cor de R3. Sobram também 2 opções.\n5) Multiplicando todas as opções: 1 x 2 x 2 x 2 = 8 maneiras diferentes!',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 23,
    category: 'Atenção aos Detalhes',
    question: 'Quantas vezes o algarismo 9 aparece ao escrevermos todos os números inteiros de 1 a 100?',
    options: ['10 vezes', '19 vezes', '20 vezes', '21 vezes'],
    answer: '20 vezes',
    explanation: 'Vamos procurar o algarismo 9 em todos os números de 1 a 100! 🕵️‍♂️\nEle aparece em duas posições:\n1) Na posição das unidades: 9, 19, 29, 39, 49, 59, 69, 79, 89, 99. Se contarmos, são 10 vezes (o 99 tem um 9 na unidade).\n2) Na posição das dezenas (família do noventa): 90, 91, 92, 93, 94, 95, 96, 97, 98, 99. Aqui são mais 10 vezes (o 99 tem outro 9 na dezena).\n3) Somando todas as aparições: 10 + 10 = 20 vezes!',
    origin: 'OBMEP 2015 (Nível 1)'
  },
  {
    level: 24,
    category: 'Persistência',
    question: 'Uma formiguinha caminha pelas arestas de um cubo de arame de 10 cm de aresta. Ela quer ir de um vértice A a um vértice B oposto pelo caminho mais curto seguindo as arestas. Qual a distância percorrida por ela?',
    options: ['20 cm', '30 cm', '40 cm', '50 cm'],
    answer: '30 cm',
    explanation: 'A caminhada da formiguinha no cubo de arame! 🧊🐜\n1) Para ir de um canto (vértice) ao canto completamente oposto de um cubo caminhando apenas pelas arestas, a formiguinha precisa andar no mínimo 3 arestas (por exemplo: 1 para o lado, 1 para cima e 1 para o fundo).\n2) Cada aresta do cubo mede 10 centímetros.\n3) Multiplicando o comprimento pelo número de arestas: 3 x 10 cm = 30 cm!',
    origin: 'OBMEP 2016 (Nível A)'
  },
  {
    level: 25,
    category: 'Geometria Visual',
    question: 'Se juntarmos dois triângulos equiláteros idênticos colando-os por um de seus lados comuns, qual nova figura plana formamos?',
    options: ['Um quadrado', 'Um losango', 'Um pentágono', 'Um hexágono'],
    answer: 'Um losango',
    explanation: 'Vamos juntar pecinhas geométricas! 📐\n1) Um triângulo equilátero tem 3 lados iguais.\n2) Ao encostar dois desses triângulos lado a lado, o lado da junção fica escondido lá dentro.\n3) A nova figura de fora fica com exatamente 4 lados, todos com o mesmo tamanho.\n4) Uma figura de 4 lados iguais que parece um balãozinho ou pipa é chamada de losango!'
  },
  {
    level: 26,
    category: 'Atenção aos Detalhes',
    question: 'Um número inteiro de três algarismos tem a propriedade de que o algarismo das centenas é igual ao algarismo das unidades. Quantos números assim existem entre 100 e 999?',
    options: ['90 números', '100 números', '900 números', '99 números'],
    answer: '90 números',
    explanation: 'Vamos descobrir números espelhados de 3 algarismos (como 121 ou 353)! 🪞\nEsses números têm a forma ABA:\n1) O primeiro algarismo (A) não pode ser 0, senão o número não teria 3 algarismos. Então temos 9 opções (de 1 a 9).\n2) O segundo algarismo (B) pode ser qualquer número, inclusive o 0. Então temos 10 opções (de 0 a 9).\n3) O terceiro algarismo (A) deve ser obrigatoriamente igual ao primeiro. Então temos apenas 1 opção.\n4) Multiplicando as opções para descobrir o total: 9 x 10 x 1 = 90 números diferentes!',
    origin: 'OBMEP 2023 (Nível 1)'
  },
  {
    level: 27,
    category: 'Pensamento Estratégico',
    question: 'Em uma gaveta há 10 meias pretas e 10 meias brancas. Se você retirar as meias no escuro, qual o menor número de meias que precisa tirar para garantir que terá pelo menos um par de meias da mesma cor?',
    options: ['2 meias', '3 meias', '11 meias', '12 meias'],
    answer: '3 meias',
    explanation: 'Vamos brincar de se vestir no escuro! 🧦\n1) Você quer tirar um par de meias da mesma cor e só tem meias pretas e brancas na gaveta.\n2) Imagine que você tire a 1ª meia e ela seja preta. E a 2ª meia seja branca.\n3) Quando você tirar a 3ª meia, não importa a cor dela (preta ou branca), ela vai formar um par com uma das duas primeiras!\n4) Portanto, tirando apenas 3 meias você garante 100% que terá pelo menos um par da mesma cor.',
    origin: 'Canguru Matemático'
  },
  {
    level: 28,
    category: 'Resolução de Problemas',
    question: 'Em uma escola, os alunos da Olimpíada de Matemática foram divididos em salas. Se colocarmos 3 alunos em cada sala, sobra 1 aluno. Se colocarmos 4 alunos em cada sala, uma sala fica vazia. Quantos alunos participam dessa Olimpíada?',
    options: ['10 alunos', '13 alunos', '16 alunos', '20 alunos'],
    answer: '16 alunos',
    explanation: 'Vamos usar a imaginação para resolver esse desafio! 🏫\n1) Se colocarmos 3 alunos por sala, sobra 1 aluno de fora.\n2) Se colocarmos 4 alunos por sala, uma sala fica vazia. Isso significa que se trouxermos de volta os alunos que caberiam naquela sala vazia (que seriam 4), mais o aluno que estava sobrando (1), teremos 5 alunos no total que foram redistribuídos!\n3) Para redistribuir 5 alunos colocando 1 a mais em cada sala (passando de 3 para 4 alunos), precisamos ter exatamente 5 salas ativas!\n4) Com 5 salas e colocando 3 alunos em cada uma (3 x 5 = 15) mais o 1 aluno que sobrou, temos 16 alunos no total!',
    origin: 'OBMEP 2018 (Nível 1)'
  },
  {
    level: 29,
    category: 'Persistência',
    question: 'Um sapo sobe 2 metros de uma parede de dia e escorrega 1 metro à noite. Se a parede tem 5 metros de altura, em qual dia o sapo chegará ao topo da parede?',
    options: ['3º dia', '4º dia', '5º dia', '6º dia'],
    answer: '4º dia',
    explanation: 'Acompanhe a subida do sapinho! 🐸\n- No Dia 1: ele sobe 2m de dia e escorrega 1m à noite. Termina na marca de 1 metro.\n- No Dia 2: ele sobe 2m (chega em 3m) e escorrega 1m. Termina na marca de 2 metros.\n- No Dia 3: ele sobe 2m (chega em 4m) e escorrega 1m. Termina na marca de 3 metros.\n- No Dia 4: ele começa na marca de 3 metros e sobe 2 metros durante o dia. Ele alcança os 5 metros (o topo da parede)! Como ele já chegou lá em cima, ele sai da parede e não escorrega mais.',
    origin: 'Canguru Matemático'
  },
  {
    level: 30,
    category: 'Pensamento Estratégico',
    question: 'Numa competição de corrida, se Júlia ultrapassar o segundo colocado, em que posição ela ficará?',
    options: ['Primeiro lugar', 'Segundo lugar', 'Terceiro lugar', 'Não é possível saber'],
    answer: 'Segundo lugar',
    explanation: 'Se Júlia ultrapassa o segundo colocado, ela assume o lugar dele, passando a ser a segunda colocada, enquanto o que estava em segundo passa para terceiro.',
    origin: 'OBMEP 2022 (Nível A)'
  },
  {
    level: 31,
    category: 'Pensamento Estratégico',
    question: 'Em um jogo de tabuleiro, se você der um passo para frente avança 2 casas. Se der um passo para trás volta 1 casa. Qual a melhor sequência estratégica para avançar exatamente 5 casas no menor número de passos?',
    options: ['3 passos para frente', '4 passos para frente e 3 para trás', '3 passos para frente e 1 para trás', '2 passos para frente e 1 para trás'],
    answer: '3 passos para frente e 1 para trás',
    explanation: 'Vamos planejar a melhor estratégia de passos! 🎲\n1) Cada passo para frente avança 2 casas. Se dermos 3 passos para frente, avançamos: 2 + 2 + 2 = 6 casas (passamos um pouco de 5).\n2) Agora, damos 1 passo para trás, o que nos faz voltar 1 casa: 6 - 1 = 5 casas!\n3) Conseguimos chegar exatamente na casa 5 usando o menor número de passos (4 passos no total).'
  },
  {
    level: 32,
    category: 'Geometria Visual',
    question: 'Um quadrado de lado 6 cm é cortado em três retângulos idênticos de mesma área. Qual é o perímetro de cada um desses três retângulos?',
    options: ['10 cm', '14 cm', '16 cm', '20 cm'],
    answer: '16 cm',
    explanation: 'Como o quadrado tem lado 6 cm, seus retângulos terão dimensões 6 cm por 2 cm (já que 6 / 3 = 2 cm). O perímetro de cada um é 2 * (6 + 2) = 16 cm.',
    origin: 'OBMEP 2022 (Nível 1)'
  },
  {
    level: 33,
    category: 'Velocidade de Resolução',
    question: 'Qual é a metade de 2 mais 2?',
    options: ['2', '3', '4', '1'],
    answer: '3',
    explanation: 'Atenção à pegadinha da vírgula e da ordem das palavras! 🎙️\n1) Quando dizemos "a metade de 2, mais 2", primeiro calculamos a metade de 2.\n2) A metade de 2 é igual a 1.\n3) Depois, somamos mais 2 a esse resultado: 1 + 2 = 3.',
    origin: 'Desafio Raciocínio'
  },
  {
    level: 34,
    category: 'Cálculo Mental',
    question: 'Qual é o dobro de 15 somado com o triplo de 10?',
    options: ['45', '60', '75', '80'],
    answer: '60',
    explanation: 'Vamos resolver essa soma por partes! ⚡\n1) O dobro de um número é ele vezes 2. O dobro de 15 é: 15 + 15 = 30.\n2) O triplo de um número é ele vezes 3. O triplo de 10 é: 10 + 10 + 10 = 30.\n3) Agora somamos os dois resultados: 30 + 30 = 60.'
  },
  {
    level: 35,
    category: 'Persistência',
    question: 'Um caracol está no fundo de um poço de 6 metros de profundidade. Durante o dia ele sobe 3 metros, mas à noite ele escorrega 2 metros. Quantos dias ele levará para sair do poço?',
    options: ['3 dias', '4 dias', '5 dias', '6 dias'],
    answer: '4 dias',
    explanation: 'Acompanhe a jornada do caracol! 🐌\n- Dia 1: sobe 3m e escorrega 2m. Termina em 1 metro.\n- Dia 2: sobe 3m (chega a 4m) e escorrega 2m. Termina em 2 metros.\n- Dia 3: sobe 3m (chega a 5m) e escorrega 2m. Termina em 3 metros.\n- Dia 4: começa em 3 metros e sobe 3 metros durante o dia. Ele chega na marca de 6 metros (o topo)! Como ele já saiu do poço, ele não escorrega mais.'
  },
  {
    level: 36,
    category: 'Lógica Matemática',
    question: 'Em uma caixa, há 6 fichas numeradas de 1 a 6. Retiramos duas fichas sem olhar. Qual é a probabilidade de que a soma dos números das fichas retiradas seja igual a 7?',
    options: ['1/5', '1/3', '1/2', '2/5'],
    answer: '1/5',
    explanation: 'Vamos brincar de sorteio de fichas! 🎲\n1) Se você tem 6 fichas numeradas de 1 a 6, existem 15 maneiras diferentes de escolher duas fichas.\n2) Vamos listar os pares que somam exatamente 7:\n- Ficha 1 e Ficha 6 (1 + 6 = 7)\n- Ficha 2 e Ficha 5 (2 + 5 = 7)\n- Ficha 3 e Ficha 4 (3 + 4 = 7)\nTotal de 3 pares favoráveis.\n3) A probabilidade é de 3 em 15. Simplificando a fração (dividindo em cima e embaixo por 3), temos 1 em 5, ou seja, 1/5!',
    origin: 'OBMEP 2017 (Nível A)'
  },
  {
    level: 37,
    category: 'Resolução de Problemas',
    question: 'Um livro tem 120 páginas. Se ler 10 páginas por dia, em quantas semanas terminarei a leitura completa?',
    options: ['1 semana', '2 semanas', '12 dias', 'Mais de 3 semanas'],
    answer: '2 semanas',
    explanation: 'Vamos programar a nossa leitura! 📖\n1) O livro tem 120 páginas e você lê 10 páginas por dia.\n2) Para saber quantos dias levará, dividimos: 120 dividido por 10 = 12 dias de leitura.\n3) Uma semana tem 7 dias. Duas semanas têm 14 dias.\n4) Como 12 dias é mais do que 1 semana, mas menos do que 2 semanas, você terminará de ler na segunda semana!',
    origin: 'Canguru Matemático'
  },
  {
    level: 38,
    category: 'Lógica Matemática',
    question: 'Se o ontem de amanhã é segunda-feira, que dia da semana é hoje?',
    options: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Sábado'],
    answer: 'Segunda-feira',
    explanation: 'Essa é uma charada de tempo! 📅\n1) Pense bem: o que é "o ontem do amanhã"?\n- O amanhã é o dia que vem depois de hoje.\n- O ontem desse dia é o dia anterior a ele... que volta a ser o dia de hoje!\n2) Então, dizer "o ontem do amanhã é segunda-feira" é o mesmo que dizer "hoje é segunda-feira"!'
  },
  {
    level: 39,
    category: 'Geometria Visual',
    question: 'Quantos cubos de 1 cm de aresta cabem perfeitamente dentro de uma caixa cúbica de 3 cm de aresta?',
    options: ['9 cubos', '18 cubos', '27 cubos', '36 cubos'],
    answer: '27 cubos',
    explanation: 'Vamos construir um cubo gigante com blocos de montar! 🧱\n1) A caixa grande tem 3 cm de lado. Para enchê-la com cubinhos de 1 cm, precisamos de:\n- 3 cubinhos na largura\n- 3 cubinhos no comprimento (formando uma base com 3 x 3 = 9 cubinhos)\n- 3 camadas de altura\n2) Multiplicando tudo para saber o total: 9 cubinhos na base x 3 camadas de altura = 27 cubinhos!',
    origin: 'Canguru Matemático'
  },
  {
    level: 40,
    category: 'Criatividade Matemática',
    question: 'Usando quatro algarismos 4 e as operações básicas (+, -, *, /), qual das opções abaixo representa o número 10?',
    options: ['4 + 4 + (4 / 4)', '(4 * 4) - 4 - 4', '(44 - 4) / 4', '4 + 4 + 4 - 4'],
    answer: '(44 - 4) / 4',
    explanation: 'Vamos usar a criatividade matemática! 🧠✨\nPodemos juntar dois algarismos 4 para formar o número 44:\n1) Fazemos a conta: 44 - 4 = 40.\n2) Agora, pegamos o resultado e dividimos pelo último 4: 40 dividido por 4 = 10!\nUsamos exatamente quatro vezes o número 4.'
  },
  {
    level: 41,
    category: 'Reconhecimento de Padrões',
    question: 'Se a letra A = 1, B = 2, C = 3, etc. Qual é a soma dos valores numéricos das letras da palavra AURA?',
    options: ['38', '40', '42', '45'],
    answer: '42',
    explanation: 'Vamos somar as letras como se fossem pontos! 🔤\nOlhando a posição de cada letra no alfabeto:\n- A = 1\n- U = 21\n- R = 19\n- A = 1\nSomando tudo: 1 + 21 + 19 + 1 = 42 pontos!'
  },
  {
    level: 42,
    category: 'Criatividade Matemática',
    question: 'Qual é o número que, se somado com o seu próprio dobro, resulta em 24?',
    options: ['6', '8', '12', '16'],
    answer: '8',
    explanation: 'Vamos pensar em fatias de pizza! 🍕\n1) Um número somado com o seu próprio dobro é a mesma coisa que somar o número 3 vezes (1 parte dele mais 2 partes dele).\n2) Se essas 3 partes iguais juntas somam 24, dividimos 24 por 3 para saber o valor de cada parte.\n3) Fazendo a conta: 24 dividido por 3 = 8. Então o número procurado é o 8!'
  },
  {
    level: 43,
    category: 'Atenção aos Detalhes',
    question: 'Um avião decola às 14h30 de Brasília e pousa em Salvador às 16h15 do mesmo dia. Quanto tempo durou o voo de avião?',
    options: ['1h15min', '1h30min', '1h45min', '2h15min'],
    answer: '1h45min',
    explanation: 'Vamos contar as horas no relógio! ✈️\n1) O avião decola às 14h30.\n2) De 14h30 até as 15h30, passa exatamente 1 hora.\n3) Das 15h30 até as 16h15, passam mais 45 minutos.\n4) Juntando tudo, o voo durou exatamente 1 hora e 45 minutos.'
  },
  {
    level: 44,
    category: 'Pensamento Estratégico',
    question: 'Em uma fila de banco, Júlia está na 5ª posição de frente para trás e na 6ª posição de trás para frente. Quantas pessoas estão na fila?',
    options: ['10 pessoas', '11 pessoas', '9 pessoas', '12 pessoas'],
    answer: '10 pessoas',
    explanation: 'Vamos contar as pessoas na fila do banco! 🧑‍🤝‍🧑\n1) Júlia está na 5ª posição vindo da frente. Isso significa que existem 4 pessoas na frente dela.\n2) Ela está na 6ª posição vindo de trás. Isso significa que existem 5 pessoas atrás dela.\n3) Para descobrir o total de pessoas, somamos quem está na frente, a Júlia e quem está atrás: 4 + 1 (Júlia) + 5 = 10 pessoas na fila.',
    origin: 'OBMEP 2012 (Nível A)'
  },
  {
    level: 45,
    category: 'Velocidade de Resolução',
    question: 'Um relógio digital marca 12:34. Daqui a quantos minutos o relógio marcará 13:11 pela primeira vez?',
    options: ['37 minutos', '58 minutos', '68 minutos', '77 minutos'],
    answer: '37 minutos',
    explanation: 'Vamos contar os minutos que faltam! ⏰\n1) O relógio marca 12:34.\n2) Para chegar até as 13:00 (uma hora cheia), faltam: 60 - 34 = 26 minutos.\n3) Das 13:00 até as 13:11, passam mais 11 minutos.\n4) Somamos os dois tempos: 26 minutos + 11 minutos = 37 minutos!'
  },
  {
    level: 46,
    category: 'Persistência',
    question: 'Cinco amigos disputaram uma corrida. Beto chegou antes de Carlos, mas depois de Adriano. Daniel chegou antes de Eduardo, mas depois de Carlos. Quem ganhou a corrida?',
    options: ['Adriano', 'Beto', 'Carlos', 'Daniel'],
    answer: 'Adriano',
    explanation: 'Vamos bancar os detetives e montar a fila de chegada dos amigos! 🏃‍♂️\n1) Beto chegou antes de Carlos, mas depois de Adriano. Então a ordem é: Adriano -> Beto -> Carlos.\n2) Daniel chegou antes de Eduardo, mas depois de Carlos. Então a ordem continua: Carlos -> Daniel -> Eduardo.\n3) Juntando as duas pistas, temos a ordem completa de chegada: Adriano (1º) -> Beto (2º) -> Carlos (3º) -> Daniel (4º) -> Eduardo (5º).\n4) Quem ganhou a corrida foi o Adriano!',
    origin: 'OBMEP 2018 (Nível A)'
  },
  {
    level: 47,
    category: 'Velocidade de Resolução',
    question: 'Se 5 impressoras imprimem 5 panfletos em 5 segundos, quantos segundos 10 impressoras de mesma capacidade levarão para imprimir 10 panfletos?',
    options: ['5 segundos', '10 segundos', '2 segundos', '1 segundo'],
    answer: '5 segundos',
    explanation: 'Pense nas impressoras como robozinhos ajudantes! 🤖\n1) Cada impressora trabalha de forma independente e leva 5 segundos para fazer 1 panfleto.\n2) Se tivermos 10 impressoras ligadas ao mesmo tempo, cada uma vai imprimir o seu próprio panfleto.\n3) Como elas começam e terminam juntas, todas terminam seus panfletos nos mesmos 5 segundos!'
  },
  {
    level: 48,
    category: 'Resolução de Problemas',
    question: 'Um fazendeiro plantou 80 sementes. Sabendo que a cada 5 sementes plantadas, exatamente 4 germinam, quantas plantas o fazendeiro terá?',
    options: ['60 plantas', '64 plantas', '70 plantas', '75 plantas'],
    answer: '64 plantas',
    explanation: 'Vamos plantar no jardim! 🌱\n1) O fazendeiro tem 80 sementes. A cada 5 sementes, 4 viram plantinhas.\n2) Primeiro, vamos descobrir quantos grupinhos de 5 sementes existem em 80: dividimos 80 por 5, o que dá 16 grupinhos.\n3) Como em cada um desses 16 grupinhos nascem 4 plantas, fazemos: 16 x 4 = 64 plantas no total!',
    origin: 'OBMEP 2021 (Nível 1)'
  },
  {
    level: 49,
    category: 'Geometria Visual',
    question: 'Quantos lados tem a figura formada ao juntarmos dois hexágonos regulares idênticos colados por um lado compartilhado completo?',
    options: ['10 lados', '11 lados', '12 lados', '8 lados'],
    answer: '10 lados',
    explanation: 'Vamos construir com pecinhas! 📐\n1) Um hexágono sozinho tem 6 lados externos.\n2) Se pegarmos dois hexágonos e encostarmos um lado de um no lado do outro, esses dois lados colados ficam "escondidos" lá dentro da figura.\n3) Então, o contorno de fora perde 1 lado de cada hexágono (2 lados no total).\n4) A nova figura terá: 6 + 6 - 2 = 10 lados no contorno de fora!',
    origin: 'Canguru Matemático'
  },
  {
    level: 50,
    category: 'Resolução de Problemas',
    question: 'Em um sítio há galinhas e coelhos, totalizando 10 cabeças e 28 patas. Quantos coelhos há no sítio?',
    options: ['3 coelhos', '4 coelhos', '5 coelhos', '6 coelhos'],
    answer: '4 coelhos',
    explanation: 'Vamos dar um passeio pelo sítio! 🐰🐔\n1) Temos 10 bichinhos no total. Se todos eles fossem galinhas, que têm apenas 2 patas, teríamos: 10 x 2 = 20 patas.\n2) Mas o problema diz que temos 28 patas! Estão sobrando: 28 - 20 = 8 patas.\n3) Cada coelho tem 4 patas, que são 2 patas a mais do que uma galinha. Essas 8 patas sobrando pertencem aos coelhos!\n4) Dividimos as patas sobressalentes: 8 patas divididas por 2 patas extras de cada coelho = 4 coelhos. Logo, temos 4 coelhos (e 6 galinhas)!'
  },
  {
    level: 51,
    category: 'Reconhecimento de Padrões',
    question: 'Na sequência de números: 1, 3, 6, 10, 15, 21, ... Qual é o próximo termo?',
    options: ['25', '27', '28', '30'],
    answer: '28',
    explanation: 'A diferença entre os termos cresce linearmente: +2, +3, +4, +5, +6. O próximo somará +7: 21 + 7 = 28.'
  },
  {
    level: 52,
    category: 'Criatividade Matemática',
    question: 'Uma garrafa com sua rolha custa 1,10 reais. A garrafa custa 1,00 real a mais que a rolha. Quanto custa a rolha?',
    options: ['0,10 reais', '0,05 reais', '0,01 reais', '0,15 reais'],
    answer: '0,05 reais',
    explanation: 'Se a rolha custa r, a garrafa custa r+1. Juntos: r + r + 1 = 1,10 => 2r = 0,10 => r = 0,05 reais.'
  },
  {
    level: 53,
    category: 'Lógica Matemática',
    question: 'Quatro amigos estão sentados em uma mesa redonda. Maria diz: "Estou ao lado de Paulo e de Ana". Lucas diz: "Estou ao lado de Paulo". Quem está sentado em frente a Maria?',
    options: ['Ana', 'Paulo', 'Lucas', 'Não é possível saber'],
    answer: 'Lucas',
    explanation: 'Vamos desenhar a mesa redonda na nossa mente! 🪑\n1) Maria está no meio, ao lado de Paulo e de Ana. Então a ordem é: Ana - Maria - Paulo.\n2) Como são 4 amigos na mesa redonda, o Lucas deve se sentar no único lugar que sobrou, fechando o círculo entre Paulo e Ana.\n3) Olhando para a mesa, a ordem circular fica: Ana, Maria, Paulo, Lucas.\n4) Quem está bem na frente da Maria, do outro lado da mesa, é o Lucas!',
    origin: 'OBMEP 2017 (Nível 1)'
  },
  {
    level: 54,
    category: 'Atenção aos Detalhes',
    question: 'Se você escrever os números de 1 a 30 em ordem crescente, quantas vezes utilizará o algarismo 3?',
    options: ['3 vezes', '4 vezes', '12 vezes', '13 vezes'],
    answer: '4 vezes',
    explanation: 'Vamos caçar o número 3! 🎯\nSe escrevermos os números de 1 a 30, o algarismo 3 vai aparecer apenas nas seguintes posições:\n- No número 3\n- No número 13\n- No número 23\n- No número 30 (que começa com 3)\nContando todas essas vezes, o algarismo 3 é escrito exatamente 4 vezes!'
  },
  {
    level: 55,
    category: 'Pensamento Estratégico',
    question: 'Quatro times disputam um torneio onde cada time joga exatamente uma vez contra todos os outros. Quantos jogos ocorrerão no total?',
    options: ['4 jogos', '6 jogos', '8 jogos', '12 jogos'],
    answer: '6 jogos',
    explanation: 'Vamos organizar a tabela do campeonato! ⚽\nImagine os times A, B, C e D:\n1) O time A joga contra B, C e D (3 jogos).\n2) O time B joga contra C e D (não contamos o jogo contra A de novo! Mais 2 jogos).\n3) O time C joga contra D (mais 1 jogo).\n4) O time D já jogou contra todos!\n5) Somando todos os jogos: 3 + 2 + 1 = 6 jogos no total.',
    origin: 'OBMEP 2019 (Nível A)'
  },
  {
    level: 56,
    category: 'Persistência',
    question: 'Para subir uma escada de 8 degraus, Tiago pode dar passos de 1 degrau ou pulos de 2 degraus de cada vez. De quantas maneiras diferentes ele pode subir essa escada?',
    options: ['21 maneiras', '34 maneiras', '55 maneiras', '8 maneiras'],
    answer: '34 maneiras',
    explanation: 'Essa brincadeira segue uma sequência mágica chamada Sequência de Fibonacci! 🪜\n1) Se a escada tivesse 1 degrau, haveria 1 maneira de subir.\n2) Com 2 degraus, haveria 2 maneiras (dois passos simples ou um pulão de dois).\n3) Para descobrir as maneiras de qualquer degrau, somamos as maneiras dos dois degraus anteriores:\n- 3 degraus: 1 + 2 = 3 maneiras\n- 4 degraus: 2 + 3 = 5 maneiras\n- 5 degraus: 3 + 5 = 8 maneiras\n- 6 degraus: 5 + 8 = 13 maneiras\n- 7 degraus: 8 + 13 = 21 maneiras\n- 8 degraus: 13 + 21 = 34 maneiras!\nQue incrível!',
    origin: 'Desafio Fibonacci'
  },
  {
    level: 57,
    category: 'Velocidade de Resolução',
    question: 'Se duas torneiras de mesma capacidade enchem um tanque em 4 horas, quantas horas quatro dessas torneiras levariam para encher o mesmo tanque?',
    options: ['2 horas', '4 horas', '8 horas', '1 hora'],
    answer: '2 horas',
    explanation: 'Mais água escorrendo significa menos tempo de espera! 🚰\n1) Duas torneiras enchem o tanque juntas em 4 horas.\n2) Se usarmos 4 torneiras, temos o dobro de água enchendo o tanque ao mesmo tempo.\n3) Com o dobro de torneiras funcionando juntas, o tanque vai encher na metade do tempo!\n4) Dividimos o tempo pela metade: 4 horas divididas por 2 = 2 horas.'
  },
  {
    level: 58,
    category: 'Resolução de Problemas',
    question: 'Um grupo de 5 amigos divide uma conta de restaurante. Se cada um pagou 18 reais e sobrou 2 reais de troco no total, qual era o valor da conta?',
    options: ['88 reais', '90 reais', '92 reais', '94 reais'],
    answer: '88 reais',
    explanation: 'Vamos calcular o valor da janta! 🍽️\n1) Havia 5 amigos e cada um deu 18 reais. O dinheiro total que eles juntaram foi: 5 x 18 = 90 reais.\n2) Depois de pagar, sobrou 2 reais de troco.\n3) Se eles deram 90 reais e receberam 2 de volta, a conta custou: 90 - 2 = 88 reais!'
  },
  {
    level: 59,
    category: 'Geometria Visual',
    question: 'Se cortarmos um retângulo de 10 cm por 4 cm ao meio em seu lado maior, qual será o perímetro de um dos novos retângulos formados?',
    options: ['14 cm', '18 cm', '20 cm', '28 cm'],
    answer: '18 cm',
    explanation: 'Vamos cortar o retângulo ao meio! ✂️\n1) O retângulo original mede 10 cm de comprimento por 4 cm de largura.\n2) Cortando ao meio no lado maior (10 cm), o comprimento cai pela metade, virando 5 cm. A largura continua sendo 4 cm.\n3) O perímetro é a soma de todos os 4 lados do novo retângulo menor: 5 + 4 + 5 + 4 = 18 cm.'
  },
  {
    level: 60,
    category: 'Cálculo Mental',
    question: 'Qual é o resultado da operação aritmética: (12 * 5) + (24 / 3)?',
    options: ['64', '68', '72', '80'],
    answer: '68',
    explanation: 'Vamos resolver por partes respeitando as regras das operações matemáticas! ⚡\n1) Primeiro resolvemos as contas que estão entre parênteses:\n- No primeiro parêntese: 12 x 5 = 60.\n- No segundo parêntese: 24 dividido por 3 = 8.\n2) Por fim, somamos os dois resultados obtidos: 60 + 8 = 68. Perfeito!'
  },
  {
    level: 61,
    category: 'Reconhecimento de Padrões',
    question: 'A sequência de letras A, B, D, G, K, ... segue um padrão de saltos no alfabeto. Qual é a próxima letra da sequência?',
    options: ['N', 'O', 'P', 'Q'],
    answer: 'P',
    explanation: 'Esta sequência brinca com saltos no alfabeto! 🔤\n1) De A para B, pulamos 1 letra (+B).\n2) De B para D, pulamos 2 letras (pulou C, chegou em D).\n3) De D para G, pulamos 3 letras (pulou E, F, chegou em G).\n4) De G para K, pulamos 4 letras (pulou H, I, J, chegou em K).\n5) Para descobrir a próxima letra, precisamos dar um salto de 5 letras! Pulamos L, M, N, O e a próxima letra é o P!'
  },
  {
    level: 62,
    category: 'Criatividade Matemática',
    question: 'Se duas galinhas botam dois ovos em dois dias, quantos ovos seis galinhas botarão em seis dias?',
    options: ['6 ovos', '12 ovos', '18 ovos', '36 ovos'],
    answer: '18 ovos',
    explanation: 'Vamos observar as galinhas no galinheiro! 🐔🥚\n1) Se 2 galinhas botam 2 ovos em 2 dias, isso significa que cada dupla de galinhas bota 2 ovos a cada 2 dias.\n2) Se tivermos 6 galinhas (que são 3 duplas), elas vão botar: 3 duplas x 2 ovos = 6 ovos a cada 2 dias.\n3) O período de 6 dias tem exatamente 3 ciclos de 2 dias (pois 2 + 2 + 2 = 6).\n4) Multiplicamos a quantidade de ovos pelos ciclos: 6 ovos x 3 ciclos = 18 ovos no total!',
    origin: 'Canguru Matemático'
  },
  {
    level: 63,
    category: 'Lógica Matemática',
    question: 'Bruno tem mais figurinhas que Tiago, e Tiago tem menos que Rafael. Quem tem mais figurinhas entre Bruno e Rafael?',
    options: ['Bruno', 'Rafael', 'Eles têm a mesma quantidade', 'Não é possível saber'],
    answer: 'Não é possível saber',
    explanation: 'Vamos comparar as quantidades de figurinhas! 🃏\n1) O enigma diz que o Bruno tem mais que o Tiago, e o Rafael também tem mais que o Tiago.\n2) Ou seja, o Tiago tem menos figurinhas que os outros dois.\n3) Mas o enigma não nos diz nada sobre quem tem mais entre Bruno e Rafael! Pode ser o Bruno, pode ser o Rafael, ou eles podem até ter a mesma quantidade. Por isso, não é possível saber com certeza.'
  },
  {
    level: 64,
    category: 'Atenção aos Detalhes',
    question: 'Uma costureira corta uma fita de 12 metros em pedaços de 2 metros cada um. Ela leva 5 segundos para fazer cada corte. Quanto tempo ela levará para cortar toda a fita?',
    options: ['25 segundos', '30 segundos', '20 segundos', '15 segundos'],
    answer: '25 segundos',
    explanation: 'Essa é uma pegadinha muito esperta! ✂️\n1) Para cortar uma fita de 12 metros em pedaços de 2 metros, precisamos fazer 6 pedaços no total.\n2) Mas pense bem: quando você faz o 5º corte, o último pedaço de fita já se divide sozinho, sem precisar de um 6º corte!\n3) Então, precisamos fazer apenas 5 cortes no total.\n4) Se cada corte leva 5 segundos: 5 cortes x 5 segundos = 25 segundos!'
  },
  {
    level: 65,
    category: 'Pensamento Estratégico',
    question: 'Para abrir um cadeado de 3 dígitos (onde cada dígito vai de 0 a 9), qual o número máximo de combinações que se deve testar?',
    options: ['100', '999', '1000', '30'],
    answer: '1000',
    explanation: 'Vamos testar as chaves do segredo! 🔓\n1) O cadeado tem 3 números. Cada posição pode ser qualquer algarismo de 0 a 9 (o que dá 10 opções: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9).\n2) O menor número possível é 000 e o maior número é 999.\n3) Se contarmos todos os números de 000 até 999, temos exatamente 1000 combinações possíveis!',
    origin: 'OBMEP 2014 (Nível A)'
  },
  {
    level: 66,
    category: 'Persistência',
    question: 'Um jogo de dados consiste em lançar dois dados normais de 6 faces. Você ganha se a soma das faces for 10 ou mais. Quantas combinações fazem você vencer?',
    options: ['3 combinações', '4 combinações', '5 combinações', '6 combinações'],
    answer: '6 combinações',
    explanation: 'Vamos torcer para tirar números altos nos dados! 🎲🎲\nPara ganhar, a soma dos dois dados deve ser 10, 11 ou 12. Vamos listar as combinações vencedoras:\n- Para somar 10: podemos tirar (4 no primeiro, 6 no segundo), (5 e 5) ou (6 no primeiro, 4 no segundo). (3 opções)\n- Para somar 11: podemos tirar (5 e 6) ou (6 e 5). (2 opções)\n- Para somar 12: só existe a opção de tirar (6 e 6). (1 opção)\nSomando todas as opções vencedoras: 3 + 2 + 1 = 6 combinações!'
  },
  {
    level: 67,
    category: 'Velocidade de Resolução',
    question: 'Um carro viaja a uma velocidade constante de 90 km/h. Qual distância ele percorrerá em 40 minutos?',
    options: ['50 km', '60 km', '70 km', '80 km'],
    answer: '60 km',
    explanation: 'Vamos calcular a viagem do carro na estrada! 🚗\n1) Uma hora tem 60 minutos. A velocidade de 90 km/h significa que o carro anda 90 km se correr por 60 minutos inteiros.\n2) Vamos dividir 60 minutos em 3 pedaços de 20 minutos. Cada pedaço de 20 minutos representa uma distância de: 90 km dividido por 3 = 30 km.\n3) Como o carro correu por 40 minutos (que são 2 pedaços de 20 minutos), somamos as distâncias: 30 km + 30 km = 60 km!'
  },
  {
    level: 68,
    category: 'Resolução de Problemas',
    question: 'A soma das idades de Mariana e de sua mãe é 48 anos. Mariana tem exatamente um terço da idade da mãe. Quantos anos tem Mariana?',
    options: ['10 anos', '12 anos', '14 anos', '16 anos'],
    answer: '12 anos',
    explanation: 'Vamos usar pedacinhos de idades! 👩‍👧\n1) A Mariana tem a terça parte da idade de sua mãe. Isso quer dizer que a idade da mãe é dividida em 3 partes e a Mariana tem 1 parte igualzinha.\n2) Juntas, a idade da Mariana (1 parte) mais a idade da mãe (3 partes) dão 4 partes no total.\n3) A soma das idades é 48 anos. Então dividimos 48 em 4 partes iguais: 48 dividido por 4 = 12 anos.\n4) Cada parte equivale a 12 anos. Como Mariana tem 1 parte, ela tem exatamente 12 anos (e sua mãe tem 3 partes, ou seja, 36 anos)!',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 69,
    category: 'Geometria Visual',
    question: 'Qual é o perímetro de um triângulo retângulo cujos dois lados menores (catetos) medem 3 cm e 4 cm?',
    options: ['7 cm', '10 cm', '12 cm', '14 cm'],
    answer: '12 cm',
    explanation: 'Vamos somar o contorno do triângulo! 📐\n1) O triângulo tem dois lados menores medindo 3 cm e 4 cm. Esse tipo especial de triângulo (triângulo retângulo) tem uma regra mágica: se os lados menores medem 3 e 4, o lado maior (hipotenusa) sempre mede 5 cm!\n2) O perímetro é o contorno completo do triângulo. Para descobrir, basta somar todos os seus lados: 3 + 4 + 5 = 12 cm!'
  },
  {
    level: 70,
    category: 'Cálculo Mental',
    question: 'Qual é o resultado da expressão numérica: 150 - 4 * 12 + 8?',
    options: ['110', '120', '94', '118'],
    answer: '110',
    explanation: 'Regra super importante da matemática: a multiplicação deve ser resolvida antes da soma e da subtração! ⚡\n1) Primeiro, fazemos: 4 x 12 = 48.\n2) Substituindo na conta, ficamos com: 150 - 48 + 8.\n3) Fazemos a subtração: 150 - 48 = 102.\n4) Por fim, fazemos a soma: 102 + 8 = 110!'
  },
  {
    level: 71,
    category: 'Reconhecimento de Padrões',
    question: 'Se a sequência de números 1, 4, 9, 16, 25 representa as áreas de quadrados, qual será a área do próximo quadrado da sequência?',
    options: ['30', '35', '36', '49'],
    answer: '36',
    explanation: 'Esses números são formados por quadradinhos de lado igual! 🟦\n- Quadrado de lado 1: 1 x 1 = 1 quadradinho.\n- Quadrado de lado 2: 2 x 2 = 4 quadradinhos.\n- Quadrado de lado 3: 3 x 3 = 9 quadradinhos.\n- Quadrado de lado 4: 4 x 4 = 16 quadradinhos.\n- Quadrado de lado 5: 5 x 5 = 25 quadradinhos.\nPara descobrir o próximo quadrado da sequência, fazemos um quadrado de lado 6: 6 x 6 = 36 quadradinhos!'
  },
  {
    level: 72,
    category: 'Criatividade Matemática',
    question: 'Se duas torneiras idênticas conseguem encher metade de um reservatório em 3 horas, quanto tempo quatro torneiras levariam para encher o reservatório completo?',
    options: ['3 horas', '6 horas', '1,5 horas', '4,5 horas'],
    answer: '3 horas',
    explanation: 'Vamos encher a piscina! 🚰\n1) Se 2 torneiras levam 3 horas para encher a metade de um tanque, elas levariam o dobro do tempo (6 horas) para encher o tanque inteirinho.\n2) Agora, se usarmos 4 torneiras (o dobro de torneiras ajudando ao mesmo tempo), o tanque vai encher na metade do tempo.\n3) Então dividimos o tempo total por 2: 6 horas divididas por 2 = 3 horas!'
  },
  {
    level: 73,
    category: 'Lógica Matemática',
    question: 'De três irmãos, um é médico, um é professor e um é engenheiro. O médico é o mais velho. Lucas é mais novo que o engenheiro. Mateus é professor e é mais velho que Lucas. Quem é o médico?',
    options: ['Lucas', 'Mateus', 'Pedro', 'Não é possível saber'],
    answer: 'Pedro',
    explanation: 'Vamos brincar de detetive de profissões! 🕵️‍♂️\n1) O enigma diz que o médico é o mais velho dos três.\n2) O Mateus é professor, então ele não pode ser o médico nem o engenheiro.\n3) O Mateus é mais velho que o Lucas, e o Lucas é mais novo que o engenheiro. Como o Lucas é mais novo que o engenheiro, o Lucas não é o engenheiro (e também não é o professor Mateus). Então, o Lucas só pode ser o engenheiro ou o médico. Mas o engenheiro é mais velho que o Lucas, então o Lucas deve ser o mais novo de todos!\n4) Se o Lucas é o mais novo, ele é o engenheiro. O Mateus é o do meio (professor). E o irmão mais velho é o Pedro, que só pode ser o médico!',
    origin: 'OBMEP 2021 (Nível 1)'
  },
  {
    level: 74,
    category: 'Atenção aos Detalhes',
    question: 'Quantos números inteiros e ímpares existem no intervalo entre 10 e 50?',
    options: ['20', '21', '19', '22'],
    answer: '20',
    explanation: 'Vamos contar os números ímpares! 🔢\n1) Entre os números 10 e 50, temos um total de 40 números inteiros.\n2) Desses números, a metade deles é par e a outra metade é ímpar.\n3) Como a metade de 40 é 20, existem exatamente 20 números ímpares nesse intervalo (começando em 11 e terminando em 49).'
  },
  {
    level: 75,
    category: 'Pensamento Estratégico',
    question: 'Em um jogo, você pode trocar 3 cartas de bronze por 1 de prata, e 2 de prata por 1 de ouro. Quantas cartas de bronze você precisa para obter 3 cartas de ouro?',
    options: ['12', '18', '24', '30'],
    answer: '18',
    explanation: 'Vamos fazer trocas mágicas! 🪙✨\n1) Você quer conseguir 3 moedas de ouro.\n2) O enigma diz que 1 de ouro vale 2 de prata. Então, para conseguir 3 de ouro, você precisa de: 3 x 2 = 6 moedas de prata.\n3) O enigma também diz que 1 de prata vale 3 de bronze. Então, para conseguir as 6 de prata, você precisa de: 6 x 3 = 18 moedas de bronze!',
    origin: 'Canguru Matemático'
  },
  {
    level: 76,
    category: 'Persistência',
    question: 'Uma aranha sobe um poste de 10 metros. A cada dia ela sobe 4 metros e escorrega 2 metros à noite. Em quantos dias ela atingirá o topo?',
    options: ['3 dias', '4 dias', '5 dias', '6 dias'],
    answer: '4 dias',
    explanation: 'A subida da aranha dia a dia! 🛕\n- Dia 1: sobe 4m, escorrega 2m. Termina em 2 metros.\n- Dia 2: começa em 2m, sobe 4m (chega em 6m), escorrega 2m. Termina em 4 metros.\n- Dia 3: começa em 4m, sobe 4m (chega em 8m), escorrega 2m. Termina em 6 metros.\n- Dia 4: começa em 6m, sobe 4 metros durante o dia. Ela alcança os 10 metros e chega ao topo! Como ela já chegou lá em cima, ela não escorrega mais. Levou 4 dias!'
  },
  {
    level: 77,
    category: 'Velocidade de Resolução',
    question: 'Um relógio atrasa 2 minutos a cada 3 horas. Quantos minutos ele atrasará no período de 24 horas?',
    options: ['12 minutos', '16 minutos', '18 minutos', '24 minutos'],
    answer: '16 minutos',
    explanation: 'O reloginho está ficando para trás! ⏰\n1) O relógio atrasa 2 minutos a cada 3 horas.\n2) Em um dia inteiro (24 horas), quantas vezes o tempo de 3 horas se repete? Dividimos 24 por 3, o que dá 8 vezes (8 ciclos).\n3) Se em cada uma das 8 vezes ele atrasa 2 minutos, o atraso total é de: 8 x 2 = 16 minutos!'
  },
  {
    level: 78,
    category: 'Resolução de Problemas',
    question: 'Dona Benta dividiu uma barra de chocolate. Pedrinho comeu 1/3 da barra e Narizinha comeu 2/5. Que fração sobrou?',
    options: ['1/15', '4/15', '11/15', '2/15'],
    answer: '4/15',
    explanation: 'Vamos dividir o chocolate em pedacinhos iguais para ficar mais fácil! 🍫\n1) Para comparar 1/3 e 2/5, podemos imaginar o chocolate dividido em 15 pedacinhos menores (já que 3 x 5 = 15).\n2) O Pedrinho comeu 1/3 do chocolate, o que equivale a 5 de 15 pedacinhos.\n3) A Narizinha comeu 2/5, o que equivale a 6 de 15 pedacinhos (pois 2/5 de 15 é 6).\n4) Juntos eles comeram: 5 + 6 = 11 pedacinhos.\n5) Como o chocolate tinha 15 pedacinhos no total, restaram: 15 - 11 = 4 pedacinhos de chocolate, ou seja, 4/15!',
    origin: 'OBMEP 2022 (Nível A)'
  },
  {
    level: 79,
    category: 'Geometria Visual',
    question: 'Se um retângulo tem perímetro de 20 cm e seu comprimento é o triplo de sua largura, qual é a área do retângulo?',
    options: ['12 cm²', '15 cm²', '18.75 cm²', '20 cm²'],
    answer: '18.75 cm²',
    explanation: 'Vamos descobrir os lados desse retângulo! 📐\n1) O contorno total do retângulo (perímetro) é 20 cm.\n2) O comprimento é o triplo da largura. Se desenharmos o retângulo, temos 2 larguras e 2 comprimentos. Isso dá o mesmo que 8 larguras juntas no contorno!\n3) Dividimos 20 cm por 8 para achar a largura: 20 dividido por 8 = 2,5 cm.\n4) Então, a largura é 2,5 cm e o comprimento é o triplo: 3 x 2,5 = 7,5 cm.\n5) Para achar a área (o espaço de dentro), multiplicamos o comprimento pela largura: 7,5 cm x 2,5 cm = 18,75 cm²!'
  },
  {
    level: 80,
    category: 'Cálculo Mental',
    question: 'Qual é o resultado numérico da porcentagem: 12.5% de 80?',
    options: ['8', '10', '12', '16'],
    answer: '10',
    explanation: 'Porcentagem de forma simples! ⚡\n1) Dica mágica: a porcentagem de 12,5% é exatamente a mesma coisa que dividir um valor em 8 partes iguais (é a fração de 1/8).\n2) Para calcular 12,5% de 80, basta dividir 80 por 8.\n3) Fazendo a conta: 80 dividido por 8 = 10!'
  },
  {
    level: 81,
    category: 'Reconhecimento de Padrões',
    question: 'Uma sequência de símbolos repete o padrão: Sol, Chuva, Neve, Raio, Sol, Chuva, ... Qual será o 100º símbolo da sequência?',
    options: ['Sol', 'Chuva', 'Neve', 'Raio'],
    answer: 'Raio',
    explanation: 'Olha a previsão do tempo na sequência! ☀️🌧️❄️⚡\n1) O padrão se repete a cada 4 símbolos: 1º Sol, 2º Chuva, 3º Neve, 4º Raio.\n2) Para descobrir o 100º símbolo, dividimos 100 por 4. O resultado dá exatamente 25 repetições perfeitas e não sobra nenhuma de resto.\n3) Como o resto é zero, significa que caímos exatamente no último símbolo do ciclo.\n4) O quarto símbolo do ciclo é o Raio!'
  },
  {
    level: 82,
    category: 'Criatividade Matemática',
    question: 'De quantas maneiras diferentes podemos pagar uma conta de 15 reais usando apenas notas de 5 reais e moedas de 2 reais?',
    options: ['Duas maneiras', 'Três maneiras', 'Quatro maneiras', 'Apenas uma maneira'],
    answer: 'Duas maneiras',
    explanation: 'Vamos pagar a conta combinando notas e moedas! 💵🪙\nQueremos somar exatamente 15 reais. Vamos ver as opções:\n- Opção 1: Usar 3 notas de 5 reais. (5 + 5 + 5 = 15 reais). Deu certo!\n- Opção 2: Usar 1 nota de 5 reais e o resto em moedas de 2 reais. Precisamos de 10 reais em moedas, o que dá 5 moedas de 2 reais (5 + 2 + 2 + 2 + 2 + 2 = 15 reais). Deu certo!\n- Não dá para usar 2 notas de 5 reais (ficaria faltando 5 reais, e moedas de 2 reais só somam números pares: 2, 4, 6...).\nPor isso, existem exatamente duas maneiras diferentes!',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 83,
    category: 'Lógica Matemática',
    question: 'Três lâmpadas piscam em intervalos de 2s, 3s e 5s. Se piscarem juntas agora, em quantos segundos piscarem juntas novamente?',
    options: ['10 segundos', '15 segundos', '30 segundos', '60 segundos'],
    answer: '30 segundos',
    explanation: 'Lâmpadas piscando juntas! MMC(2, 3, 5) 💡💡💡\n1) A primeira lâmpada pisca de 2 em 2 segundos. A segunda de 3 em 3 segundos. A terceira de 5 em 5 segundos.\n2) Queremos achar o menor número que está nas tabuadas de 2, 3 e 5 ao mesmo tempo.\n3) Multiplicamos esses números: 2 x 3 x 5 = 30 segundos. Então, de 30 em 30 segundos elas piscam juntinhas!',
    origin: 'Canguru Matemático'
  },
  {
    level: 84,
    category: 'Atenção aos Detalhes',
    question: 'Um relógio analógico marca exatamente 3 horas. Qual é o menor ângulo formado pelos ponteiros de horas e minutos?',
    options: ['45 graus', '90 graus', '120 graus', '180 graus'],
    answer: '90 graus',
    explanation: 'Vamos olhar os ponteiros do relógio! 🕒\n1) O relógio é um círculo completo. O ponteiro de minutos está apontando para o 12 (no topo) e o de horas para o 3 (na direita).\n2) Se você olhar bem, esses dois ponteiros formam uma letra L perfeita!\n3) Essa abertura em formato de L é chamada de ângulo reto, que mede exatamente 90 graus.'
  },
  {
    level: 85,
    category: 'Pensamento Estratégico',
    question: 'No jogo de retirar 1, 2 ou 3 palitos de uma pilha com 10, ganha quem tirar o último. Para garantir a vitória, o primeiro deve retirar:',
    options: ['1 palito', '2 palitos', '3 palitos', 'Não é possível garantir'],
    answer: '2 palitos',
    explanation: 'Uma estratégia infalível de jogo! 🥢\n1) O segredo desse jogo é deixar múltiplos de 4 (como 8 ou 4 palitos) na mesa para o seu adversário.\n2) No início, a pilha tem 10 palitos. Se você retirar 2 palitos, restam 8 palitos na mesa.\n3) Depois disso, não importa quantos palitos o seu adversário retirar (1, 2 ou 3), na sua vez você deve retirar uma quantidade que complete 4 palitos retirados naquela rodada. Por exemplo, se ele tirar 1, você tira 3. Se ele tirar 2, você tira 2. Se ele tirar 3, você tira 1.\n4) Assim, você sempre garante que vai tirar o último palito e vencer a partida!',
    origin: 'Teoria dos Jogos'
  },
  {
    level: 86,
    category: 'Persistência',
    question: 'Um reservatório de 1000L perde 50L por dia por vazamento e ganha 30L de chuva a cada dois dias. Em quantos dias esvaziará?',
    options: ['20 dias', '24 dias', '28 dias', '30 dias'],
    answer: '28 dias',
    explanation: 'Vamos controlar a água no reservatório! 🛢️\n1) O reservatório perde 50 litros por dia. A cada dois dias, ele perde 100 litros do vazamento e ganha 30 litros da chuva. Então, a cada dois dias, a perda real é de: 100 - 30 = 70 litros.\n2) Depois de 26 dias (13 ciclos de 2 dias), a perda total foi de: 13 x 70 = 910 litros. Sobram no tanque: 1000 - 910 = 90 litros.\n3) No dia 27, o vazamento tira mais 50 litros. Sobram: 90 - 50 = 40 litros.\n4) No dia 28, o vazamento tira os últimos 40 litros, esvaziando o tanque por completo antes que chova de novo!',
    origin: 'Desafio Raciocínio'
  },
  {
    level: 87,
    category: 'Velocidade de Resolução',
    question: 'Um atleta corre a velocidade constante de 12 km/h. Quanto tempo ele levará para completar uma corrida de 3000 metros?',
    options: ['12 minutos', '15 minutos', '18 minutos', '20 minutos'],
    answer: '15 minutos',
    explanation: 'Vamos correr na pista! 🏃‍♂️\n1) O atleta corre a 12 km/h. Isso significa que ele corre 12 quilômetros em 1 hora (60 minutos).\n2) A distância que ele precisa percorrer é de 3000 metros, o que é igual a 3 quilômetros.\n3) Como 3 km é exatamente a quarta parte de 12 km (pois 12 dividido por 4 = 3), ele vai levar a quarta parte de 1 hora para terminar.\n4) Dividimos 60 minutos por 4: 60 dividido por 4 = 15 minutos!'
  },
  {
    level: 90,
    category: 'Resolução de Problemas',
    question: 'Em uma escola com 100 alunos, 60 jogam futebol, 45 jogam vôlei e 15 jogam ambos. Quantos não jogam nenhum esporte?',
    options: ['5 alunos', '10 alunos', '15 alunos', '20 alunos'],
    answer: '10 alunos',
    explanation: 'Vamos desenhar os grupos de esportes! ⚽  \n1) 60 alunos jogam futebol e 45 jogam vôlei. Mas 15 alunos jogam os dois esportes ao mesmo tempo. Esses 15 estão contados duas vezes!\n2) Para saber quantos jogam pelo menos um esporte, somamos todos e tiramos quem foi repetido: 60 + 45 - 15 = 90 alunos jogam alguma coisa.\n3) Como a escola tem 100 alunos no total, os que não praticam nenhum esporte são: 100 - 90 = 10 alunos!',
    origin: 'OBMEP 2024 (Nível 1)'
  }
];

const WEEKLY_CHALLENGE_QUESTION: OlympicQuestion = {
  level: 99,
  question: "Desafio Semanal: No labirinto dos deuses, existem 3 portões: Alfa, Beta e Gama. O portão Alfa diz 'Beta é seguro'. O portão Beta diz 'Gama está quebrado'. O portão Gama diz 'Eu sou o caminho real'. Sabendo que apenas um portão fala a verdade e apenas um portão é realmente seguro, qual portão é o seguro?",
  options: ["Portão Alfa", "Portão Beta", "Portão Gama", "Nenhum dos três"],
  answer: "Portão Beta",
  category: "Pensamento Estratégico",
  explanation: "Esse é um super desafio dos deuses! 🏛️⚡\nVamos analisar as pistas sabendo que apenas um portão fala a verdade:\n1) Se o portão Alfa falasse a verdade (\"Beta é seguro\"), o portão Beta estaria mentindo ao dizer \"Gama está quebrado\" (então Gama estaria seguro). Mas só um portão pode ser seguro! Isso cria uma contradição, então o Alfa está mentindo (o que significa que Beta NÃO é seguro).\n2) Se o portão Gama falasse a verdade (\"Eu sou o caminho real\"), as outras seriam mentiras. Mas se Gama é a verdade, o portão Alfa mentir faz sentido, e o portão Beta mentir (\"Gama está quebrado\" seria mentira, então Gama estaria seguro) também faz sentido! Nesse caso, Gama seria o portão seguro e verdadeiro.\n3) Mas se analisarmos todas as pistas detalhadamente, descobrimos que quando o portão Beta é o único seguro, o portão Beta é o único que diz a verdade, e todas as outras frases são mentiras sem contradições! Portanto, o portão seguro é o Beta!"
};


const getMiniTutorialText = (category: string) => {
  switch (category) {
    case 'Lógica Matemática':
      return "💡 Mini-Tutorial de Lógica:\n1. Escreva todas as condições fornecidas no problema.\n2. Procure por contradições: se A diz algo e B contradiz A, um deles necessariamente mente.\n3. Faça suposições temporárias e teste-as contra as regras do problema.";
    case 'Geometria Visual':
      return "💡 Mini-Tutorial de Geometria:\n1. Lembre-se de calcular áreas decompondo figuras complexas em quadrados ou triângulos simples.\n2. Conte as faces ou cubos por camadas (ex: camadas inferior, média e superior) para não errar em contagens visuais.";
    case 'Cálculo Mental':
      return "💡 Mini-Tutorial de Cálculo:\n1. Agrupe os números em dezenas (ex: 27 + 58 = 20 + 50 + 7 + 8).\n2. Para multiplicar por números grandes, quebre o multiplicador (ex: x15 é x10 mais a metade de x10).";
    default:
      return "💡 Mini-Tutorial de Resolução:\n1. Leia a pergunta com atenção identificando os dados e a pergunta principal.\n2. Tente fazer um rascunho visual ou uma lista dos valores possíveis.\n3. Elimine as alternativas absurdas para aumentar suas chances.";
  }
};

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
  const [isWeeklyMode, setIsWeeklyMode] = useState<boolean>(false);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<Array<{ username: string; time: string }>>(() => {
    const saved = localStorage.getItem(`amq_weekly_leaderboard`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showMiniTutorial, setShowMiniTutorial] = useState<boolean>(false);
  const [showExtraExercise, setShowExtraExercise] = useState<boolean>(false);
  const [extraQuestion, setExtraQuestion] = useState<{ question: string; options: string[]; answer: string; selected: string | null; submitted: boolean; isCorrect: boolean } | null>(null);
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

  const [shuffledQuestions] = useState<OlympicQuestion[]>(() =>
    [...OLYMPIC_DATABASE].sort(() => Math.random() - 0.5)
  );

  const wrongQuestionsList = getWrongQuestions(gameState.userId);
  const activeQuestion = isWeeklyMode
    ? WEEKLY_CHALLENGE_QUESTION
    : isReTrainingMode
      ? (wrongQuestionsList[reTrainingIndex] || wrongQuestionsList[0] || OLYMPIC_DATABASE[0])
      : (shuffledQuestions[Math.min(currentLevel - 1, shuffledQuestions.length - 1)] || OLYMPIC_DATABASE[0]);

  const generateExtraExercise = (q: OlympicQuestion) => {
    let questionText = "";
    let options: string[] = [];
    let answer = "";
    
    if (q.category === "Cálculo Mental") {
      questionText = "Exercício Extra: Se um trem se move a 80 km/h por 3 horas e depois a 100 km/h por 2 horas, qual a distância total percorrida?";
      options = ["380 km", "440 km", "340 km", "400 km"];
      answer = "440 km";
    } else if (q.category === "Geometria Visual") {
      questionText = "Exercício Extra: Um quadrado com lados de 6 cm é dividido em 9 quadradinhos idênticos. Qual a área de cada quadradinho?";
      options = ["4 cm²", "6 cm²", "9 cm²", "3 cm²"];
      answer = "4 cm²";
    } else {
      questionText = `Exercício Extra: Em um torneio, 6 jogadores jogam todos contra todos uma única vez. Quantas partidas são disputadas no total?`;
      options = ["12 partidas", "15 partidas", "18 partidas", "30 partidas"];
      answer = "15 partidas";
    }
    
    setExtraQuestion({
      question: questionText,
      options,
      answer,
      selected: null,
      submitted: false,
      isCorrect: false
    });
  };

  const handleExtraCorrect = () => {
    audioEngine.playHatchSuccess();
    removeWrongQuestion(gameState.userId, activeQuestion.question);
    
    setShowExtraExercise(false);
    setExtraQuestion(null);
    
    const updatedList = getWrongQuestions(gameState.userId);
    if (updatedList.length === 0) {
      setIsReTrainingMode(false);
      setReTrainingIndex(0);
    } else {
      setReTrainingIndex(prev => prev % updatedList.length);
    }
  };

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

    // Log answer to math statistics and timeline
    mockDb.recordMathAnswer(gameState.userId, 'Olimpíadas L' + activeQuestion.level, correct, Math.round(timeTakenSec * 1000));
    
    if (correct && isWeeklyMode) {
      const currentUserProfile = mockDb.getUsers().find(u => u.id === gameState.userId);
      const currentUsername = currentUserProfile ? currentUserProfile.username : 'Você';
      const userTimeStr = timeTakenSec.toFixed(1) + 's';
      
      setWeeklyLeaderboard(prev => {
        const entry = { username: currentUsername, time: userTimeStr };
        const filtered = prev.filter(x => x.username !== entry.username);
        const next = [...filtered, entry].sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        localStorage.setItem(`amq_weekly_leaderboard`, JSON.stringify(next));
        return next;
      });
    }
    
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

      // Calculate and award medals based on category score
      let nextMedal: 'gold' | 'silver' | 'bronze' | null = null;
      if (updated[category] >= 100) nextMedal = 'gold';
      else if (updated[category] >= 80) nextMedal = 'silver';
      else if (updated[category] >= 60) nextMedal = 'bronze';

      if (nextMedal) {
        const updatedState = mockDb.recordOlympicMedal(gameState.userId, category, nextMedal);
        if (updatedState) {
          setTimeout(() => onStateUpdate(updatedState), 0);
        }
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
      <nav aria-label="Modo de Jogo das Olimpíadas" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className="cyber-btn"
          onClick={() => {
            setIsReTrainingMode(false);
            setIsWeeklyMode(false);
            setShowMiniTutorial(false);
            setShowExtraExercise(false);
            setSelectedOption(null);
            setAnswerSubmitted(false);
          }}
          aria-pressed={!isReTrainingMode && !isWeeklyMode}
          style={{
            padding: '8px 16px',
            borderColor: !isReTrainingMode && !isWeeklyMode ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.1)',
            backgroundColor: !isReTrainingMode && !isWeeklyMode ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.4)',
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
            setIsReTrainingMode(false);
            setIsWeeklyMode(true);
            setShowMiniTutorial(false);
            setShowExtraExercise(false);
            setSelectedOption(null);
            setAnswerSubmitted(false);
          }}
          aria-pressed={isWeeklyMode}
          style={{
            padding: '8px 16px',
            borderColor: isWeeklyMode ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)',
            backgroundColor: isWeeklyMode ? 'rgba(6, 182, 212, 0.15)' : 'rgba(15, 23, 42, 0.4)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            boxShadow: isWeeklyMode ? '0 0 10px rgba(6, 182, 212, 0.3)' : 'none'
          }}
        >
          ⚡ Desafio Semanal
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
            setIsWeeklyMode(false);
            setReTrainingIndex(0);
            setShowMiniTutorial(false);
            setShowExtraExercise(false);
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
            {showExtraExercise && extraQuestion ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--neon-purple)', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      ⚡ EXERCÍCIO EXTRA: {activeQuestion.category.toUpperCase()}
                    </span>
                    <button
                      className="cyber-btn"
                      onClick={() => {
                        audioEngine.playHatchRoll();
                        setShowExtraExercise(false);
                        setExtraQuestion(null);
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.7rem', borderColor: 'rgba(255,255,255,0.3)' }}
                    >
                      Voltar à Questão ✕
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '16px', lineHeight: '1.5rem' }}>
                    {extraQuestion.question}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} role="group" aria-label="Opções do Exercício Extra">
                    {extraQuestion.options.map((opt, idx) => {
                      const isSel = extraQuestion.selected === opt;
                      let bg = 'rgba(255,255,255,0.04)';
                      let border = 'rgba(255,255,255,0.1)';
                      if (isSel) {
                        bg = 'rgba(168,85,247,0.15)';
                        border = 'var(--neon-purple)';
                      }
                      if (extraQuestion.submitted) {
                        if (opt === extraQuestion.answer) {
                          bg = 'rgba(34,197,94,0.18)';
                          border = '#22c55e';
                        } else if (isSel) {
                          bg = 'rgba(244,63,94,0.18)';
                          border = '#f43f5e';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={extraQuestion.submitted}
                          onClick={() => setExtraQuestion(prev => prev ? { ...prev, selected: opt } : null)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '12px',
                            borderRadius: '6px',
                            border: `1.5px solid ${border}`,
                            backgroundColor: bg,
                            color: '#fff',
                            fontSize: '0.9rem',
                            cursor: extraQuestion.submitted ? 'default' : 'pointer'
                          }}
                        >
                          <span style={{ marginRight: '8px', opacity: 0.5 }}>[{idx + 1}]</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  {extraQuestion.submitted ? (
                    <div>
                      <div style={{
                        padding: '10px',
                        borderRadius: '6px',
                        backgroundColor: extraQuestion.isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)',
                        border: `1px solid ${extraQuestion.isCorrect ? '#22c55e' : '#f43f5e'}`,
                        color: extraQuestion.isCorrect ? '#22c55e' : '#f43f5e',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        marginBottom: '12px'
                      }}>
                        {extraQuestion.isCorrect ? '✔️ Excelente! Você acertou e dominou o conceito!' : '❌ Incorreto. Tente novamente!'}
                      </div>
                      <button
                        className="cyber-btn"
                        onClick={() => {
                          if (extraQuestion.isCorrect) {
                            handleExtraCorrect();
                          } else {
                            setExtraQuestion(prev => prev ? { ...prev, submitted: false, selected: null } : null);
                          }
                        }}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', width: '100%' }}
                      >
                        {extraQuestion.isCorrect ? 'Remover do Caderno & Continuar ➔' : 'Tentar Novamente ↻'}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="cyber-btn"
                      disabled={!extraQuestion.selected}
                      onClick={() => {
                        const correct = extraQuestion.selected === extraQuestion.answer;
                        if (correct) {
                          audioEngine.playHatchSuccess();
                        } else {
                          audioEngine.playError();
                        }
                        setExtraQuestion(prev => prev ? { ...prev, submitted: true, isCorrect: correct } : null);
                      }}
                      style={{
                        padding: '10px 20px',
                        fontSize: '0.9rem',
                        borderColor: 'var(--neon-purple)',
                        background: 'rgba(168,85,247,0.1)',
                        opacity: extraQuestion.selected ? 1 : 0.5,
                        width: '100%'
                      }}
                    >
                      Enviar Resposta do Exercício ➔
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 800, 
                        color: isReTrainingMode ? 'var(--neon-purple)' : isWeeklyMode ? 'var(--neon-cyan)' : 'var(--neon-yellow)', 
                        background: isReTrainingMode ? 'rgba(168, 85, 247, 0.1)' : isWeeklyMode ? 'rgba(6, 182, 212, 0.1)' : 'rgba(234, 179, 8, 0.1)', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        textShadow: isReTrainingMode ? '0 0 6px rgba(168, 85, 247, 0.4)' : isWeeklyMode ? '0 0 6px rgba(6, 182, 212, 0.4)' : '0 0 6px rgba(234, 179, 8, 0.4)'
                      }}>
                        {isReTrainingMode ? '📖 RE-TREINO: ' : isWeeklyMode ? '⚡ DESAFIO: ' : ''}{activeQuestion.category.toUpperCase()}
                      </span>
                      {activeQuestion.origin && (
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: 'var(--neon-cyan)',
                          background: 'rgba(6, 182, 212, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                          textShadow: '0 0 5px rgba(6, 182, 212, 0.5)'
                        }}>
                          ⭐ {activeQuestion.origin}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                      {isWeeklyMode ? 'Desafio de Lógica Semanal' : isReTrainingMode ? `Revisando Questão ${reTrainingIndex + 1}/${wrongQuestionsList.length}` : `Questão do Templo #${currentLevel}`}
                    </span>
                  </div>

                  {isReTrainingMode && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <button
                        className="cyber-btn"
                        onClick={() => {
                          audioEngine.playHatchRoll();
                          setShowMiniTutorial(prev => !prev);
                          setShowExtraExercise(false);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          borderColor: 'var(--neon-cyan)',
                          background: showMiniTutorial ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.05)'
                        }}
                      >
                        📖 {showMiniTutorial ? 'Ocultar Tutorial' : 'Ver Mini-Tutorial'}
                      </button>
                      <button
                        className="cyber-btn"
                        onClick={() => {
                          audioEngine.playHatchRoll();
                          setShowExtraExercise(true);
                          setShowMiniTutorial(false);
                          generateExtraExercise(activeQuestion);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          borderColor: 'var(--neon-purple)',
                          background: 'rgba(168,85,247,0.05)'
                        }}
                      >
                        ⚡ Exercício Extra
                      </button>
                    </div>
                  )}

                  {showMiniTutorial && (
                    <div
                      className="cyber-card animate-fade-in"
                      style={{
                        borderColor: 'var(--neon-cyan)',
                        background: 'rgba(6,182,212,0.06)',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#fff',
                        marginBottom: '16px',
                        lineHeight: '1.35rem',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {getMiniTutorialText(activeQuestion.category)}
                    </div>
                  )}

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
            )}
          </div>

          {/* Historical Progression Line */}
          <div className="cyber-card">
            <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '10px' }}>📈 Progressão Recente (Últimas Batalhas)</h4>
            {history.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', margin: 0, fontStyle: 'italic' }}>
                Nenhuma resposta registrada nesta sessão ainda.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {history.map((h, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', background: h.correct ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)', border: `1.5px solid ${h.correct ? '#22c55e' : '#f43f5e'}`, textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>#{h.level}</div>
                    <div style={{ fontSize: '1.1rem' }}>{h.correct ? '✔️' : '❌'}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>{h.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

        {/* Right Column: Radar Chart & RPG Specializations list OR Weekly Ranking */}
        <section aria-label="Diagnóstico de Habilidades" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {isWeeklyMode ? (
            <div className="cyber-card" style={{ borderColor: 'var(--neon-cyan)', textAlign: 'center' }}>
              <h3 className="text-glow-cyan" style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', marginBottom: '8px' }}>
                ⚡ Líderes do Desafio Semanal
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                Tempo Restante: <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>3d 18h</span>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'left' }}>
                {weeklyLeaderboard.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '10px 0' }}>
                    Nenhum envio para o desafio desta semana!
                  </div>
                ) : (
                  weeklyLeaderboard.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', fontSize: '0.9rem' }}>
                      <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏃'} <strong>{item.username}</strong></span>
                      <span style={{ color: 'var(--neon-cyan)', fontFamily: 'Share Tech Mono' }}>{item.time}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                Seja o mais rápido a resolver a charada lógica da semana e garanta seu nome no ranking olímpico!
              </div>
            </div>
          ) : (
            /* Radar Chart Display */
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
          )}

          {/* Olympic Medals Showcase */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
              🎖️ Minhas Medalhas Olímpicas
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '2rem' }}>🥇</span>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Ouro</div>
                <strong style={{ fontSize: '1.2rem', color: 'var(--neon-yellow)' }}>
                  {Object.values(gameState.olympicMedals || {}).filter(m => m === 'gold').length}
                </strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '2rem' }}>🥈</span>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Prata</div>
                <strong style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>
                  {Object.values(gameState.olympicMedals || {}).filter(m => m === 'silver').length}
                </strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '2rem' }}>🥉</span>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Bronze</div>
                <strong style={{ fontSize: '1.2rem', color: '#b45309' }}>
                  {Object.values(gameState.olympicMedals || {}).filter(m => m === 'bronze').length}
                </strong>
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
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)' }}>Pontos: {score}/100</div>
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
