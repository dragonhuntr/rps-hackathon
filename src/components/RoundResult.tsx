
import React, { useEffect, useState } from 'react';

interface RoundResultProps {
  playerGesture: string;
  computerGesture: string;
  result: 'win' | 'lose' | 'draw';
  onContinue: () => void;
}

const RoundResult: React.FC<RoundResultProps> = ({
  playerGesture,
  computerGesture,
  result,
  onContinue
}) => {
  const [showContinue, setShowContinue] = useState(false);
  const [glitching, setGlitching] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContinue(true);
    }, 2000);
    
    // Add random glitching effect
    const glitchInterval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 100);
    }, 1500);
    
    return () => {
      clearTimeout(timer);
      clearInterval(glitchInterval);
    };
  }, []);
  
  const getResultText = () => {
    switch (result) {
      case 'win':
        return 'YOU WIN';
      case 'lose':
        return 'YOU LOSE';
      case 'draw':
        return 'DRAW';
      default:
        return '';
    }
  };
  
  const getResultColor = () => {
    switch (result) {
      case 'win':
        return 'text-green-500';
      case 'lose':
        return 'text-horror-red';
      case 'draw':
        return 'text-horror-gray';
      default:
        return '';
    }
  };
  
  return (
    <div className="fixed inset-0 z-40 bg-black/90 flex flex-col items-center justify-center crt-overlay scan-line">
      <div className="flex justify-between w-64 mb-6">
        <div className="text-center">
          <div className="text-sm font-mono opacity-70 mb-2">YOU</div>
          <div className="text-6xl">{playerGesture}</div>
        </div>
        
        <div className="text-center">
          <div className="text-sm font-mono opacity-70 mb-2">CPU</div>
          <div className={`text-6xl ${glitching ? 'animate-glitch-1' : ''}`}>{computerGesture}</div>
        </div>
      </div>
      
      <div className={`text-3xl font-ocr mb-8 ${getResultColor()} ${glitching ? 'animate-glitch-2' : ''}`}>
        {getResultText()}
      </div>
      
      {showContinue && (
        <button 
          onClick={onContinue}
          className="px-5 py-2 bg-horror-light/10 border border-horror-light/40 text-horror-gray hover:bg-horror-light/20 transition-colors font-mono"
        >
          CONTINUE_
        </button>
      )}
    </div>
  );
};

export default RoundResult;
