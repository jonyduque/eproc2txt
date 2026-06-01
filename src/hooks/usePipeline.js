import { useState, useRef, useEffect, useCallback } from 'react';
import { buildConsolidatedXml } from '../utils/xml-builder.js';

export default function usePipeline() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00.00');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pdfPages, setPdfPages] = useState(0);
  const [ocrPages, setOcrPages] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [progressText, setProgressText] = useState('Aguardando início...');
  const [consolidatedXml, setConsolidatedXml] = useState('');
  const [timelineStep, setTimelineStep] = useState('step-upload');
  
  // Document live status tracking
  const [docStatuses, setDocStatuses] = useState({});

  const [workerStatuses, setWorkerStatuses] = useState([
    { index: 1, status: 'offline', job: 'Aguardando Início' },
    { index: 2, status: 'offline', job: 'Aguardando Início' },
    { index: 3, status: 'offline', job: 'Aguardando Início' },
    { index: 4, status: 'offline', job: 'Aguardando Início' },
    { index: 5, status: 'offline', job: 'Aguardando Início' },
  ]);

  // Mutable refs for worker logic to avoid stale closures in events
  const pipelineWorkerRef = useRef(null);
  const ocrWorkersRef = useRef([]); // array of { worker, index, active, currentJob }
  const ocrQueueRef = useRef([]);
  const activeJobsRef = useRef(new Map());
  const processedDocsRef = useRef(new Map());
  const isPipelineFinishedRef = useRef(false);
  const isPipelinePausedRef = useRef(false);
  const jobIdCounterRef = useRef(0);
  const totalEstimatedPagesRef = useRef(0);
  const completedPagesCountRef = useRef(0);
  const currentTessDataPathRef = useRef('');
  const maxOcrWorkersRef = useRef(3);
  const currentTreeRef = useRef(null);

  // Timer refs
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(0);

  // Stats refs (to avoid stale render dependencies)
  const pdfPagesCountRef = useRef(0);
  const ocrPagesCountRef = useRef(0);

  const formatDuration = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsedTime('00:00.00');
    setElapsedMs(0);
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);
      setElapsedTime(formatDuration(elapsed));
    }, 50);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const updateWorkerStatus = useCallback((index, status, jobText = '') => {
    setWorkerStatuses(prev => prev.map(w => {
      if (w.index === index) {
        let resolvedJob = jobText;
        if (!resolvedJob) {
          if (status === 'offline') resolvedJob = 'Desativado';
          else if (status === 'idle') resolvedJob = 'Aguardando tarefa';
          else if (status === 'active') resolvedJob = 'Processando...';
        }
        return { ...w, status, job: resolvedJob };
      }
      return w;
    }));
  }, []);

  const terminateAllWorkers = useCallback(() => {
    if (pipelineWorkerRef.current) {
      pipelineWorkerRef.current.terminate();
      pipelineWorkerRef.current = null;
    }

    ocrWorkersRef.current.forEach(wRecord => {
      wRecord.worker.postMessage({ type: 'terminate' });
      wRecord.worker.terminate();
    });
    ocrWorkersRef.current = [];

    // Set all status dots to offline
    setWorkerStatuses(prev => prev.map(w => ({ ...w, status: 'offline', job: 'Desativado' })));
  }, []);

  const checkBackpressure = useCallback(() => {
    const ocrQueue = ocrQueueRef.current;
    const maxWorkers = maxOcrWorkersRef.current;
    const isPaused = isPipelinePausedRef.current;
    const pipelineWorker = pipelineWorkerRef.current;

    if (!pipelineWorker) return;

    if (!isPaused && ocrQueue.length >= maxWorkers * 3) {
      isPipelinePausedRef.current = true;
      pipelineWorker.postMessage({ type: 'pause' });
      console.log(`[BACKPRESSURE] Activated: Queue length = ${ocrQueue.length}. Pausing pipeline worker.`);
    } else if (isPaused && ocrQueue.length <= maxWorkers * 1.5) {
      isPipelinePausedRef.current = false;
      pipelineWorker.postMessage({ type: 'resume' });
      console.log(`[BACKPRESSURE] Released: Queue length = ${ocrQueue.length}. Resuming pipeline worker.`);
    }
  }, []);

  const dispatchOcrJobs = useCallback(() => {
    const ocrWorkers = ocrWorkersRef.current;
    const ocrQueue = ocrQueueRef.current;
    const tessDataPath = currentTessDataPathRef.current;

    for (const wRecord of ocrWorkers) {
      if (!wRecord.active && ocrQueue.length > 0) {
        const job = ocrQueue.shift();
        wRecord.active = true;
        wRecord.currentJob = job;

        updateWorkerStatus(wRecord.index, 'active', `OCR ${job.fileName} (Pág ${job.page}/${job.pageCount})`);

        wRecord.worker.postMessage({
          type: 'ocr_job',
          jobId: job.jobId,
          width: job.width,
          height: job.height,
          imageBuffer: job.imageBuffer,
          tessDataPath: tessDataPath
        }, [job.imageBuffer]);

        checkBackpressure();
      }
    }
  }, [updateWorkerStatus, checkBackpressure]);

  const updateOverallProgress = useCallback((fileName, page, pageCount) => {
    const total = totalEstimatedPagesRef.current;
    const completed = completedPagesCountRef.current;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    setProgressPercentage(pct);
    setProgressText(`Página ${completed} de ${total} processadas (Última: Pág ${page}/${pageCount} de ${fileName})`);
  }, []);

  const finishProcessing = useCallback(() => {
    stopTimer();
    setIsProcessing(false);
    setIsCompleted(true);
    setTimelineStep('step-xml');

    // Build the final XML data based on the processed files
    const finalTree = [];
    const currentTree = currentTreeRef.current;
    const processedDocs = processedDocsRef.current;

    if (currentTree) {
      currentTree.forEach(event => {
        const eventDocs = [];
        event.documents.forEach(origDoc => {
          const docState = processedDocs.get(origDoc.fileName);
          if (docState) {
            const orderedPages = [];
            for (let p = 1; p <= docState.pageCount; p++) {
              const content = docState.pages.get(p) || '';
              orderedPages.push({
                pagId: p,
                content: content
              });
            }

            eventDocs.push({
              eventNumber: origDoc.eventNumber,
              docNumber: origDoc.docNumber,
              docType: origDoc.docType,
              extension: origDoc.extension,
              fileName: origDoc.fileName,
              pages: orderedPages
            });
          }
        });

        if (eventDocs.length > 0) {
          finalTree.push({
            eventNumber: event.eventNumber,
            documents: eventDocs
          });
        }
      });
    }

    const xmlResult = buildConsolidatedXml(finalTree);
    setConsolidatedXml(xmlResult);
    
    // Set all docs to done
    setDocStatuses(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        next[key] = {
          ...next[key],
          status: 'done',
          finishedAt: next[key].finishedAt || Date.now()
        };
      });
      return next;
    });

    terminateAllWorkers();
  }, [terminateAllWorkers]);

  const handleOcrWorkerMessage = useCallback((workerIndex, event) => {
    const data = event.data;
    const wRecord = ocrWorkersRef.current.find(w => w.index === workerIndex);
    if (!wRecord) return;

    if (data.type === 'ocr_success' || data.type === 'ocr_error') {
      const job = wRecord.currentJob;
      if (job && job.jobId === data.jobId) {
        wRecord.active = false;
        wRecord.currentJob = null;
        updateWorkerStatus(workerIndex, 'idle');

        const jobInfo = activeJobsRef.current.get(data.jobId);
        if (jobInfo) {
          activeJobsRef.current.delete(data.jobId);

          const docState = processedDocsRef.current.get(jobInfo.fileName);
          if (docState) {
            const text = data.type === 'ocr_success' ? data.text : `[Erro OCR na página ${jobInfo.page}: ${data.message}]`;
            docState.pages.set(jobInfo.page, text);
            docState.completedPages++;

            // Update docStatuses state
            setDocStatuses(prev => {
              const next = { ...prev };
              const doc = next[jobInfo.fileName];
              if (doc) {
                const comp = doc.completedPages + 1;
                const isFinished = comp === doc.pageCount;
                next[jobInfo.fileName] = {
                  ...doc,
                  completedPages: comp,
                  status: isFinished ? 'done' : 'processing',
                  finishedAt: isFinished ? Date.now() : null
                };
              }
              return next;
            });

            // Update stats
            ocrPagesCountRef.current++;
            setOcrPages(ocrPagesCountRef.current);

            completedPagesCountRef.current++;
            updateOverallProgress(jobInfo.fileName, jobInfo.page, jobInfo.pageCount);
          }
        }

        dispatchOcrJobs();

        if (isPipelineFinishedRef.current && activeJobsRef.current.size === 0 && ocrQueueRef.current.length === 0) {
          finishProcessing();
        }
      }
    }
  }, [updateWorkerStatus, dispatchOcrJobs, updateOverallProgress, finishProcessing]);

  const startOcrWorkers = useCallback((count) => {
    terminateAllWorkers();
    ocrWorkersRef.current = [];

    // Initialize state mapping
    setWorkerStatuses(prev => prev.map(w => {
      if (w.index <= count) {
        return { ...w, status: 'idle', job: 'Aguardando tarefa' };
      }
      return { ...w, status: 'offline', job: 'Desativado' };
    }));

    for (let i = 0; i < count; i++) {
      const workerIndex = i + 1;
      const worker = new Worker(new URL('../workers/ocr.worker.js', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (event) => handleOcrWorkerMessage(workerIndex, event);

      ocrWorkersRef.current.push({
        worker,
        index: workerIndex,
        active: false,
        currentJob: null
      });
    }
  }, [terminateAllWorkers, handleOcrWorkerMessage]);

  const handlePipelineMessage = useCallback((event) => {
    const data = event.data;

    switch (data.type) {
      case 'status':
        console.log(`[PIPELINE] ${data.message}`);
        break;

      case 'log':
        console.log(`[PIPELINE LOG] [${data.level.toUpperCase()}] ${data.message}`);
        break;

      case 'doc_start':
        console.log(`Iniciando leitura do arquivo: ${data.fileName}...`);
        setDocStatuses(prev => {
          const next = { ...prev };
          if (next[data.fileName]) {
            next[data.fileName] = {
              ...next[data.fileName],
              status: 'processing',
              startedAt: Date.now()
            };
          }
          return next;
        });
        break;

      case 'doc_info':
        processedDocsRef.current.set(data.fileName, {
          pageCount: data.pageCount,
          pages: new Map(),
          completedPages: 0
        });
        setDocStatuses(prev => {
          const next = { ...prev };
          if (next[data.fileName]) {
            next[data.fileName] = {
              ...next[data.fileName],
              pageCount: data.pageCount,
              status: 'processing',
              startedAt: next[data.fileName].startedAt || Date.now()
            };
          }
          return next;
        });
        totalEstimatedPagesRef.current += data.pageCount;
        updateOverallProgress(data.fileName, 1, data.pageCount);
        break;

      case 'page_native': {
        const docState = processedDocsRef.current.get(data.fileName);
        if (docState) {
          docState.pages.set(data.page, data.content);
          docState.completedPages++;

          // Update docStatuses state
          setDocStatuses(prev => {
            const next = { ...prev };
            const doc = next[data.fileName];
            if (doc) {
              const comp = doc.completedPages + 1;
              const isFinished = comp === doc.pageCount;
              next[data.fileName] = {
                ...doc,
                completedPages: comp,
                status: isFinished ? 'done' : 'processing',
                finishedAt: isFinished ? Date.now() : null
              };
            }
            return next;
          });

          pdfPagesCountRef.current++;
          setPdfPages(pdfPagesCountRef.current);

          completedPagesCountRef.current++;
          updateOverallProgress(data.fileName, data.page, data.pageCount);
        }
        break;
      }

      case 'page_ocr_request': {
        setTimelineStep(prev => prev === 'step-processing' ? 'step-ocr' : prev);

        const jobId = ++jobIdCounterRef.current;
        ocrQueueRef.current.push({
          jobId,
          fileName: data.fileName,
          page: data.page,
          pageCount: data.pageCount,
          width: data.width,
          height: data.height,
          imageBuffer: data.imageBuffer
        });

        activeJobsRef.current.set(jobId, {
          fileName: data.fileName,
          page: data.page,
          pageCount: data.pageCount
        });

        dispatchOcrJobs();
        break;
      }

      case 'pipeline_finished':
        isPipelineFinishedRef.current = true;
        console.log('Varredura do arquivo ZIP finalizada pelo Pipeline Worker.');
        if (activeJobsRef.current.size === 0 && ocrQueueRef.current.length === 0) {
          finishProcessing();
        }
        break;

      case 'error':
        console.error(`Erro crítico no Pipeline: ${data.message}`);
        terminateAllWorkers();
        setIsProcessing(false);
        setTimelineStep('step-processing');
        break;
    }
  }, [dispatchOcrJobs, finishProcessing, terminateAllWorkers, updateOverallProgress]);

  const startPipeline = useCallback((zipData, selectedFiles, maxOcrWorkers, tessModel, currentTree) => {
    // Reset state variables
    ocrQueueRef.current = [];
    activeJobsRef.current.clear();
    processedDocsRef.current.clear();
    isPipelineFinishedRef.current = false;
    isPipelinePausedRef.current = false;
    jobIdCounterRef.current = 0;
    
    pdfPagesCountRef.current = 0;
    ocrPagesCountRef.current = 0;
    setPdfPages(0);
    setOcrPages(0);

    totalEstimatedPagesRef.current = 0;
    completedPagesCountRef.current = 0;
    setConsolidatedXml('');

    maxOcrWorkersRef.current = maxOcrWorkers;
    currentTreeRef.current = currentTree;

    // Set initial statuses object
    const initialStatuses = {};
    selectedFiles.forEach(file => {
      initialStatuses[file.fileName] = {
        status: 'queued',
        fileName: file.fileName,
        originalPath: file.originalPath,
        extension: file.extension,
        pageCount: file.extension === 'html' ? 1 : 0,
        completedPages: 0,
        startedAt: null,
        finishedAt: null
      };
    });
    setDocStatuses(initialStatuses);

    // Set Tessdata URL path
    let tessPath = 'https://tessdata.projectnaptha.com/4.0.0';
    if (tessModel === 'fast') {
      tessPath = 'https://tessdata.projectnaptha.com/4.0.0_fast';
    } else if (tessModel === 'best') {
      tessPath = 'https://tessdata.projectnaptha.com/4.0.0_best';
    }
    currentTessDataPathRef.current = tessPath;

    // Initialize OCR threads
    startOcrWorkers(maxOcrWorkers);

    // Set UI states
    setIsProcessing(true);
    setIsCompleted(false);
    setProgressPercentage(0);
    setProgressText(`Iniciando processamento de ${selectedFiles.length} documentos...`);
    setTimelineStep('step-processing');

    startTimer();

    // Spawn pipeline worker
    pipelineWorkerRef.current = new Worker(new URL('../workers/pipeline.worker.js', import.meta.url), {
      type: 'module'
    });
    pipelineWorkerRef.current.onmessage = handlePipelineMessage;

    // Slice buffer and dispatch
    const zipDataCopy = zipData.slice(0);
    pipelineWorkerRef.current.postMessage({
      type: 'start',
      zipData: zipDataCopy,
      selectedFiles: selectedFiles
    }, [zipDataCopy.buffer]);
  }, [startOcrWorkers, handlePipelineMessage]);

  const cancelPipeline = useCallback(() => {
    terminateAllWorkers();
    stopTimer();
    setIsProcessing(false);
    setIsCompleted(false);
    setTimelineStep('step-mapping');
    setProgressPercentage(0);
    setProgressText('Processamento cancelado pelo usuário.');
    setDocStatuses({});
  }, [terminateAllWorkers]);

  const resetPipeline = useCallback(() => {
    terminateAllWorkers();
    stopTimer();
    setIsProcessing(false);
    setIsCompleted(false);
    setElapsedTime('00:00.00');
    setElapsedMs(0);
    setPdfPages(0);
    setOcrPages(0);
    setProgressPercentage(0);
    setProgressText('Aguardando início...');
    setConsolidatedXml('');
    setTimelineStep('step-upload');
    setDocStatuses({});
  }, [terminateAllWorkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminateAllWorkers();
      stopTimer();
    };
  }, [terminateAllWorkers]);

  return {
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
    startPipeline,
    cancelPipeline,
    resetPipeline,
    setTimelineStep
  };
}
