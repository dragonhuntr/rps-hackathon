import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
  count: number;
  onComplete: () => void;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count, onComplete }) => {
  const [currentCount, setCurrentCount] = useState(count);
  
  useEffect(() => {
    if (currentCount <= 0) {
      onComplete();
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentCount(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentCount, onComplete]);
  
  return (
    <div className="absolute inset-0 bg-horror-dark/80 flex items-center justify-center pointer-events-none">
      <span className="text-7xl font-ocr text-horror-gray animate-pulse">{currentCount}</span>
    </div>
  );
};

export default CountdownOverlay;
