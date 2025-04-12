import React from 'react';

interface CountdownOverlayProps {
  countdown: number;
  isCounting: boolean;
  show?: boolean;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ countdown, isCounting, show }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-red-500/90 flex items-center justify-center z-[9999]" style={{ pointerEvents: 'none' }}>
      <span className="text-[150px] font-bold text-white">{countdown}</span>
    </div>
  );
};

export default CountdownOverlay;
