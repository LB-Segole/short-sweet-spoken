
import React, { useState, useEffect, useRef } from 'react';

// Ensure the props type matches the type in CallCenter.tsx
interface CallVisualizationProps {
  callStatus: 'idle' | 'calling' | 'connected' | 'completed';
  isMuted: boolean;
}

const CallVisualization: React.FC<CallVisualizationProps> = ({ callStatus, isMuted }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  // Create animation for call visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const parentWidth = canvas.parentElement?.clientWidth || 300;
    canvas.width = parentWidth;
    canvas.height = 150;
    
    // Wave properties
    const customerWaveColor = '#6366f1';  // indigo
    const aiWaveColor = '#ec4899';        // pink
    const bgColor = '#f9fafb';            // light gray
    
    let customerAmplitude = 0;
    let aiAmplitude = 0;
    let cycles = 0;
    
    // Animation loop
    const animate = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      cycles += 0.05;
      
      // Adjust amplitudes based on call status
      if (callStatus === 'idle' || callStatus === 'completed') {
        customerAmplitude = 0;
        aiAmplitude = 0;
      } else if (callStatus === 'calling') {
        customerAmplitude = 0;
        aiAmplitude = Math.sin(cycles) * 10 + 15; // Pulsing effect
      } else if (callStatus === 'connected') {
        // If muted, customer amplitude is reduced
        customerAmplitude = isMuted ? 5 : 20 + Math.sin(cycles * 3) * 10;
        
        // Simulate AI speaking
        if (isAiSpeaking) {
          aiAmplitude = 25 + Math.sin(cycles * 2.5) * 15;
        } else {
          aiAmplitude = 5 + Math.sin(cycles) * 3;
        }
      }
      
      // Draw customer wave
      drawWave(
        ctx, 
        canvas.width / 2, 
        canvas.height / 4, 
        canvas.width / 2 - 20, 
        customerAmplitude, 
        customerWaveColor, 
        'Customer'
      );
      
      // Draw AI wave
      drawWave(
        ctx, 
        canvas.width / 2, 
        (canvas.height / 4) * 3, 
        canvas.width / 2 - 20, 
        aiAmplitude, 
        aiWaveColor, 
        'AI Agent'
      );
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    const drawWave = (
      ctx: CanvasRenderingContext2D,
      centerX: number,
      centerY: number,
      width: number,
      amplitude: number,
      color: string,
      label: string
    ) => {
      // Draw label
      ctx.fillStyle = '#6b7280'; // gray
      ctx.font = '12px sans-serif';
      ctx.fillText(label, 10, centerY - 20);
      
      // Draw wave
      ctx.beginPath();
      
      for (let x = centerX - width; x <= centerX + width; x++) {
        const progress = (x - (centerX - width)) / (width * 2);
        const y = centerY + Math.sin(progress * Math.PI * 8 + cycles * 5) * amplitude;
        
        if (x === centerX - width) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    // Simulate AI speaking patterns during connected calls
    if (callStatus === 'connected') {
      const speakInterval = setInterval(() => {
        setIsAiSpeaking(prev => !prev);
      }, Math.random() * 3000 + 2000); // Random interval between 2-5 seconds
      
      return () => clearInterval(speakInterval);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [callStatus, isMuted, isAiSpeaking]);
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
};

export default CallVisualization;
