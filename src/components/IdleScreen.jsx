import React from 'react';
import Dropzone from './Dropzone';
import GuideCards from './GuideCards';
import './IdleScreen.css';

export default function IdleScreen({ onZipParsed, onLoadingChange }) {
  return (
    <div className="idle-screen-container animate-fade-up">
      <p className="text-glow-magenta idle-subtitle">
        // entrada · arquivo .zip
      </p>

      <h1 className="idle-title">
        Converta processos do<br/>
        <span className="idle-title-highlight text-glow animate-text-glow">eproc</span> em texto.
      </h1>

      <Dropzone 
        onZipParsed={onZipParsed} 
        onLoadingChange={onLoadingChange} 
      />

      <GuideCards />
    </div>
  );
}
