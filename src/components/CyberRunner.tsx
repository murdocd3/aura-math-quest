import React, { useState, useEffect, useRef } from 'react';
import { mockDb, PET_TYPES } from '../services/mockDb';
import type { User, GameState } from '../services/mockDb';
import { audioEngine } from './AudioEngine';

interface CyberRunnerProps {
  playerUser: User;
  gameState: GameState;
  onBack: () => void;
  onStateUpdate: (newState: GameState) => void;
}

interface RunnerQuestion {
  num1: number;
  num2: number;
  answer: number;
  choices: number[]; // 3 choices for 3 lanes
  correctLane: number; // 0, 1, or 2
}

interface Obstacle {
  id: string;
  x: number;
  lane: number;
  width: number;
  height: number;
  passed: boolean;
  type?: 'spike' | 'laser';
}

interface GateColumn {
  id: string;
  x: number;
  question: RunnerQuestion;
  passed: boolean;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

interface Collectible {
  id: string;
  x: number;
  lane: number;
  type: 'gem' | 'magnet' | 'shield' | 'slowmo';
  width: number;
  height: number;
  passed: boolean;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  speedY: number;
}

interface Vehicle {
  id: string;
  name: string;
  cost: number;
  trailColor: string;
  boardColor: string;
  emoji: string;
}

const LANES = [40, 100, 160];
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 200;

const RUNNER_CONFIG = {
  initialSpeed: 3.5,
  maxSpeed: 7.0,
  speedIncrement: 0.25,
  obstacleSpawnRate: 3000,
  gateSpawnRate: 10000,
  collectibleSpawnRate: 1800,
  magnetDuration: 7.0,
  slowmoDuration: 5.0,
  slowmoFactor: 0.5,
  shieldMax: 3,
  
  // Pet specific variables
  petTimeBonus: 2.0, // extra seconds for slowmo/magnet duration
  petGemMultiplier: 2, // doubles the gem value (or adds extra gems)
};

const VEHICLES: Vehicle[] = [
  { id: 'light_skate', name: 'Skate de Luz', cost: 0, trailColor: '#00ffcc', boardColor: '#00ffcc', emoji: '🛹' },
  { id: 'tron_bike', name: 'Moto Tron', cost: 25, trailColor: '#ec4899', boardColor: '#a855f7', emoji: '🏍️' },
  { id: 'holo_board', name: 'Prancha Holográfica', cost: 50, trailColor: '#3b82f6', boardColor: '#ffffff', emoji: '🛸' },
];

export const CyberRunner: React.FC<CyberRunnerProps> = ({
  playerUser,
  gameState,
  onBack,
  onStateUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game States
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [shields, setShields] = useState<number>(3);
  const [xpGained, setXpGained] = useState<number>(0);
  const [gemsGained, setGemsGained] = useState<number>(0);
  const [questionsSolved, setQuestionsSolved] = useState<number>(0);

  // Active power-up states for the UI HUD
  const [hudMagnetActive, setHudMagnetActive] = useState<boolean>(false);
  const [hudShieldActive, setHudShieldActive] = useState<boolean>(false);
  const [hudSlowmoActive, setHudSlowmoActive] = useState<boolean>(false);

  // Fever Mode & HUD Question
  const [hudQuestion, setHudQuestion] = useState<RunnerQuestion | null>(null);
  const [hudFeverActive, setHudFeverActive] = useState<boolean>(false);
  const [hudFeverStreak, setHudFeverStreak] = useState<number>(0);

  // Boss Battle States
  const [hudBossActive, setHudBossActive] = useState<boolean>(false);
  const [bossHp, setBossHp] = useState<number>(3);
  const [bossQuestion, setBossQuestion] = useState<RunnerQuestion | null>(null);

  // Vehicle customization states
  const [selectedVehicle, setSelectedVehicle] = useState<string>(() => {
    return localStorage.getItem(`amq_runner_equipped_board_${playerUser.id}`) || 'light_skate';
  });
  const [purchasedVehicles, setPurchasedVehicles] = useState<string[]>(() => {
    const local = localStorage.getItem(`amq_runner_purchased_boards_${playerUser.id}`);
    return local ? JSON.parse(local) : ['light_skate'];
  });

  // Active question references (shared with canvas thread)
  const currentQuestionRef = useRef<RunnerQuestion | null>(null);
  const selectedOperation = gameState.selectedOperation || 'addition';

  // Learning Buff check: 2x XP if Addition is heavily grinded while player selected another underplayed op
  const isUnderplayedBonusActive = (() => {
    const stats = mockDb.getMathStats(playerUser.id);
    const addCount = stats.filter(s => s.questionKey.includes('+')).reduce((sum, s) => sum + s.correctCount, 0);
    const subCount = stats.filter(s => s.questionKey.includes('-')).reduce((sum, s) => sum + s.correctCount, 0);
    const multCount = stats.filter(s => s.questionKey.includes('x') || s.questionKey.includes('*')).reduce((sum, s) => sum + s.correctCount, 0);
    const divCount = stats.filter(s => s.questionKey.includes('/') || s.questionKey.includes('÷')).reduce((sum, s) => sum + s.correctCount, 0);
    
    if (addCount > 30) {
      if (selectedOperation === 'subtraction' && subCount < 15) return true;
      if (selectedOperation === 'multiplication' && multCount < 15) return true;
      if (selectedOperation === 'division' && divCount < 15) return true;
    }
    return false;
  })();

  // Game variables
  const playerLaneRef = useRef<number>(1);
  const playerYRef = useRef<number>(LANES[1]);
  const scoreRef = useRef<{ xp: number; gems: number }>({ xp: 0, gems: 0 });
  const shieldsRef = useRef<number>(3);
  
  // Power-up durations & flags
  const magnetTimeLeftRef = useRef<number>(0);
  const shieldActiveRef = useRef<boolean>(false);
  const slowmoTimeLeftRef = useRef<number>(0);
  
  // Speed & Distance Ramping
  const currentSpeedRef = useRef<number>(3.5);
  const distanceRef = useRef<number>(0);

  // Visual Effects Refs
  const shakeIntensityRef = useRef<number>(0);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const feverStreakRef = useRef<number>(0);
  const feverTimeLeftRef = useRef<number>(0);

  // Boss Battle Refs
  const bossActiveRef = useRef<boolean>(false);
  const bossHpRef = useRef<number>(3);
  const bossXRef = useRef<number>(CANVAS_WIDTH + 150);
  const bossQuestionRef = useRef<RunnerQuestion | null>(null);

  // Lists of moving objects
  const starsRef = useRef<Star[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const gatesRef = useRef<GateColumn[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);

  // Spawn timers
  const lastSpawnTime = useRef<number>(0);
  const lastGateTime = useRef<number>(0);
  const lastCollectibleTime = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Fetch equipped pet information
  const equippedPet = (() => {
    if (!gameState.equippedPetId) return null;
    const pets = mockDb.getPets(playerUser.id);
    const equipped = pets.find(p => p.id === gameState.equippedPetId);
    if (!equipped) return null;
    const petType = PET_TYPES.find(pt => pt.id === equipped.petTypeId);
    return {
      name: equipped.nickname,
      emoji: petType?.emoji || '🐾',
      rarity: equipped.rarity,
      buffType: equipped.buffType,
    };
  })();

  // Helper to resolve dynamic symbols
  const getOpSymbol = (op: string) => {
    switch (op) {
      case 'addition': return '+';
      case 'subtraction': return '-';
      case 'multiplication': return '×';
      case 'division': return '÷';
      default: return '+';
    }
  };

  // Generate a runner math question with adaptive complexity & Spaced Repetition
  const generateRunnerQuestion = (): RunnerQuestion => {
    const stats = mockDb.getMathStats(playerUser.id);
    const op = selectedOperation;

    // Filter stats matching the current operation
    const opStats = stats.filter(s => {
      if (op === 'addition') return s.questionKey.includes('+');
      if (op === 'subtraction') return s.questionKey.includes('-');
      if (op === 'multiplication') return s.questionKey.includes('x') || s.questionKey.includes('*');
      if (op === 'division') return s.questionKey.includes('/') || s.questionKey.includes('÷');
      return false;
    });

    // Find problem questions (correct ratio < 70% or has error count)
    const problemStats = opStats.filter(s => {
      const total = s.correctCount + s.errorCount;
      if (total === 0) return false;
      return (s.correctCount / total) < 0.70 || s.errorCount > 0;
    });

    let num1 = 2;
    let num2 = 2;
    let isSrsQuestion = false;

    // 40% chance of injecting a review question if any problem equations exist
    if (Math.random() < 0.40 && problemStats.length > 0) {
      const chosenStat = problemStats[Math.floor(Math.random() * problemStats.length)];
      // Parse operands (splitting by operator symbols)
      const parts = chosenStat.questionKey.split(/[\+\-\*x\/÷]/);
      if (parts.length >= 2) {
        num1 = parseInt(parts[0]);
        num2 = parseInt(parts[1]);
        if (!isNaN(num1) && !isNaN(num2)) {
          isSrsQuestion = true;
        }
      }
    }

    if (!isSrsQuestion) {
      // Scale complexity with total correct answers on this operator
      const totalAcertosOp = opStats.reduce((sum, s) => sum + s.correctCount, 0);
      const opLevel = Math.min(10, 1 + Math.floor(totalAcertosOp / 12));

      if (op === 'addition') {
        const maxLimit = 5 + opLevel * 2;
        num1 = Math.floor(Math.random() * maxLimit) + 2;
        num2 = Math.floor(Math.random() * maxLimit) + 2;
      } else if (op === 'subtraction') {
        const maxLimit = 8 + opLevel * 4;
        num1 = Math.floor(Math.random() * maxLimit) + 5;
        num2 = Math.floor(Math.random() * (num1 - 2)) + 1;
      } else if (op === 'division') {
        const maxDivisor = Math.min(10, 3 + Math.floor(opLevel * 0.7));
        const maxQuotient = Math.min(10, 3 + Math.floor(opLevel * 0.7));
        const divisor = Math.floor(Math.random() * (maxDivisor - 1)) + 2;
        const quotient = Math.floor(Math.random() * (maxQuotient - 1)) + 2;
        num1 = divisor * quotient;
        num2 = divisor;
      } else {
        // multiplication
        const maxLimit = Math.min(12, 3 + Math.floor(opLevel * 0.9));
        num1 = Math.floor(Math.random() * (maxLimit - 1)) + 2;
        num2 = Math.floor(Math.random() * (maxLimit - 1)) + 2;
      }
    }

    let answer = 0;
    if (op === 'addition') answer = num1 + num2;
    else if (op === 'subtraction') answer = num1 - num2;
    else if (op === 'division') answer = num1 / num2;
    else answer = num1 * num2;

    // Generate 3 choices
    const choices = new Set<number>([answer]);
    while (choices.size < 3) {
      const offset = Math.floor(Math.random() * 7) - 3;
      const fake = answer + (offset === 0 ? 4 : offset);
      if (fake > 0 && fake !== answer) {
        choices.add(fake);
      } else {
        choices.add(answer + Math.floor(Math.random() * 10) + 1);
      }
    }

    const choicesArray = Array.from(choices).sort(() => Math.random() - 0.5);
    const correctLane = choicesArray.indexOf(answer);

    return {
      num1,
      num2,
      answer,
      choices: choicesArray,
      correctLane,
    };
  };

  // Keyboard and Touch navigation
  useEffect(() => {
    let touchStartY = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver || bossActiveRef.current) return;

      if (e.key === 'ArrowUp' || e.key === 'w') {
        if (playerLaneRef.current > 0) {
          audioEngine.playHatchRoll();
          playerLaneRef.current -= 1;
        }
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        if (playerLaneRef.current < 2) {
          audioEngine.playHatchRoll();
          playerLaneRef.current += 1;
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isPlaying || gameOver || bossActiveRef.current || e.changedTouches.length === 0) return;
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchEndY - touchStartY;

      if (Math.abs(diffY) > 40) { // 40px threshold
        if (diffY < 0) { // swipe up
          if (playerLaneRef.current > 0) {
            audioEngine.playHatchRoll();
            playerLaneRef.current -= 1;
          }
        } else { // swipe down
          if (playerLaneRef.current < 2) {
            audioEngine.playHatchRoll();
            playerLaneRef.current += 1;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPlaying, gameOver]);

  // Click on lanes
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver || bossActiveRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Map y coordinate to lane index
    let selectedLane = 1;
    if (y < 70) selectedLane = 0;
    else if (y > 130) selectedLane = 2;

    if (selectedLane !== playerLaneRef.current) {
      audioEngine.playHatchRoll();
      playerLaneRef.current = selectedLane;
    }
  };

  // Helper to trigger Screen Shake
  const triggerScreenShake = (intensity: number) => {
    shakeIntensityRef.current = intensity;
  };

  // Helper to add Floating Text
  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      text,
      color,
      alpha: 1.0,
      speedY: -1.4,
    });
  };

  // Main Canvas Loop
  useEffect(() => {
    // Generate first question
    const firstQ = generateRunnerQuestion();
    currentQuestionRef.current = firstQ;
    setHudQuestion(firstQ);

    // Spawn initial stars
    const initialStars: Star[] = [];
    for (let i = 0; i < 40; i++) {
      initialStars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: Math.random() * 3 + 1,
        size: Math.random() * 2 + 0.5,
      });
    }
    starsRef.current = initialStars;

    // Reset loop states
    obstaclesRef.current = [];
    gatesRef.current = [];
    particlesRef.current = [];
    collectiblesRef.current = [];
    floatingTextsRef.current = [];
    scoreRef.current = { xp: 0, gems: 0 };
    shieldsRef.current = 3;
    currentSpeedRef.current = 3.5;
    distanceRef.current = 0;
    
    // Fever/Overdrive states reset
    feverStreakRef.current = 0;
    feverTimeLeftRef.current = 0;
    setHudFeverStreak(0);
    setHudFeverActive(false);

    // Boss States Reset
    bossActiveRef.current = false;
    bossHpRef.current = 3;
    bossXRef.current = CANVAS_WIDTH + 150;
    setHudBossActive(false);
    setBossHp(3);
    setBossQuestion(null);
    
    // Reset powerups
    magnetTimeLeftRef.current = 0;
    shieldActiveRef.current = false;
    slowmoTimeLeftRef.current = 0;
    setHudMagnetActive(false);
    setHudSlowmoActive(false);

    const startWithShield = equippedPet && (equippedPet.buffType === 'aura_multiplier' || equippedPet.buffType === 'combined');
    shieldActiveRef.current = !!startWithShield;
    setHudShieldActive(!!startWithShield);

    setShields(3);
    setGameOver(false);
    setIsPlaying(true);
    setXpGained(0);
    setGemsGained(0);
    setQuestionsSolved(0);

    let animationFrameId: number;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const updateAndRender = (time: number) => {
      if (!ctx || !canvasRef.current) return;

      // Delta time in seconds
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Update Power-up timers
      if (magnetTimeLeftRef.current > 0) {
        magnetTimeLeftRef.current -= dt;
        if (magnetTimeLeftRef.current <= 0) {
          magnetTimeLeftRef.current = 0;
          setHudMagnetActive(false);
        }
      }

      if (slowmoTimeLeftRef.current > 0) {
        slowmoTimeLeftRef.current -= dt;
        if (slowmoTimeLeftRef.current <= 0) {
          slowmoTimeLeftRef.current = 0;
          setHudSlowmoActive(false);
        }
      }

      if (feverTimeLeftRef.current > 0) {
        feverTimeLeftRef.current -= dt;
        if (feverTimeLeftRef.current <= 0) {
          feverTimeLeftRef.current = 0;
          setHudFeverActive(false);
          // speed returns to normal
        }
      }

      // Base game speed with slow-mo & Fever modifiers
      const baseSpeed = currentSpeedRef.current;
      const slowmoFactor = slowmoTimeLeftRef.current > 0 ? RUNNER_CONFIG.slowmoFactor : 1.0;
      const feverFactor = feverTimeLeftRef.current > 0 ? 2.0 : 1.0;
      const activeSpeed = bossActiveRef.current ? 0 : baseSpeed * slowmoFactor * feverFactor;

      // Increment distance
      if (!bossActiveRef.current) {
        distanceRef.current += activeSpeed * dt * 10; // scale meters
      }

      // --- SCREEN SHAKE PREPARATION ---
      ctx.save();
      if (shakeIntensityRef.current > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensityRef.current;
        const dy = (Math.random() - 0.5) * shakeIntensityRef.current;
        ctx.translate(dx, dy);
        // decay shake
        shakeIntensityRef.current *= 0.9;
        if (shakeIntensityRef.current < 0.2) shakeIntensityRef.current = 0;
      }

      // 1. CLEAR AND DRAW BACKGROUND
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // PARALLAX LAYER 1: Distant Cyber Skyscrapers
      const buildingOffset = (time * 0.03 * slowmoFactor * feverFactor) % 300;
      ctx.fillStyle = 'rgba(17, 24, 39, 0.4)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
      ctx.lineWidth = 1.5;
      for (let i = -1; i < 6; i++) {
        const bX = i * 160 - buildingOffset;
        const bWidth = 100;
        const bHeight = 80 + ((i * 47) % 50);
        ctx.fillRect(bX, CANVAS_HEIGHT - bHeight, bWidth, bHeight);
        ctx.strokeRect(bX, CANVAS_HEIGHT - bHeight, bWidth, bHeight);
        
        // Simple neon windows on skyscrapers
        ctx.fillStyle = 'rgba(0, 255, 204, 0.03)';
        ctx.fillRect(bX + 15, CANVAS_HEIGHT - bHeight + 15, 12, 12);
        ctx.fillRect(bX + 45, CANVAS_HEIGHT - bHeight + 15, 12, 12);
        ctx.fillRect(bX + 15, CANVAS_HEIGHT - bHeight + 40, 12, 12);
        ctx.fillStyle = 'rgba(17, 24, 39, 0.4)';
      }

      // Draw Grid Lines (moving left)
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.08)';
      ctx.lineWidth = 1;
      const gridOffset = (time * 0.15 * slowmoFactor * feverFactor) % 40;
      for (let x = -gridOffset; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Draw three lane lines (neon cyan)
      LANES.forEach(y => {
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      });

      // 2. RENDER STARS
      starsRef.current.forEach(star => {
        star.x -= star.speed * slowmoFactor * feverFactor;
        if (star.x < 0) {
          star.x = CANVAS_WIDTH;
          star.y = Math.random() * CANVAS_HEIGHT;
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // RENDER FEVER SPEEDLINES EFFECT
      if (feverTimeLeftRef.current > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const sY = (i * 18 + time * 0.2) % CANVAS_HEIGHT;
          const sX = (i * 97) % CANVAS_WIDTH;
          const sLen = 30 + Math.random() * 50;
          ctx.beginPath();
          ctx.moveTo(sX, sY);
          ctx.lineTo(sX + sLen, sY);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. SPAWN ENTITIES (Only if Boss is not active)
      if (!bossActiveRef.current) {
        const elapsed = time - lastSpawnTime.current;
        const timeSinceGate = time - lastGateTime.current;
        const timeSinceCollectible = time - lastCollectibleTime.current;

        // Spawn obstacle spikes / lasers / double obstacles
        const isAnyGateClose = gatesRef.current.some(gate => Math.abs(gate.x - (CANVAS_WIDTH + 20)) < 350);
        if (elapsed > RUNNER_CONFIG.obstacleSpawnRate && !isAnyGateClose && timeSinceGate < 7000) {
          const roll = Math.random();
          if (roll < 0.70) {
            // Normal Spike
            const lane = Math.floor(Math.random() * 3);
            obstaclesRef.current.push({
              id: Math.random().toString(36).substring(2, 9),
              x: CANVAS_WIDTH + 20,
              lane,
              width: 25,
              height: 25,
              passed: false,
              type: 'spike',
            });
          } else if (roll < 0.85) {
            // Lane Laser Indicator
            const lane = Math.floor(Math.random() * 3);
            obstaclesRef.current.push({
              id: Math.random().toString(36).substring(2, 9),
              x: CANVAS_WIDTH + 20,
              lane,
              width: 40,
              height: 20,
              passed: false,
              type: 'laser',
            });
          } else {
            // Double Spikes (2 lanes blocked simultaneously, leaving 1 safe lane)
            const safeLane = Math.floor(Math.random() * 3);
            [0, 1, 2].forEach(lane => {
              if (lane !== safeLane) {
                obstaclesRef.current.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: CANVAS_WIDTH + 20,
                  lane,
                  width: 25,
                  height: 25,
                  passed: false,
                  type: 'spike',
                });
              }
            });
          }
          lastSpawnTime.current = time;
        }

        // Spawn Question Gates
        if (timeSinceGate > RUNNER_CONFIG.gateSpawnRate || lastGateTime.current === 0) {
          const activeQ = currentQuestionRef.current || generateRunnerQuestion();
          currentQuestionRef.current = activeQ;
          setHudQuestion(activeQ);

          // Filter out obstacles too close
          obstaclesRef.current = obstaclesRef.current.filter(obs => {
            const distance = Math.abs(obs.x - (CANVAS_WIDTH + 100));
            if (obs.lane === activeQ.correctLane && distance < 350) {
              return false;
            }
            return true;
          });

          gatesRef.current.push({
            id: Math.random().toString(36).substring(2, 9),
            x: CANVAS_WIDTH + 100,
            question: activeQ,
            passed: false,
          });
          lastGateTime.current = time;
        }

        // Spawn Collectibles (Gems or Power-ups)
        if (timeSinceCollectible > RUNNER_CONFIG.collectibleSpawnRate && timeSinceGate < 8500) {
          const lane = Math.floor(Math.random() * 3);
          
          let type: 'gem' | 'magnet' | 'shield' | 'slowmo' = 'gem';
          const rand = Math.random();
          if (rand > 0.80) {
            const pRand = Math.random();
            if (pRand < 0.33) type = 'magnet';
            else if (pRand < 0.66) type = 'shield';
            else type = 'slowmo';
          }

          collectiblesRef.current.push({
            id: Math.random().toString(36).substring(2, 9),
            x: CANVAS_WIDTH + 20,
            lane,
            type,
            width: 18,
            height: 18,
            passed: false,
          });
          lastCollectibleTime.current = time;
        }
      }

      // 4. PLAYER MOVEMENT & ANIMATION
      // Interpolate player Y position smoothly to the selected lane
      const targetY = LANES[playerLaneRef.current];
      playerYRef.current += (targetY - playerYRef.current) * 0.25;

      // Spawn custom trail particles based on vehicle equipped
      const vehicleInfo = VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[0];
      if (Math.random() < 0.40) {
        particlesRef.current.push({
          x: 75,
          y: playerYRef.current + 12 + (Math.random() * 6 - 3),
          vx: -(Math.random() * 3 + 2),
          vy: Math.random() * 1.5 - 0.75,
          color: feverTimeLeftRef.current > 0 ? '#00ffcc' : vehicleInfo.trailColor,
          alpha: 1,
          size: Math.random() * 3.5 + 1.5,
        });
      }

      // Render Floating Pet
      if (equippedPet) {
        ctx.save();
        const petBob = Math.sin(time * 0.005) * 6;
        ctx.font = '1.4rem sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(equippedPet.emoji, 45, playerYRef.current - 14 + petBob);
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#a855f7';
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.beginPath();
        ctx.ellipse(45, playerYRef.current + 12 + petBob, 6, 2.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Player Wizard (glowing cyber hoverboard rider)
      ctx.save();
      const runnerColor = gameState.auraColor || '#00ffcc';
      ctx.shadowBlur = 15;
      ctx.shadowColor = runnerColor;
      
      // Cyber Hoverboard (Modified dynamically by equipped vehicle)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = vehicleInfo.boardColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (selectedVehicle === 'tron_bike') {
        // Tron bike shape
        ctx.arc(48, playerYRef.current + 12, 6, 0, Math.PI * 2);
        ctx.arc(74, playerYRef.current + 12, 6, 0, Math.PI * 2);
        ctx.moveTo(48, playerYRef.current + 12);
        ctx.lineTo(74, playerYRef.current + 12);
      } else {
        // Hoverboard shape
        ctx.moveTo(40, playerYRef.current + 12);
        ctx.lineTo(85, playerYRef.current + 12);
        ctx.lineTo(75, playerYRef.current + 19);
        ctx.lineTo(30, playerYRef.current + 19);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Engine Thruster Fire
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(32, playerYRef.current + 15);
      ctx.lineTo(15, playerYRef.current + 16);
      ctx.lineTo(32, playerYRef.current + 18);
      ctx.fill();

      // Cyber Wizard Body (hooded silhouette)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = runnerColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(45, playerYRef.current + 12);
      ctx.lineTo(55, playerYRef.current - 12); // top hood
      ctx.lineTo(65, playerYRef.current + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Neon Visor
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 10;
      ctx.fillRect(52, playerYRef.current - 3, 9, 3.5);

      ctx.restore();

      // Draw Active Shield Sphere
      if (shieldActiveRef.current) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffcc';
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.6)';
        ctx.fillStyle = 'rgba(0, 255, 204, 0.06)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(60, playerYRef.current + 8, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 5. UPDATE AND RENDER PARTICLES
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // reset alpha

      // 6. UPDATE AND RENDER OBSTACLES (SPIKES AND LASERS)
      obstaclesRef.current.forEach((obs, idx) => {
        obs.x -= activeSpeed;

        const obsY = LANES[obs.lane];
        const isLaser = obs.type === 'laser';

        if (isLaser) {
          ctx.save();
          ctx.shadowBlur = 15;
          const isWarning = obs.x > 320;
          if (isWarning) {
            // Draw flashing warning line
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
            ctx.shadowColor = '#f43f5e';
            ctx.lineWidth = 2;
            if (Math.floor(time / 100) % 2 === 0) {
              ctx.setLineDash([8, 4]);
            } else {
              ctx.setLineDash([2, 6]);
            }
            ctx.beginPath();
            ctx.moveTo(0, obsY);
            ctx.lineTo(CANVAS_WIDTH, obsY);
            ctx.stroke();

            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 9px Share Tech Mono';
            ctx.textAlign = 'left';
            ctx.fillText('⚠️ ALERTA: DISPARO DE LASER', 90, obsY - 8);
          } else {
            // Firing active laser beam
            ctx.strokeStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(0, obsY);
            ctx.lineTo(CANVAS_WIDTH, obsY);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, obsY);
            ctx.lineTo(CANVAS_WIDTH, obsY);
            ctx.stroke();
          }
          ctx.restore();
        } else {
          // Draw standard spike
          ctx.fillStyle = '#f43f5e';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#f43f5e';
          
          ctx.beginPath();
          ctx.moveTo(obs.x, obsY + 10);
          ctx.lineTo(obs.x + 12, obsY - 15);
          ctx.lineTo(obs.x + 25, obsY + 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Collision Check
        const playerX = 65;
        if (!obs.passed) {
          if (isLaser) {
            const isWarning = obs.x > 320;
            // Hit player if in same lane during the active fire window (and not invulnerable in Overdrive)
            if (!isWarning && feverTimeLeftRef.current <= 0 && obs.lane === playerLaneRef.current && obs.x > -20 && obs.x < 320) {
              obs.passed = true;
              handleCollisionDamage('Laser!');
            }
          } else {
            // Spike collision (ignored during Overdrive)
            if (feverTimeLeftRef.current <= 0 && obs.x < playerX + 15 && obs.x + obs.width > playerX - 15) {
              if (obs.lane === playerLaneRef.current) {
                obs.passed = true;
                handleCollisionDamage('Obstáculo!');
              }
            }
          }
        }

        // Clean up out of bounds obstacles
        if (obs.x < -30) {
          obstaclesRef.current.splice(idx, 1);
        }
      });

      // 7. UPDATE AND RENDER COLLECTIBLES
      collectiblesRef.current.forEach((item, idx) => {
        // Magnet effect / Fever mode magnet pull
        if ((magnetTimeLeftRef.current > 0 || feverTimeLeftRef.current > 0) && item.type === 'gem') {
          const dx = 65 - item.x;
          item.x += dx * 0.12;
          item.lane = playerLaneRef.current; // snap lane target
        } else {
          item.x -= activeSpeed;
        }

        ctx.save();
        const itemY = LANES[item.lane];
        ctx.shadowBlur = 10;

        if (item.type === 'gem') {
          ctx.fillStyle = '#22c55e';
          ctx.strokeStyle = '#fff';
          ctx.shadowColor = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(item.x, itemY - 8);
          ctx.lineTo(item.x + 8, itemY);
          ctx.lineTo(item.x, itemY + 8);
          ctx.lineTo(item.x - 8, itemY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (item.type === 'magnet') {
          ctx.fillStyle = '#3b82f6';
          ctx.shadowColor = '#3b82f6';
          ctx.font = '16px Share Tech Mono';
          ctx.textAlign = 'center';
          ctx.fillText('🧲', item.x, itemY + 5);
        } else if (item.type === 'shield') {
          ctx.fillStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.font = '16px Share Tech Mono';
          ctx.textAlign = 'center';
          ctx.fillText('🛡️', item.x, itemY + 5);
        } else if (item.type === 'slowmo') {
          ctx.fillStyle = '#eab308';
          ctx.shadowColor = '#eab308';
          ctx.font = '16px Share Tech Mono';
          ctx.textAlign = 'center';
          ctx.fillText('⏳', item.x, itemY + 5);
        }
        ctx.restore();

        // Check collision
        const playerX = 65;
        if (!item.passed && item.x < playerX + 18 && item.x + item.width > playerX - 18) {
          if (item.lane === playerLaneRef.current) {
            item.passed = true;
            collectiblesRef.current.splice(idx, 1);
            handleCollectiblePickup(item.type, item.x, itemY);
            return;
          }
        }

        if (item.x < -30) {
          collectiblesRef.current.splice(idx, 1);
        }
      });

      // 8. UPDATE AND RENDER QUESTION GATES
      gatesRef.current.forEach((gate, idx) => {
        gate.x -= activeSpeed;

        LANES.forEach((laneY, laneIdx) => {
          const answerVal = gate.question.choices[laneIdx];
          
          ctx.strokeStyle = 'var(--neon-purple)';
          ctx.lineWidth = 4;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#a855f7';

          ctx.fillRect(gate.x, laneY - 20, 45, 40);
          ctx.strokeRect(gate.x, laneY - 20, 45, 40);

          ctx.restore();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 1.2rem Share Tech Mono';
          ctx.textAlign = 'center';
          ctx.fillText(String(answerVal), gate.x + 22, laneY + 6);
        });

        const playerX = 65;
        if (!gate.passed && gate.x < playerX + 10 && gate.x + 45 > playerX - 10) {
          gate.passed = true;
          
          const chosenLane = playerLaneRef.current;
          const isCorrect = chosenLane === gate.question.correctLane;

          if (isCorrect) {
            handleGateSuccess(gate.x, LANES[chosenLane]);
          } else {
            handleCollisionDamage('Resposta Errada!');
          }

          const nextQ = generateRunnerQuestion();
          currentQuestionRef.current = nextQ;
          setHudQuestion(nextQ);
        }

        if (gate.x < -100) {
          gatesRef.current.splice(idx, 1);
        }
      });

      // 9. RENDER AND ANIMATE CYBER INVASOR BOSS
      if (bossActiveRef.current) {
        // Interpolate boss position onto screen
        bossXRef.current += (580 - bossXRef.current) * 0.1;

        // Render Boss Cyber Drone
        ctx.save();
        ctx.shadowBlur = 25;
        const pulseColor = Math.floor(time / 200) % 2 === 0 ? '#ef4444' : '#f43f5e';
        ctx.shadowColor = pulseColor;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = pulseColor;
        ctx.lineWidth = 3;

        // Drone Core Body
        ctx.beginPath();
        ctx.arc(bossXRef.current, CANVAS_HEIGHT / 2, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Holographic shield ring around boss
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(bossXRef.current, CANVAS_HEIGHT / 2, 70 + Math.sin(time * 0.01) * 5, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing Scanner Eye
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fillRect(bossXRef.current - 25, CANVAS_HEIGHT / 2 - 5, 18, 10);

        // Tech details: lines and side nodes
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(bossXRef.current + 25, CANVAS_HEIGHT / 2 - 25, 8, 0, Math.PI * 2);
        ctx.arc(bossXRef.current + 25, CANVAS_HEIGHT / 2 + 25, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Tech background banner text
        ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
        ctx.font = 'bold 2rem Share Tech Mono';
        ctx.textAlign = 'center';
        ctx.fillText('INVASOR DETECTADO', CANVAS_WIDTH / 2 - 50, CANVAS_HEIGHT / 2 + 10);
      }

      // 10. UPDATE AND RENDER FLOATING TEXTS
      floatingTextsRef.current.forEach((ft, idx) => {
        ft.y += ft.speedY;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(idx, 1);
          return;
        }
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ft.color;
        ctx.font = 'bold 12px Share Tech Mono';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // 11. HUD METRICS INSIDE CANVAS
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Share Tech Mono';
      ctx.textAlign = 'left';
      ctx.fillText(`🚀 DISTÂNCIA: ${Math.floor(distanceRef.current)}m`, 15, 22);

      // Overdrive Streak counter inside Canvas
      if (feverTimeLeftRef.current <= 0) {
        ctx.fillStyle = feverStreakRef.current >= 4 ? '#ec4899' : '#00ffcc';
        ctx.fillText(`🔥 MULTIPLICADOR: ${feverStreakRef.current}/5`, 180, 22);
      } else {
        ctx.fillStyle = '#ff007f';
        ctx.font = 'bold 13px Share Tech Mono';
        ctx.fillText(`⚡ OVERDRIVE ATIVO: ${feverTimeLeftRef.current.toFixed(1)}s`, 180, 22);
      }

      // Show active buffs indicator inside Canvas
      if (magnetTimeLeftRef.current > 0 || slowmoTimeLeftRef.current > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '11px Share Tech Mono';
        ctx.textAlign = 'right';
        let hudY = 22;
        if (magnetTimeLeftRef.current > 0) {
          ctx.fillText(`🧲 ÍMÃ: ${magnetTimeLeftRef.current.toFixed(1)}s`, CANVAS_WIDTH - 15, hudY);
          hudY += 15;
        }
        if (slowmoTimeLeftRef.current > 0) {
          ctx.fillText(`⏳ SLOW-MO: ${slowmoTimeLeftRef.current.toFixed(1)}s`, CANVAS_WIDTH - 15, hudY);
        }
      }

      // --- SCREEN SHAKE RESTORE ---
      ctx.restore();

      // Continue loop if running
      if (shieldsRef.current > 0) {
        animationFrameId = requestAnimationFrame(updateAndRender);
      } else {
        setGameOver(true);
      }
    };

    animationFrameId = requestAnimationFrame(updateAndRender);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedOperation, selectedVehicle]);

  // Handle Pickups of Collectibles
  const handleCollectiblePickup = (type: 'gem' | 'magnet' | 'shield' | 'slowmo', x: number, y: number) => {
    audioEngine.playHatchRoll();

    const hasTimeBuff = equippedPet && (equippedPet.buffType === 'time_bonus' || equippedPet.buffType === 'combined');
    const hasGemBuff = equippedPet && (equippedPet.buffType === 'gem_multiplier' || equippedPet.buffType === 'combined');

    if (type === 'gem') {
      const gemVal = hasGemBuff ? RUNNER_CONFIG.petGemMultiplier : 1;
      scoreRef.current.gems += gemVal;
      setGemsGained(scoreRef.current.gems);
      addFloatingText(`+${gemVal} 💎`, x, y - 10, '#22c55e');

      // Spawn tiny green sparkle particles
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x,
          y,
          vx: Math.random() * 4 - 2,
          vy: Math.random() * 4 - 2,
          color: '#22c55e',
          alpha: 1,
          size: Math.random() * 3 + 1.5,
        });
      }
    } else if (type === 'magnet') {
      const duration = RUNNER_CONFIG.magnetDuration + (hasTimeBuff ? RUNNER_CONFIG.petTimeBonus : 0);
      magnetTimeLeftRef.current = duration;
      setHudMagnetActive(true);
      addFloatingText('ÍMÃ ATIVO!', x, y - 10, '#3b82f6');
      spawnPowerupParticles('#3b82f6');
    } else if (type === 'shield') {
      shieldActiveRef.current = true;
      setHudShieldActive(true);
      addFloatingText('ESCUDO ATIVO!', x, y - 10, '#00ffcc');
      spawnPowerupParticles('#00ffcc');
    } else if (type === 'slowmo') {
      const duration = RUNNER_CONFIG.slowmoDuration + (hasTimeBuff ? RUNNER_CONFIG.petTimeBonus : 0);
      slowmoTimeLeftRef.current = duration;
      setHudSlowmoActive(true);
      addFloatingText('BULLET TIME!', x, y - 10, '#eab308');
      spawnPowerupParticles('#eab308');
    }
  };

  const spawnPowerupParticles = (color: string) => {
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      particlesRef.current.push({
        x: 80,
        y: playerYRef.current + 8,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        color,
        alpha: 1.0,
        size: Math.random() * 4 + 2,
      });
    }
  };

  // Audio/Visual handlers on Collisions
  const handleCollisionDamage = (source: string) => {
    // Screen shake on taking damage
    triggerScreenShake(12);

    if (source === 'Resposta Errada!') {
      const q = currentQuestionRef.current;
      if (q) {
        const op = selectedOperation;
        const opSign = op === 'addition' ? '+' : op === 'subtraction' ? '-' : op === 'multiplication' ? 'x' : '/';
        const key = `${q.num1}${opSign}${q.num2}`;
        mockDb.recordMathAnswer(playerUser.id, key, false, 5000);
      }
    }

    // If shield is active, absorb damage
    if (shieldActiveRef.current) {
      shieldActiveRef.current = false;
      setHudShieldActive(false);
      audioEngine.playCorrect(); // Play alternate high pitch sound or pop
      addFloatingText('ESCUDO QUEBROU!', 80, playerYRef.current - 10, '#00ffcc');

      // Splash shield particles
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({
          x: 80,
          y: playerYRef.current + 8,
          vx: Math.random() * 6 - 3,
          vy: Math.random() * 6 - 3,
          color: '#00ffcc',
          alpha: 1,
          size: Math.random() * 4 + 2,
        });
      }
      return;
    }

    audioEngine.playError();
    feverStreakRef.current = 0; // Reset Fever Streak on hit
    setHudFeverStreak(0);
    addFloatingText('DANO! -1🛡️', 80, playerYRef.current - 10, '#f43f5e');

    // Trigger mobile vibration if available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Spawn failure splash particles
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x: 80,
        y: playerYRef.current,
        vx: (Math.random() * 6 - 3),
        vy: (Math.random() * 6 - 3),
        color: '#f43f5e',
        alpha: 1,
        size: Math.random() * 5 + 3,
      });
    }

    shieldsRef.current -= 1;
    setShields(shieldsRef.current);

    if (shieldsRef.current <= 0) {
      setGameOver(true);
    }
  };

  const handleGateSuccess = (x: number, y: number) => {
    audioEngine.playCorrect();
    
    const q = currentQuestionRef.current;
    let isMastered = false;
    let baseXp = 20;
    let baseGems = 2;

    if (q) {
      const op = selectedOperation;
      const opSign = op === 'addition' ? '+' : op === 'subtraction' ? '-' : op === 'multiplication' ? 'x' : '/';
      const key = `${q.num1}${opSign}${q.num2}`;

      // Save success statistic
      mockDb.recordMathAnswer(playerUser.id, key, true, 2000);

      // Check if mastered (correct answers >= threshold and no errors)
      const stats = mockDb.getMathStats(playerUser.id);
      const factStat = stats.find(s => s.questionKey === key);
      const threshold = gameState.masteryThreshold !== undefined ? gameState.masteryThreshold : 5;
      if (factStat && factStat.correctCount >= threshold && factStat.errorCount === 0) {
        isMastered = true;
        baseXp = 5;
        baseGems = 0;
      }
    }

    // Apply study nudges 2x XP learning buff if active
    if (isUnderplayedBonusActive && !isMastered) {
      baseXp *= 2;
    }

    // Scale rewards slightly by speed for risk (unless already mastered)
    const speedBonusFactor = 1 + Math.floor((currentSpeedRef.current - 3.5) * 2) * 0.1;
    const xpBonus = isMastered ? baseXp : Math.round(baseXp * speedBonusFactor);
    const gemsBonus = isMastered ? baseGems : Math.round(baseGems * speedBonusFactor);

    scoreRef.current.xp += xpBonus;
    scoreRef.current.gems += gemsBonus;

    setXpGained(scoreRef.current.xp);
    setGemsGained(scoreRef.current.gems);
    
    if (isMastered) {
      addFloatingText('⚠️ DOMINADO: XP Reduzido', x, y - 10, '#f97316');
      addFloatingText(`+${xpBonus} XP`, x, y - 25, '#a855f7');
    } else {
      addFloatingText(`+${xpBonus} XP`, x, y - 10, '#a855f7');
      if (gemsBonus > 0) {
        addFloatingText(`+${gemsBonus} 💎`, x, y - 25, '#00ffcc');
      }
      if (isUnderplayedBonusActive) {
        addFloatingText('💡 BÔNUS DE ESTUDO 2x XP!', x, y - 40, '#f97316');
      }
    }

    const nextSolved = questionsSolved + 1;
    setQuestionsSolved(nextSolved);

    // Fever Mode counter increments
    if (feverTimeLeftRef.current <= 0) {
      feverStreakRef.current += 1;
      setHudFeverStreak(feverStreakRef.current);
      if (feverStreakRef.current >= 5) {
        feverTimeLeftRef.current = 4.0;
        setHudFeverActive(true);
        feverStreakRef.current = 0;
        setHudFeverStreak(0);
        addFloatingText('⚡ OVERDRIVE ATIVADO! ⚡', 80, playerYRef.current - 20, '#ff007f');
        triggerScreenShake(8);
        spawnPowerupParticles('#ff007f');
      }
    }

    // Spawn sparkles
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x: 80,
        y: playerYRef.current,
        vx: (Math.random() * 8 - 4),
        vy: (Math.random() * 8 - 4),
        color: '#00ffcc',
        alpha: 1,
        size: Math.random() * 6 + 2,
      });
    }

    // Dynamic Speed Ramping: increase speed on correct gates
    if (currentSpeedRef.current < RUNNER_CONFIG.maxSpeed) {
      currentSpeedRef.current += RUNNER_CONFIG.speedIncrement;
    }

    // Trigger Boss Battle every 8 solved questions
    if (nextSolved % 8 === 0) {
      bossActiveRef.current = true;
      bossHpRef.current = 3;
      bossXRef.current = CANVAS_WIDTH + 150;
      setHudBossActive(true);
      setBossHp(3);
      
      const bQ = generateRunnerQuestion();
      bossQuestionRef.current = bQ;
      setBossQuestion(bQ);
      audioEngine.playError(); // Alarm sound
    }
  };

  // Solve a boss question
  const handleBossAnswer = (choiceIndex: number) => {
    if (!bossQuestionRef.current) return;

    const isCorrect = choiceIndex === bossQuestionRef.current.correctLane;

    if (isCorrect) {
      audioEngine.playCorrect();
      bossHpRef.current -= 1;
      setBossHp(bossHpRef.current);
      addFloatingText('-1 HP 💥', bossXRef.current, CANVAS_HEIGHT / 2 - 20, '#22c55e');
      triggerScreenShake(6);

      // Boss hit particles
      for (let i = 0; i < 15; i++) {
        particlesRef.current.push({
          x: bossXRef.current,
          y: CANVAS_HEIGHT / 2,
          vx: Math.random() * 8 - 4,
          vy: Math.random() * 8 - 4,
          color: '#f43f5e',
          alpha: 1,
          size: Math.random() * 5 + 2,
        });
      }

      if (bossHpRef.current <= 0) {
        // Defeated!
        audioEngine.playCorrect();
        addFloatingText('VITORIA DO SISTEMA! 🏆', bossXRef.current, CANVAS_HEIGHT / 2 - 25, '#00ffcc');
        addFloatingText('+100 XP / +5 💎', 80, playerYRef.current - 15, '#a855f7');
        
        scoreRef.current.xp += 100;
        scoreRef.current.gems += 5;
        setXpGained(scoreRef.current.xp);
        setGemsGained(scoreRef.current.gems);

        // Giant explosion particles
        for (let i = 0; i < 40; i++) {
          particlesRef.current.push({
            x: bossXRef.current,
            y: CANVAS_HEIGHT / 2,
            vx: Math.random() * 12 - 6,
            vy: Math.random() * 12 - 6,
            color: '#ef4444',
            alpha: 1,
            size: Math.random() * 8 + 3,
          });
        }

        // Reset boss state and resume run
        bossActiveRef.current = false;
        setHudBossActive(false);
        setBossQuestion(null);
        // Clear all obstacles to give space
        obstaclesRef.current = [];
      } else {
        // Next boss question
        const nextQ = generateRunnerQuestion();
        bossQuestionRef.current = nextQ;
        setBossQuestion(nextQ);
      }
    } else {
      // Player damage
      handleCollisionDamage('Boss Miss');
      addFloatingText('ERROU! ⚠️', 80, playerYRef.current - 20, '#ef4444');
      
      const nextQ = generateRunnerQuestion();
      bossQuestionRef.current = nextQ;
      setBossQuestion(nextQ);
    }
  };

  // Buy or equip vehicle board
  const selectVehicleBoard = (vehicle: Vehicle) => {
    const isOwned = purchasedVehicles.includes(vehicle.id);

    if (isOwned) {
      // Equip
      setSelectedVehicle(vehicle.id);
      localStorage.setItem(`amq_runner_equipped_board_${playerUser.id}`, vehicle.id);
      addFloatingText(`EQUIPOU: ${vehicle.name}!`, 80, playerYRef.current - 15, vehicle.trailColor);
    } else {
      // Check gems in state
      const currentGems = gameState.gems + gemsGained;
      if (currentGems >= vehicle.cost) {
        // Purchase
        const newGemsVal = currentGems - vehicle.cost;
        
        // Update local arrays
        const newPurchased = [...purchasedVehicles, vehicle.id];
        setPurchasedVehicles(newPurchased);
        setSelectedVehicle(vehicle.id);

        localStorage.setItem(`amq_runner_purchased_boards_${playerUser.id}`, JSON.stringify(newPurchased));
        localStorage.setItem(`amq_runner_equipped_board_${playerUser.id}`, vehicle.id);

        // Deduct from db
        mockDb.updateGameState(playerUser.id, {
          gems: newGemsVal,
        });

        // Set gems gained to balance UI
        scoreRef.current.gems = scoreRef.current.gems - vehicle.cost;
        setGemsGained(scoreRef.current.gems);

        addFloatingText(`COMPROU: ${vehicle.name}!`, 80, playerYRef.current - 15, vehicle.trailColor);
        audioEngine.playCorrect();
      } else {
        alert('Gemas insuficientes para desbloquear este veículo!');
      }
    }
  };

  const handleFinishRun = () => {
    // Stop game loop
    shieldsRef.current = 0;

    // Update database GameState with rewards
    const currentXp = gameState.auraXp + xpGained;
    let newLevel = gameState.auraLevel;
    let newXp = currentXp;

    const getXpNeeded = (lvl: number) => Math.round(100 * Math.pow(1.15, lvl - 1));
    let boundary = getXpNeeded(newLevel);

    while (newXp >= boundary && newLevel < 100) {
      newXp -= boundary;
      newLevel++;
      boundary = getXpNeeded(newLevel);
    }

    mockDb.updateGameState(playerUser.id, {
      auraLevel: newLevel,
      auraXp: newXp,
      gems: gameState.gems + gemsGained,
    });

    const updated = mockDb.getGameState(playerUser.id);
    if (updated) {
      onStateUpdate(updated);
    }

    onBack();
  };

  const opSym = getOpSymbol(selectedOperation);

  return (
    <div style={{ padding: '20px', minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 className="text-glow-cyan" style={{ fontSize: '1.8rem', color: 'var(--neon-cyan)' }}>
            🏃‍♂️ CORRIDA CYBER: MATEMÁTICA 2D
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Desvie de lasers, acumule combos para ativar Overdrive e derrote os Invasores!</p>
        </div>
        <button className="cyber-btn cyber-btn-pink" onClick={handleFinishRun} style={{ padding: '10px 18px' }}>
          🛑 Finalizar e Sair
        </button>
      </div>

      {/* Game Frame */}
      <div className="cyber-card" style={{ width: '100%', maxWidth: '830px', padding: '16px', background: '#0b0f19', border: '2px solid rgba(0, 255, 204, 0.2)' }}>
        
        {/* Statistics & Question Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          
          {/* Shields Display */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[...Array(3)].map((_, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '1.5rem',
                  opacity: idx < shields ? 1 : 0.2,
                  filter: idx < shields ? 'drop-shadow(0 0 4px var(--neon-pink))' : 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                🛡️
              </span>
            ))}
            {hudShieldActive && (
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(0, 255, 204, 0.2)',
                  color: '#00ffcc',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 255, 204, 0.4)',
                  marginLeft: '8px',
                  fontFamily: 'Share Tech Mono',
                  boxShadow: '0 0 8px rgba(0, 255, 204, 0.3)'
                }}
              >
                ESCUDO ATIVO
              </span>
            )}
          </div>

          {/* Active Math Question */}
          {hudQuestion && !gameOver && !hudBossActive && (
            <div
              style={{
                fontFamily: 'Share Tech Mono',
                fontSize: '2rem',
                fontWeight: 'bold',
                color: hudFeverActive ? '#ff007f' : 'var(--neon-cyan)',
                textShadow: hudFeverActive ? '0 0 15px rgba(255, 0, 127, 0.6)' : '0 0 10px rgba(0, 255, 204, 0.4)',
                background: hudFeverActive ? 'rgba(255, 0, 127, 0.08)' : 'rgba(0, 255, 204, 0.05)',
                padding: '4px 20px',
                borderRadius: '8px',
                border: hudFeverActive ? '1px solid rgba(255, 0, 127, 0.4)' : '1px solid rgba(0, 255, 204, 0.2)',
                animation: hudFeverActive ? 'pulse 1s infinite alternate' : 'none',
              }}
            >
              {hudQuestion.num1} {opSym} {hudQuestion.num2} = ?
            </div>
          )}

          {/* Boss Active Title */}
          {hudBossActive && !gameOver && (
            <div
              style={{
                fontFamily: 'Share Tech Mono',
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: '#ef4444',
                textShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '4px 15px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              ⚠️ CHEFE: INVASOR ({bossHp} HP)
            </div>
          )}

          {/* Stats & active buffs */}
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.95rem', alignItems: 'center' }}>
            {hudMagnetActive && <span title="Ímã de Gemas ativo!" style={{ filter: 'drop-shadow(0 0 3px #3b82f6)' }}>🧲</span>}
            {hudSlowmoActive && <span title="Câmera Lenta ativa!" style={{ filter: 'drop-shadow(0 0 3px #eab308)' }}>⏳</span>}
            <div style={{ color: hudFeverActive ? '#ff007f' : 'rgba(255,255,255,0.7)', textShadow: hudFeverActive ? '0 0 5px #ff007f' : 'none' }}>
              Combo: <strong>{hudFeverActive ? '⚡ OVERDRIVE!' : `${hudFeverStreak}/5 🔥`}</strong>
            </div>
            <div>XP: <strong style={{ color: 'var(--neon-purple)' }}>+{xpGained}</strong></div>
            <div>Gemas: <strong style={{ color: 'var(--neon-cyan)' }}>💎 {gemsGained}</strong></div>
          </div>

        </div>

        {/* 2D Canvas View */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '800px', height: 'auto', aspectRatio: '4/1', margin: '0 auto', overflow: 'hidden', borderRadius: '8px' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            style={{ display: 'block', width: '100%', height: '100%', cursor: bossActiveRef.current ? 'default' : 'pointer' }}
          />

          {/* Boss Math Question Panel Overlay */}
          {hudBossActive && bossQuestion && !gameOver && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '65%',
                height: '100%',
                background: 'rgba(15, 23, 42, 0.85)',
                borderRight: '2px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '10px',
                zIndex: 5,
              }}
            >
              <div style={{ color: '#ef4444', fontFamily: 'Share Tech Mono', fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px' }}>
                DESCRIPTOGRAFE O ESCUDO DO CHEFE!
              </div>
              <div style={{ color: '#fff', fontFamily: 'Share Tech Mono', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '12px' }}>
                {bossQuestion.num1} {opSym} {bossQuestion.num2} = ?
              </div>
              <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px' }}>
                {bossQuestion.choices.map((choice, idx) => (
                  <button
                    key={idx}
                    className="cyber-btn cyber-btn-pink"
                    onClick={() => handleBossAnswer(idx)}
                    style={{ flex: 1, padding: '8px', fontSize: '1rem', textShadow: 'none' }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GameOver overlay */}
          {gameOver && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(3, 7, 18, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <h2 className="text-glow-pink" style={{ color: 'var(--neon-pink)', fontSize: '2.5rem', marginBottom: '10px' }}>
                CORRIDA ENCERRADA!
              </h2>
              <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '20px' }}>Você resolveu {questionsSolved} equações matemáticas!</p>
              
              <button className="cyber-btn" onClick={handleFinishRun} style={{ padding: '12px 30px', fontSize: '1.1rem' }}>
                Coletar Recompensas: +{xpGained} XP / 💎 {gemsGained} Gemas ➔
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Vehicle selection Board Shop Card */}
      <div className="cyber-card" style={{ width: '100%', maxWidth: '830px', marginTop: '16px', padding: '16px', background: '#0b0f19', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
        <h3 className="text-glow-purple" style={{ color: 'var(--neon-purple)', fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🛹 LOJA E SELETOR DE VEÍCULOS (PRANCHAS)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {VEHICLES.map((vehicle) => {
            const isOwned = purchasedVehicles.includes(vehicle.id);
            const isEquipped = selectedVehicle === vehicle.id;
            
            return (
              <div
                key={vehicle.id}
                style={{
                  background: isEquipped ? 'rgba(168, 85, 247, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                  border: isEquipped ? '2px solid var(--neon-purple)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  justifyContent: 'space-between',
                  boxShadow: isEquipped ? '0 0 10px rgba(168, 85, 247, 0.2)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.4rem' }}>{vehicle.emoji}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isEquipped ? 'var(--neon-purple)' : '#fff' }}>{vehicle.name}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {vehicle.id === 'light_skate' && 'Prancha leve de luz. Rastro ciano clássico.'}
                  {vehicle.id === 'tron_bike' && 'Motocicleta cibernética. Rastro rosa de alta velocidade.'}
                  {vehicle.id === 'holo_board' && 'Prancha flutuante holográfica. Rastro de luz azul.'}
                </div>
                <button
                  onClick={() => selectVehicleBoard(vehicle)}
                  className={`cyber-btn ${isEquipped ? '' : isOwned ? 'cyber-btn-pink' : 'cyber-btn-purple'}`}
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    width: '100%',
                    textShadow: 'none',
                    background: isEquipped ? 'transparent' : undefined,
                    border: isEquipped ? '1px solid rgba(255,255,255,0.2)' : undefined,
                    color: isEquipped ? '#fff' : undefined,
                    cursor: isEquipped ? 'default' : 'pointer',
                  }}
                  disabled={isEquipped}
                >
                  {isEquipped ? 'Equipado' : isOwned ? 'Equipar' : `Comprar (💎 ${vehicle.cost})`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control & Power-ups Instruction Card */}
      <div className="cyber-card" style={{ width: '100%', maxWidth: '830px', marginTop: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '2rem' }}>🎮</span>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4rem' }}>
            <strong>Como Jogar:</strong> Use as teclas <strong>[W] / [S]</strong> ou as <strong>Setas Cima / Baixo</strong> para trocar de pista. Em dispositivos móveis, você pode <strong>tocar diretamente</strong> na pista que deseja ir. Acerte <strong>5 contas seguidas</strong> sem bater para ativar o <strong>Modo Overdrive ⚡</strong>!
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.8rem', justifySelf: 'start' }}>
          <div><strong>Itens Especiais nas Pistas:</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '1.1rem' }}>💎</span> Gema (+1 Gema)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '1.1rem' }}>🛡️</span> Escudo (Protege contra a próxima colisão ou erro)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '1.1rem' }}>🧲</span> Ímã (Atrai todas as gemas próximas para você)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '1.1rem' }}>⏳</span> Relógio (Câmera lenta temporária nas pistas)</div>
        </div>
      </div>

    </div>
  );
};
