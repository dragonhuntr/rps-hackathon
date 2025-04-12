
import React, { useRef, useState, useEffect } from 'react';

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
  
  // Mock hand detection - in a real implementation, this would use MediaPipe
  useEffect(() => {
    if (isCountingDown && countdown === null) {
      setCountdown(3);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(interval);
            
            // Mock gesture detection - in a real app this would come from MediaPipe
            const gestures = ['✊', '✋', '✌️'];
            const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
            setTimeout(() => onGestureDetected(randomGesture), 500);
            
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isCountingDown, onGestureDetected, countdown]);
  
  // Start webcam
  useEffect(() => {
    const getWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Mock hand detection - randomly toggle hand detection state
        const handDetectionInterval = setInterval(() => {
          setIsHandDetected(Math.random() > 0.3);
        }, 1000);
        
        return () => {
          clearInterval(handDetectionInterval);
          stream.getTracks().forEach(track => track.stop());
        };
      } catch (err) {
        console.error("Error accessing webcam", err);
      }
    };
    
    getWebcam();
  }, []);
  
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
