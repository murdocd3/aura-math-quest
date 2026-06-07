import React, { useEffect, useRef } from 'react';

interface ParticleCanvasProps {
  level: number;
  rebirths: number;
  color: string;
  active: boolean;
  width?: number;
  height?: number;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  level,
  rebirths,
  color,
  active,
  width = 160,
  height = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
      life: number;
      maxLife: number;
    }> = [];

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      // 1. Level 30+: Rotating Energy Rings
      if (level >= 30) {
        angle += 0.02;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        // Draw inner ring
        ctx.beginPath();
        ctx.arc(cx, cy, 40, angle, angle + Math.PI * 1.5);
        ctx.stroke();

        // Draw outer ring (opposite direction)
        ctx.strokeStyle = color + '88';
        ctx.beginPath();
        ctx.arc(cx, cy, 50, -angle, -angle + Math.PI * 1.2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow
      }

      // 2. Level 60+: Energy Wings
      if (level >= 60) {
        ctx.fillStyle = color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 150) * 0.1;

        // Left Wing
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 10);
        ctx.bezierCurveTo(cx - 50, cy - 60, cx - 70, cy - 20, cx - 15, cy + 20);
        ctx.bezierCurveTo(cx - 40, cy + 10, cx - 35, cy - 10, cx - 10, cy - 10);
        ctx.fill();

        // Right Wing
        ctx.beginPath();
        ctx.moveTo(cx + 10, cy - 10);
        ctx.bezierCurveTo(cx + 50, cy - 60, cx + 70, cy - 20, cx + 15, cy + 20);
        ctx.bezierCurveTo(cx + 40, cy + 10, cx + 35, cy - 10, cx + 10, cy - 10);
        ctx.fill();

        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      }

      // 3. Level 10+ or Rebirth: Emit Particles
      // Level 10 gives standard trail under feet
      // Rebirth gives cosmic stardust floating upwards
      const particleSpawnChance = rebirths > 0 ? 0.3 : (level >= 10 ? 0.15 : 0);

      if (Math.random() < particleSpawnChance) {
        const size = Math.random() * 3 + 1;
        const isRebirth = rebirths > 0;
        
        // Cosmic colors for rebirths
        const colorPalette = isRebirth
          ? ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#00ffcc']
          : [color];
        const pColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

        particles.push({
          x: isRebirth ? cx + (Math.random() * 60 - 30) : cx + (Math.random() * 20 - 10),
          y: isRebirth ? cy + 40 : cy + 50, // Foot level
          vx: isRebirth ? (Math.random() * 1 - 0.5) : (Math.random() * 1.5 - 0.75),
          vy: isRebirth ? -(Math.random() * 1.5 + 0.5) : -(Math.random() * 0.5), // float up for rebirth, stick near bottom for lvl 10
          size,
          alpha: 1.0,
          color: pColor,
          life: 0,
          maxLife: isRebirth ? Math.random() * 60 + 40 : Math.random() * 30 + 15,
        });
      }

      // Update & Draw Particles
      particles = particles.filter(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = 1 - (p.life / p.maxLife);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        return p.life < p.maxLife;
      });

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [level, rebirths, color, active, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};
