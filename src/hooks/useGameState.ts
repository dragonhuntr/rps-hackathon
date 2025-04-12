
import { useState, useCallback } from 'react';

export type Item = {
  id: string;
  type: string;
  name: string;
};

export type GameState = {
  playerHealth: number;
  computerHealth: number;
  items: Item[];
  playerGesture: string | null;
  computerGesture: string | null;
  roundResult: 'win' | 'lose' | 'draw' | null;
  roundActive: boolean;
  gameOver: boolean;
  winner: 'player' | 'computer' | null;
};

const MAX_HEALTH = 5;

// Determine winner based on gestures
const determineWinner = (playerGesture: string, computerGesture: string): 'win' | 'lose' | 'draw' => {
  if (playerGesture === computerGesture) return 'draw';
  
  if (
    (playerGesture === '✊' && computerGesture === '✌️') ||
    (playerGesture === '✌️' && computerGesture === '✋') ||
    (playerGesture === '✋' && computerGesture === '✊')
  ) {
    return 'win';
  }
  
  return 'lose';
};

// Generate a random gesture for the computer
const getRandomGesture = (): string => {
  const gestures = ['✊', '✋', '✌️'];
  return gestures[Math.floor(Math.random() * gestures.length)];
};

// Generate random items
const generateRandomItems = (count: number): Item[] => {
  const itemTypes = [
    { type: 'cola', name: 'COLA' },
    { type: 'peek', name: 'PEEK' },
  ];
  
  const items: Item[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    items.push({
      id: `item-${Date.now()}-${i}`,
      ...randomType
    });
  }
  
  return items;
};

export const useGameState = () => {
  const [state, setState] = useState<GameState>({
    playerHealth: MAX_HEALTH,
    computerHealth: MAX_HEALTH,
    items: generateRandomItems(2),
    playerGesture: null,
    computerGesture: null,
    roundResult: null,
    roundActive: false,
    gameOver: false,
    winner: null,
  });
  
  const startRound = useCallback(() => {
    setState(prev => ({
      ...prev,
      roundActive: true,
      playerGesture: null,
      computerGesture: null,
      roundResult: null,
    }));
  }, []);
  
  const setPlayerGesture = useCallback((gesture: string, peekedGesture?: string) => {
    console.log(peekedGesture);
    const computerGesture = peekedGesture || getRandomGesture();
    const result = determineWinner(gesture, computerGesture);
    
    setState(prev => {
      let newPlayerHealth = prev.playerHealth;
      let newComputerHealth = prev.computerHealth;
      
      if (result === 'lose') {
        newPlayerHealth = Math.max(0, prev.playerHealth - 1);
      } else if (result === 'win') {
        newComputerHealth = Math.max(0, prev.computerHealth - 1);
      }
      
      const gameOver = newPlayerHealth === 0 || newComputerHealth === 0;
      const winner = gameOver 
        ? (newPlayerHealth === 0 ? 'computer' : 'player')
        : null;
      
      return {
        ...prev,
        playerGesture: gesture,
        computerGesture,
        roundResult: result,
        playerHealth: newPlayerHealth,
        computerHealth: newComputerHealth,
        roundActive: false,
        gameOver,
        winner,
      };
    });
  }, []);
  
  const endRound = useCallback(() => {
    setState(prev => {
      // Only add items occasionally
      const shouldAddItem = Math.random() > 0.7;
      const newItems = shouldAddItem 
        ? [...prev.items, ...generateRandomItems(1)]
        : prev.items;
      
      return {
        ...prev,
        items: newItems,
      };
    });
  }, []);
  
  const useItem = useCallback((itemId: string) => {
    setState(prev => {
      const item = prev.items.find(i => i.id === itemId);
      
      if (!item) return prev;
      
      const remainingItems = prev.items.filter(i => i.id !== itemId);
      let updatedState = { ...prev, items: remainingItems };
      
      // Handle item effects
      if (item.type === 'cola') {
        updatedState = {
          ...updatedState,
          playerHealth: Math.min(MAX_HEALTH, updatedState.playerHealth + 1),
        };
      } else if (item.type === 'peek') {
        // Peek will be handled in the UI layer
        // We'll just remove the item here
      }
      
      return updatedState;
    });
  }, []);
  
  const resetGame = useCallback(() => {
    setState({
      playerHealth: MAX_HEALTH,
      computerHealth: MAX_HEALTH,
      items: generateRandomItems(2),
      playerGesture: null,
      computerGesture: null,
      roundResult: null,
      roundActive: false,
      gameOver: false,
      winner: null,
    });
  }, []);
  
  return {
    state,
    startRound,
    setPlayerGesture,
    endRound,
    useItem,
    resetGame,
    MAX_HEALTH,
  };
};
