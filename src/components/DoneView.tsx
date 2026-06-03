import React from 'react';

interface DoneViewProps {
  totalDocsCount: number;
  completedPages: number;
  maxWorkers: number;
  tessModel: string;
  elapsedTime: string;
  copied: boolean;
  handleCopyXml: () => void;
  handleDownloadXml: () => void;
  onReset: () => void;
}

export default function DoneView({
  totalDocsCount,
  completedPages,
  maxWorkers,
  tessModel,
  elapsedTime,
  copied,
  handleCopyXml,
  handleDownloadXml,
  onReset
}: DoneViewProps) {
  return (
    <div className="done-view-container animate-fade-up">
      <div className="done-header-banner">
        <div className="done-success-icon-wrapper animate-glow-pulse">
          <span className="material-icons done-success-material">check_circle</span>
        </div>
        <p className="done-status-tagline">
          // processamento concluído
        </p>
        <h2 className="done-title">
          {totalDocsCount} documentos convertidos
        </h2>
        <p className="done-summary-details">
          {completedPages} págs · {maxWorkers} workers · ocr {tessModel === 'fast' ? 'rápido' : tessModel === 'best' ? 'preciso' : 'normal'}
        </p>
      </div>

      {/* Stats card grid */}
      <div className="done-stats-grid">
        <div className="panel done-stats-card">
          <p className="done-stats-label">tempo total</p>
          <p className="ticker done-stats-value text-glow">{elapsedTime}</p>
        </div>
        <div className="panel done-stats-card">
          <p className="done-stats-label">documentos</p>
          <p className="ticker done-stats-value">{totalDocsCount}</p>
        </div>
        <div className="panel done-stats-card">
          <p className="done-stats-label">páginas</p>
          <p className="ticker done-stats-value">{completedPages}</p>
        </div>
      </div>

      {/* Export actions */}
      <div className="done-actions-row">
        <button
          type="button"
          onClick={handleCopyXml}
          className="btn-copy-xml"
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'copiado' : 'copiar resultado'}
        </button>

        <button
          type="button"
          onClick={handleDownloadXml}
          className="btn-download-xml"
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>save</span>
          salvar arquivo .txt
        </button>
        
        <button
          type="button"
          onClick={onReset}
          className="btn-restart"
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>refresh</span>
          processar novo arquivo
        </button>
      </div>
    </div>
  );
}
