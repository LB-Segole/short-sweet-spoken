
import React, { useEffect, useRef } from 'react';

const HeroAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = 600;
    canvas.height = 400;
    
    // Sound wave properties
    const waves = 3;
    const waveColors = ['rgba(129, 140, 248, 0.6)', 'rgba(129, 140, 248, 0.4)', 'rgba(129, 140, 248, 0.2)'];
    const amplitudes = [30, 20, 10];
    const frequencies = [0.02, 0.03, 0.04];
    const speeds = [0.05, 0.03, 0.02];
    const offsets = [0, 0, 0];
    
    // Phone icon
    const phoneIcon = new Image();
    phoneIcon.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'%3E%3C/path%3E%3C/svg%3E";
    
    const circleRadius = 70;
    const circleX = canvas.width / 2;
    const circleY = canvas.height / 2;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw gradient circle
      const gradient = ctx.createRadialGradient(circleX, circleY, 0, circleX, circleY, circleRadius);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)');
      
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Draw phone icon
      if (phoneIcon.complete) {
        const iconSize = 40;
        ctx.drawImage(phoneIcon, circleX - iconSize / 2, circleY - iconSize / 2, iconSize, iconSize);
      }
      
      // Draw sound waves
      for (let i = 0; i < waves; i++) {
        offsets[i] += speeds[i];
        drawSoundWave(ctx, circleX, circleY, circleRadius + 20 + i * 20, amplitudes[i], frequencies[i], offsets[i], waveColors[i]);
      }
      
      requestAnimationFrame(animate);
    };
    
    const drawSoundWave = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      amplitude: number,
      frequency: number,
      offset: number,
      color: string
    ) => {
      ctx.beginPath();
      
      for (let angle = 0; angle < Math.PI * 2; angle += 0.01) {
        const r = radius + Math.sin(angle * frequency * 10 + offset) * amplitude;
        const pointX = x + Math.cos(angle) * r;
        const pointY = y + Math.sin(angle) * r;
        
        if (angle === 0) {
          ctx.moveTo(pointX, pointY);
        } else {
          ctx.lineTo(pointX, pointY);
        }
      }
      
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    
    animate();
  }, []);
  
  return (
    <div className="floating">
      <canvas 
        ref={canvasRef} 
        className="max-w-full h-auto"
        style={{ filter: 'drop-shadow(0 0 10px rgba(79, 70, 229, 0.3))' }}
      />
    </div>
  );
};

export default HeroAnimation;
