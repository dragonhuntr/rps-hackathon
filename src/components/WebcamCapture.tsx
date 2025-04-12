import React, { useRef, useState, useEffect } from 'react';
import { GestureRecognizer } from '@mediapipe/tasks-vision';
import { initGestureRecognizer, detectGesture, drawHandLandmarks, mapGestureToGameSymbol } from '../lib/gesture';
import CountdownOverlay from './CountdownOverlay';

interface WebcamCaptureProps {
  showGestureResult: boolean;
  resultGesture?: string | null;
  debugMode?: boolean;
  roundActive: boolean;
  onGestureDetected: (gesture: string) => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  showGestureResult,
  resultGesture,
  debugMode = true,
  roundActive,
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
  
  // Initialize MediaPipe GestureRecognizer
  useEffect(() => {
    const init = async () => {
      try {
        gestureRecognizerRef.current = await initGestureRecognizer();
        setIsGestureRecognizerReady(true);
      } catch (err) {
        console.error('Failed to initialize GestureRecognizer:', err);
        setIsGestureRecognizerReady(false);
      }
    };
    
    init();
    
    return () => {
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsGestureRecognizerReady(false);
    };
  }, []);
  
  // Initialize canvas size after video is loaded
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      const resizeCanvas = () => {
        if (videoRef.current && canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      };
      
      videoRef.current.addEventListener('loadedmetadata', resizeCanvas);
      videoRef.current.addEventListener('resize', resizeCanvas);
      
      return () => {
        videoRef.current?.removeEventListener('loadedmetadata', resizeCanvas);
        videoRef.current?.removeEventListener('resize', resizeCanvas);
      };
    }
  }, []);
  
  // Process video frames with MediaPipe
  const processVideoFrame = () => {
    if (!videoRef.current || !gestureRecognizerRef.current || videoRef.current.paused || videoRef.current.ended) {
      return;
    }
    
    try {
      const result = detectGesture(videoRef.current, gestureRecognizerRef.current);
      setIsHandDetected(result.handPresent);
      
      if (result.handPresent && result.landmarks) {
        setDetectedGestureName(result.detectedGesture || null);
        setConfidenceScore(result.confidenceScore || null);
        
        // Handle countdown logic here
        const allCriteriaMet =
          result.confidenceScore > 80 &&
          result.handPresent &&
          result.detectedGesture !== null;

        if (allCriteriaMet && !isCounting) {
          // Only start counting if we're not already counting and there's no active interval
          if (!countdownIntervalRef.current) {
            console.log('Starting countdown...');
            setIsCounting(true);
            countdownIntervalRef.current = window.setInterval(() => {
              setCountdown(prev => {
                const newCount = prev > 0 ? prev - 1 : 0;
                console.log('Countdown update:', newCount);
                return newCount;
              });
            }, 1000);
          }
        } else if (!allCriteriaMet) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;  // Reset the ref after clearing
          }
          setIsCounting(false);
          setCountdown(3);
        }
        
        if (canvasRef.current && debugMode) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            try {
              drawHandLandmarks(ctx, canvasRef.current, result.landmarks);
            } catch (err) {
              console.error('Error drawing hand landmarks:', err);
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        }
      } else {
        if (canvasRef.current && debugMode) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setDetectedGestureName(null);
        setConfidenceScore(null);
        
        // Clear countdown when hand is not detected
        if (isCounting) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          setIsCounting(false);
          setCountdown(3);
        }
      }
    } catch (err) {
      console.error('Error processing video frame:', err);
    }
    
    // Schedule next frame
    animationRef.current = requestAnimationFrame(processVideoFrame);
  };
  
  // Start webcam and frame processing
  useEffect(() => {
    if (!isGestureRecognizerReady) {
      return;
    }

    const getWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
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
        console.error('Error accessing webcam:', err);
      }
    };
    
    getWebcam();
  }, [isGestureRecognizerReady]);

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
            <div className="mt-2 border-t border-gray-600 pt-2">
              <div className="font-bold mb-1">Countdown Conditions:</div>
              <div className={isCounting ? "text-green-400" : "text-red-400"}>
                ⚡ Is Counting: {isCounting ? "Yes" : "No"} ({countdown})
              </div>
              <div className={confidenceScore && confidenceScore > 80 ? "text-green-400" : "text-red-400"}>
                ⚡ Confidence {'>'} 80%: {confidenceScore && confidenceScore > 80 ? "Yes" : "No"}
              </div>
              <div className={isHandDetected ? "text-green-400" : "text-red-400"}>
                ⚡ Hand Detected: {isHandDetected ? "Yes" : "No"}
              </div>
              <div className={detectedGestureName ? "text-green-400" : "text-red-400"}>
                ⚡ Gesture Detected: {detectedGestureName ? "Yes" : "No"}
              </div>
              <div className={roundActive ? "text-green-400" : "text-red-400"}>
                ⚡ Round Active: {roundActive ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Countdown overlay */}
      <CountdownOverlay 
        countdown={countdown}
        isCounting={isCounting}
      />
      
      {/* Result overlay */}
      {showGestureResult && resultGesture && (
        <div className="absolute inset-0 bg-horror-dark/80 flex flex-col items-center justify-center">
          <div className="text-2xl font-ocr text-horror-gray mb-2 animate-glitch-1">YOU PLAYED:</div>
          <div className="text-6xl mb-4">{resultGesture}</div>
          <div className="text-sm font-mono text-horror-gray/70 animate-pulse">GESTURE RECORDED</div>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
