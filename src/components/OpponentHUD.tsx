
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
  return (
    <div className="relative w-full bg-horror-dark border-b border-horror-light p-4 text-horror-gray crt-overlay scan-line">
      <h1 className={`text-center text-xl font-ocr tracking-wider`}>
        COMPUTER
      </h1>
        
      <div className="flex flex-col items-center">
          <div className="flex justify-center">
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
        </div>
      
      <div className="flex justify-center items-center mt-2">
        <div className="w-60 h-60 border border-horror-light bg-black/30 flex items-center justify-center">
          <div className={`text-3xl`}>
            {showMove ? currentMove : '🤖'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentHUD;
