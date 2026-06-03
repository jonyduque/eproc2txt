import React from 'react';
import './TessModel.css';

interface TessModelProps {
  tessModel: string;
  setTessModel: (model: string) => void;
}

export default function TessModel({ tessModel, setTessModel }: TessModelProps) {
  return (
    <>
      <div 
        className="segmented-control-container" 
        style={{ '--active-index': tessModel === 'fast' ? 0 : tessModel === 'standard' ? 1 : 2 } as React.CSSProperties}
      >
        <div className="segmented-control-indicator" />
        {[
          { value: 'fast', label: 'Rápido' },
          { value: 'standard', label: 'Normal' },
          { value: 'best', label: 'Preciso' }
        ].map(preset => {
          const active = tessModel === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => setTessModel(preset.value)}
              className={`segmented-control-btn ${active ? 'active' : ''}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <p className="ocr-preset-desc">
        {tessModel === 'fast' 
          ? 'Precisão baixa | Velocidade alta' 
          : tessModel === 'best' 
            ? 'Precisão máxima | Processamento lento' 
            : 'Equilíbrio velocidade/precisão'}
      </p>
    </>
  );
}
