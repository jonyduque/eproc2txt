import React, { useRef, useEffect } from "react";
import './Wheel.css';

interface WheelProps {
  workers: number;
  maxAllowedWorkers: number;
  setWorkers: React.Dispatch<React.SetStateAction<number>> | ((val: number | ((prev: number) => number)) => void);
}

export default function Wheel({ workers, setWorkers, maxAllowedWorkers }: WheelProps) {
  const dragStartRef = useRef<number | null>(null);

  // Mouse Drag to scroll dial horizontally
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = e.clientX;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragStartRef.current === null) return;
    const deltaX = dragStartRef.current - e.clientX;
    if (Math.abs(deltaX) > 20) {
      if (deltaX > 0) {
        setWorkers(prev => Math.min(maxAllowedWorkers, prev + 1));
      } else {
        setWorkers(prev => Math.max(1, prev - 1));
      }
      dragStartRef.current = e.clientX;
    }
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // Touch swipe to scroll dial horizontally
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragStartRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartRef.current === null || e.touches.length !== 1) return;
    const deltaX = dragStartRef.current - e.touches[0].clientX;
    if (Math.abs(deltaX) > 16) {
      if (deltaX > 0) {
        setWorkers(prev => Math.min(maxAllowedWorkers, prev + 1));
      } else {
        setWorkers(prev => Math.max(1, prev - 1));
      }
      dragStartRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setWorkers(prev => Math.min(maxAllowedWorkers, prev + 1));
    } else {
      setWorkers(prev => Math.max(1, prev - 1));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const renderNumbers = () => {
    const items: number[] = [];
    for (let i = workers - 2; i <= workers + 2; i++) {
      if (i >= 1 && i <= maxAllowedWorkers) {
        items.push(i);
      }
    }

    return items.map((val) => {
      const offset = val - workers;
      const angle = offset * 26;
      const scale = 1 - Math.abs(offset) * 0.15;
      const opacity = 1 - Math.abs(offset) * 0.42;
      const isActive = offset === 0;

      return (
        <div
          key={val}
          onClick={() => setWorkers(val)}
          className={`wheel-item ${isActive ? 'active' : ''}`}
          style={{
            transform: `rotateY(${angle}deg) translateZ(40px) scale(${scale})`,
            opacity: opacity > 0 ? opacity : 0,
            pointerEvents: Math.abs(offset) > 2 ? 'none' : 'auto'
          }}
        >
          {val}
        </div>
      );
    });
  };

  return (
    <div className="workers-slider-wrapper">
      <button
        type="button"
        className="btn btn-secondary btn-xs btn-workers-adjust"
        disabled={workers <= 1}
        onClick={() => setWorkers(prev => Math.max(1, prev - 1))}
      >
        <span className="material-icons" style={{ fontSize: '14px' }}>remove</span>
      </button>

      <div className="workers-speed-dial-container">
        <div className="wheel-window">
          <div className="wheel-indicator" />
          <div
            className="wheel-drum"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {renderNumbers()}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-xs btn-workers-adjust"
        disabled={workers >= maxAllowedWorkers}
        onClick={() => setWorkers(prev => Math.min(maxAllowedWorkers, prev + 1))}
      >
        <span className="material-icons" style={{ fontSize: '14px' }}>add</span>
      </button>
    </div>
  );
}
