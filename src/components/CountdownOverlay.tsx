import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
  countdown: number;
  isCounting: boolean;
  show?: boolean;
  color?: 'red' | 'blue';
  direction?: 'bottom-to-top' | 'top-to-bottom';
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ 
  countdown, 
  isCounting, 
  show, 
  color = 'red',
  direction = 'bottom-to-top'
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isCounting) {
      const startTime = Date.now();
      const totalDuration = 3000; // 3 seconds total for the fill-up
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / totalDuration, 1);
        setProgress(newProgress);
        
        if (newProgress < 1 && isCounting) {
          requestAnimationFrame(updateProgress);
        }
      };
      
      requestAnimationFrame(updateProgress);
    } else {
      setProgress(0);
    }

    return () => {
      if (!isCounting) {
        setProgress(0);
      }
    };
  }, [isCounting]);

  if (!show) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] overflow-hidden" style={{ pointerEvents: 'none' }}>
      <div 
        className={`absolute inset-0 bg-${color}-500/90 ${direction === 'bottom-to-top' ? 'origin-bottom' : 'origin-top'} transition-transform duration-75`}
        style={{ 
          transform: `scaleY(${progress})`,
        }}
      />
      <span className="relative text-[150px] font-bold text-white z-10">{countdown}</span>
    </div>
  );
};

export default CountdownOverlay;
