import React, { useState, useEffect, useRef } from 'react';

function formatDuration(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '00:00.00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function formatBytes(b) {
  if (!b || isNaN(b)) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

// Helper component for event checkboxes to handle indeterminate state
function EventCheckbox({ checked, indeterminate, onChange, disabled }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className="tree-checkbox event-checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

// Retro PDF icon component matching reference
function FileIcon({ status, ext }) {
  let stateClass = '';
  if (status === 'done') {
    stateClass = 'status-done';
  } else if (status === 'processing') {
    stateClass = 'status-processing';
  }

  return (
    <div className={`file-icon ${stateClass}`}>
      <span className="file-icon-fold" />
      <div className="file-icon-label">
        {ext ? ext.toUpperCase() : 'PDF'}
      </div>
    </div>
  );
}

export default function DashboardScreen({
  zipName,
  tree,
  ignoredFiles,
  selectedPaths,
  setSelectedPaths,
  isProcessing,
  isCompleted,
  elapsedTime,
  elapsedMs,
  pdfPages,
  ocrPages,
  progressPercentage,
  progressText,
  consolidatedXml,
  timelineStep,
  workerStatuses,
  docStatuses,
  onStart,
  onCancel,
  onReset
}) {
  const [tessModel, setTessModel] = useState('standard');
  const [maxWorkers, setMaxWorkers] = useState(3);
  const [collapsedEvents, setCollapsedEvents] = useState(new Set());
  const [copied, setCopied] = useState(false);

  // Initialize selection tree: all paths selected by default
  useEffect(() => {
    if (tree && selectedPaths.size === 0 && !isProcessing && !isCompleted) {
      const allPaths = new Set();
      tree.forEach(event => {
        event.documents.forEach(doc => {
          allPaths.add(doc.originalPath);
        });
      });
      setSelectedPaths(allPaths);
    }
  }, [tree, selectedPaths.size, setSelectedPaths, isProcessing, isCompleted]);

  const toggleEventCollapse = (eventNum) => {
    setCollapsedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventNum)) {
        next.delete(eventNum);
      } else {
        next.add(eventNum);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allPaths = new Set();
    tree.forEach(event => {
      event.documents.forEach(doc => {
        allPaths.add(doc.originalPath);
      });
    });
    setSelectedPaths(allPaths);
  };

  const handleDeselectAll = () => {
    setSelectedPaths(new Set());
  };

  const handleStartClick = () => {
    const selectedList = [];
    tree.forEach(event => {
      event.documents.forEach(doc => {
        if (selectedPaths.has(doc.originalPath)) {
          selectedList.push(doc);
        }
      });
    });
    if (selectedList.length > 0) {
      onStart(selectedList, maxWorkers, tessModel);
    }
  };

  const handleCopyXml = async () => {
    if (!consolidatedXml) return;
    try {
      await navigator.clipboard.writeText(consolidatedXml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Falha ao copiar XML:', err);
    }
  };

  const handleDownloadXml = () => {
    if (!consolidatedXml) return;
    const blob = new Blob([consolidatedXml], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consolidado.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Dynamic calculations for ProcessingView
  const totalPages = Object.values(docStatuses).reduce((s, d) => s + d.pageCount, 0) || 1;
  const completedPages = pdfPages + ocrPages;
  const elapsedSec = (elapsedMs || 0) / 1000 || 0.1;
  const pagesPerSec = completedPages / elapsedSec;
  
  const remainingPages = Math.max(0, totalPages - completedPages);
  const etaSec = pagesPerSec > 0 ? (remainingPages / pagesPerSec) : 0;
  const etaText = etaSec > 0 ? formatDuration(etaSec * 1000) : '—';

  const completedDocs = Object.values(docStatuses).filter(d => d.status === 'done').length;
  const totalDocsCount = Object.keys(docStatuses).length || 1;
  const avgMs = completedDocs > 0 ? ((elapsedMs || 0) / completedDocs) : 0;
  const avgText = avgMs > 0 ? formatDuration(avgMs) : '—';
  
  const activeWorkersCount = workerStatuses.filter(w => w.status === 'active').length;
  const queuedDocsCount = Object.values(docStatuses).filter(d => d.status === 'queued').length;

  // View state transitions
  if (isCompleted) {
    // 3. DONE VIEW
    return (
      <div className="done-view-container animate-fade-up">
        <div className="done-header-banner">
          <div className="done-success-icon-wrapper animate-glow-pulse">
            <svg viewBox="0 0 24 24" className="done-success-svg" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
          <div className="panel done-stats-card">
            <p className="done-stats-label">média / doc</p>
            <p className="ticker done-stats-value">{avgText}</p>
          </div>
        </div>

        {/* Export actions */}
        <div className="done-actions-row">
          <button
            type="button"
            onClick={handleCopyXml}
            className="btn-copy-xml"
          >
            {copied ? '✓ copiado' : '⎘ copiar resultado'}
          </button>
          
          <button
            type="button"
            onClick={handleDownloadXml}
            className="btn-download-xml"
          >
            ⤓ salvar arquivo .txt
          </button>
        </div>

        {/* Text Preview console */}
        {consolidatedXml && (
          <div className="preview-panel panel">
            <div className="preview-panel-header">
              <span className="preview-panel-title">
                pré-visualização do texto extraído
              </span>
              <span className="preview-panel-length">
                {consolidatedXml.length.toLocaleString('pt-BR')} caracteres
              </span>
            </div>
            <pre className="preview-console">
              {consolidatedXml.slice(0, 4000)}
              {consolidatedXml.length > 4000 && '\n\n...'}
            </pre>
          </div>
        )}

        <div className="restart-btn-container">
          <button
            type="button"
            onClick={onReset}
            className="btn-restart"
          >
            ↻ processar novo arquivo
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    // 2. PROCESSING VIEW
    return (
      <div className="animate-fade-up">
        {/* Top stats glow panel */}
        <div className="panel-glow processing-header-stats">
          <div className="processing-stats-grid">
            <div>
              <p className="processing-stat-label">cronômetro</p>
              <p className="ticker processing-stat-value text-glow">{elapsedTime}</p>
            </div>
            <div>
              <p className="processing-stat-label">concluídos</p>
              <p className="ticker processing-stat-value">{completedDocs} / {totalDocsCount}</p>
            </div>
            <div>
              <p className="processing-stat-label">em processo</p>
              <p className="ticker processing-stat-value">{activeWorkersCount}</p>
            </div>
            <div>
              <p className="processing-stat-label">tempo médio</p>
              <p className="ticker processing-stat-value">{avgText}</p>
            </div>
            <div>
              <p className="processing-stat-label">eta estimado</p>
              <p className="ticker processing-stat-value">{etaText}</p>
            </div>
          </div>

          {/* Shimmer progress bar */}
          <div className="processing-progress-container">
            <div className="processing-progress-labels">
              <span>progresso geral</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="processing-progress-track">
              {/* Colored gradient bar */}
              <div 
                className="processing-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
              {/* Shimmer overlay */}
              <div 
                className="processing-progress-shimmer"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="processing-progress-sublabels">
              <span>{completedPages} / {totalPages} págs</span>
              <span>{pagesPerSec.toFixed(1)} págs/s</span>
              <span>{queuedDocsCount} na fila</span>
            </div>
          </div>
        </div>

        {/* Side-by-side grids */}
        <div className="processing-layout-grid">
          
          {/* Left panel: docs list */}
          <div className="panel docs-list-card">
            <div className="docs-list-header">
              <span className="docs-list-header-title">
                documentos
              </span>
              <button 
                type="button" 
                className="btn-stop-process"
                onClick={onCancel}
              >
                Parar Processo
              </button>
            </div>
            <ul className="docs-list-items">
              {Object.values(docStatuses).map((d) => {
                const isProcessingDoc = d.status === 'processing';
                const isDoneDoc = d.status === 'done';
                const isQueuedDoc = d.status === 'queued';
                
                // Calculate elapsed time per document
                const elapsedDocMs = d.startedAt ? ((d.finishedAt || Date.now()) - d.startedAt) : 0;
                const elapsedDocText = elapsedDocMs > 0 ? formatDuration(elapsedDocMs) : '—';
                
                return (
                  <li key={d.fileName} className="docs-list-item">
                    {/* Retro PDF Icon */}
                    <FileIcon status={d.status} ext={d.extension} />

                    <div className="docs-list-item-info">
                      <div className="docs-list-item-top">
                        <p className="docs-list-item-name">{d.fileName}</p>
                        <span className="docs-list-item-elapsed">
                          {isQueuedDoc ? '—' : elapsedDocText}
                        </span>
                      </div>
                      
                      <div className="docs-list-item-bottom">
                        <span className={`docs-list-item-status ${
                          isQueuedDoc ? 'queued' : isProcessingDoc ? 'processing' : 'done'
                        }`}>
                          {isQueuedDoc ? 'aguardando' : isProcessingDoc ? 'processando' : 'concluído'}
                        </span>
                        
                        <span className="docs-list-item-details">
                          · ~{isDoneDoc ? d.pageCount : d.pageCount || '?'} págs
                        </span>
                      </div>
                    </div>

                    {/* Active moving scanline overlay */}
                    {isProcessingDoc && (
                      <div className="item-scanline-container">
                        <div className="scan-line" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right panel: Workers list */}
          <div className="panel workers-list-card">
            <div className="workers-list-header">
              <span className="workers-list-title">
                processadores paralelos
              </span>
              <span className="workers-list-count">{activeWorkersCount}</span>
            </div>
            
            <ul className="workers-items-list">
              {workerStatuses.slice(0, maxWorkers).map(w => {
                const isActive = w.status === 'active';
                const isIdle = w.status === 'idle';
                
                // Calculate worker progress percent based on Pág current/total
                let progressPercent = 0;
                if (w.job && w.job.includes('Pág ')) {
                  const match = w.job.match(/Pág (\d+)\/(\d+)/);
                  if (match) {
                    const currentPage = parseInt(match[1], 10);
                    const totalPages = parseInt(match[2], 10);
                    if (totalPages > 0) {
                      progressPercent = (currentPage / totalPages) * 100;
                    }
                  }
                } else if (isActive) {
                  progressPercent = 50; // default for active
                }
                
                return (
                  <li 
                    key={w.index} 
                    className={`worker-card-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="worker-top-row">
                      <span className={`worker-status-dot pulse-dot ${
                        isActive ? 'active animate-blink' : isIdle ? 'idle' : 'inactive'
                      }`} />
                      <span className="worker-status-label">
                        worker #{String(w.index).padStart(2, '0')}
                      </span>
                    </div>
                    
                    <p className="worker-job-desc" title={w.job}>
                      {w.job}
                    </p>

                    {/* Mini progress line */}
                    <div className="worker-progress-track">
                      <div
                        className="worker-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 1. LOADED VIEW (ZIP parsed, selection tree displayed)
  let selectedDocsCount = 0;
  let selectedPagesEstimate = 0;
  let selectedSize = 0;
  let treeDocsCount = 0;

  tree.forEach(event => {
    event.documents.forEach(doc => {
      treeDocsCount++;
      if (selectedPaths.has(doc.originalPath)) {
        selectedDocsCount++;
        const pages = doc.extension === 'pdf' ? Math.max(1, Math.round(doc.size / 25000)) : 1;
        selectedPagesEstimate += pages;
        selectedSize += doc.size;
      }
    });
  });
  
  return (
    <div className="animate-fade-up">
      {/* File summary bar */}
      <div className="loaded-summary-bar">
        <div>
          <p className="idle-subtitle text-glow">
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

      {/* Grid configuration and lists */}
      <div className="loaded-layout-grid">
        
        {/* Left Column: Interactive Checkbox Tree */}
        <div className="panel docs-tree-card">
          <div className="tree-card-header">
            <span className="tree-card-title">
              documentos detectados
            </span>
            <div className="tree-selection-tools">
              <button 
                type="button" 
                className="btn btn-secondary btn-xs" 
                title="Selecionar Tudo"
                onClick={handleSelectAll}
              >
                Selecionar Tudo
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-xs" 
                title="Limpar Seleção"
                onClick={handleDeselectAll}
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="tree-container tree-container-transparent">
            {tree.map(event => {
              const docs = event.documents;
              const eventDocsPaths = docs.map(d => d.originalPath);
              const checkedDocs = eventDocsPaths.filter(p => selectedPaths.has(p));
              
              const isAllChecked = checkedDocs.length === docs.length;
              const isNoneChecked = checkedDocs.length === 0;
              const isIndeterminate = !isAllChecked && !isNoneChecked;
              const isCollapsed = collapsedEvents.has(event.eventNumber);

              const handleEventCheckboxChange = (e) => {
                const checked = e.target.checked;
                setSelectedPaths(prev => {
                  const next = new Set(prev);
                  eventDocsPaths.forEach(p => {
                    if (checked) {
                      next.add(p);
                    } else {
                      next.delete(p);
                    }
                  });
                  return next;
                });
              };

              return (
                <div key={event.eventNumber} className={`tree-node ${isCollapsed ? 'collapsed' : ''}`}>
                  <div className="tree-node-header">
                    <span 
                      className="tree-toggle" 
                      onClick={() => toggleEventCollapse(event.eventNumber)}
                    >
                      ▼
                    </span>
                    <EventCheckbox
                      checked={isAllChecked}
                      indeterminate={isIndeterminate}
                      onChange={handleEventCheckboxChange}
                    />
                    <span className="node-label" onClick={() => toggleEventCollapse(event.eventNumber)}>
                      <svg className="node-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="node-name">
                        <b>{event.eventNumber === 0 ? 'Capa do Processo' : `Evento ${event.eventNumber}`}</b>
                        <span className="event-doc-count">({checkedDocs.length}/{docs.length})</span>
                      </span>
                    </span>
                  </div>

                  <div className="tree-children">
                    {docs.map(doc => {
                      const isChecked = selectedPaths.has(doc.originalPath);
                      const handleDocCheckboxChange = () => {
                        setSelectedPaths(prev => {
                          const next = new Set(prev);
                          if (isChecked) {
                            next.delete(doc.originalPath);
                          } else {
                            next.add(doc.originalPath);
                          }
                          return next;
                        });
                      };

                      const isPdf = doc.extension === 'pdf';
                      return (
                        <div 
                          key={doc.originalPath} 
                          className="tree-node-header doc-node"
                        >
                          <input
                            type="checkbox"
                            className="tree-checkbox doc-checkbox"
                            checked={isChecked}
                            onChange={handleDocCheckboxChange}
                          />
                          <span className="node-label" onClick={handleDocCheckboxChange}>
                            {isPdf ? (
                              <svg className="node-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ) : (
                              <svg className="node-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                            )}
                            <span className="node-name" title={doc.fileName}>
                              {event.eventNumber === 0 ? doc.fileName : `${doc.docType}${doc.docNumber}.${doc.extension}`}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Configuration & Start Button */}
        <div className="config-panel">
          {/* Workers range card */}
          <div className="panel config-card">
            <label className="config-card-label">
              processadores paralelos
            </label>
            <div className="workers-value-group">
              <span className="workers-count-value ticker text-glow">
                {maxWorkers}
              </span>
              <span className="workers-count-unit">workers</span>
            </div>
            
            <div className="workers-slider-wrapper">
              <button 
                type="button" 
                className="btn btn-secondary btn-xs btn-workers-adjust"
                disabled={maxWorkers <= 1}
                onClick={() => setMaxWorkers(prev => Math.max(1, prev - 1))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
                </svg>
              </button>
              
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={maxWorkers} 
                className="workers-slider"
                onChange={(e) => setMaxWorkers(parseInt(e.target.value, 10))}
              />
              
              <button 
                type="button" 
                className="btn btn-secondary btn-xs btn-workers-adjust"
                disabled={maxWorkers >= 5}
                onClick={() => setMaxWorkers(prev => Math.min(5, prev + 1))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="workers-slider-labels">
              <span>1</span><span>5</span>
            </div>
          </div>

          {/* OCR presets card */}
          <div className="panel config-card">
            <span className="config-card-label">
              nível de ocr
            </span>
            <div className="ocr-presets-grid">
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
                    className={`ocr-preset-btn ${active ? 'active' : ''}`}
                  >
                    <span className="ocr-preset-btn-label">{preset.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="ocr-preset-desc">
              {tessModel === 'fast' ? 'Precisão baixa | Velocidade alta' : tessModel === 'best' ? 'Precisão máxima | Processamento lento' : 'Equilíbrio velocidade/precisão'}
            </p>
          </div>

          {/* Glowing start button */}
          <button
            type="button"
            onClick={handleStartClick}
            disabled={selectedPaths.size === 0}
            className="btn-start-processing animate-glow-pulse"
          >
            <span className="btn-start-label">▶ iniciar processamento</span>
            <span className="btn-start-shimmer" />
          </button>
        </div>
      </div>

      {/* Ignored files warnings */}
      {ignoredFiles && ignoredFiles.length > 0 && (
        <section className="card warning-card-panel animate-fade-in">
          <div className="warning-header">
            <svg className="warning-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3>Arquivos Ignorados (Fora do Padrão eproc)</h3>
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
