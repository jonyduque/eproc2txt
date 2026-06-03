import { useState } from 'react';
import Tree from './Tree';
import DoneView from './DoneView';
import ProcessingView from './ProcessingView';
import FileSummaryBar from './FileSummaryBar';
import ConfigPanel from './ConfigPanel';
import './DashboardScreen.css';

export default function DashboardScreen({
  zipName,
  tree,
  ignoredFiles,
  selectedPaths,
  setSelectedPaths,
  isProcessing,
  isCompleted,
  isPaused,
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
  onReset,
  onPause,
  onResume
}) {
  const maxAllowedWorkers = Math.max(navigator.hardwareConcurrency || 3, 3);
  const [workers, setWorkers] = useState(maxAllowedWorkers);
  const [copied, setCopied] = useState(false);
  const [tessModel, setTessModel] = useState('standard');

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
      onStart(selectedList, workers, tessModel);
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

  const completedDocs = Object.values(docStatuses).filter(d => d.status === 'done').length;
  const totalDocsCount = Object.keys(docStatuses).length || 1;

  const activeWorkersCount = workerStatuses.filter(w => w.status === 'active').length;
  const queuedDocsCount = Object.values(docStatuses).filter(d => d.status === 'queued').length;

  // Calculate document statistics for LOADED VIEW
  let selectedDocsCount = 0;
  let treeDocsCount = 0;
  let selectedPagesEstimate = 0;
  let selectedSize = 0;

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

  // View state transitions
  if (isCompleted) {
    // 3. DONE VIEW
    return (
      <DoneView
        totalDocsCount={totalDocsCount}
        completedPages={completedPages}
        maxWorkers={workers}
        tessModel={tessModel}
        elapsedTime={elapsedTime}
        copied={copied}
        handleCopyXml={handleCopyXml}
        handleDownloadXml={handleDownloadXml}
        onReset={onReset}
      />
    );
  }

  if (isProcessing) {
    // 2. PROCESSING VIEW
    return (
      <ProcessingView
        isPaused={isPaused}
        elapsedTime={elapsedTime}
        completedDocs={completedDocs}
        totalDocsCount={totalDocsCount}
        activeWorkersCount={activeWorkersCount}
        progressPercentage={progressPercentage}
        completedPages={completedPages}
        totalPages={totalPages}
        pagesPerSec={pagesPerSec}
        queuedDocsCount={queuedDocsCount}
        onResume={onResume}
        onPause={onPause}
        onCancel={onCancel}
        docStatuses={docStatuses}
        workerStatuses={workerStatuses}
        maxWorkers={workers}
      />
    );
  }

  // 1. LOADED VIEW (ZIP parsed, selection tree displayed)
  return (
    <div className="animate-fade-up">
      <FileSummaryBar
        zipName={zipName}
        selectedDocsCount={selectedDocsCount}
        treeDocsCount={treeDocsCount}
        selectedPagesEstimate={selectedPagesEstimate}
        selectedSize={selectedSize}
        onReset={onReset}
      />

      {/* Grid configuration and lists */}
      <div className="loaded-layout-grid">
        <Tree 
          tree={tree} 
          selectedPaths={selectedPaths} 
          setSelectedPaths={setSelectedPaths} 
          isProcessing={isProcessing} 
          isCompleted={isCompleted} 
        />

        <ConfigPanel
          workers={workers}
          setWorkers={setWorkers}
          maxAllowedWorkers={maxAllowedWorkers}
          tessModel={tessModel}
          setTessModel={setTessModel}
          selectedPathsSize={selectedPaths.size}
          handleStartClick={handleStartClick}
          ignoredFiles={ignoredFiles}
        />
      </div>
    </div>
  );
}
