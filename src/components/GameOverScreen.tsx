
import React, { useState, useEffect } from 'react';

interface GameOverScreenProps {
  winner: 'player' | 'computer';
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ winner, onRestart }) => {
  const [isGlitching, setIsGlitching] = useState(false);
  const [showButton, setShowButton] = useState(false);
  
  useEffect(() => {
    // Show restart button after a delay
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 2000);
    
    // Add random glitching effect
    const glitchInterval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 100 + Math.random() * 200);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(glitchInterval);
    };
  }, []);
  
  return (
    <div className="fixed inset-0 z-50 bg-horror flex flex-col items-center justify-center crt-overlay scan-line">
      <div className={`text-center ${isGlitching ? 'animate-glitch-1' : ''}`}>
        <h1 className="text-3xl md:text-4xl font-ocr text-horror-gray mb-4">GAME OVER</h1>
        
        {winner === 'player' ? (
          <div className="text-2xl font-mono text-green-500 mb-8">
            YOU SURVIVED
          </div>
        ) : (
          <div className="text-2xl font-mono text-horror-red mb-8 animate-pulse">
            SYSTEM WINS
          </div>
        )}
        
        {showButton && (
          <button 
            onClick={onRestart}
            className="px-6 py-3 bg-horror-light/10 border border-horror-light/40 text-horror-gray hover:bg-horror-light/20 transition-colors font-mono mt-4"
          >
            RESTART_
          </button>
        )}
      </div>
      
      <div className="absolute bottom-8 text-xs font-mono text-horror-gray/50 max-w-xs text-center">
        {winner === 'player' 
          ? "CONGRATULATIONS SUBJECT #4721. YOUR PATTERN RECOGNITION SKILLS HAVE BEEN RECORDED."
          : "SUBJECT #4721 TERMINATED. RECALIBRATING SYSTEM FOR NEXT SUBJECT."}
      </div>
    </div>
  );
};

export default GameOverScreen;
