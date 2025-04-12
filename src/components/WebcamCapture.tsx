import React, { useRef, useState, useEffect } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

interface WebcamCaptureProps {
  onGestureDetected: (gesture: string) => void;
  isCountingDown: boolean;
  detectedGesture: string | null;
  showGestureResult: boolean;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onGestureDetected,
  isCountingDown,
  detectedGesture,
  showGestureResult
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Initialize MediaPipe GestureRecognizer
  useEffect(() => {
    const initGestureRecognizer = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        }
      );
    };
    
    initGestureRecognizer();
    
    return () => {
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Process video frames with MediaPipe
  const processVideoFrame = () => {
    if (!videoRef.current || !gestureRecognizerRef.current || videoRef.current.paused || videoRef.current.ended) {
      return;
    }
    
    const nowInMs = Date.now();
    const results = gestureRecognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);
    
    // Check if hands are detected
    const handPresent = results.landmarks && results.landmarks.length > 0;
    setIsHandDetected(handPresent);
    
    // Schedule next frame
    animationRef.current = requestAnimationFrame(processVideoFrame);
  };
  
  // Start webcam
  useEffect(() => {
    const getWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            // Start processing frames
            animationRef.current = requestAnimationFrame(processVideoFrame);
          };
        }
        
        return () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          stream.getTracks().forEach(track => track.stop());
        };
      } catch (err) {
        console.error("Error accessing webcam", err);
      }
    };
    
    getWebcam();
  }, []);
  
  // Handle countdown and gesture detection
  useEffect(() => {
    if (isCountingDown && countdown === null) {
      setCountdown(3);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(interval);
            
            // Capture and recognize gesture when countdown completes
            setTimeout(() => {
              if (videoRef.current && gestureRecognizerRef.current) {
                const nowInMs = Date.now();
                const results = gestureRecognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);
                
                if (results.gestures && results.gestures.length > 0) {
                  const gesture = results.gestures[0][0].categoryName;
                  // Map MediaPipe gestures to game gestures
                  let gameGesture = '✊'; // Default to rock
                  
                  if (gesture === 'Open_Palm') {
                    gameGesture = '✋'; // Paper
                  } else if (gesture === 'Victory' || gesture === 'ILoveYou') {
                    gameGesture = '✌️'; // Scissors
                  } else if (gesture === 'Closed_Fist') {
                    gameGesture = '✊'; // Rock
                  }
                  
                  onGestureDetected(gameGesture);
                } else {
                  // Fallback if no gesture detected
                  onGestureDetected('✊');
                }
              }
            }, 500);
            
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isCountingDown, onGestureDetected, countdown]);
  
  return (
    <div className="relative w-full h-full overflow-hidden vignette">
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Hand detection indicator */}
      {isHandDetected && !isCountingDown && !showGestureResult && (
        <div className="absolute inset-0 border-2 border-green-500/30 pointer-events-none" />
      )}
      
      {/* Countdown overlay */}
      {isCountingDown && countdown !== null && (
        <div className="absolute inset-0 bg-horror-dark/80 flex items-center justify-center crt-flicker">
          <span className="text-7xl font-bold text-horror-gray animate-pulse">{countdown}</span>
        </div>
      )}
      
      {/* Result overlay */}
      {showGestureResult && detectedGesture && (
        <div className="absolute inset-0 bg-horror-dark/80 flex flex-col items-center justify-center">
          <div className="text-2xl font-ocr text-horror-gray mb-2 animate-glitch-1">YOU PLAYED:</div>
          <div className="text-6xl mb-4">{detectedGesture}</div>
          <div className="text-sm font-mono text-horror-gray/70 animate-pulse">GESTURE RECORDED</div>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
