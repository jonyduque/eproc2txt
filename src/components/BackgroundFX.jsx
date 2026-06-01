import React from 'react';

export default function BackgroundFX() {
  return (
    <>
      {/* Grid background */}
      <div className="bg-grid-overlay grid-bg" />
      
      {/* Top linear glow line */}
      <div className="top-glow-line" />
      
      {/* Bottom glowing blur circle */}
      <div className="bottom-glow-circle" />
    </>
  );
}
