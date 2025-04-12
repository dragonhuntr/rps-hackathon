import React, { useRef, useState, useEffect } from 'react';
import { GestureRecognizer } from '@mediapipe/tasks-vision';
import { initGestureRecognizer, detectGesture, drawHandLandmarks, mapGestureToGameSymbol, VALID_GAME_GESTURES } from '../lib/gesture';
import CountdownOverlay from './CountdownOverlay';

interface WebcamCaptureProps {
  showGestureResult: boolean;
  resultGesture?: string | null;
  debugMode?: boolean;
  roundActive: boolean; // The prop itself
  onGestureDetected: (gesture: string) => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  showGestureResult,
  resultGesture,
  debugMode = true,
  roundActive, // Keep receiving the prop
  onGestureDetected
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

  // --- SOLUTION START ---
  // Ref to hold the latest value of roundActive
  const roundActiveRef = useRef(roundActive);

  // Effect to update the ref whenever the prop changes
  useEffect(() => {
    roundActiveRef.current = roundActive;
  }, [roundActive]);
  // --- SOLUTION END ---

  // Initialize MediaPipe GestureRecognizer
  useEffect(() => {
    // ... (rest of the init code remains the same)
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

  // Initialize canvas size after video is loaded
  useEffect(() => {
    // ... (canvas resize logic remains the same)
    if (videoRef.current && canvasRef.current) {
      const videoElement = videoRef.current; // Capture current ref value
      const canvasElement = canvasRef.current; // Capture current ref value

      const resizeCanvas = () => {
        if (videoElement && canvasElement) {
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          // console.log(`Canvas resized: ${canvasElement.width}x${canvasElement.height}`); // Optional log
        }
      };

      videoElement.addEventListener('loadedmetadata', resizeCanvas);
      videoElement.addEventListener('resize', resizeCanvas);
      // Initial resize in case metadata is already loaded
      if (videoElement.videoWidth > 0) {
         resizeCanvas();
      }


      return () => {
        videoElement?.removeEventListener('loadedmetadata', resizeCanvas);
        videoElement?.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [isGestureRecognizerReady]); // Re-run if recognizer/video might change, or just keep empty [] if video element stable

  // Process video frames with MediaPipe
  // Define processVideoFrame *outside* the webcam setup effect,
  // but use useCallback to memoize it if needed (though often not necessary with requestAnimationFrame loops)
  // For simplicity here, we'll keep it inside, but be mindful of dependencies if extracting.

  // Start webcam and frame processing
  useEffect(() => {
    // Only run when the recognizer is ready
    if (!isGestureRecognizerReady) {
      console.log("Waiting for Gesture Recognizer...");
      return;
    }

    // Moved processVideoFrame definition here to ensure it captures necessary refs/state setters correctly
    // It will still close over the initial state/props unless we use refs or pass them explicitly
    const processVideoFrame = () => {
      // Add checks for refs being current at the start of the frame processing
      if (!videoRef.current || !gestureRecognizerRef.current || videoRef.current.paused || videoRef.current.ended) {
        // console.log("Video not ready or recognizer missing, skipping frame.");
        // Request next frame even if skipping processing this one, to keep the loop alive
        animationRef.current = requestAnimationFrame(processVideoFrame);
        return;
      }

      try {
        const result = detectGesture(videoRef.current, gestureRecognizerRef.current);
        setIsHandDetected(result.handPresent); // Update state based on detection

        if (result.handPresent && result.landmarks) {
          setDetectedGestureName(result.detectedGesture || null);
          setConfidenceScore(result.confidenceScore || 0); // Default to 0 if null

          allCriteriaMet.current =
            (result.confidenceScore || 0) > 80 &&
            result.handPresent &&
            result.detectedGesture !== null &&
            VALID_GAME_GESTURES.includes(result.detectedGesture || '') &&
            roundActiveRef.current;


          if (allCriteriaMet.current && !isCounting) {
            // Only start counting if we're not already counting and interval isn't set
            if (!countdownIntervalRef.current) {
              console.log(`Starting countdown (roundActive: ${roundActiveRef.current}, confidence: ${result.confidenceScore}, hand: ${result.handPresent}, gesture: ${result.detectedGesture})`);
              setIsCounting(true);
              setCountdown(3); // Reset countdown state before starting interval

              countdownIntervalRef.current = window.setInterval(() => {
                setCountdown(prev => {
                  const newCount = prev > 0 ? prev - 1 : 0;
                  console.log('Countdown update:', newCount);

                  if (newCount === 0) {
                     // Re-detect right before triggering to get the *final* gesture at count 0
                     const finalResult = detectGesture(videoRef.current!, gestureRecognizerRef.current!); // Non-null assertion assumes video still exists
                     if (finalResult.detectedGesture) {
                        console.log(`Countdown finished. Detected gesture: ${finalResult.detectedGesture}`);
                        const gameSymbol = mapGestureToGameSymbol(finalResult.detectedGesture);
                        if (gameSymbol) {
                          onGestureDetected(gameSymbol);
                        }
                     } else {
                         console.log("Countdown finished, but no gesture detected at the end.");
                     }

                     // Clear interval *after* processing
                     clearInterval(countdownIntervalRef.current!); // Non-null because we are inside its callback
                     countdownIntervalRef.current = null;
                     setIsCounting(false); // Update counting state *after* clearing
                     // No need to return 0 here, state update handles it.
                     // Let the normal loop handle resetting countdown display outside the interval.
                  }

                  return newCount; // Return the new count for the next state update
                });
              }, 1000);
            }
          } else if (!allCriteriaMet.current) {
            // If criteria are no longer met AND we were counting, cancel the countdown
            console.log(`Countdown cancelled (Criteria not met: roundActive: ${roundActiveRef.current}, confidence: ${result.confidenceScore}, hand: ${result.handPresent}, gesture: ${result.detectedGesture})`);
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null; // Reset the ref
            }
            setIsCounting(false);
            setCountdown(3); // Reset countdown state
          }


          if (canvasRef.current && debugMode) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              try {
                 // Clear previous frame before drawing new one
                 ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                 drawHandLandmarks(ctx, canvasRef.current, result.landmarks);
              } catch (err) {
                console.error('Error drawing hand landmarks:', err);
                // Clear canvas on error to avoid stale drawings
                 ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
          }
        } else {
           // --- Hand Not Detected ---
           // Clear canvas if in debug mode
           if (canvasRef.current && debugMode) {
             const ctx = canvasRef.current.getContext('2d');
             if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
           }
           // Reset gesture state
           setDetectedGestureName(null);
           setConfidenceScore(null);
           // Reset criteria flag
           allCriteriaMet.current = false;

           // Clear countdown if hand is not detected and we were counting
           if (isCounting) {
             console.log("Countdown cancelled (Hand lost - outer check)");
             if (countdownIntervalRef.current) {
               clearInterval(countdownIntervalRef.current);
               countdownIntervalRef.current = null;
             }
             setIsCounting(false);
             setCountdown(3);
           }
        }
      } catch (err) {
        console.error('Error processing video frame:', err);
        // Optionally clear canvas or reset state here too
         if (canvasRef.current && debugMode) {
             const ctx = canvasRef.current.getContext('2d');
             if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
           }
      }

      // Schedule next frame processing
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
          console.log("Cleaning up webcam useEffect...");
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null; // Clear ref
            console.log("Animation Frame Cancelled in webcam cleanup");
          }
          stream?.getTracks().forEach(track => track.stop());
          console.log("Webcam stream stopped.");
          if (videoRef.current) {
             videoRef.current.srcObject = null; // Release stream from video element
          }
          // Clear any lingering countdown interval
          if (countdownIntervalRef.current) {
             clearInterval(countdownIntervalRef.current);
             countdownIntervalRef.current = null;
             console.log("Cleared countdown interval in webcam cleanup");
          }
          // Reset relevant states on cleanup
          setIsCounting(false);
          setCountdown(3);
          setIsHandDetected(false);
          setDetectedGestureName(null);
          setConfidenceScore(null);
          allCriteriaMet.current = false;

        };
      } catch (err) {
        console.error('Error accessing webcam:', err);
        return () => {}; // Return empty cleanup if setup failed
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

  }, [isGestureRecognizerReady, onGestureDetected, debugMode]);

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
      {/* Uses the 'roundActive' prop directly, which is why it updates correctly */}
      {debugMode && (
        <div className="absolute top-4 left-4 bg-black/80 rounded-md p-3 text-white font-mono text-sm border border-green-500/50 z-10">
          {/* ... (rest of debug panel JSX - make sure it uses the direct prop or state values) */}
          <div className="flex items-center gap-2 mb-2">
            {/* ... */}
          </div>
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            {/* ... */}
             <div className="mt-2 border-t border-gray-600 pt-2">
              <div className="font-bold mb-1">Countdown Conditions:</div>
              <div className={isCounting ? "text-green-400" : "text-red-400"}>
                ⚡ Is Counting: {isCounting ? "Yes" : "No"} ({countdown})
              </div>
              {/* Reading the ref here for debug consistency with the loop logic */}
              <div className={roundActiveRef.current ? "text-green-400" : "text-red-400"}>
                ⚡ Round Active (ref): {roundActiveRef.current ? "Yes" : "No"}
              </div>
               {/* Keep the original prop display for comparison if needed */}
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

      {/* Countdown overlay */}
      <CountdownOverlay
        countdown={countdown}
        isCounting={isCounting}
        show={isCounting} // Show overlay only when actively counting
      />

      {/* Result overlay */}
      {/* ... (result overlay remains the same) */}
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

export default WebcamCapture;