import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface CombatVfxCanvasRef {
  fireProjectile: (
    from: 'player' | 'monster',
    onImpact: () => void,
    isCritical?: boolean,
    op?: 'addition' | 'subtraction' | 'multiplication' | 'division'
  ) => void;
  triggerExplosion: (
    side: 'player' | 'monster',
    type: 'critical' | 'normal' | 'error',
    op?: 'addition' | 'subtraction' | 'multiplication' | 'division'
  ) => void;
}

interface Projectile {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  progress: number; // 0 to 1
  speed: number;    // increment per frame
  color: string;
  isCritical: boolean;
  onImpact: () => void;
  op?: 'addition' | 'subtraction' | 'multiplication' | 'division';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity?: number;
  shape?: 'circle' | 'square' | 'cross' | 'slash';
}

interface Shockwave {
  cx: number;
  cy: number;
  r: number;
  maxR: number;
  color: string;
  alpha: number;
}

export const CombatVfxCanvas = React.memo(forwardRef<CombatVfxCanvasRef>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Arrays to hold physics entities
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);

  // Expose triggers to parent component
  useImperativeHandle(ref, () => ({
    fireProjectile(from, onImpact, isCritical = false, op) {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Start and target coordinates
      const startX = from === 'player' ? width * 0.22 : width * 0.78;
      const targetX = from === 'player' ? width * 0.78 : width * 0.22;
      const startY = height * 0.5;
      const targetY = height * 0.5;

      let color = '#ec4899'; // Default pink glitch for monster
      if (from === 'player') {
        if (op === 'addition') color = '#22c55e'; // Green
        else if (op === 'subtraction') color = '#ef4444'; // Red
        else if (op === 'multiplication') color = '#facc15'; // Gold
        else if (op === 'division') color = '#00ffcc'; // Cyan
        else color = '#00ffcc';
      }

      projectilesRef.current.push({
        x: startX,
        y: startY,
        sx: startX,
        sy: startY,
        tx: targetX,
        ty: targetY,
        progress: 0,
        speed: 0.045, // takes ~22 frames (approx 350ms) to travel
        color,
        isCritical,
        onImpact,
        op,
      });
    },

    triggerExplosion(side, type, op) {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const width = canvas.width;
      const height = canvas.height;

      const x = side === 'player' ? width * 0.22 : width * 0.78;
      const y = height * 0.5;

      createExplosion(x, y, type, op);
    }
  }));

  // Create particle burst
  const createExplosion = (x: number, y: number, type: 'critical' | 'normal' | 'error', op?: 'addition' | 'subtraction' | 'multiplication' | 'division') => {
    const particles = particlesRef.current;

    let opColor = '#00ffcc'; // Default cyan
    if (op === 'addition') opColor = '#22c55e';
    else if (op === 'subtraction') opColor = '#ef4444';
    else if (op === 'multiplication') opColor = '#facc15';
    else if (op === 'division') opColor = '#00ffcc';

    if (type === 'critical') {
      // 1. Shockwave circle
      shockwavesRef.current.push({
        cx: x,
        cy: y,
        r: 5,
        maxR: 70,
        color: opColor,
        alpha: 1.0,
      });

      // 2. Heavy Sparks matching operator color
      const count = 50;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 3;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1, // slight upward push
          size: Math.random() * 4 + 1.5,
          color: Math.random() < 0.6 ? opColor : '#ffffff',
          alpha: 1.0,
          life: 0,
          maxLife: Math.random() * 35 + 25,
          gravity: 0.12,
          shape: op === 'subtraction' ? 'slash' : op === 'addition' ? 'cross' : 'circle',
        });
      }
    } else if (type === 'normal') {
      // Regular impact
      const count = 25;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3 + 1,
          color: Math.random() < 0.7 ? opColor : '#ffffff',
          alpha: 1.0,
          life: 0,
          maxLife: Math.random() * 25 + 15,
          gravity: 0.05,
          shape: op === 'subtraction' ? 'slash' : op === 'addition' ? 'cross' : 'circle',
        });
      }
    } else if (type === 'error') {
      // Glitch code blocks scattering (Pink and Red squares)
      const count = 30;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 1.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 6 + 3, // larger square blocks
          color: Math.random() < 0.6 ? '#ec4899' : '#ef4444',
          alpha: 1.0,
          life: 0,
          maxLife: Math.random() * 30 + 20,
          gravity: 0.08,
          shape: 'square',
        });
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationFrameId: number;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updatePhysics = () => {
      // 1. Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 2. Update and Draw Projectiles
      projectilesRef.current = projectilesRef.current.filter((p) => {
        p.progress += p.speed;
        
        // Calculate position via linear interpolation
        p.x = p.sx + (p.tx - p.sx) * p.progress;
        p.y = p.sy + (p.ty - p.sy) * p.progress;

        // Draw projectile core
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.isCritical ? 20 : 12;
        ctx.fillStyle = '#ffffff';

        // Draw operator-themed projectile shapes!
        if (p.op === 'subtraction') {
          // Blade / Slash
          ctx.translate(p.x, p.y);
          ctx.rotate(p.progress * Math.PI * 8);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.isCritical ? 4.5 : 3;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(10, 0);
          ctx.stroke();
        } else if (p.op === 'addition') {
          // Plus sign
          ctx.translate(p.x, p.y);
          ctx.rotate(p.progress * Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.isCritical ? 4 : 2.5;
          ctx.beginPath();
          ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
          ctx.moveTo(0, -7); ctx.lineTo(0, 7);
          ctx.stroke();
        } else if (p.op === 'division') {
          // Division sign
          ctx.translate(p.x, p.y);
          ctx.rotate(p.progress * Math.PI * 3);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.isCritical ? 3.5 : 2;
          ctx.beginPath();
          ctx.moveTo(-7, 7); ctx.lineTo(7, -7);
          ctx.stroke();
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(-3, -3, 2, 0, Math.PI * 2);
          ctx.arc(3, 3, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Circle (glowing sphere) - multiplication / monster / default
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.isCritical ? 8 : 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Emit trail particles
        const trailColor = p.color;
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() * 1.5 - 0.75) - (p.tx - p.sx) * 0.015, // blow slightly backward
          vy: Math.random() * 1.5 - 0.75,
          size: Math.random() * 2 + 1,
          color: trailColor,
          alpha: 0.8,
          life: 0,
          maxLife: Math.random() * 15 + 8,
          shape: p.op === 'subtraction' ? 'slash' : p.op === 'addition' ? 'cross' : 'circle',
        });

        // Trigger impact on arrival
        if (p.progress >= 1.0) {
          p.onImpact();
          return false; // remove
        }
        return true;
      });

      // 3. Update and Draw Shockwaves
      shockwavesRef.current = shockwavesRef.current.filter((sw) => {
        sw.r += 3.5;
        sw.alpha = 1 - (sw.r / sw.maxR);

        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = sw.alpha;
        ctx.beginPath();
        ctx.arc(sw.cx, sw.cy, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        return sw.r < sw.maxR;
      });

      // 4. Update and Draw Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        
        // Physics logic: gravity and friction
        if (p.gravity) {
          p.vy += p.gravity;
        }
        p.vx *= 0.98; // air friction
        p.vy *= 0.98;
        
        p.x += p.vx;
        p.y += p.vy;

        p.alpha = 1 - (p.life / p.maxLife);

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;

        if (p.shape === 'square') {
          ctx.beginPath();
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else if (p.shape === 'cross') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y); ctx.lineTo(p.x + p.size, p.y);
          ctx.moveTo(p.x, p.y - p.size); ctx.lineTo(p.x, p.y + p.size);
          ctx.stroke();
        } else if (p.shape === 'slash') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y + p.size);
          ctx.lineTo(p.x + p.size, p.y - p.size);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        return p.life < p.maxLife;
      });

      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    updatePhysics();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}));

CombatVfxCanvas.displayName = 'CombatVfxCanvas';
