import React, { useState } from 'react';
import usePipeline from './hooks/usePipeline.js';
import BackgroundFX from './components/BackgroundFX.jsx';
import { BackgroundGradientAnimation } from './components/Background-Gradient.tsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import IdleScreen from './components/IdleScreen.jsx';
import DashboardScreen from './components/DashboardScreen.jsx';

export default function App() {
  const {
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
    startPipeline,
    cancelPipeline,
    resetPipeline,
    pausePipeline,
    resumePipeline,
    setTimelineStep
  } = usePipeline();

  const [zipData, setZipData] = useState(null);
  const [zipName, setZipName] = useState('');
  const [tree, setTree] = useState([]);
  const [ignoredFiles, setIgnoredFiles] = useState([]);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [globalLoading, setGlobalLoading] = useState(false);

  const handleZipParsed = (data, name, parsedTree, ignored) => {
    setZipData(data);
    setZipName(name);
    setTree(parsedTree);
    setIgnoredFiles(ignored);
    setTimelineStep('step-mapping');
  };

  const handleStartPipeline = (selectedFiles, maxWorkers, model) => {
    startPipeline(zipData, selectedFiles, maxWorkers, model, tree);
  };

  const handleCancelPipeline = () => {
    cancelPipeline();
  };

  const handleResetPipeline = () => {
    resetPipeline();
    setZipData(null);
    setZipName('');
    setTree([]);
    setIgnoredFiles([]);
    setSelectedPaths(new Set());
  };

  // Determine status indicators for the header
  let statusClass = 'idled pulse-radar-dot';
  let statusLabel = 'Aguardando Arquivo';

  if (globalLoading) {
    statusClass = 'processing';
    statusLabel = 'Lendo ZIP...';
  } else if (zipData && !isProcessing && !isCompleted) {
    statusClass = 'idled';
    statusLabel = 'Pronto';
  } else if (isProcessing) {
    statusClass = 'processing';
    statusLabel = 'Processando';
  } else if (isCompleted) {
    statusClass = 'finished';
    statusLabel = 'Finalizado';
  } else if (timelineStep === 'step-mapping' && !isProcessing) {
    statusClass = 'warning';
    statusLabel = 'Interrompido';
  }

  return (
    <main className="app-main-layout">
      {/* Animated gradient background overlay */}
      <BackgroundGradientAnimation containerClassName="app-fixed-background-gradient" interactive={true} />

      <BackgroundFX />

      <Header
        statusClass={statusClass}
        statusLabel={statusLabel}
      />

      <section className="app-content-wrapper">
        {!zipData ? (
          <IdleScreen
            onZipParsed={handleZipParsed}
            onLoadingChange={setGlobalLoading}
          />
        ) : (
          <DashboardScreen
            zipName={zipName}
            tree={tree}
            ignoredFiles={ignoredFiles}
            selectedPaths={selectedPaths}
            setSelectedPaths={setSelectedPaths}
            isProcessing={isProcessing}
            isCompleted={isCompleted}
            isPaused={isPaused}
            elapsedTime={elapsedTime}
            elapsedMs={elapsedMs}
            pdfPages={pdfPages}
            ocrPages={ocrPages}
            progressPercentage={progressPercentage}
            progressText={progressText}
            consolidatedXml={consolidatedXml}
            timelineStep={timelineStep}
            workerStatuses={workerStatuses}
            docStatuses={docStatuses}
            onStart={handleStartPipeline}
            onCancel={handleCancelPipeline}
            onReset={handleResetPipeline}
            onPause={pausePipeline}
            onResume={resumePipeline}
          />
        )}
      </section>

      <Footer />
    </main>
  );
}
