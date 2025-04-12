
import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
  count: number;
  onComplete: () => void;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count, onComplete }) => {
  const [currentCount, setCurrentCount] = useState(count);
  const [glitch, setGlitch] = useState(false);
  
  useEffect(() => {
    if (currentCount <= 0) {
      onComplete();
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentCount(prev => prev - 1);
      
      // Add random glitch effect
      setGlitch(true);
      setTimeout(() => setGlitch(false), 100);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentCount, onComplete]);
  
  return (
    <div className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center crt-overlay">
      <div className={`text-8xl font-ocr text-horror-red ${glitch ? 'animate-glitch-1' : 'animate-pulse'}`}>
        {currentCount}
      </div>
    </div>
  );
};

export default CountdownOverlay;
