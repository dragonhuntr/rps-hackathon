import React, { useState, useEffect, useCallback } from 'react';
import { Syringe, Eye, Bug } from 'lucide-react';
import OpponentHUD from '@/components/OpponentHUD';
import PlayerHUD from '@/components/PlayerHUD';
import WebcamCapture from '@/components/WebcamCapture';
import RoundResult from '@/components/RoundResult';
import GameStartScreen from '@/components/GameStartScreen';
import GameOverScreen from '@/components/GameOverScreen';
import { useGameState } from '@/hooks/useGameState';
import { useToast } from "@/components/ui/use-toast";
import { getRandomGesture } from '@/hooks/useGameState';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(true); // true for dev
  const [showGestureResult, setShowGestureResult] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [peekedGesture, setPeekedGesture] = useState<string | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [debugMode, setDebugMode] = useState(import.meta.env.VITE_ENV === 'development');
  
  const { toast } = useToast();
  const {
    state,
    startRound,
    setPlayerGesture,
    endRound,
    useItem,
    resetGame,
    MAX_HEALTH,
  } = useGameState();
  
  // Memoize the debug mode value to prevent unnecessary re-renders
  const memoizedDebugMode = React.useMemo(() => debugMode, [debugMode]);
  const memoizedShowGestureResult = React.useMemo(() => showGestureResult, [showGestureResult]);
  
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setMediaLoaded(true);
    } else {
      toast({
        title: "Camera Error",
        description: "Your browser doesn't support webcam access needed for gesture recognition",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const toggleDebugMode = () => {
    setDebugMode(prev => !prev);
    toast({
      title: `Debug Mode: ${!debugMode ? 'Enabled' : 'Disabled'}`,
      description: "Hand detection visualization toggled",
    });
  };
  
  // Memoize the gesture detection handler to prevent unnecessary re-renders of WebcamCapture
  const handleGestureDetected = useCallback((gesture: string) => {
    setTimeout(() => {
      setPlayerGesture(gesture, peekedGesture);
      setShowRoundResult(true);
    }, 1000);
  }, [setPlayerGesture, peekedGesture]);
  
  const handleContinueAfterRound = () => {
    setIsPeeking(false);
    setPeekedGesture(null);
    setShowRoundResult(false);
    endRound();
  };
  
  const handleUseItem = (itemId: string) => {
    const item = state.items.find(i => i.id === itemId);
    
    if (!item) return;
    
    if (item.type === 'cola') {
      useItem(itemId);
      toast({
        title: "Used Cola",
        description: "Restored 1 health point.",
      });
    } else if (item.type === 'peek') {
      useItem(itemId);
      setIsPeeking(true);
      
      const peek = getRandomGesture();
      setPeekedGesture(peek);
      
      toast({
        title: "Used Peek",
        description: "You can see the opponent's next move.",
      });
    }
  };
  
  // Callback for when the three gesture is detected
  const handleThreeGestureDetected = useCallback(() => {
    // Find if player has a peek item
    const peekItem = state.items.find(item => item.type === 'peek');
    
    if (peekItem) {
      // Use the item (this will remove it from inventory)
      useItem(peekItem.id);
      
      // Generate the peek and set it
      const peek = getRandomGesture();
      setPeekedGesture(peek);
      setIsPeeking(true);
      
      toast({
        title: "Three Gesture Detected!",
        description: "Peek activated - you can see the opponent's next move.",
      });
    } else {
      // No peek item available
      toast({
        title: "Three Gesture Detected",
        description: "You need a peek item to use this gesture.",
        variant: "destructive"
      });
    }
  }, [toast, state.items, useItem]);
  
  // Callback for when the one gesture is detected
  const handleOneGestureDetected = useCallback(() => {
    // Find if player has a cola item
    const colaItem = state.items.find(item => item.type === 'cola');
    
    if (colaItem) {
      // Use the item (this will remove it from inventory)
      useItem(colaItem.id);
      
      toast({
        title: "One Gesture Detected!",
        description: "Cola activated - health restored by 1 point.",
      });
    } else {
      // No cola item available
      toast({
        title: "One Gesture Detected",
        description: "You need a cola item to use this gesture.",
        variant: "destructive"
      });
    }
  }, [toast, state.items, useItem]);
  
  const handleRestart = () => {
    resetGame();
    setShowRoundResult(false);
  };
  
  // Enhanced items with icons
  const itemsWithIcons = state.items.map(item => ({
    ...item,
    icon: item.type === 'cola' 
      ? <Syringe size={22} className="text-horror-red" />
      : <Eye size={22} className="text-horror-gray" />
  }));

  return (
    <div className="flex flex-col h-screen bg-horror overflow-hidden">
      {/* Game Start Screen */}
      {!gameStarted && (
        <GameStartScreen onStart={() => setGameStarted(true)} />
      )}
      
      {/* Game Over Screen */}
      {gameStarted && state.gameOver && state.winner && (
        <GameOverScreen 
          winner={state.winner}
          onRestart={handleRestart}
        />
      )}
      
      {/* Round Result Modal */}
      {gameStarted && showRoundResult && state.playerGesture && state.computerGesture && state.roundResult && (
        <RoundResult
          playerGesture={state.playerGesture}
          computerGesture={state.computerGesture}
          result={state.roundResult}
          onContinue={handleContinueAfterRound}
        />
      )}
      
      {/* Development mode indicator and debug toggle */}
      {import.meta.env.VITE_ENV === 'development' && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button 
            onClick={toggleDebugMode}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-mono bg-black/70 ${debugMode ? 'text-green-400' : 'text-white'}`}
          >
            <Bug size={14} />
            {debugMode ? 'Debug ON' : 'Debug OFF'}
          </button>
        </div>
      )}
      
      {/* Top: Opponent HUD */}
      <div className="w-full sticky top-0 z-10">
        <OpponentHUD 
          health={state.computerHealth} 
          maxHealth={MAX_HEALTH}
          currentMove={isPeeking ? peekedGesture : state.computerGesture}
          showMove={isPeeking || (Boolean(state.computerGesture) && showRoundResult)}
        />
      </div>
      
      {/* Middle: Webcam */}
      <div className="w-full flex justify-center items-center relative">
        <div className="aspect-square w-full max-w-[min(100vh,100vw)] relative">
          {!mediaLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-horror-dark text-horror-gray">
              <p className="text-xl font-mono">Loading Camera...</p>
            </div>
          ) : (
            <WebcamCapture
              resultGesture={state.playerGesture}
              showGestureResult={memoizedShowGestureResult}
              debugMode={memoizedDebugMode}
              roundActive={state.roundActive}
              peekedGesture={peekedGesture}
              onGestureDetected={handleGestureDetected}
              onThreeGestureDetected={handleThreeGestureDetected}
              onOneGestureDetected={handleOneGestureDetected}
            />
          )}
          
          {gameStarted && !state.gameOver && !state.roundActive && !showRoundResult && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => {
                  // Reset relevant state before starting a new round
                  setIsPeeking(false);
                  setPeekedGesture(null);
                  startRound();
                }}
                className="px-6 py-3 bg-horror-dark/80 border border-horror-red/40 text-horror-red hover:bg-horror-red/20 transition-colors font-mono"
                disabled={!mediaLoaded}
              >
                PLAY ROUND_
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom: Player HUD */}
      <div className="w-full sticky bottom-0 z-10">
        <PlayerHUD 
          health={state.playerHealth} 
          maxHealth={MAX_HEALTH}
          items={itemsWithIcons}
          onUseItem={handleUseItem}
        />
      </div>
    </div>
  );
};

export default Index;
