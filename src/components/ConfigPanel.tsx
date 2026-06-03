import React from 'react';
import Wheel from './Wheel';
import TessModel from './TessModel';

interface ConfigPanelProps {
  workers: number;
  setWorkers: React.Dispatch<React.SetStateAction<number>> | ((val: number | ((prev: number) => number)) => void);
  maxAllowedWorkers: number;
  tessModel: string;
  setTessModel: (model: string) => void;
  selectedPathsSize: number;
  handleStartClick: () => void;
  ignoredFiles: Array<{ fileName: string; size: number }>;
}

export default function ConfigPanel({
  workers,
  setWorkers,
  maxAllowedWorkers,
  tessModel,
  setTessModel,
  selectedPathsSize,
  handleStartClick,
  ignoredFiles
}: ConfigPanelProps) {
  return (
    <div className="config-panel">
      {/* Workers range card */}
      <div className="panel config-card">
        <label className="config-card-label">
          processadores paralelos
        </label>
        <Wheel 
          workers={workers} 
          setWorkers={setWorkers} 
          maxAllowedWorkers={maxAllowedWorkers} 
        />
      </div>

      {/* OCR presets card */}
      <div className="panel config-card">
        <span className="config-card-label">
          nível de ocr
        </span>
        <TessModel 
          tessModel={tessModel} 
          setTessModel={setTessModel} 
        />
      </div>

      {/* Glowing start button */}
      <button
        type="button"
        onClick={handleStartClick}
        disabled={selectedPathsSize === 0}
        className="btn-start-processing animate-glow-pulse"
      >
        <span className="btn-start-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="material-icons" style={{ fontSize: '18px' }}>play_arrow</span>
          iniciar processamento
        </span>
        <span className="btn-start-shimmer" />
      </button>

      {/* Ignored files warnings */}
      {ignoredFiles && ignoredFiles.length > 0 && (
        <section className="panel warning-card warning-card-panel animate-fade-in" style={{ marginTop: 'var(--space-4)' }}>
          <div className="warning-header">
            <span className="material-icons warning-icon-material">warning</span>
            <h3>Arquivos Ignorados</h3>
          </div>
          <p className="warning-description">
            Os seguintes arquivos foram encontrados no pacote ZIP, mas foram desconsiderados por não seguirem a nomenclatura estipulada:
          </p>
          <ul className="ignored-files-list">
            {ignoredFiles.map((f, idx) => (
              <li key={idx}>
                {f.fileName} ({(f.size / 1024).toFixed(1)} KB)
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
