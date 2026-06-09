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

const LANES = [40, 100, 160];
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 200;

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
  const [hudQuestion, setHudQuestion] = useState<RunnerQuestion | null>(null);

  // Active power-up states for the UI HUD
  const [hudMagnetActive, setHudMagnetActive] = useState<boolean>(false);
  const [hudShieldActive, setHudShieldActive] = useState<boolean>(false);
  const [hudSlowmoActive, setHudSlowmoActive] = useState<boolean>(false);

  // Active question references (shared with canvas thread)
  const currentQuestionRef = useRef<RunnerQuestion | null>(null);
  const selectedOperation = gameState.selectedOperation || 'addition';

  // Game variables
  const playerLaneRef = useRef<number>(1);
  const playerYRef = useRef<number>(LANES[1]);
  const scoreRef = useRef<{ xp: number; gems: number }>({ xp: 0, gems: 0 });
  const shieldsRef = useRef<number>(3);
  
  // Power-up durations & flags
  const magnetTimeLeftRef = useRef<number>(0);
  const shieldActiveRef = useRef<boolean>(false);
  const slowmoTimeLeftRef = useRef<number>(0);
  
  // Speed Ramping
  const currentSpeedRef = useRef<number>(3.5);

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

  // Generate a runner math question
  const generateRunnerQuestion = (): RunnerQuestion => {
    let num1 = 2;
    let num2 = 2;
    let answer = 0;

    const op = selectedOperation;

    if (op === 'addition') {
      num1 = Math.floor(Math.random() * 12) + 2; // 2 to 14
      num2 = Math.floor(Math.random() * 12) + 2; // 2 to 14
      answer = num1 + num2;
    } else if (op === 'subtraction') {
      num1 = Math.floor(Math.random() * 20) + 6; // 6 to 25
      num2 = Math.floor(Math.random() * (num1 - 3)) + 2; // Keep result positive
      answer = num1 - num2;
    } else if (op === 'division') {
      const divisor = Math.floor(Math.random() * 4) + 2; // 2 to 5
      const quotient = Math.floor(Math.random() * 8) + 2; // 2 to 9
      num1 = divisor * quotient;
      num2 = divisor;
      answer = quotient;
    } else {
      // multiplication
      num1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
      num2 = Math.floor(Math.random() * 8) + 2; // 2 to 9
      answer = num1 * num2;
    }

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
      if (!isPlaying || gameOver) return;

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
      if (!isPlaying || gameOver || e.changedTouches.length === 0) return;
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
    if (!isPlaying || gameOver || !canvasRef.current) return;

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
    scoreRef.current = { xp: 0, gems: 0 };
    shieldsRef.current = 3;
    currentSpeedRef.current = 3.5;
    
    // Reset powerups
    magnetTimeLeftRef.current = 0;
    shieldActiveRef.current = false;
    slowmoTimeLeftRef.current = 0;
    setHudMagnetActive(false);
    setHudShieldActive(false);
    setHudSlowmoActive(false);

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

      // Base game speed with slow-mo modifier
      const baseSpeed = currentSpeedRef.current;
      const slowmoFactor = slowmoTimeLeftRef.current > 0 ? 0.5 : 1.0;
      const activeSpeed = baseSpeed * slowmoFactor;

      // 1. CLEAR AND DRAW BACKGROUND
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // PARALLAX LAYER 1: Distant Cyber Skyscrapers
      const buildingOffset = (time * 0.03 * slowmoFactor) % 300;
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
      const gridOffset = (time * 0.15 * slowmoFactor) % 40;
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
        star.x -= star.speed * slowmoFactor;
        if (star.x < 0) {
          star.x = CANVAS_WIDTH;
          star.y = Math.random() * CANVAS_HEIGHT;
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // 3. SPAWN ENTITIES
      const elapsed = time - lastSpawnTime.current;
      const timeSinceGate = time - lastGateTime.current;
      const timeSinceCollectible = time - lastCollectibleTime.current;

      // Spawn obstacle spikes every 3 seconds if no gate is nearby
      const isAnyGateClose = gatesRef.current.some(gate => Math.abs(gate.x - (CANVAS_WIDTH + 20)) < 350);
      if (elapsed > 3000 && !isAnyGateClose && timeSinceGate < 7000) {
        const lane = Math.floor(Math.random() * 3);
        obstaclesRef.current.push({
          id: Math.random().toString(36).substring(2, 9),
          x: CANVAS_WIDTH + 20,
          lane,
          width: 25,
          height: 25,
          passed: false,
        });
        lastSpawnTime.current = time;
      }

      // Spawn Question Gates every 10 seconds (using the pre-generated HUD question)
      if (timeSinceGate > 10000 || lastGateTime.current === 0) {
        const activeQ = currentQuestionRef.current || generateRunnerQuestion();
        currentQuestionRef.current = activeQ;
        setHudQuestion(activeQ);

        // Filter out any obstacles that are too close to the new gate's X position in the correct lane
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

      // Spawn Collectibles (Gems or Power-ups) every 1.8 seconds
      if (timeSinceCollectible > 1800 && timeSinceGate < 8500) {
        const lane = Math.floor(Math.random() * 3);
        
        // Determine type: 80% gems, 20% power-ups (Shield, Magnet, Slowmo)
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

      // 4. PLAYER MOVEMENT & ANIMATION
      // Interpolate player Y position smoothly to the selected lane
      const targetY = LANES[playerLaneRef.current];
      playerYRef.current += (targetY - playerYRef.current) * 0.25;

      // Spawn trail particles behind player
      if (Math.random() < 0.35) {
        particlesRef.current.push({
          x: 80,
          y: playerYRef.current + (Math.random() * 10 - 5),
          vx: -(Math.random() * 2 + 1),
          vy: Math.random() * 1 - 0.5,
          color: gameState.auraColor || '#00ffcc',
          alpha: 1,
          size: Math.random() * 4 + 2,
        });
      }

      // Render Floating Pet
      if (equippedPet) {
        ctx.save();
        const petBob = Math.sin(time * 0.005) * 6;
        ctx.font = '1.4rem sans-serif';
        ctx.textAlign = 'center';
        // Render pet float behind hoverboard
        ctx.fillText(equippedPet.emoji, 45, playerYRef.current - 14 + petBob);
        
        // Glow effect below pet
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
      
      // Cyber Hoverboard
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = runnerColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(40, playerYRef.current + 12);
      ctx.lineTo(85, playerYRef.current + 12);
      ctx.lineTo(75, playerYRef.current + 19);
      ctx.lineTo(30, playerYRef.current + 19);
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

      // 6. UPDATE AND RENDER OBSTACLES (SPIKES)
      obstaclesRef.current.forEach((obs, idx) => {
        obs.x -= activeSpeed;

        // Draw glitchy spike
        ctx.fillStyle = '#f43f5e';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f43f5e';
        
        ctx.beginPath();
        const obsY = LANES[obs.lane];
        ctx.moveTo(obs.x, obsY + 10);
        ctx.lineTo(obs.x + 12, obsY - 15);
        ctx.lineTo(obs.x + 25, obsY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // AABB Collision check
        const playerX = 65;
        if (!obs.passed && obs.x < playerX + 15 && obs.x + obs.width > playerX - 15) {
          if (obs.lane === playerLaneRef.current) {
            obs.passed = true;
            handleCollisionDamage('Obstáculo!');
          }
        }

        // Clean up out of bounds obstacles
        if (obs.x < -30) {
          obstaclesRef.current.splice(idx, 1);
        }
      });

      // 7. UPDATE AND RENDER COLLECTIBLES
      collectiblesRef.current.forEach((item, idx) => {
        // Magnet effect: attract gems towards the player
        if (magnetTimeLeftRef.current > 0 && item.type === 'gem') {
          const dx = 65 - item.x;
          // Pull closer
          item.x += dx * 0.08;
          // offset forward pull
          item.x -= activeSpeed * 0.4;
        } else {
          item.x -= activeSpeed;
        }

        // Render collectible graphics
        ctx.save();
        const itemY = LANES[item.lane];
        ctx.shadowBlur = 10;

        if (item.type === 'gem') {
          // Glow green diamond
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
          // Glow blue horseshoe
          ctx.fillStyle = '#3b82f6';
          ctx.shadowColor = '#3b82f6';
          ctx.font = '16px Share Tech Mono';
          ctx.textAlign = 'center';
          ctx.fillText('🧲', item.x, itemY + 5);
        } else if (item.type === 'shield') {
          // Glow cyan shield crest
          ctx.fillStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.font = '16px Share Tech Mono';
          ctx.textAlign = 'center';
          ctx.fillText('🛡️', item.x, itemY + 5);
        } else if (item.type === 'slowmo') {
          // Glow yellow hourglass
          ctx.fillStyle = '#eab308';
          ctx.shadowColor = '#eab308';
          ctx.font = '16px Share Tech Mono';
          ctx.textAlign = 'center';
          ctx.fillText('⏳', item.x, itemY + 5);
        }
        ctx.restore();

        // Check collision with player
        const playerX = 65;
        if (!item.passed && item.x < playerX + 18 && item.x + item.width > playerX - 18) {
          // Map item position to lane
          if (item.lane === playerLaneRef.current) {
            item.passed = true;
            collectiblesRef.current.splice(idx, 1);
            handleCollectiblePickup(item.type);
            return;
          }
        }

        // Clean up
        if (item.x < -30) {
          collectiblesRef.current.splice(idx, 1);
        }
      });

      // 8. UPDATE AND RENDER QUESTION GATES
      gatesRef.current.forEach((gate, idx) => {
        gate.x -= activeSpeed;

        // Draw the 3 gate structures
        LANES.forEach((laneY, laneIdx) => {
          const answerVal = gate.question.choices[laneIdx];
          
          // Gate frame (all are uniform to prevent visual hints)
          ctx.strokeStyle = 'var(--neon-purple)';
          ctx.lineWidth = 4;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#a855f7';

          // Render Gate block
          ctx.fillRect(gate.x, laneY - 20, 45, 40);
          ctx.strokeRect(gate.x, laneY - 20, 45, 40);

          // Render choice number inside gate
          ctx.restore();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 1.2rem Share Tech Mono';
          ctx.textAlign = 'center';
          ctx.fillText(String(answerVal), gate.x + 22, laneY + 6);
        });

        // Collision Check: when wizard passes the gate's x coordinate
        const playerX = 65;
        if (!gate.passed && gate.x < playerX + 10 && gate.x + 45 > playerX - 10) {
          gate.passed = true;
          
          const chosenLane = playerLaneRef.current;
          const isCorrect = chosenLane === gate.question.correctLane;

          if (isCorrect) {
            handleGateSuccess();
          } else {
            handleCollisionDamage('Resposta Errada!');
          }

          // Generate next question immediately to show on HUD
          const nextQ = generateRunnerQuestion();
          currentQuestionRef.current = nextQ;
          setHudQuestion(nextQ);
        }

        // Clean up
        if (gate.x < -100) {
          gatesRef.current.splice(idx, 1);
        }
      });

      // Show active buffs indicator inside Canvas
      if (magnetTimeLeftRef.current > 0 || slowmoTimeLeftRef.current > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '11px Share Tech Mono';
        ctx.textAlign = 'right';
        let hudY = 20;
        if (magnetTimeLeftRef.current > 0) {
          ctx.fillText(`🧲 ÍMÃ: ${magnetTimeLeftRef.current.toFixed(1)}s`, CANVAS_WIDTH - 15, hudY);
          hudY += 15;
        }
        if (slowmoTimeLeftRef.current > 0) {
          ctx.fillText(`⏳ SLOW-MO: ${slowmoTimeLeftRef.current.toFixed(1)}s`, CANVAS_WIDTH - 15, hudY);
        }
      }

      // Continue loop if running
      if (shieldsRef.current > 0) {
        animationFrameId = requestAnimationFrame(updateAndRender);
      } else {
        // Trigger game over state
        setGameOver(true);
      }
    };

    animationFrameId = requestAnimationFrame(updateAndRender);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedOperation]);

  // Handle Pickups of Collectibles
  const handleCollectiblePickup = (type: 'gem' | 'magnet' | 'shield' | 'slowmo') => {
    audioEngine.playHatchRoll();

    if (type === 'gem') {
      scoreRef.current.gems += 1;
      setGemsGained(scoreRef.current.gems);
      // Spawn tiny green sparkle particles
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: 80,
          y: playerYRef.current,
          vx: Math.random() * 4 - 2,
          vy: Math.random() * 4 - 2,
          color: '#22c55e',
          alpha: 1,
          size: Math.random() * 3 + 1.5,
        });
      }
    } else if (type === 'magnet') {
      magnetTimeLeftRef.current = 7.0; // 7 seconds duration
      setHudMagnetActive(true);
      // Spawn blue magnet particle circle
      spawnPowerupParticles('#3b82f6');
    } else if (type === 'shield') {
      shieldActiveRef.current = true;
      setHudShieldActive(true);
      // Spawn cyan shield particle circle
      spawnPowerupParticles('#00ffcc');
    } else if (type === 'slowmo') {
      slowmoTimeLeftRef.current = 5.0; // 5 seconds duration
      setHudSlowmoActive(true);
      // Spawn yellow clock particles
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
  const handleCollisionDamage = (_source: string) => {
    // If shield is active, absorb damage
    if (shieldActiveRef.current) {
      shieldActiveRef.current = false;
      setHudShieldActive(false);
      audioEngine.playCorrect(); // Play alternate high pitch sound or pop
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

  const handleGateSuccess = () => {
    audioEngine.playCorrect();
    setQuestionsSolved(prev => prev + 1);

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
    if (currentSpeedRef.current < 7.0) {
      currentSpeedRef.current += 0.25;
    }

    // Earn XP and Gems (scaled slightly by speed as rewards for risk)
    const speedBonusFactor = 1 + Math.floor((currentSpeedRef.current - 3.5) * 2) * 0.1;
    const xpBonus = Math.round(20 * speedBonusFactor);
    const gemsBonus = Math.round(2 * speedBonusFactor);

    scoreRef.current.xp += xpBonus;
    scoreRef.current.gems += gemsBonus;

    setXpGained(scoreRef.current.xp);
    setGemsGained(scoreRef.current.gems);
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

    // Refresh state
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
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Use as setas [W] / [S] ou clique nas pistas para desviar e passar pelo resultado correto!</p>
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
          {hudQuestion && !gameOver && (
            <div
              style={{
                fontFamily: 'Share Tech Mono',
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'var(--neon-cyan)',
                textShadow: '0 0 10px rgba(0, 255, 204, 0.4)',
                background: 'rgba(0, 255, 204, 0.05)',
                padding: '4px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 204, 0.2)',
              }}
            >
              {hudQuestion.num1} {opSym} {hudQuestion.num2} = ?
            </div>
          )}

          {/* Stats & active buffs */}
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.95rem', alignItems: 'center' }}>
            {hudMagnetActive && <span title="Ímã de Gemas ativo!" style={{ filter: 'drop-shadow(0 0 3px #3b82f6)' }}>🧲</span>}
            {hudSlowmoActive && <span title="Câmera Lenta ativa!" style={{ filter: 'drop-shadow(0 0 3px #eab308)' }}>⏳</span>}
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
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}
          />

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

      {/* Control & Power-ups Instruction Card */}
      <div className="cyber-card" style={{ width: '100%', maxWidth: '800px', marginTop: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '2rem' }}>🎮</span>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4rem' }}>
            <strong>Como Jogar:</strong> Use as teclas <strong>[W] / [S]</strong> ou as <strong>Setas Cima / Baixo</strong> para trocar de pista. Em dispositivos móveis, você pode <strong>tocar diretamente</strong> na pista que deseja ir (superior, central ou inferior).
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
