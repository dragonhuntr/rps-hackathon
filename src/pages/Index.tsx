import React, { useState, useEffect } from 'react';
import { Syringe, Eye, Bug } from 'lucide-react';
import OpponentHUD from '@/components/OpponentHUD';
import PlayerHUD from '@/components/PlayerHUD';
import WebcamCapture from '@/components/WebcamCapture';
import RoundResult from '@/components/RoundResult';
import GameStartScreen from '@/components/GameStartScreen';
import GameOverScreen from '@/components/GameOverScreen';
import { useGameState } from '@/hooks/useGameState';
import { useToast } from "@/components/ui/use-toast";

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
  
  useEffect(() => {
    // Check if MediaPipe is supported
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
  
  const handleStartGame = () => {
    setGameStarted(true);
  };
  
  const handleStartRound = () => {
    startRound();
  };
  
  const handleGestureDetected = (gesture: string) => {
    setShowGestureResult(true);
    
    // Set timeout to show gesture result before showing round result
    setTimeout(() => {
      setShowGestureResult(false);
      setPlayerGesture(gesture);
      setShowRoundResult(true);
    }, 1500);
  };
  
  const handleContinueAfterRound = () => {
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
      
      // Generate "peeked" gesture (in a real app this would be the AI's actual next move)
      const gestures = ['✊', '✋', '✌️'];
      const peek = gestures[Math.floor(Math.random() * gestures.length)];
      setPeekedGesture(peek);
      
      toast({
        title: "Used Peek",
        description: "You can see the opponent's next move.",
      });
      
      // Clear peeking after 5 seconds
      setTimeout(() => {
        setIsPeeking(false);
        setPeekedGesture(null);
      }, 5000);
    }
  };
  
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
        <GameStartScreen onStart={handleStartGame} />
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
          showMove={isPeeking || Boolean(state.computerGesture)}
        />
      </div>
      
      {/* Middle: Webcam */}
      <div className="flex-grow relative">
        {!mediaLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-horror-dark text-horror-gray">
            <p className="text-xl font-mono">Loading Camera...</p>
          </div>
        ) : (
          <WebcamCapture
            resultGesture={state.playerGesture}
            showGestureResult={showGestureResult}
            debugMode={debugMode}
          />
        )}
        
        {gameStarted && !state.gameOver && !state.roundActive && !showRoundResult && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={handleStartRound}
              className="px-6 py-3 bg-horror-dark/80 border border-horror-red/40 text-horror-red hover:bg-horror-red/20 transition-colors font-mono"
              disabled={!mediaLoaded}
            >
              PLAY ROUND_
            </button>
          </div>
        )}
        
        {/* Peeking indicator */}
        {isPeeking && peekedGesture && (
          <div className="absolute bottom-4 right-4 bg-horror-dark/90 p-2 border border-horror-light/30">
            <div className="text-xs font-mono text-horror-gray mb-1">NEXT MOVE:</div>
            <div className="text-2xl">{peekedGesture}</div>
          </div>
        )}
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
