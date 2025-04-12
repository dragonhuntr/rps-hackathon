
import React from 'react';
import { Heart, Syringe, Eye } from 'lucide-react';

interface Item {
  id: string;
  type: string;
  name: string;
  icon: React.ReactNode;
}

interface PlayerHUDProps {
  health: number;
  maxHealth: number;
  items: Item[];
  onUseItem: (itemId: string) => void;
}

const PlayerHUD: React.FC<PlayerHUDProps> = ({
  health,
  maxHealth,
  items,
  onUseItem
}) => {
  return (
    <div className="w-full bg-horror-dark border-t border-horror-light p-4 text-horror-gray crt-overlay">
      <div className="flex justify-between items-center mb-2">
        <div>
          <div className="text-xs font-mono uppercase tracking-wide opacity-70">VITALS</div>
          <div className="flex mt-1">
            {Array.from({ length: maxHealth }).map((_, i) => (
              <Heart 
                key={i}
                size={20} 
                className={`mr-1 ${i < health ? 'text-horror-red' : 'text-horror-light/30'}`}
                fill={i < health ? "#ea384c" : "transparent"}
              />
            ))}
          </div>
        </div>
        
        <div className="text-xs font-mono text-right">
          <div className="opacity-70 uppercase tracking-wide">STATUS</div>
          <div className="text-horror-gray mt-1 animate-blink inline-block">ACTIVE_</div>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="text-xs font-mono uppercase tracking-wide opacity-70 mb-2">INVENTORY</div>
        <div className="flex overflow-x-auto pb-2">
          {items.length > 0 ? (
            items.map((item) => (
              <button
                key={item.id}
                className="min-w-[60px] h-16 flex flex-col items-center justify-center bg-horror-light/10 border border-horror-light/30 mr-3 p-2 hover:bg-horror-light/20 transition-colors"
                onClick={() => onUseItem(item.id)}
              >
                <div className="text-horror-gray mb-1">{item.icon}</div>
                <div className="text-xs font-mono uppercase">{item.name}</div>
              </button>
            ))
          ) : (
            <div className="text-xs font-mono opacity-50">NO ITEMS AVAILABLE</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerHUD;
