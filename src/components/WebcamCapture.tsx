import React, { useRef, useState, useEffect } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

interface WebcamCaptureProps {
  onGestureDetected: (gesture: string) => void;
  isCountingDown: boolean;
  detectedGesture: string | null;
  showGestureResult: boolean;
  debugMode?: boolean;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onGestureDetected,
  isCountingDown,
  detectedGesture,
  showGestureResult,
  debugMode = import.meta.env.VITE_ENV === 'development'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const animationRef = useRef<number | null>(null);
  const [detectedGestureName, setDetectedGestureName] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  
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
  
  // Draw hand landmarks on canvas
  const drawLandmarks = (landmarks: Landmark[][]) => {
    if (!canvasRef.current || !videoRef.current || !debugMode) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Set canvas dimensions to match video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    
    // Draw connections between landmarks
    const drawConnectors = (landmarks: Landmark[]) => {
      // Define hand connections (simplified for this example)
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],  // thumb
        [0, 5], [5, 6], [6, 7], [7, 8],  // index finger
        [0, 9], [9, 10], [10, 11], [11, 12],  // middle finger
        [0, 13], [13, 14], [14, 15], [15, 16],  // ring finger
        [0, 17], [17, 18], [18, 19], [19, 20],  // pinky
        [0, 5], [5, 9], [9, 13], [13, 17]  // palm
      ];
      
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      
      for (const [idx1, idx2] of connections) {
        const landmark1 = landmarks[idx1];
        const landmark2 = landmarks[idx2];
        
        if (landmark1 && landmark2) {
          ctx.beginPath();
          ctx.moveTo(landmark1.x * canvasRef.current!.width, landmark1.y * canvasRef.current!.height);
          ctx.lineTo(landmark2.x * canvasRef.current!.width, landmark2.y * canvasRef.current!.height);
          ctx.stroke();
        }
      }
    };
    
    // Draw each landmark as a circle
    const drawLandmarkPoints = (landmarks: Landmark[]) => {
      ctx.fillStyle = '#FF0000';
      
      landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvasRef.current!.width,
          landmark.y * canvasRef.current!.height,
          5,
          0,
          2 * Math.PI
        );
        ctx.fill();
      });
    };
    
    // Draw each hand
    landmarks.forEach(handLandmarks => {
      drawConnectors(handLandmarks);
      drawLandmarkPoints(handLandmarks);
    });
  };
  
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
    
    // Draw landmarks if hands are detected
    if (handPresent && results.landmarks) {
      // Update detected gesture and confidence
      if (results.gestures && results.gestures.length > 0) {
        const gesture = results.gestures[0][0].categoryName;
        const score = Math.round(results.gestures[0][0].score * 100);
        setDetectedGestureName(gesture);
        setConfidenceScore(score);
      } else {
        setDetectedGestureName(null);
        setConfidenceScore(null);
      }
      
      drawLandmarks(results.landmarks);
    } else {
      // Clear canvas when no hands detected
      if (canvasRef.current && debugMode) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setDetectedGestureName(null);
      setConfidenceScore(null);
    }
    
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
            
            // Initialize canvas size after video is loaded
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
            
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
                  const score = results.gestures[0][0].score;
                  
                  // Log detailed information in development
                  if (import.meta.env.VITE_ENV === 'development') {
                    console.log(`Detected gesture: ${gesture} (confidence: ${score.toFixed(2)})`);
                  }
                  
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
  
  // Get corresponding game gesture emoji for display
  const getGameGestureEmoji = (mediapigeGesture: string | null): string => {
    if (!mediapigeGesture) return '';
    
    if (mediapigeGesture === 'Open_Palm') {
      return '✋';
    } else if (mediapigeGesture === 'Victory' || mediapigeGesture === 'ILoveYou') {
      return '✌️';
    } else if (mediapigeGesture === 'Closed_Fist') {
      return '✊';
    }
    
    return '';
  };
  
  return (
    <div className="relative w-full h-full overflow-hidden vignette">
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
      />
      
      {/* Debug visualization panel */}
      {debugMode && isHandDetected && detectedGestureName && (
        <div className="absolute top-4 left-4 bg-black/80 rounded-md p-3 text-white font-mono text-sm border border-green-500/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-3xl">{getGameGestureEmoji(detectedGestureName)}</div>
            <div>
              <div className="font-bold text-green-400">{detectedGestureName}</div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${confidenceScore || 0}%` }}
                  />
                </div>
                <span className="text-xs">{confidenceScore}%</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            MediaPipe Hand Tracking Active
          </div>
        </div>
      )}
      
      {/* Hand detection indicator */}
      {isHandDetected && !isCountingDown && !showGestureResult && !debugMode && (
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
