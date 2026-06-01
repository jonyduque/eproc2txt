import React, { useState, useRef } from 'react';
import { parseZipStructure } from '../utils/parser.js';

export default function IdleScreen({ onZipParsed, onLoadingChange }) {
  const [hover, setHover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    setError(null);
    if (!file || !file.name.endsWith('.zip')) {
      setError('Por favor, envie um arquivo ZIP válido.');
      return;
    }

    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const zipData = new Uint8Array(e.target.result);
        const result = parseZipStructure(zipData);
        
        if (result.tree.length === 0) {
          setError('Nenhum arquivo válido ou PDF encontrado no ZIP.');
          setLoading(false);
          if (onLoadingChange) onLoadingChange(false);
          return;
        }

        const zipName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        onZipParsed(zipData, zipName, result.tree, result.ignored);
      } catch (err) {
        console.error(err);
        setError(`Erro ao ler arquivo ZIP: ${err.message}`);
      } finally {
        setLoading(false);
        if (onLoadingChange) onLoadingChange(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="idle-screen-container animate-fade-up">
      <p className="idle-subtitle text-glow">
        // entrada · arquivo .zip
      </p>
      
      <h1 className="idle-title">
        Converta lotes de PDFs em texto,{' '}
        <span className="idle-title-highlight text-glow animate-text-glow">em paralelo.</span>
      </h1>
      
      <p className="idle-description">
        Envie um arquivo ZIP contendo seus arquivos do processo eproc. O eproc2txt distribui
        o trabalho entre múltiplos processadores paralelos e devolve o texto consolidado, com OCR.
      </p>

      {/* Futuristic Drag & Drop Label Panel */}
      <label
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`dropzone-card panel scanlines ${hover ? 'hovered' : ''} ${loading ? 'loading' : ''}`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".zip" 
          className="visually-hidden" 
          onChange={(e) => {
            if (e.target.files?.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
          disabled={loading}
        />

        {/* Scan line active when loading */}
        {loading && <div className="scan-line" />}

        {/* Upload visual core */}
        <div className="dropzone-icon-wrapper">
          <div className="dropzone-circle-outer" />
          <div className="dropzone-circle-orbit" />
          <div className="dropzone-circle-glow" />
          
          <svg 
            viewBox="0 0 24 24" 
            className="dropzone-svg-icon" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          >
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="dropzone-text-group">
          <p className="dropzone-prompt">
            {loading ? 'Lendo arquivo…' : 'Arraste o .zip aqui ou clique para selecionar'}
          </p>
          <p className="dropzone-hint">
            apenas arquivos .zip · padrão eproc será detectado automaticamente
          </p>
        </div>
      </label>

      {error && (
        <p className="dropzone-error animate-fade-in">{error}</p>
      )}

      {/* Grid Guide cards at bottom */}
      <div className="guide-cards-grid">
        {[
          ['01', 'Envie o ZIP', 'Extraímos e catalogamos cada PDF e HTML automaticamente.'],
          ['02', 'Configure Workers', 'Ajuste a quantidade de núcleos e o preset do OCR.'],
          ['03', 'Copie o XML', 'Gere um arquivo estruturado pronto para indexar no seu sistema.'],
        ].map(([n, t, d]) => (
          <div key={n} className="panel guide-card">
            <span className="guide-card-number">{n}</span>
            <p className="guide-card-title">{t}</p>
            <p className="guide-card-description">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
