import React from 'react';
import { formatBytes } from '../utils/format';
import './FileSummaryBar.css';

interface FileSummaryBarProps {
  zipName: string;
  selectedDocsCount: number;
  treeDocsCount: number;
  selectedPagesEstimate: number;
  selectedSize: number;
  onReset: () => void;
}

export default function FileSummaryBar({
  zipName,
  selectedDocsCount,
  treeDocsCount,
  selectedPagesEstimate,
  selectedSize,
  onReset
}: FileSummaryBarProps) {
  return (
    <div className="loaded-summary-bar">
      <div>
        <p className="text-glow-magenta idle-subtitle">
          // arquivo carregado
        </p>
        <h2 className="loaded-summary-title">
          {zipName || "Processo Geral"}
        </h2>
        <p className="loaded-summary-details">
          {selectedDocsCount} / {treeDocsCount} documentos selecionados · ~{selectedPagesEstimate} págs estimadas · {formatBytes(selectedSize)}
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="btn-change-file"
      >
        ← Trocar arquivo
      </button>
    </div>
  );
}
