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
    explanation: 'Se Carla veste verde, sobram azul e vermelho. Como Ana não veste vermelho, Ana veste azul. Logo, Beatriz veste vermelho.'
  },
  {
    level: 2,
    category: 'Geometria Visual',
    question: 'Nícolas tem duas peças de papelão formato retangular com medidas 3 cm por 4 cm. Ele junta essas duas peças de várias formas sem sobreposição. Qual das seguintes figuras NÃO pode ser formada por essas duas peças?',
    options: ['Retângulo de 3 cm por 8 cm', 'Retângulo de 6 cm por 4 cm', 'Retângulo de 6 cm por 8 cm', 'Uma figura em formato de L com lados alternados'],
    answer: 'Retângulo de 6 cm por 8 cm',
    explanation: 'A área total das duas peças juntas é 3*4 + 3*4 = 24 cm². Um retângulo de 6 cm por 8 cm teria área de 48 cm², o que é o dobro da área disponível. Portanto, é impossível formá-lo.',
    origin: 'OBMEP 2023 (Nível 1)'
  },
  {
    level: 3,
    category: 'Cálculo Mental',
    question: 'Um sorvete custa 6 reais. Se você comprar 4 sorvetes e pagar com uma nota de 50 reais, quanto receberá de troco?',
    options: ['24 reais', '26 reais', '30 reais', '34 reais'],
    answer: '26 reais',
    explanation: 'O custo total dos sorvetes é 4 * 6 = 24 reais. O troco será 50 - 24 = 26 reais.',
    origin: 'Canguru Matemático'
  },
  {
    level: 4,
    category: 'Resolução de Problemas',
    question: 'Vítor tem uma fita adesiva de 1 metro de comprimento. Ele usou pedaços de 15 centímetros para fechar caixas de presente. Qual é o maior número de caixas de presente que ele conseguiu fechar com essa fita?',
    options: ['5 caixas', '6 caixas', '7 caixas', '8 caixas'],
    answer: '6 caixas',
    explanation: '1 metro equivale a 100 centímetros. Dividindo 100 por 15, temos 100 = 6 * 15 + 10. Portanto, ele consegue fechar no máximo 6 caixas completas.',
    origin: 'OBMEP 2023 (Nível A)'
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
    level: 6,
    category: 'Reconhecimento de Padrões',
    question: 'Em uma fila de 10 pessoas, cada um a partir do segundo na fila tem 2 anos a mais que o anterior. Se a primeira pessoa da fila tem 8 anos, qual é a idade da última pessoa da fila?',
    options: ['24 anos', '26 anos', '28 anos', '30 anos'],
    answer: '26 anos',
    explanation: 'A idade do n-ésimo termo é dada por 8 + (n-1)*2. Para n=10, temos 8 + 9 * 2 = 8 + 18 = 26 anos.',
    origin: 'OBMEP 2017 (Nível 1)'
  },
  {
    level: 7,
    category: 'Resolução de Problemas',
    question: 'Para pintar um muro, 3 pintores levam 6 dias. Quantos dias levariam 9 pintores para pintar o mesmo muro no mesmo ritmo?',
    options: ['2 dias', '3 dias', '4 dias', '18 dias'],
    answer: '2 dias',
    explanation: 'Se triplicamos o número de pintores (de 3 para 9), o tempo necessário cai para um terço: 6 / 3 = 2 dias.',
    origin: 'Olimpíada de Maio'
  },
  {
    level: 8,
    category: 'Geometria Visual',
    question: 'Na malha quadriculada de quadradinhos de 1 cm x 1 cm, desenhamos uma letra O estilizada constituída por uma moldura externa de 4 cm x 4 cm de onde foi retirado um quadrado central de 2 cm x 2 cm. Qual é a área dessa letra O?',
    options: ['8 cm²', '12 cm²', '14 cm²', '16 cm²'],
    answer: '12 cm²',
    explanation: 'Área da moldura total: 4 * 4 = 16 cm². Área do quadrado retirado: 2 * 2 = 4 cm². Área restante da letra O: 16 - 4 = 12 cm².',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 9,
    category: 'Resolução de Problemas',
    question: 'Um suco de laranja é feito misturando-se 2 copos de suco concentrado com 5 copos de água. Para fazer uma jarra maior mantendo o mesmo sabor, quantos copos de água devem ser misturados com 6 copos de suco concentrado?',
    options: ['10 copos de água', '12 copos de água', '15 copos de água', '18 copos de água'],
    answer: '15 copos de água',
    explanation: 'A proporção é de 2 partes de suco para 5 de água. Se triplicamos a quantidade de suco concentrado (de 2 para 6 copos), devemos triplicar a água: 5 * 3 = 15 copos.',
    origin: 'OBMEP 2018 (Nível A)'
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
    level: 11,
    category: 'Reconhecimento de Padrões',
    question: 'Sofia escreveu uma palavra repetidamente: AURAURAURA... seguindo o mesmo padrão de repetição. Qual será a 50ª letra escrita por Sofia?',
    options: ['A', 'U', 'R', 'Não é possível saber'],
    answer: 'U',
    explanation: 'O padrão "AUR" tem tamanho 3. Dividindo 50 por 3, temos 50 = 16 * 3 + 2. O resto é 2, o que significa que a 50ª letra corresponde à 2ª letra do padrão, que é "U".',
    origin: 'OBMEP 2021 (Nível A)'
  },
  {
    level: 12,
    category: 'Lógica Matemática',
    question: 'A formiguinha da OBMEP quer andar do ponto A (canto inferior esquerdo) ao ponto B (canto superior direito) seguindo as linhas de uma grade de 2x2. Ela só pode andar para a direita ou para cima. De quantas maneiras diferentes ela pode fazer esse trajeto?',
    options: ['4 caminhos', '6 caminhos', '8 caminhos', '10 caminhos'],
    answer: '6 caminhos',
    explanation: 'Para ir de (0,0) a (2,2) dando 4 passos (2 para a direita e 2 para cima), o número de caminhos é a combinação de 4 elementos 2 a 2: C(4,2) = 6 caminhos (D-D-C-C, D-C-D-C, D-C-C-D, C-D-D-C, C-D-C-D, C-C-D-D).',
    origin: 'OBMEP 2022 (Nível 1)'
  },
  {
    level: 13,
    category: 'Reconhecimento de Padrões',
    question: 'Qual é o próximo número na sequência numérica: 2, 4, 8, 16, 32, ...?',
    options: ['40', '48', '64', '80'],
    answer: '64',
    explanation: 'Cada termo é o dobro do termo anterior na progressão geométrica. Portanto, 32 * 2 = 64.',
    origin: 'Canguru Matemático'
  },
  {
    level: 14,
    category: 'Atenção aos Detalhes',
    question: 'Joãozinho escreveu os números de 1 a 20 em uma folha. Ele apagou todos os números pares e, em seguida, apagou todos os múltiplos de 3 que restaram. Quantos números sobraram escritos na folha?',
    options: ['7 números', '8 números', '9 números', '10 números'],
    answer: '7 números',
    explanation: 'Ímpares de 1 a 20: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19 (10 números). Apagando múltiplos de 3 (3, 9, 15): restam 1, 5, 7, 11, 13, 17, 19. Total de 7 números.',
    origin: 'OBMEP 2021 (Nível 1)'
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
    level: 16,
    category: 'Resolução de Problemas',
    question: 'Um vaso cheio de água pesa 900 gramas. Se jogarmos metade da água fora, o vaso com o restante da água passa a pesar 500 gramas. Quanto pesa o vaso vazio?',
    options: ['100 gramas', '200 gramas', '300 gramas', '400 gramas'],
    answer: '100 gramas',
    explanation: 'A metade da água pesa 900 - 500 = 400g. Logo, a água toda pesa 800g. O vaso vazio pesa 900 - 800 = 100g.',
    origin: 'OBMEP 2022 (Nível A)'
  },
  {
    level: 17,
    category: 'Criatividade Matemática',
    question: 'Em uma caixa temos 5 bolas azuis, 5 bolas vermelhas e 5 bolas amarelas. Retiramos bolas de olhos vendados. Qual é o menor número de bolas que devemos retirar para ter certeza de que pegamos pelo menos duas da mesma cor?',
    options: ['3 bolas', '4 bolas', '5 bolas', '6 bolas'],
    answer: '4 bolas',
    explanation: 'Pelo Princípio da Casa dos Pombos, ao retirar 3 bolas, podemos pegar uma de cada cor. Ao retirar a 4ª bola, ela obrigatoriamente repetirá uma das cores das bolas já retiradas.',
    origin: 'OBMEP 2019 (Nível A)'
  },
  {
    level: 18,
    category: 'Pensamento Estratégico',
    question: 'Três cartões numerados com 1, 2 e 3 são colocados em uma linha. Podemos trocar a posição de dois cartões vizinhos por vez. Qual é o número mínimo de trocas necessárias para inverter completamente a ordem dos cartões, deixando-os como 3, 2, 1?',
    options: ['2 trocas', '3 trocas', '4 trocas', '5 trocas'],
    answer: '3 trocas',
    explanation: 'Começando em [1, 2, 3]: Troca vizinhos 1 e 2 -> [2, 1, 3]. Troca vizinhos 1 e 3 -> [2, 3, 1]. Troca vizinhos 2 e 3 -> [3, 2, 1]. Portanto, o mínimo de trocas necessárias é 3.',
    origin: 'OBMEP 2019 (Nível 1)'
  },
  {
    level: 19,
    category: 'Lógica Matemática',
    question: 'Uma pizza foi cortada em 8 fatias iguais. Se você comer 3 fatias, que fração da pizza restará no prato?',
    options: ['3/8', '5/8', '1/2', '8/5'],
    answer: '5/8',
    explanation: 'Se comemos 3 fatias de 8, restam 8 - 3 = 5 fatias. Em forma de fração, representamos por 5/8.',
    origin: 'Canguru Matemático'
  },
  {
    level: 20,
    category: 'Atenção aos Detalhes',
    question: 'Quantos números contendo o algarismo 7 existem entre os números de 1 a 50?',
    options: ['5', '14', '15', '20'],
    answer: '5',
    explanation: 'Listando com atenção: 7, 17, 27, 37, 47. Logo, existem exatamente 5 números com o algarismo 7 nesse intervalo.'
  },
  {
    level: 21,
    category: 'Pensamento Estratégico',
    question: 'Teresa quer preencher uma tabela 3x3 com os números 1, 2 e 3 de forma que a soma de cada linha e de cada coluna seja a mesma. Qual deve ser o valor da soma de cada linha e coluna?',
    options: ['5', '6', '7', '9'],
    answer: '6',
    explanation: 'Os números usados em cada linha/coluna devem somar 6 (uma combinação possível é usar 1, 2, 3 em cada linha e coluna. A soma é 1+2+3=6).',
    origin: 'OBMEP 2024 (Nível 1)'
  },
  {
    level: 22,
    category: 'Lógica Matemática',
    question: 'Manuela quer pintar as quatro regiões de uma bandeira em linha (R1, R2, R3, R4) usando três cores: azul, vermelho e amarelo. Regiões vizinhas não podem ter a mesma cor. Se ela pintar R1 de azul, de quantas maneiras pode pintar o resto?',
    options: ['4 maneiras', '6 maneiras', '8 maneiras', '12 maneiras'],
    answer: '8 maneiras',
    explanation: 'R1 é azul. Para R2 sobram 2 cores. Para R3 sobram 2 cores (diferentes de R2). Para R4 sobram 2 cores (diferentes de R3). Multiplicando as possibilidades: 1 * 2 * 2 * 2 = 8 maneiras.',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 23,
    category: 'Atenção aos Detalhes',
    question: 'Quantas vezes o algarismo 9 aparece ao escrevermos todos os números inteiros de 1 a 100?',
    options: ['10 vezes', '19 vezes', '20 vezes', '21 vezes'],
    answer: '20 vezes',
    explanation: 'Aparece nas unidades de: 9, 19, 29, 39, 49, 59, 69, 79, 89, 99 (10 vezes, sendo 2 no 99) e nas dezenas de 90 a 99 (10 vezes). Total de 20 vezes.',
    origin: 'OBMEP 2015 (Nível 1)'
  },
  {
    level: 24,
    category: 'Persistência',
    question: 'Uma formiguinha caminha pelas arestas de um cubo de arame de 10 cm de aresta. Ela quer ir de um vértice A a um vértice B oposto pelo caminho mais curto seguindo as arestas. Qual a distância percorrida por ela?',
    options: ['20 cm', '30 cm', '40 cm', '50 cm'],
    answer: '30 cm',
    explanation: 'Em um cubo, o caminho mais curto sobre as arestas de um vértice ao seu oposto exige percorrer exatamente 3 arestas distintas. Logo, 3 * 10 cm = 30 cm.',
    origin: 'OBMEP 2016 (Nível A)'
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
    level: 26,
    category: 'Atenção aos Detalhes',
    question: 'Um número inteiro de três algarismos tem a propriedade de que o algarismo das centenas é igual ao algarismo das unidades. Quantos números assim existem entre 100 e 999?',
    options: ['90 números', '100 números', '900 números', '99 números'],
    answer: '90 números',
    explanation: 'O número tem a forma ABA. O algarismo das centenas A pode ser escolhido de 1 a 9 (9 opções). O algarismo das dezenas B pode ser de 0 a 9 (10 opções). O algarismo das unidades é igual a A (1 opção). Total = 9 * 10 * 1 = 90 números.',
    origin: 'OBMEP 2023 (Nível 1)'
  },
  {
    level: 27,
    category: 'Pensamento Estratégico',
    question: 'Em uma gaveta há 10 meias pretas e 10 meias brancas. Se você retirar as meias no escuro, qual o menor número de meias que precisa tirar para garantir que terá pelo menos um par de meias da mesma cor?',
    options: ['2 meias', '3 meias', '11 meias', '12 meias'],
    answer: '3 meias',
    explanation: 'Retirando 3 meias, pelo menos duas devem ser pretas ou duas brancas, pois só temos duas cores disponíveis (Princípio da Casa dos Pombos).',
    origin: 'Canguru Matemático'
  },
  {
    level: 28,
    category: 'Resolução de Problemas',
    question: 'Em uma escola, os alunos da Olimpíada de Matemática foram divididos em salas. Se colocarmos 3 alunos em cada sala, sobra 1 aluno. Se colocarmos 4 alunos em cada sala, uma sala fica vazia. Quantos alunos participam dessa Olimpíada?',
    options: ['10 alunos', '13 alunos', '16 alunos', '20 alunos'],
    answer: '16 alunos',
    explanation: 'Equacionando: a = 3s + 1 e a = 4(s - 1) = 4s - 4. Igualando: 3s + 1 = 4s - 4 => s = 5. Logo, a = 3(5) + 1 = 16 alunos.',
    origin: 'OBMEP 2018 (Nível 1)'
  },
  {
    level: 29,
    category: 'Persistência',
    question: 'Um sapo sobe 2 metros de uma parede de dia e escorrega 1 metro à noite. Se a parede tem 5 metros de altura, em qual dia o sapo chegará ao topo da parede?',
    options: ['3º dia', '4º dia', '5º dia', '6º dia'],
    answer: '4º dia',
    explanation: 'No fim do 3º dia ele está na marca de 3 metros. No 4º dia, ele sobe 2 metros, atingindo a marca de 5 metros e saindo da parede antes de escorregar.',
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
    explanation: '3 passos para frente dão 6 casas. 1 para trás volta para 5. Total de 4 passos. 3 passos para frente dão 6 (passou). 2 para frente e 1 para trás dá 3.'
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
    explanation: 'A expressão verbal "metade de 2, mais 2" representa (2 / 2) + 2 = 1 + 2 = 3.',
    origin: 'Desafio Raciocínio'
  },
  {
    level: 34,
    category: 'Cálculo Mental',
    question: 'Qual é o dobro de 15 somado com o triplo de 10?',
    options: ['45', '60', '75', '80'],
    answer: '60',
    explanation: 'O dobro de 15 é 30. O triplo de 10 é 30. Somando 30 + 30 = 60.'
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
    level: 36,
    category: 'Lógica Matemática',
    question: 'Em uma caixa, há 6 fichas numeradas de 1 a 6. Retiramos duas fichas sem olhar. Qual é a probabilidade de que a soma dos números das fichas retiradas seja igual a 7?',
    options: ['1/5', '1/3', '1/2', '2/5'],
    answer: '1/5',
    explanation: 'Total de duplas possíveis de 6 fichas: (6 * 5) / 2 = 15 pares. Os pares favoráveis que somam 7 são: (1,6), (2,5), (3,4). São 3 pares. Probabilidade: 3/15 = 1/5.',
    origin: 'OBMEP 2017 (Nível A)'
  },
  {
    level: 37,
    category: 'Resolução de Problemas',
    question: 'Um livro tem 120 páginas. Se ler 10 páginas por dia, em quantas semanas terminarei a leitura completa?',
    options: ['1 semana', '2 semanas', '12 dias', 'Mais de 3 semanas'],
    answer: '2 semanas',
    explanation: '120 páginas dividido por 10 páginas ao dia resulta em 12 dias. Como 1 semana tem 7 dias, 12 dias cabem na segunda semana (14 dias).',
    origin: 'Canguru Matemático'
  },
  {
    level: 38,
    category: 'Lógica Matemática',
    question: 'Se o ontem de amanhã é segunda-feira, que dia da semana é hoje?',
    options: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Sábado'],
    answer: 'Segunda-feira',
    explanation: 'O ontem do amanhã é o próprio dia de hoje. Portanto, hoje é segunda-feira.'
  },
  {
    level: 39,
    category: 'Geometria Visual',
    question: 'Quantos cubos de 1 cm de aresta cabem perfeitamente dentro de uma caixa cúbica de 3 cm de aresta?',
    options: ['9 cubos', '18 cubos', '27 cubos', '36 cubos'],
    answer: '27 cubos',
    explanation: 'Volume da caixa grande: 3 * 3 * 3 = 27 cm³. Como cada cubinho tem 1 cm³, cabem exatamente 27 cubinhos.',
    origin: 'Canguru Matemático'
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
    level: 41,
    category: 'Reconhecimento de Padrões',
    question: 'Se a letra A = 1, B = 2, C = 3, etc. Qual é a soma dos valores numéricos das letras da palavra AURA?',
    options: ['38', '40', '42', '45'],
    answer: '42',
    explanation: 'Valores: A=1, U=21, R=19, A=1. Somando: 1 + 21 + 19 + 1 = 42.'
  },
  {
    level: 42,
    category: 'Criatividade Matemática',
    question: 'Qual é o número que, se somado com o seu próprio dobro, resulta em 24?',
    options: ['6', '8', '12', '16'],
    answer: '8',
    explanation: 'A equação é x + 2x = 24 => 3x = 24 => x = 8.'
  },
  {
    level: 43,
    category: 'Atenção aos Detalhes',
    question: 'Um avião decola às 14h30 de Brasília e pousa em Salvador às 16h15 do mesmo dia. Quanto tempo durou o voo de avião?',
    options: ['1h15min', '1h30min', '1h45min', '2h15min'],
    answer: '1h45min',
    explanation: 'De 14h30 até 15h30 é 1 hora. De 15h30 até 16h15 são mais 45 minutos. Total de 1 hora e 45 minutos.'
  },
  {
    level: 44,
    category: 'Pensamento Estratégico',
    question: 'Em uma fila de banco, Júlia está na 5ª posição de frente para trás e na 6ª posição de trás para frente. Quantas pessoas estão na fila?',
    options: ['10 pessoas', '11 pessoas', '9 pessoas', '12 pessoas'],
    answer: '10 pessoas',
    explanation: 'Há 4 pessoas na frente de Júlia e 5 pessoas atrás dela. Total: 4 + Júlia (1) + 5 = 10 pessoas.',
    origin: 'OBMEP 2012 (Nível A)'
  },
  {
    level: 45,
    category: 'Velocidade de Resolução',
    question: 'Um relógio digital marca 12:34. Daqui a quantos minutos o relógio marcará 13:11 pela primeira vez?',
    options: ['37 minutos', '58 minutos', '68 minutos', '77 minutos'],
    answer: '37 minutos',
    explanation: 'De 12:34 até 13:00 são 26 minutos. De 13:00 até 13:11 são mais 11 minutos. Somando ambos: 26 + 11 = 37 minutos.'
  },
  {
    level: 46,
    category: 'Persistência',
    question: 'Cinco amigos disputaram uma corrida. Beto chegou antes de Carlos, mas depois de Adriano. Daniel chegou antes de Eduardo, mas depois de Carlos. Quem ganhou a corrida?',
    options: ['Adriano', 'Beto', 'Carlos', 'Daniel'],
    answer: 'Adriano',
    explanation: 'Temos a ordem: Adriano > Beto > Carlos > Daniel > Eduardo. Logo, Adriano foi o primeiro colocado.',
    origin: 'OBMEP 2018 (Nível A)'
  },
  {
    level: 47,
    category: 'Velocidade de Resolução',
    question: 'Se 5 impressoras imprimem 5 panfletos em 5 segundos, quantos segundos 10 impressoras de mesma capacidade levarão para imprimir 10 panfletos?',
    options: ['5 segundos', '10 segundos', '2 segundos', '1 segundo'],
    answer: '5 segundos',
    explanation: 'Como cada impressora imprime 1 panfleto em 5 segundos de forma independente, 10 impressoras trabalhando juntas farão 10 panfletos nos mesmos 5 segundos.'
  },
  {
    level: 48,
    category: 'Resolução de Problemas',
    question: 'Um fazendeiro plantou 80 sementes. Sabendo que a cada 5 sementes plantadas, exatamente 4 germinam, quantas plantas o fazendeiro terá?',
    options: ['60 plantas', '64 plantas', '70 plantas', '75 plantas'],
    answer: '64 plantas',
    explanation: 'Multiplicamos o total pela taxa 4/5: 80 * (4/5) = 16 * 4 = 64 plantas germinadas.',
    origin: 'OBMEP 2021 (Nível 1)'
  },
  {
    level: 49,
    category: 'Geometria Visual',
    question: 'Quantos lados tem a figura formada ao juntarmos dois hexágonos regulares idênticos colados por um lado compartilhado completo?',
    options: ['10 lados', '11 lados', '12 lados', '8 lados'],
    answer: '10 lados',
    explanation: 'Cada hexágono tem 6 lados. Ao colá-los, a aresta de junção vai para o interior. A nova figura terá 6 + 6 - 2 = 10 lados externos.',
    origin: 'Canguru Matemático'
  },
  {
    level: 50,
    category: 'Resolução de Problemas',
    question: 'Em um sítio há galinhas e coelhos, totalizando 10 cabeças e 28 patas. Quantos coelhos há no sítio?',
    options: ['3 coelhos', '4 coelhos', '5 coelhos', '6 coelhos'],
    answer: '4 coelhos',
    explanation: 'Se todos fossem galinhas teríamos 20 patas. Sobram 8 patas (28 - 20). Cada coelho tem 2 patas a mais que a galinha, logo 8 / 2 = 4 coelhos.'
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
    explanation: 'A mesa segue a ordem circular: Ana - Maria - Paulo - Lucas. Logo, Lucas e Maria estão em posições diametralmente opostas.',
    origin: 'OBMEP 2017 (Nível 1)'
  },
  {
    level: 54,
    category: 'Atenção aos Detalhes',
    question: 'Se você escrever os números de 1 a 30 em ordem crescente, quantas vezes utilizará o algarismo 3?',
    options: ['3 vezes', '4 vezes', '12 vezes', '13 vezes'],
    answer: '4 vezes',
    explanation: 'O algarismo 3 aparece em: 3, 13, 23 e 30. Total de 4 vezes.'
  },
  {
    level: 55,
    category: 'Pensamento Estratégico',
    question: 'Quatro times disputam um torneio onde cada time joga exatamente uma vez contra todos os outros. Quantos jogos ocorrerão no total?',
    options: ['4 jogos', '6 jogos', '8 jogos', '12 jogos'],
    answer: '6 jogos',
    explanation: 'Para 4 times, as partidas possíveis são combinadas 2 a 2: (4 * 3) / 2 = 6 jogos.',
    origin: 'OBMEP 2019 (Nível A)'
  },
  {
    level: 56,
    category: 'Persistência',
    question: 'Para subir uma escada de 8 degraus, Tiago pode dar passos de 1 degrau ou pulos de 2 degraus de cada vez. De quantas maneiras diferentes ele pode subir essa escada?',
    options: ['21 maneiras', '34 maneiras', '55 maneiras', '8 maneiras'],
    answer: '34 maneiras',
    explanation: 'A progressão dos degraus segue a sequência de Fibonacci: 1, 2, 3, 5, 8, 13, 21, 34. Logo, para 8 degraus são 34 combinações.',
    origin: 'Desafio Fibonacci'
  },
  {
    level: 57,
    category: 'Velocidade de Resolução',
    question: 'Se duas torneiras de mesma capacidade enchem um tanque em 4 horas, quantas horas quatro dessas torneiras levariam para encher o mesmo tanque?',
    options: ['2 horas', '4 horas', '8 horas', '1 hora'],
    answer: '2 horas',
    explanation: 'Dobrando o número de torneiras de mesma vazão, o tempo cai pela metade: 4 / 2 = 2 horas.'
  },
  {
    level: 58,
    category: 'Resolução de Problemas',
    question: 'Um grupo de 5 amigos divide uma conta de restaurante. Se cada um pagou 18 reais e sobrou 2 reais de troco no total, qual era o valor da conta?',
    options: ['88 reais', '90 reais', '92 reais', '94 reais'],
    answer: '88 reais',
    explanation: 'O dinheiro pago pelos amigos foi 5 * 18 = 90 reais. Se sobrou 2 reais de troco, a conta foi de 90 - 2 = 88 reais.'
  },
  {
    level: 59,
    category: 'Geometria Visual',
    question: 'Se cortarmos um retângulo de 10 cm por 4 cm ao meio em seu lado maior, qual será o perímetro de um dos novos retângulos formados?',
    options: ['14 cm', '18 cm', '20 cm', '28 cm'],
    answer: '18 cm',
    explanation: 'O corte gera retângulos de 5 cm por 4 cm. Perímetro: 2 * (5 + 4) = 18 cm.'
  },
  {
    level: 60,
    category: 'Cálculo Mental',
    question: 'Qual é o resultado da operação aritmética: (12 * 5) + (24 / 3)?',
    options: ['64', '68', '72', '80'],
    answer: '68',
    explanation: '12 * 5 = 60. 24 / 3 = 8. Somando os dois resultados obtemos 68.'
  },
  {
    level: 61,
    category: 'Reconhecimento de Padrões',
    question: 'A sequência de letras A, B, D, G, K, ... segue um padrão de saltos no alfabeto. Qual é a próxima letra da sequência?',
    options: ['N', 'O', 'P', 'Q'],
    answer: 'P',
    explanation: 'Salto cresce de 1 em 1: +1 (A para B), +2 (B para D), +3 (D para G), +4 (G para K). O próximo salto é de +5: K + 5 = P.'
  },
  {
    level: 62,
    category: 'Criatividade Matemática',
    question: 'Se duas galinhas botam dois ovos em dois dias, quantos ovos seis galinhas botarão em seis dias?',
    options: ['6 ovos', '12 ovos', '18 ovos', '36 ovos'],
    answer: '18 ovos',
    explanation: '2 galinhas botam 2 ovos em 2 dias => 6 galinhas botam 6 ovos em 2 dias => Em 6 dias (3 ciclos de 2 dias), 6 galinhas botam 6 * 3 = 18 ovos.',
    origin: 'Canguru Matemático'
  },
  {
    level: 63,
    category: 'Lógica Matemática',
    question: 'Bruno tem mais figurinhas que Tiago, e Tiago tem menos que Rafael. Quem tem mais figurinhas entre Bruno e Rafael?',
    options: ['Bruno', 'Rafael', 'Eles têm a mesma quantidade', 'Não é possível saber'],
    answer: 'Não é possível saber',
    explanation: 'Sabemos que ambos têm mais que Tiago, mas não há informações comparando diretamente Bruno e Rafael.'
  },
  {
    level: 64,
    category: 'Atenção aos Detalhes',
    question: 'Uma costureira corta uma fita de 12 metros em pedaços de 2 metros cada um. Ela leva 5 segundos para fazer cada corte. Quanto tempo ela levará para cortar toda a fita?',
    options: ['25 segundos', '30 segundos', '20 segundos', '15 segundos'],
    answer: '25 segundos',
    explanation: 'Ela precisará fazer apenas 5 cortes para obter 6 pedaços. 5 cortes * 5 segundos = 25 segundos.'
  },
  {
    level: 65,
    category: 'Pensamento Estratégico',
    question: 'Para abrir um cadeado de 3 dígitos (onde cada dígito vai de 0 a 9), qual o número máximo de combinações que se deve testar?',
    options: ['100', '999', '1000', '30'],
    answer: '1000',
    explanation: 'Como cada posição tem 10 dígitos possíveis (0-9), o total de combinações é 10 * 10 * 10 = 1000.',
    origin: 'OBMEP 2014 (Nível A)'
  },
  {
    level: 66,
    category: 'Persistência',
    question: 'Um jogo de dados consiste em lançar dois dados normais de 6 faces. Você ganha se a soma das faces for 10 ou mais. Quantas combinações fazem você vencer?',
    options: ['3 combinações', '4 combinações', '5 combinações', '6 combinações'],
    answer: '6 combinações',
    explanation: 'Combinações válidas: (4,6), (5,5), (6,4) para soma 10; (5,6), (6,5) para soma 11; (6,6) para soma 12. Total de 6 combinações.'
  },
  {
    level: 67,
    category: 'Velocidade de Resolução',
    question: 'Um carro viaja a uma velocidade constante de 90 km/h. Qual distância ele percorrerá em 40 minutos?',
    options: ['50 km', '60 km', '70 km', '80 km'],
    answer: '60 km',
    explanation: '40 minutos correspondem a 2/3 de hora. 90 km/h * 2/3 h = 60 km.'
  },
  {
    level: 68,
    category: 'Resolução de Problemas',
    question: 'A soma das idades de Mariana e de sua mãe é 48 anos. Mariana tem exatamente um terço da idade da mãe. Quantos anos tem Mariana?',
    options: ['10 anos', '12 anos', '14 anos', '16 anos'],
    answer: '12 anos',
    explanation: 'f + 3f = 48 => 4f = 48 => f = 12 anos. A mãe tem 36 anos.',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 69,
    category: 'Geometria Visual',
    question: 'Qual é o perímetro de um triângulo retângulo cujos dois lados menores (catetos) medem 3 cm e 4 cm?',
    options: ['7 cm', '10 cm', '12 cm', '14 cm'],
    answer: '12 cm',
    explanation: 'Hipotenusa = raiz(3² + 4²) = 5 cm. O perímetro é a soma dos lados: 3 + 4 + 5 = 12 cm.'
  },
  {
    level: 70,
    category: 'Cálculo Mental',
    question: 'Qual é o resultado da expressão numérica: 150 - 4 * 12 + 8?',
    options: ['110', '120', '94', '118'],
    answer: '110',
    explanation: 'Primeiro fazemos a multiplicação: 4 * 12 = 48. Depois: 150 - 48 + 8 = 110.'
  },
  {
    level: 71,
    category: 'Reconhecimento de Padrões',
    question: 'Se a sequência de números 1, 4, 9, 16, 25 representa as áreas de quadrados, qual será a área do próximo quadrado da sequência?',
    options: ['30', '35', '36', '49'],
    answer: '36',
    explanation: 'Os números são quadrados perfeitos: 1², 2², 3², 4², 5². O próximo termo é 6² = 36.'
  },
  {
    level: 72,
    category: 'Criatividade Matemática',
    question: 'Se duas torneiras idênticas conseguem encher metade de um reservatório em 3 horas, quanto tempo quatro torneiras levariam para encher o reservatório completo?',
    options: ['3 horas', '6 horas', '1,5 horas', '4,5 horas'],
    answer: '3 horas',
    explanation: '2 torneiras enchem metade do tanque em 3h, logo encheriam todo em 6h. Se dobramos as torneiras para 4, o tempo cai pela metade: 6 / 2 = 3 horas.'
  },
  {
    level: 73,
    category: 'Lógica Matemática',
    question: 'De três irmãos, um é médico, um é professor e um é engenheiro. O médico é o mais velho. Lucas é mais novo que o engenheiro. Mateus é professor e é mais velho que Lucas. Quem é o médico?',
    options: ['Lucas', 'Mateus', 'Pedro', 'Não é possível saber'],
    answer: 'Pedro',
    explanation: 'Por eliminação de idades e profissões, Pedro é o médico (mais velho), Mateus é o professor (médio) e Lucas é o engenheiro (mais novo).',
    origin: 'OBMEP 2021 (Nível 1)'
  },
  {
    level: 74,
    category: 'Atenção aos Detalhes',
    question: 'Quantos números inteiros e ímpares existem no intervalo entre 10 e 50?',
    options: ['20', '21', '19', '22'],
    answer: '20',
    explanation: 'Existem 40 inteiros nesse intervalo. Exatamente a metade é ímpar, ou seja, 20.'
  },
  {
    level: 75,
    category: 'Pensamento Estratégico',
    question: 'Em um jogo, você pode trocar 3 cartas de bronze por 1 de prata, e 2 de prata por 1 de ouro. Quantas cartas de bronze você precisa para obter 3 cartas de ouro?',
    options: ['12', '18', '24', '30'],
    answer: '18',
    explanation: '3 ouro = 6 prata = 18 bronze. Multiplica-se: 3 * 2 * 3 = 18.',
    origin: 'Canguru Matemático'
  },
  {
    level: 76,
    category: 'Persistência',
    question: 'Uma aranha sobe um poste de 10 metros. A cada dia ela sobe 4 metros e escorrega 2 metros à noite. Em quantos dias ela atingirá o topo?',
    options: ['3 dias', '4 dias', '5 dias', '6 dias'],
    answer: '4 dias',
    explanation: 'Dia 3 termina na marca de 6 metros. No Dia 4, ela sobe 4 metros e atinge os 10 metros, saindo do topo.'
  },
  {
    level: 77,
    category: 'Velocidade de Resolução',
    question: 'Um relógio atrasa 2 minutos a cada 3 horas. Quantos minutos ele atrasará no período de 24 horas?',
    options: ['12 minutos', '16 minutos', '18 minutos', '24 minutos'],
    answer: '16 minutos',
    explanation: '24 horas / 3 horas = 8 ciclos. 8 ciclos * 2 minutos = 16 minutos de atraso.'
  },
  {
    level: 78,
    category: 'Resolução de Problemas',
    question: 'Dona Benta dividiu uma barra de chocolate. Pedrinho comeu 1/3 da barra e Narizinha comeu 2/5. Que fração sobrou?',
    options: ['1/15', '4/15', '11/15', '2/15'],
    answer: '4/15',
    explanation: 'Soma consumida: 1/3 + 2/5 = 11/15. O que restou é 15/15 - 11/15 = 4/15.',
    origin: 'OBMEP 2022 (Nível A)'
  },
  {
    level: 79,
    category: 'Geometria Visual',
    question: 'Se um retângulo tem perímetro de 20 cm e seu comprimento é o triplo de sua largura, qual é a área do retângulo?',
    options: ['12 cm²', '15 cm²', '18.75 cm²', '20 cm²'],
    answer: '18.75 cm²',
    explanation: 'Lados x e 3x. Perímetro: 8x = 20 => x = 2.5. Lados: 2.5 e 7.5. Área: 2.5 * 7.5 = 18.75 cm².'
  },
  {
    level: 80,
    category: 'Cálculo Mental',
    question: 'Qual é o resultado numérico da porcentagem: 12.5% de 80?',
    options: ['8', '10', '12', '16'],
    answer: '10',
    explanation: '12.5% equivale a 1/8. Logo, 80 / 8 = 10.'
  },
  {
    level: 81,
    category: 'Reconhecimento de Padrões',
    question: 'Uma sequência de símbolos repete o padrão: Sol, Chuva, Neve, Raio, Sol, Chuva, ... Qual será o 100º símbolo da sequência?',
    options: ['Sol', 'Chuva', 'Neve', 'Raio'],
    answer: 'Raio',
    explanation: 'Ciclo de 4 termos. 100 dividido por 4 dá resto 0, correspondendo ao quarto símbolo (Raio).'
  },
  {
    level: 82,
    category: 'Criatividade Matemática',
    question: 'De quantas maneiras diferentes podemos pagar uma conta de 15 reais usando apenas notas de 5 reais e moedas de 2 reais?',
    options: ['Duas maneiras', 'Três maneiras', 'Quatro maneiras', 'Apenas uma maneira'],
    answer: 'Duas maneiras',
    explanation: 'Maneiras: (3 de 5 reais) ou (1 de 5 reais + 5 de 2 reais). Apenas estas duas combinações somam 15.',
    origin: 'OBMEP 2023 (Nível A)'
  },
  {
    level: 83,
    category: 'Lógica Matemática',
    question: 'Três lâmpadas piscam em intervalos de 2s, 3s e 5s. Se piscarem juntas agora, em quantos segundos piscarão juntas novamente?',
    options: ['10 segundos', '15 segundos', '30 segundos', '60 segundos'],
    answer: '30 segundos',
    explanation: 'O menor tempo comum é o MMC(2, 3, 5) = 2 * 3 * 5 = 30 segundos.',
    origin: 'Canguru Matemático'
  },
  {
    level: 84,
    category: 'Atenção aos Detalhes',
    question: 'Um relógio analógico marca exatamente 3 horas. Qual é o menor ângulo formado pelos ponteiros de horas e minutos?',
    options: ['45 graus', '90 graus', '120 graus', '180 graus'],
    answer: '90 graus',
    explanation: 'Com 3 divisões de horas e 30 graus por hora, temos 3 * 30 = 90 graus (um ângulo reto).'
  },
  {
    level: 85,
    category: 'Pensamento Estratégico',
    question: 'No jogo de retirar 1, 2 ou 3 palitos de uma pilha com 10, ganha quem tirar o último. Para garantir a vitória, o primeiro deve retirar:',
    options: ['1 palito', '2 palitos', '3 palitos', 'Não é possível garantir'],
    answer: '2 palitos',
    explanation: 'Retirando 2 palitos você deixa a pilha com 8 (múltiplo de 4) para o adversário, o que permite controlar os complementos de soma 4 dali em diante até o fim.',
    origin: 'Teoria dos Jogos'
  },
  {
    level: 86,
    category: 'Persistência',
    question: 'Um reservatório de 1000L perde 50L por dia por vazamento e ganha 30L de chuva a cada dois dias. Em quantos dias esvaziará?',
    options: ['20 dias', '24 dias', '28 dias', '30 dias'],
    answer: '28 dias',
    explanation: 'No 26º dia resta 90 litros. No 27º dia perde 50L (resta 40L). No 28º dia perde os 40L restantes antes de qualquer nova chuva entrar.',
    origin: 'Desafio Raciocínio'
  },
  {
    level: 87,
    category: 'Velocidade de Resolução',
    question: 'Um atleta corre a velocidade constante de 12 km/h. Quanto tempo ele levará para completar uma corrida de 3000 metros?',
    options: ['12 minutos', '15 minutos', '18 minutos', '20 minutos'],
    answer: '15 minutos',
    explanation: '3000m = 3 km. Tempo = 3 / 12 = 0.25 horas, que corresponde a exatamente 15 minutos.'
  },
  {
    level: 90,
    category: 'Resolução de Problemas',
    question: 'Em uma escola com 100 alunos, 60 jogam futebol, 45 jogam vôlei e 15 jogam ambos. Quantos não jogam nenhum esporte?',
    options: ['5 alunos', '10 alunos', '15 alunos', '20 alunos'],
    answer: '10 alunos',
    explanation: 'Total com esporte: 60 + 45 - 15 = 90. Sem esporte: 100 - 90 = 10 alunos.',
    origin: 'OBMEP 2024 (Nível 1)'
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

  const [shuffledQuestions] = useState<OlympicQuestion[]>(() =>
    [...OLYMPIC_DATABASE].sort(() => Math.random() - 0.5)
  );

  const wrongQuestionsList = getWrongQuestions(gameState.userId);
  const activeQuestion = isReTrainingMode
    ? (wrongQuestionsList[reTrainingIndex] || wrongQuestionsList[0] || OLYMPIC_DATABASE[0])
    : (shuffledQuestions[Math.min(currentLevel - 1, shuffledQuestions.length - 1)] || OLYMPIC_DATABASE[0]);

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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
