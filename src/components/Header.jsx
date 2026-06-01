import React, { useState, useEffect } from 'react';

function LogoMark() {
  return (
    <div className="logo-mark">
      <div className="logo-mark-outer" />
      <div className="logo-mark-inner" />
      <div className="logo-mark-center" />
      <div className="logo-mark-orbit" />
    </div>
  );
}

export default function Header({ statusClass, statusLabel }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Convert status label to match reference wording
  let displayLabel = 'AGUARDANDO ARQUIVO';
  let dotClass = 'status-dot-idle';

  if (statusLabel === 'Aguardando Arquivo') {
    displayLabel = 'AGUARDANDO ARQUIVO';
    dotClass = 'status-dot-idle pulse-dot';
  } else if (statusLabel === 'Pronto') {
    displayLabel = 'PRONTO PARA PROCESSAR';
    dotClass = 'status-dot-ready';
  } else if (statusLabel === 'Processando' || statusLabel === 'Lendo ZIP...') {
    displayLabel = 'PROCESSAMENTO EM CURSO';
    dotClass = 'status-dot-processing animate-blink';
  } else if (statusLabel === 'Finalizado') {
    displayLabel = 'PROCESSAMENTO CONCLUÍDO';
    dotClass = 'status-dot-completed';
  } else if (statusLabel === 'Interrompido' || statusLabel === 'Cancelado') {
    displayLabel = 'PROCESSAMENTO CANCELADO';
    dotClass = 'status-dot-canceled';
  }

  return (
    <header className="app-header-nav">
      {/* Brand logo & tagline */}
      <div className="logo-text-group">
        <LogoMark />
        <div className="logo-text-wrapper">
          <span className="logo-title">
            eproc<span className="logo-glow-number text-glow">2</span>txt
          </span>
          <span className="logo-subtitle">
            ocr · parallel · realtime
          </span>
        </div>
      </div>

      {/* Header controls & status badge */}
      <div className="header-controls">
        <div className="status-badge">
          <span className={`status-badge-dot ${dotClass}`} />
          <span className="status-badge-label">
            {displayLabel}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button 
          type="button" 
          className="btn btn-secondary btn-theme-toggle" 
          title="Alternar Tema"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <svg 
              className="theme-icon-light" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              stroke="currentColor" 
              width="14" 
              height="14"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" 
              />
            </svg>
          ) : (
            <svg 
              className="theme-icon-dark" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              stroke="currentColor" 
              width="14" 
              height="14"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
