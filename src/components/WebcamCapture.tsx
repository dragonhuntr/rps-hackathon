import React, { useRef, useState, useEffect } from 'react';
import { GestureRecognizer } from '@mediapipe/tasks-vision';
import { initGestureRecognizer, detectGesture, drawHandLandmarks, mapGestureToGameSymbol } from '../lib/gesture';

interface WebcamCaptureProps {
  onGestureDetected: (gesture: string) => void;
  isCountingDown: boolean;
  detectedGesture: string | null;
  showGestureResult: boolean;
  debugMode?: boolean;
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
    const init = async () => {
      gestureRecognizerRef.current = await initGestureRecognizer();
    };
    
    init();
    
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
    
    const result = detectGesture(videoRef.current, gestureRecognizerRef.current);
    setIsHandDetected(result.handPresent);
    
    if (result.handPresent && result.landmarks) {
      setDetectedGestureName(result.detectedGesture || null);
      setConfidenceScore(result.confidenceScore || null);
      
      if (canvasRef.current && debugMode) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          drawHandLandmarks(ctx, canvasRef.current, result.landmarks);
        }
      }
    } else {
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
  
  // Handles the final gesture capture after countdown
  const captureAndProcessGesture = () => {
    if (!videoRef.current || !gestureRecognizerRef.current) return;
    
    const result = detectGesture(videoRef.current, gestureRecognizerRef.current);
    
    if (result.handPresent && result.detectedGesture) {
      if (debugMode) {
        console.log(`Detected gesture: ${result.detectedGesture} (confidence: ${result.confidenceScore}%)`);
      }
      const gameGesture = mapGestureToGameSymbol(result.detectedGesture);
      onGestureDetected(gameGesture);
    } else {
      onGestureDetected('✊');
    }
  };

  // Handles a single countdown tick
  const handleCountdownTick = (
    currentCount: number | null,
    interval: NodeJS.Timeout
  ): number | null => {
    if (currentCount === 1) {
      clearInterval(interval);
      setTimeout(captureAndProcessGesture, 500);
      return null;
    }
    return currentCount ? currentCount - 1 : null;
  };

  // Main countdown effect
  useEffect(() => {
    const shouldStartCountdown = 
      isCountingDown && 
      countdown === null && 
      confidenceScore && 
      confidenceScore > 80;

    if (!shouldStartCountdown) return;

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => handleCountdownTick(prev, interval));
    }, 1000);

    return () => clearInterval(interval);
  }, [isCountingDown, countdown, confidenceScore]);
  
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
      {debugMode && (
        <div className="absolute top-4 left-4 bg-black/80 rounded-md p-3 text-white font-mono text-sm border border-green-500/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-3xl">{mapGestureToGameSymbol(detectedGestureName)}</div>
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
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            <div>MediaPipe Hand Tracking Active</div>
            <div className={isHandDetected ? "text-green-400" : "text-red-400"}>
              Hand Detection: {isHandDetected ? "Active" : "Not Detected"}
            </div>
          </div>
        </div>
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
