
import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface OpponentHUDProps {
  health: number;
  maxHealth: number;
  currentMove?: string;
  showMove: boolean;
}

const OpponentHUD: React.FC<OpponentHUDProps> = ({
  health,
  maxHealth,
  currentMove,
  showMove
}) => {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 100);
    }, 4000);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className="relative w-full bg-horror-dark border-b border-horror-light p-4 text-horror-gray crt-overlay scan-line">
      <div className="absolute top-0 left-0 w-full h-full opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjMWExZjJjIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDVMNSAwWk02IDRMNCA2Wk0tMSAxTDEgLTFaIiBzdHJva2U9IiMyNjJhMzciIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')]"></div>
      </div>
      
      <h1 className={`text-center text-xl font-ocr tracking-wider ${isGlitching ? 'animate-glitch-1' : ''}`}>
        COMPUTER
      </h1>
      
      <div className="flex justify-between items-center mt-2">
        <div className="w-20 h-20 border border-horror-light bg-black/30 flex items-center justify-center">
          <div className={`text-3xl ${isGlitching ? 'animate-glitch-2' : ''}`}>
            {showMove ? currentMove : '🤖'}
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex">
            {Array.from({ length: maxHealth }).map((_, i) => (
              <Heart 
                key={i}
                size={18} 
                className={`mx-0.5 ${i < health ? 'text-horror-red' : 'text-horror-light/30'}`}
                fill={i < health ? "#ea384c" : "transparent"}
              />
            ))}
          </div>
          
          <div className="mt-1 text-xs font-mono opacity-70 animate-pulse">
            SYSTEM: ACTIVE
          </div>
          
          <div className="mt-1 w-32 h-2 bg-horror-light/20">
            <div 
              className="h-full bg-horror-red transition-all duration-500" 
              style={{ width: `${(health / maxHealth) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentHUD;
