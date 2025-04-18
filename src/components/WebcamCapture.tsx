import React, { useRef, useState, useEffect, memo } from 'react';
import { GestureRecognizer } from '@mediapipe/tasks-vision';
import { initGestureRecognizer, detectGesture, drawHandLandmarks, mapGestureToGameSymbol, VALID_GAME_GESTURES } from '../lib/gesture';
import CountdownOverlay from './CountdownOverlay';

interface WebcamCaptureProps {
  showGestureResult: boolean;
  resultGesture?: string | null;
  debugMode?: boolean;
  roundActive: boolean; // The prop itself
  peekedGesture: string | null;
  onGestureDetected: (gesture: string) => void;
  onThreeGestureDetected?: () => void; // New callback for "three" gesture
  onOneGestureDetected?: () => void; // New callback for "one" gesture
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  showGestureResult,
  resultGesture,
  debugMode = true,
  roundActive, // Keep receiving the prop
  peekedGesture,
  onGestureDetected,
  onThreeGestureDetected,
  onOneGestureDetected
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isCounting, setIsCounting] = useState(false);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const animationRef = useRef<number | null>(null);
  const [detectedGestureName, setDetectedGestureName] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const [isGestureRecognizerReady, setIsGestureRecognizerReady] = useState(false);
  const allCriteriaMet = useRef<boolean>(false);
  // Three gesture state
  const [isThreeGestureCounting, setIsThreeGestureCounting] = useState(false);
  const [threeGestureCountdown, setThreeGestureCountdown] = useState(3);
  const threeGestureIntervalRef = useRef<number | null>(null);
  // One gesture state
  const [isOneGestureCounting, setIsOneGestureCounting] = useState(false);
  const [oneGestureCountdown, setOneGestureCountdown] = useState(3);
  const oneGestureIntervalRef = useRef<number | null>(null);
  // Cooldown states
  const [isThreeGestureOnCooldown, setIsThreeGestureOnCooldown] = useState(false);
  const [isOneGestureOnCooldown, setIsOneGestureOnCooldown] = useState(false);
  const threeGestureCooldownRef = useRef<number | null>(null);
  const oneGestureCooldownRef = useRef<number | null>(null);

  const roundActiveRef = useRef(roundActive);

  useEffect(() => {
    roundActiveRef.current = roundActive;
  }, [roundActive]);

  useEffect(() => {
    const init = async () => {
      try {
        gestureRecognizerRef.current = await initGestureRecognizer();
        setIsGestureRecognizerReady(true);
        console.log("Gesture Recognizer Initialized"); // Added log
      } catch (err) {
        console.error('Failed to initialize GestureRecognizer:', err);
        setIsGestureRecognizerReady(false);
      }
    };

    init();

    return () => {
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
        console.log("Gesture Recognizer Closed"); // Added log
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        console.log("Animation Frame Cancelled on Cleanup"); // Added log
      }
      setIsGestureRecognizerReady(false); // Ensure state is reset
    };
  }, []); // Keep dependencies minimal for init/cleanup

  // Ensure proper cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Clear any active intervals to avoid memory leaks
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      if (threeGestureIntervalRef.current) {
        clearInterval(threeGestureIntervalRef.current);
        threeGestureIntervalRef.current = null;
      }
      
      if (oneGestureIntervalRef.current) {
        clearInterval(oneGestureIntervalRef.current);
        oneGestureIntervalRef.current = null;
      }
      
      // Clear cooldown timeouts
      if (threeGestureCooldownRef.current) {
        clearTimeout(threeGestureCooldownRef.current);
        threeGestureCooldownRef.current = null;
      }
      
      if (oneGestureCooldownRef.current) {
        clearTimeout(oneGestureCooldownRef.current);
        oneGestureCooldownRef.current = null;
      }
      
      // Reset states
      setIsCounting(false);
      setIsThreeGestureCounting(false);
      setIsOneGestureCounting(false);
      setIsThreeGestureOnCooldown(false);
      setIsOneGestureOnCooldown(false);
      setCountdown(3);
      setThreeGestureCountdown(3);
      setOneGestureCountdown(3);
    };
  }, []);

  // Function to reset all countdown states - can be called from anywhere in component
  const resetCountdowns = () => {
    // Just cancel any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setIsCounting(false);
      setCountdown(3);
    }
    
    // Cancel any three gesture countdown if active
    if (threeGestureIntervalRef.current) {
      clearInterval(threeGestureIntervalRef.current);
      threeGestureIntervalRef.current = null;
      setIsThreeGestureCounting(false);
      setThreeGestureCountdown(3);
    }
    
    // Cancel any one gesture countdown if active
    if (oneGestureIntervalRef.current) {
      clearInterval(oneGestureIntervalRef.current);
      oneGestureIntervalRef.current = null;
      setIsOneGestureCounting(false);
      setOneGestureCountdown(3);
    }
    
    setIsCounting(false);
    // Clear gesture data
    setDetectedGestureName(null);
    setConfidenceScore(null);
    allCriteriaMet.current = false;
  };

  // Initialize canvas size after video is loaded
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      const videoElement = videoRef.current; // Capture current ref value
      const canvasElement = canvasRef.current; // Capture current ref value

      const resizeCanvas = () => {
        if (videoElement && canvasElement) {
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
        }
      };

      videoElement.addEventListener('loadedmetadata', resizeCanvas);
      videoElement.addEventListener('resize', resizeCanvas);
      if (videoElement.videoWidth > 0) {
        resizeCanvas();
      }


      return () => {
        videoElement?.removeEventListener('loadedmetadata', resizeCanvas);
        videoElement?.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [isGestureRecognizerReady]); // Re-run if recognizer/video might change, or just keep empty [] if video element stable

  // Start webcam and frame processing
  useEffect(() => {
    // Only run when the recognizer is ready
    if (!isGestureRecognizerReady) {
      console.log("Waiting for Gesture Recognizer...");
      return;
    }

    // Moved processVideoFrame definition here to ensure it captures necessary refs/state setters correctly
    // It will still close over the initial state/props unless we use refs or pass them explicitly
    const processVideoFrame = async () => {
      // Basic checks
      if (!videoRef.current || !gestureRecognizerRef.current || videoRef.current.paused || videoRef.current.ended) {
        animationRef.current = requestAnimationFrame(processVideoFrame);
        return;
      }

      try {
        const result = detectGesture(videoRef.current, gestureRecognizerRef.current);
        const handDetected = result.handPresent;
        
        // Update hand detection state
        setIsHandDetected(handDetected);
        
        // SIMPLE APPROACH: If no hand is detected, stop the countdown immediately
        if (!handDetected) {
          resetCountdowns();
          
          // Clear canvas of any previous hand landmarks
          if (canvasRef.current && debugMode) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        } 
        // Hand is detected
        else if (result.landmarks) {
          setDetectedGestureName(result.detectedGesture || null);
          setConfidenceScore(result.confidenceScore || 0);
          
          // Check for three gesture to activate special countdown
          if (result.detectedGesture?.toLowerCase() === 'three' && 
              (result.confidenceScore || 0) > 80 && 
              !isThreeGestureCounting && 
              !threeGestureIntervalRef.current && 
              !isCounting &&
              !isOneGestureCounting && 
              !isThreeGestureOnCooldown &&
              roundActiveRef.current) {
            
            console.log('Three gesture detected:', result.detectedGesture);
            
            setIsThreeGestureCounting(true);
            setThreeGestureCountdown(3);
            
            threeGestureIntervalRef.current = window.setInterval(() => {
              setThreeGestureCountdown(prev => {
                const newCount = prev - 1;
                
                if (newCount <= 0) {
                  // Clear the interval
                  if (threeGestureIntervalRef.current) {
                    clearInterval(threeGestureIntervalRef.current);
                    threeGestureIntervalRef.current = null;
                  }
                  
                  // Important: Reset state properly to ensure gesture detection can continue
                  setIsThreeGestureCounting(false);
                  setThreeGestureCountdown(3);
                  
                  // Set the cooldown
                  setIsThreeGestureOnCooldown(true);
                  if (threeGestureCooldownRef.current) {
                    clearTimeout(threeGestureCooldownRef.current);
                  }
                  threeGestureCooldownRef.current = window.setTimeout(() => {
                    setIsThreeGestureOnCooldown(false);
                    threeGestureCooldownRef.current = null;
                  }, 2000); // 2 second cooldown
                  
                  // Invoke the callback for three gesture detection
                  if (onThreeGestureDetected) {
                    onThreeGestureDetected();
                  }
                  
                  return 0;
                }
                
                return newCount;
              });
            }, 1000);
          } 
          // Check for one gesture to activate cola special countdown
          else if (result.detectedGesture?.toLowerCase() === 'one' && 
              (result.confidenceScore || 0) > 80 && 
              !isOneGestureCounting && 
              !oneGestureIntervalRef.current && 
              !isCounting &&
              !isThreeGestureCounting && 
              !isOneGestureOnCooldown &&
              roundActiveRef.current) {
            
            setIsOneGestureCounting(true);
            setOneGestureCountdown(3);
            
            oneGestureIntervalRef.current = window.setInterval(() => {
              setOneGestureCountdown(prev => {
                const newCount = prev - 1;
                
                if (newCount <= 0) {
                  // Clear the interval
                  if (oneGestureIntervalRef.current) {
                    clearInterval(oneGestureIntervalRef.current);
                    oneGestureIntervalRef.current = null;
                  }
                  
                  // Important: Reset state properly to ensure gesture detection can continue
                  setIsOneGestureCounting(false);
                  setOneGestureCountdown(3);
                  
                  // Set the cooldown
                  setIsOneGestureOnCooldown(true);
                  if (oneGestureCooldownRef.current) {
                    clearTimeout(oneGestureCooldownRef.current);
                  }
                  oneGestureCooldownRef.current = window.setTimeout(() => {
                    setIsOneGestureOnCooldown(false);
                    oneGestureCooldownRef.current = null;
                  }, 2000); // 2 second cooldown
                  
                  // Invoke the callback for one gesture detection
                  if (onOneGestureDetected) {
                    onOneGestureDetected();
                  }
                  
                  return 0;
                }
                
                return newCount;
              });
            }, 1000);
          }
          // Cancel three gesture countdown if criteria not met
          else if (result.detectedGesture?.toLowerCase() !== 'three' && threeGestureIntervalRef.current) {
            clearInterval(threeGestureIntervalRef.current);
            threeGestureIntervalRef.current = null;
            setIsThreeGestureCounting(false);
            setThreeGestureCountdown(3);
          }
          // Cancel one gesture countdown if criteria not met
          else if (result.detectedGesture?.toLowerCase() !== 'one' && oneGestureIntervalRef.current) {
            clearInterval(oneGestureIntervalRef.current);
            oneGestureIntervalRef.current = null;
            setIsOneGestureCounting(false);
            setOneGestureCountdown(3);
          }
          
          // Simple criteria check for normal gameplay
          allCriteriaMet.current = 
            (result.confidenceScore || 0) > 80 && 
            result.detectedGesture !== null && 
            VALID_GAME_GESTURES.includes(result.detectedGesture || '') && 
            roundActiveRef.current;
          
          // Start countdown if criteria met and not already counting
          if (allCriteriaMet.current && !isCounting && !countdownIntervalRef.current && !isThreeGestureCounting && !isOneGestureCounting) {
            setIsCounting(true);
            setCountdown(3);
            
            countdownIntervalRef.current = window.setInterval(() => {
              setCountdown(prev => {
                const newCount = prev - 1;
                
                if (newCount <= 0) {
                  // Get final gesture
                  const finalResult = detectGesture(videoRef.current!, gestureRecognizerRef.current!);
                  if (finalResult.detectedGesture) {
                    const gameSymbol = mapGestureToGameSymbol(finalResult.detectedGesture);
                    if (gameSymbol) {
                      onGestureDetected(gameSymbol);
                    }
                  }
                  return 0;
                }
                
                return newCount;
              });
            }, 1000);
          }
          // Cancel countdown if criteria not met
          else if (!allCriteriaMet.current && countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            setIsCounting(false);
            setCountdown(3);
          }
          
          // Draw hand landmarks
          if (canvasRef.current && debugMode) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              drawHandLandmarks(ctx, canvasRef.current, result.landmarks);
            }
          }
        }
      } catch (err) {
        console.error('Error processing video frame:', err);
        // Clear countdown on error
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          setIsCounting(false);
          setCountdown(3);
        }
        
        // Clear three gesture countdown on error
        if (threeGestureIntervalRef.current) {
          clearInterval(threeGestureIntervalRef.current);
          threeGestureIntervalRef.current = null;
          setIsThreeGestureCounting(false);
          setThreeGestureCountdown(3);
        }
        
        // Clear one gesture countdown on error
        if (oneGestureIntervalRef.current) {
          clearInterval(oneGestureIntervalRef.current);
          oneGestureIntervalRef.current = null;
          setIsOneGestureCounting(false);
          setOneGestureCountdown(3);
        }
        
        // Clear cooldown timers on error
        if (threeGestureCooldownRef.current) {
          clearTimeout(threeGestureCooldownRef.current);
          threeGestureCooldownRef.current = null;
          setIsThreeGestureOnCooldown(false);
        }
        
        if (oneGestureCooldownRef.current) {
          clearTimeout(oneGestureCooldownRef.current);
          oneGestureCooldownRef.current = null;
          setIsOneGestureOnCooldown(false);
        }
      }
      
      // Continue processing
      animationRef.current = requestAnimationFrame(processVideoFrame);
    };


    const getWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        const videoElement = videoRef.current; // Capture ref value

        if (videoElement) {
          videoElement.srcObject = stream;
          // Use a promise-based approach for play()
          videoElement.onloadedmetadata = async () => {
            console.log("Video metadata loaded");
            try {
              await videoElement.play();
              console.log("Video playing");
              // Start processing frames *only after* video starts playing
              if (animationRef.current) cancelAnimationFrame(animationRef.current); // Cancel previous loop if any
              animationRef.current = requestAnimationFrame(processVideoFrame);
              console.log("Started animation frame loop");
            } catch (playError) {
              console.error("Error playing video:", playError);
            }
          };
        }

        // Return cleanup function
        return () => {
          
          // CRITICAL: Force clear any running countdown interval
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          
          // Clear three gesture countdown
          if (threeGestureIntervalRef.current) {
            clearInterval(threeGestureIntervalRef.current);
            threeGestureIntervalRef.current = null;
          }
          
          // Clear one gesture countdown
          if (oneGestureIntervalRef.current) {
            clearInterval(oneGestureIntervalRef.current);
            oneGestureIntervalRef.current = null;
          }
          
          // Clear cooldown timers
          if (threeGestureCooldownRef.current) {
            clearTimeout(threeGestureCooldownRef.current);
            threeGestureCooldownRef.current = null;
          }
          
          if (oneGestureCooldownRef.current) {
            clearTimeout(oneGestureCooldownRef.current);
            oneGestureCooldownRef.current = null;
          }
          
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          
          stream?.getTracks().forEach(track => track.stop());
          
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          
          // Reset all state
          resetCountdowns();
          setIsThreeGestureOnCooldown(false);
          setIsOneGestureOnCooldown(false);
        };
      } catch (err) {
        console.error('Error accessing webcam:', err);
        return () => { }; // Return empty cleanup if setup failed
      }
    };

    let cleanupWebcam: (() => void) | undefined;
    // Call getWebcam which returns the cleanup function
    getWebcam().then(cleanup => {
      cleanupWebcam = cleanup;
    });

    // Return the cleanup function obtained from getWebcam
    return () => {
      cleanupWebcam?.();
    };

  }, [isGestureRecognizerReady, onGestureDetected, onThreeGestureDetected, onOneGestureDetected, debugMode]);

  return (
    <div className="relative w-full h-full overflow-hidden vignette">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]" // Flip horizontally
      />

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none transform scale-x-[-1]" // Flip canvas to match video
      />

      {/* Debug visualization panel */}
      {debugMode && (
        <div className="absolute top-4 left-4 bg-black/80 rounded-md p-3 text-white font-mono text-sm border border-green-500/50 z-10">
          <div className="flex items-center gap-2 mb-2">
          </div>
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            <div className="mt-2 border-t border-gray-600 pt-2">
              <div className="font-bold mb-1">Countdown Conditions:</div>
              <div className={isCounting ? "text-green-400" : "text-red-400"}>
                ⚡ Is Counting: {isCounting ? "Yes" : "No"} ({countdown})
              </div>
              <div className={isThreeGestureCounting ? "text-blue-400" : "text-red-400"}>
                ⚡ Three Gesture: {isThreeGestureCounting ? "Yes" : "No"} ({threeGestureCountdown})
              </div>
              <div className={isThreeGestureOnCooldown ? "text-yellow-400" : "text-gray-400"}>
                ⚡ Three Cooldown: {isThreeGestureOnCooldown ? "Yes" : "No"}
              </div>
              <div className={isOneGestureCounting ? "text-green-400" : "text-red-400"}>
                ⚡ One Gesture: {isOneGestureCounting ? "Yes" : "No"} ({oneGestureCountdown})
              </div>
              <div className={isOneGestureOnCooldown ? "text-yellow-400" : "text-gray-400"}>
                ⚡ One Cooldown: {isOneGestureOnCooldown ? "Yes" : "No"}
              </div>
              <div className={roundActiveRef.current ? "text-green-400" : "text-red-400"}>
                ⚡ Round Active (ref): {roundActiveRef.current ? "Yes" : "No"}
              </div>
              <div className={roundActive ? "text-blue-400" : "text-orange-400"}>
                (Prop: {roundActive ? "Yes" : "No"})
              </div>
              <div className={confidenceScore && confidenceScore > 80 ? "text-green-400" : "text-red-400"}>
                ⚡ Confidence {'>'} 80%: {confidenceScore && confidenceScore > 80 ? "Yes" : "No"} ({confidenceScore?.toFixed(0)}%)
              </div>
              <div className={isHandDetected ? "text-green-400" : "text-red-400"}>
                ⚡ Hand Detected: {isHandDetected ? "Yes" : "No"}
              </div>
              <div className={detectedGestureName ? "text-green-400" : "text-red-400"}>
                ⚡ Gesture Detected: {detectedGestureName ? "Yes" : "No"} ({detectedGestureName})
              </div>
              <div className={detectedGestureName && VALID_GAME_GESTURES.includes(detectedGestureName) ? "text-green-400" : "text-red-400"}>
                ⚡ Valid Game Gesture: {detectedGestureName && VALID_GAME_GESTURES.includes(detectedGestureName) ? "Yes" : "No"}
              </div>
              <div className={allCriteriaMet.current ? "text-green-400" : "text-red-400"}>
                ⚡ All Criteria Met (ref): {allCriteriaMet.current ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular countdown overlay */}
      <CountdownOverlay
        countdown={countdown}
        isCounting={isCounting}
        show={isCounting} // Show overlay only when actively counting
        color="red"
        direction="bottom-to-top"
      />

      {/* Three gesture countdown overlay */}
      <CountdownOverlay
        countdown={threeGestureCountdown}
        isCounting={isThreeGestureCounting}
        show={isThreeGestureCounting}
        color="blue" // Blue color for three gesture
        direction="top-to-bottom" // Fill from top to bottom for the three gesture
      />

      {/* One gesture countdown overlay */}
      <CountdownOverlay
        countdown={oneGestureCountdown}
        isCounting={isOneGestureCounting}
        show={isOneGestureCounting}
        color="green" // Green color for one gesture
        direction="top-to-bottom" // Fill from top to bottom for the one gesture
      />

      {/* Result overlay */}
      {showGestureResult && resultGesture && (
        <div className="absolute inset-0 bg-horror-dark/80 flex flex-col items-center justify-center z-20">
          <div className="text-2xl font-ocr text-horror-gray mb-2 animate-glitch-1">YOU PLAYED:</div>
          <div className="text-6xl mb-4">{resultGesture}</div>
          <div className="text-sm font-mono text-horror-gray/70 animate-pulse">GESTURE RECORDED</div>
        </div>
      )}
    </div>
  );
};

// Use React.memo with a custom comparison function to prevent re-renders 
// when only certain props change
export default memo(WebcamCapture, (prevProps, nextProps) => {
  // We need to re-render when roundActive changes too, since it's critical for gesture detection
  if (
    prevProps.showGestureResult !== nextProps.showGestureResult ||
    prevProps.resultGesture !== nextProps.resultGesture ||
    prevProps.debugMode !== nextProps.debugMode ||
    prevProps.onGestureDetected !== nextProps.onGestureDetected ||
    prevProps.roundActive !== nextProps.roundActive ||
    prevProps.peekedGesture !== nextProps.peekedGesture ||
    prevProps.onThreeGestureDetected !== nextProps.onThreeGestureDetected ||
    prevProps.onOneGestureDetected !== nextProps.onOneGestureDetected
  ) {
    return false; // Props are different - should re-render
  }
  
  return true; // Consider props equal, don't re-render
});