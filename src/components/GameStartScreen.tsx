
import React, { useState, useEffect } from 'react';

interface GameStartScreenProps {
  onStart: () => void;
}

const GameStartScreen: React.FC<GameStartScreenProps> = ({ onStart }) => {
  const [isGlitching, setIsGlitching] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showButton, setShowButton] = useState(false);
  
  useEffect(() => {
    // Simulate loading sequence
    setTimeout(() => {
      setShowTitle(true);
      
      setTimeout(() => {
        setShowButton(true);
      }, 1000);
    }, 500);
    
    // Add random glitching effect
    const glitchInterval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 100);
    }, 2000);
    
    return () => clearInterval(glitchInterval);
  }, []);
  
  return (
    <div className="fixed inset-0 z-50 bg-horror flex flex-col items-center justify-center crt-overlay scan-line">
      <div className={`text-center ${isGlitching ? 'animate-glitch-1' : ''}`}>
        {showTitle && (
          <>
            <div className="mb-2 text-xs font-mono text-horror-gray/70">INITIALIZING SYSTEM</div>
            <h1 className="text-4xl md:text-5xl font-ocr text-horror-gray mb-2">GESTURE</h1>
            <h1 className="text-5xl md:text-6xl font-ocr text-horror-red mb-6">ROULETTE</h1>
            <div className="mb-8 text-sm font-mono text-horror-gray/70">
              HAND GESTURE RECOGNITION: <span className="animate-blink">ACTIVE_</span>
            </div>
          </>
        )}
        
        {showButton && (
          <button 
            onClick={onStart}
            className="px-6 py-3 bg-horror-light/10 border border-horror-red/40 text-horror-red hover:bg-horror-red/10 transition-colors font-mono"
          >
            START GAME_
          </button>
        )}
      </div>
      
      <div className="absolute bottom-5 text-xs font-mono text-horror-gray/50">
        (C) 2025 HORROR GESTURE INTERFACE v1.0.3
      </div>
    </div>
  );
};

export default GameStartScreen;
