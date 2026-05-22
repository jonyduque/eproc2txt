import './style.css';
import { parseZipStructure } from './utils/parser.js';
import { buildConsolidatedXml } from './utils/xml-builder.js';

// Application state
let currentZipData = null;
let currentZipName = 'eproc_consolidado';
let currentTree = null;
let activeWorker = null;
let selectedFiles = [];
let consolidatedText = ''; // Armazena o XML consolidado final em memória

// OCR Multi-worker state
let maxOcrWorkers = 3;
let ocrWorkers = [];
let ocrQueue = [];
let activeJobs = new Map(); // jobId -> { fileName, page, pageCount }
let processedDocs = new Map(); // fileName -> { pageCount, pages: Map, completedPages }
let isPipelineFinished = false;
let isPipelinePaused = false;
let jobIdCounter = 0;
let pdfPagesCount = 0;
let ocrPagesCount = 0;
let currentTessDataPath = '';
let totalEstimatedPages = 0; // Quantidade estimada de páginas do documento inteiro
let completedPagesCount = 0; // Quantidade de páginas concluídas (nativas + OCR)

// DOM Elements
const uploadSection = document.getElementById('upload-section');
const dashboardSection = document.getElementById('dashboard-section');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('zip-file-input');
const treeContainer = document.getElementById('tree-container');
const totalDocsBadge = document.getElementById('total-docs-badge');

const btnSelectAll = document.getElementById('btn-select-all');
const btnDeselectAll = document.getElementById('btn-deselect-all');
const btnProcess = document.getElementById('btn-process');

// DOM Elements para os Workers de OCR
const inputWorkers = document.getElementById('input-workers');
const workersCountDisplay = document.getElementById('workers-count-display');
const btnWorkersMinus = document.getElementById('btn-workers-minus');
const btnWorkersPlus = document.getElementById('btn-workers-plus');
const workersStatusList = document.getElementById('workers-status-list');

const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('status-text');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressPercentage = document.getElementById('progress-percentage');
const progressCounter = document.getElementById('progress-counter');

const resultsProgressGroup = document.getElementById('results-progress-group');
const xmlActionsContainer = document.getElementById('xml-actions-container');

const btnCopyXml = document.getElementById('btn-copy-xml');
const btnDownloadXml = document.getElementById('btn-download-xml');

const ignoredFilesCard = document.getElementById('ignored-files-card');
const ignoredFilesList = document.getElementById('ignored-files-list');

const statElapsedTime = document.getElementById('stat-elapsed-time');
const statPdfPages = document.getElementById('stat-pdf-pages');
const statOcrPages = document.getElementById('stat-ocr-pages');

// Tesseract Selector Elements
const tesseractRadios = document.getElementsByName('tesseract-model');

// Theme Switcher Elements
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIconDark = document.querySelector('.theme-icon-dark');
const themeIconLight = document.querySelector('.theme-icon-light');

// Timeline Steps
const timelineSteps = ['step-upload', 'step-mapping', 'step-processing', 'step-ocr', 'step-xml'];

// Timer State
let timerInterval = null;
let startTime = 0;

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Logs message to the browser developer console
 */
function logToConsole(message, level = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warning') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

/**
 * Reset Timer
 */
function startTimer() {
  startTime = Date.now();
  statElapsedTime.textContent = '0.0s';
  timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    statElapsedTime.textContent = `${elapsed}s`;
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
}

/**
 * Updates status indicator in the UI
 */
function setStatus(statusClass, label) {
  if (statusDot) {
    statusDot.className = 'status-dot';
    statusDot.classList.add(statusClass);
  }
  if (statusText) {
    statusText.textContent = label;
  }
}

/**
 * Updates active and completed steps in the header timeline
 */
function setTimelineStep(activeStepId) {
  let activeIndex = timelineSteps.indexOf(activeStepId);
  if (activeIndex === -1) activeIndex = 0;
  
  timelineSteps.forEach((stepId, index) => {
    const el = document.getElementById(stepId);
    if (!el) return;
    
    if (index < activeIndex) {
      el.classList.add('completed');
      el.classList.remove('active');
    } else if (index === activeIndex) {
      el.classList.remove('completed');
      el.classList.add('active');
    } else {
      el.classList.remove('completed');
      el.classList.remove('active');
    }
  });
}

/**
 * Sets the active theme ('light' or 'dark') and saves to localStorage
 */
function setTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    themeIconDark.classList.remove('hidden');
    themeIconLight.classList.add('hidden');
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.remove('light-theme');
    themeIconDark.classList.add('hidden');
    themeIconLight.classList.remove('hidden');
    localStorage.setItem('theme', 'dark');
  }
}

// Initialize theme switcher event listener and initial theme
const initialTheme = localStorage.getItem('theme') || 'dark';
setTheme(initialTheme);

btnThemeToggle.addEventListener('click', () => {
  const currentTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
  setTheme(currentTheme);
});

/**
 * Trata o status do Worker e sua linha correspondente no painel
 */
function updateWorkerStatusDot(index, status, jobText = '') {
  const row = workersStatusList.querySelector(`.worker-status-row[data-worker="${index}"]`);
  if (!row) return;

  row.className = `worker-status-row ${status}`;
  const dot = row.querySelector('.worker-status-dot');
  if (dot) {
    dot.className = `worker-status-dot ${status}`;
  }

  const tag = row.querySelector('.worker-state-tag');
  if (tag) {
    if (status === 'offline') {
      tag.textContent = 'Desativado';
    } else if (status === 'idle') {
      tag.textContent = 'Ocioso';
    } else if (status === 'active') {
      tag.textContent = 'Processando';
    }
  }

  const jobEl = row.querySelector('.worker-current-job');
  if (jobEl) {
    if (status === 'offline') {
      jobEl.textContent = jobText || 'Desativado';
    } else if (status === 'idle') {
      jobEl.textContent = jobText || 'Aguardando tarefa';
    } else if (status === 'active') {
      jobEl.textContent = jobText || 'Processando...';
    }
  }

  let tooltip = `Worker ${index}: `;
  if (status === 'offline') tooltip += jobText || 'Desativado';
  else if (status === 'idle') tooltip += jobText || 'Ocioso';
  else if (status === 'active') tooltip += `Processando: ${jobText}`;
  row.setAttribute('title', tooltip);
}

/**
 * Update the UI showing active/offline workers based on the slider value
 */
function updateWorkersUi() {
  const count = parseInt(inputWorkers.value, 10);
  maxOcrWorkers = count;
  workersCountDisplay.textContent = count;
  
  for (let i = 1; i <= 5; i++) {
    if (i <= count) {
      if (activeWorker || ocrWorkers.length > 0) {
        const wRecord = ocrWorkers.find(w => w.index === i);
        if (wRecord) {
          if (wRecord.active) {
            const job = wRecord.currentJob;
            updateWorkerStatusDot(i, 'active', job ? `OCR ${job.fileName} (Pág ${job.page}/${job.pageCount})` : 'Processando...');
          } else {
            updateWorkerStatusDot(i, 'idle');
          }
        } else {
          updateWorkerStatusDot(i, 'idle');
        }
      } else {
        updateWorkerStatusDot(i, 'offline', 'Aguardando Início');
      }
    } else {
      updateWorkerStatusDot(i, 'offline');
    }
  }
}

// Add event listeners to worker controls
inputWorkers.addEventListener('input', updateWorkersUi);
btnWorkersMinus.addEventListener('click', () => {
  let val = parseInt(inputWorkers.value, 10);
  if (val > 1) {
    inputWorkers.value = val - 1;
    updateWorkersUi();
  }
});
btnWorkersPlus.addEventListener('click', () => {
  let val = parseInt(inputWorkers.value, 10);
  if (val < 5) {
    inputWorkers.value = val + 1;
    updateWorkersUi();
  }
});

// Initialize workers UI
updateWorkersUi();

/**
 * Updates UI State when process is running or idle
 */
function setUiProcessing(processing, completed = false) {
  const btnText = btnProcess.querySelector('.btn-text');
  const xmlPanel = document.querySelector('.xml-panel');

  if (processing) {
    if (btnText) btnText.textContent = 'Parar';
    btnProcess.classList.add('btn-parar');
    if (xmlPanel) {
      xmlPanel.classList.add('processing');
      xmlPanel.classList.remove('finished');
    }
  } else {
    if (btnText) {
      btnText.textContent = completed ? 'Reiniciar' : 'Iniciar';
    }
    btnProcess.classList.remove('btn-parar');
    if (xmlPanel) {
      xmlPanel.classList.remove('processing');
      if (completed) {
        xmlPanel.classList.add('finished');
      } else {
        xmlPanel.classList.remove('finished');
      }
    }
  }
  
  fileInput.disabled = processing;
  btnSelectAll.disabled = processing;
  btnDeselectAll.disabled = processing;
  
  if (inputWorkers) inputWorkers.disabled = processing;
  if (btnWorkersMinus) btnWorkersMinus.disabled = processing;
  if (btnWorkersPlus) btnWorkersPlus.disabled = processing;
  
  document.querySelectorAll('.tree-checkbox').forEach(cb => {
    cb.disabled = processing;
  });

  tesseractRadios.forEach(radio => {
    radio.disabled = processing;
  });

  if (processing) {
    if (resultsProgressGroup) resultsProgressGroup.classList.remove('hidden');
    if (xmlActionsContainer) xmlActionsContainer.classList.add('hidden');
    setStatus('processing', 'Processando');
    startTimer();
    consolidatedText = '';
    btnCopyXml.disabled = true;
    btnDownloadXml.disabled = true;
  } else {
    stopTimer();
    if (completed) {
      if (resultsProgressGroup) resultsProgressGroup.classList.add('hidden');
      if (xmlActionsContainer) xmlActionsContainer.classList.remove('hidden');
    } else {
      if (resultsProgressGroup) resultsProgressGroup.classList.add('hidden');
      if (xmlActionsContainer) xmlActionsContainer.classList.add('hidden');
    }
  }
}

/**
 * Updates progress bar status
 */
function updateProgress(percentage, text) {
  progressFill.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;
  progressCounter.textContent = text;
}

/**
 * Recalculates selected vs total documents per event in the tree
 */
function updateEventDocCounts() {
  if (!currentTree) return;
  currentTree.forEach(event => {
    const eventNode = document.querySelector(`.tree-node[data-event="${event.eventNumber}"]`);
    if (!eventNode) return;
    
    const docs = eventNode.querySelectorAll('.doc-checkbox');
    const total = docs.length;
    const selected = Array.from(docs).filter(cb => cb.checked).length;
    
    const countSpan = document.getElementById(`count-event-${event.eventNumber}`);
    if (countSpan) {
      countSpan.textContent = `(${selected}/${total})`;
    }
  });
}

/**
 * Check if at least one document is selected, enabling the Process button
 */
function updateProcessButtonState() {
  const selectedCount = document.querySelectorAll('.doc-checkbox:checked').length;
  btnProcess.disabled = selectedCount === 0;
  totalDocsBadge.textContent = `${selectedCount} documentos selecionados`;
  
  // Recalculate event counts
  updateEventDocCounts();
}

/**
 * Renders the hierarchical tree structure in the left panel
 */
function renderTree(tree) {
  treeContainer.innerHTML = '';
  
  tree.forEach(event => {
    const eventNode = document.createElement('div');
    eventNode.className = 'tree-node collapsed'; // Collapsed by default
    eventNode.dataset.event = event.eventNumber;

    const header = document.createElement('div');
    header.className = 'tree-node-header';

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.innerHTML = '▼'; // Rotated via CSS to point right when collapsed
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      eventNode.classList.toggle('collapsed');
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'tree-checkbox event-checkbox';
    checkbox.checked = true;
    checkbox.dataset.event = event.eventNumber;
    checkbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      childrenContainer.querySelectorAll('.doc-checkbox').forEach(cb => {
        cb.checked = checked;
      });
      updateProcessButtonState();
    });

    const label = document.createElement('span');
    label.className = 'node-label';
    label.innerHTML = `
      <svg class="node-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <span class="node-name">
        <b>${event.eventNumber === 0 ? 'Capa do Processo' : `Evento ${event.eventNumber}`}</b>
        <span class="event-doc-count" id="count-event-${event.eventNumber}">(0/0)</span>
      </span>
    `;

    // Toggle collapse on clicking label name (excluding toggle or checkbox)
    label.addEventListener('click', () => {
      eventNode.classList.toggle('collapsed');
    });

    header.appendChild(toggle);
    header.appendChild(checkbox);
    header.appendChild(label);
    eventNode.appendChild(header);

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';

    event.documents.forEach(doc => {
      const docNode = document.createElement('div');
      docNode.className = 'tree-node-header doc-node';
      docNode.style.paddingLeft = '1.5rem';

      const docCheckbox = document.createElement('input');
      docCheckbox.type = 'checkbox';
      docCheckbox.className = 'tree-checkbox doc-checkbox';
      docCheckbox.checked = true;
      docCheckbox.dataset.event = event.eventNumber;
      docCheckbox.dataset.path = doc.originalPath;

      docCheckbox.addEventListener('change', () => {
        const docCbs = Array.from(childrenContainer.querySelectorAll('.doc-checkbox'));
        const allChecked = docCbs.every(cb => cb.checked);
        const noneChecked = docCbs.every(cb => !cb.checked);

        checkbox.checked = allChecked;
        checkbox.indeterminate = !allChecked && !noneChecked;

        updateProcessButtonState();
      });

      const isPdf = doc.extension === 'pdf';
      const docIconSvg = isPdf 
        ? `<svg class="node-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
           </svg>`
        : `<svg class="node-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
           </svg>`;

      const docLabel = document.createElement('span');
      docLabel.className = 'node-label';
      const displayName = event.eventNumber === 0 ? doc.fileName : `${doc.docType}${doc.docNumber}.${doc.extension}`;
      docLabel.innerHTML = `
        ${docIconSvg}
        <span class="node-name" title="${doc.fileName}">${displayName}</span>
      `;

      // Allow clicking label to toggle checkbox
      docLabel.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          docCheckbox.checked = !docCheckbox.checked;
          docCheckbox.dispatchEvent(new Event('change'));
        }
      });

      docNode.appendChild(docCheckbox);
      docNode.appendChild(docLabel);
      childrenContainer.appendChild(docNode);
    });

    eventNode.appendChild(childrenContainer);
    treeContainer.appendChild(eventNode);
  });

  updateProcessButtonState();
}

/**
 * Handle ZIP file loading and initial structure extraction
 */
async function handleFile(file) {
  if (!file || !file.name.endsWith('.zip')) {
    logToConsole('Por favor, envie um arquivo ZIP válido.', 'error');
    return;
  }

  // Extract the base name of the uploaded ZIP file (without .zip extension)
  currentZipName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

  logToConsole(`Carregando ZIP: ${file.name} (${formatBytes(file.size)})...`, 'system');
  setTimelineStep('step-upload');
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      currentZipData = new Uint8Array(e.target.result);
      logToConsole('Analisando estrutura do pacote...', 'system');
      
      const result = parseZipStructure(currentZipData);
      currentTree = result.tree;

      logToConsole(`Estrutura mapeada. ${currentTree.reduce((acc, ev) => acc + ev.documents.length, 0)} arquivos válidos encontrados.`, 'success');
      
      // Update timeline step to mapping
      setTimelineStep('step-mapping');

      // Render tree
      renderTree(currentTree);

      // Handle ignored files
      if (result.ignored.length > 0) {
        ignoredFilesList.innerHTML = '';
        result.ignored.forEach(f => {
          const li = document.createElement('li');
          li.textContent = `${f.fileName} (${formatBytes(f.size)})`;
          ignoredFilesList.appendChild(li);
        });
        ignoredFilesCard.classList.remove('hidden');
        logToConsole(`${result.ignored.length} arquivos desconsiderados por padrão de nomenclatura incorreto.`, 'warning');
      } else {
        ignoredFilesCard.classList.add('hidden');
      }

      // Switch view
      uploadSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      setStatus('idled', 'Pronto');
      
      // Ensure start button text is reset to "Iniciar"
      const btnText = btnProcess.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Iniciar';

    } catch (err) {
      logToConsole(`Erro ao ler arquivo ZIP: ${err.message}`, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

// Set up file input trigger
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

// Drag & Drop handlers
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

// Checkbox global handlers
btnSelectAll.addEventListener('click', () => {
  document.querySelectorAll('.tree-checkbox').forEach(cb => {
    cb.checked = true;
    cb.indeterminate = false;
  });
  updateProcessButtonState();
});

btnDeselectAll.addEventListener('click', () => {
  document.querySelectorAll('.tree-checkbox').forEach(cb => {
    cb.checked = false;
    cb.indeterminate = false;
  });
  updateProcessButtonState();
});

/**
 * Reset application state and return to Step 1 (Upload)
 */
function resetToUploadState() {
  currentZipData = null;
  currentZipName = 'eproc_consolidado';
  currentTree = null;
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  
  // Reset file input value
  fileInput.value = '';
  
  // Clear tree and output panel
  treeContainer.innerHTML = '';
  consolidatedText = '';
  btnCopyXml.disabled = true;
  btnDownloadXml.disabled = true;
  
  // Reset stats
  statElapsedTime.textContent = '0.0s';
  statPdfPages.textContent = '0';
  statOcrPages.textContent = '0';
  
  // Hide progress bar and reset values
  if (resultsProgressGroup) resultsProgressGroup.classList.add('hidden');
  if (xmlActionsContainer) xmlActionsContainer.classList.add('hidden');
  progressFill.style.width = '0%';
  progressPercentage.textContent = '0%';
  progressCounter.textContent = '0 / 0 páginas';
  
  // Hide ignored files card
  ignoredFilesList.innerHTML = '';
  ignoredFilesCard.classList.add('hidden');
  
  // Reset timeline steps
  setTimelineStep('step-upload');
  
  // Switch sections
  dashboardSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  
  // Reset button state
  setUiProcessing(false, false);
  setStatus('idled', 'Aguardando Arquivo');
  
  logToConsole('Pronto para receber um novo arquivo ZIP.', 'system');
}

/**
 * Inicializa os OCR Workers com base no valor selecionado no slider
 */
function startOcrWorkers() {
  // Finaliza qualquer worker anterior por segurança
  terminateAllWorkers();

  ocrWorkers = [];
  for (let i = 0; i < maxOcrWorkers; i++) {
    const workerIndex = i + 1;
    // O Vite resolve caminhos de worker com import.meta.url
    const worker = new Worker(new URL('./workers/ocr.worker.js', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (event) => handleOcrWorkerMessage(workerIndex, event);

    ocrWorkers.push({
      worker,
      index: workerIndex,
      active: false,
      currentJob: null
    });

    // Coloca o status dot correspondente em ocioso (idle)
    updateWorkerStatusDot(workerIndex, 'idle');
  }

  // Deixa os outros status dots excedentes offline
  for (let i = maxOcrWorkers + 1; i <= 5; i++) {
    updateWorkerStatusDot(i, 'offline');
  }
}

/**
 * Encerra todos os workers em execução
 */
function terminateAllWorkers() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  
  ocrWorkers.forEach(wRecord => {
    wRecord.worker.postMessage({ type: 'terminate' });
    wRecord.worker.terminate();
  });
  ocrWorkers = [];

  // Define todos os dots como offline
  for (let i = 1; i <= 5; i++) {
    updateWorkerStatusDot(i, 'offline');
  }
}

/**
 * Despacha tarefas de OCR pendentes na fila para workers livres
 */
function dispatchOcrJobs() {
  for (const wRecord of ocrWorkers) {
    if (!wRecord.active && ocrQueue.length > 0) {
      const job = ocrQueue.shift();
      wRecord.active = true;
      wRecord.currentJob = job;

      // Atualiza visual do status
      updateWorkerStatusDot(wRecord.index, 'active', `OCR ${job.fileName} (Pág ${job.page}/${job.pageCount})`);

      // Envia tarefa transferindo posse do buffer
      wRecord.worker.postMessage({
        type: 'ocr_job',
        jobId: job.jobId,
        width: job.width,
        height: job.height,
        imageBuffer: job.imageBuffer,
        tessDataPath: currentTessDataPath
      }, [job.imageBuffer]);

      // Verifica contra-pressão após retirar da fila
      checkBackpressure();
    }
  }
}

/**
 * Controla a contra-pressão de memória pausando ou resumindo a varredura do zip
 */
function checkBackpressure() {
  if (!activeWorker) return;

  if (!isPipelinePaused && ocrQueue.length >= maxOcrWorkers * 3) {
    isPipelinePaused = true;
    activeWorker.postMessage({ type: 'pause' });
    logToConsole(`Contra-pressão ativada: fila com ${ocrQueue.length} páginas. Pausando leitura do ZIP.`, 'warning');
  } else if (isPipelinePaused && ocrQueue.length <= maxOcrWorkers * 1.5) {
    isPipelinePaused = false;
    activeWorker.postMessage({ type: 'resume' });
    logToConsole(`Contra-pressão liberada: fila com ${ocrQueue.length} páginas. Retomando leitura do ZIP.`, 'info');
  }
}

/**
 * Trata as mensagens retornadas pelos OCR Workers
 */
function handleOcrWorkerMessage(workerIndex, event) {
  const data = event.data;
  const wRecord = ocrWorkers.find(w => w.index === workerIndex);
  if (!wRecord) return;

  if (data.type === 'ocr_success' || data.type === 'ocr_error') {
    const job = wRecord.currentJob;
    if (job && job.jobId === data.jobId) {
      // Libera o worker
      wRecord.active = false;
      wRecord.currentJob = null;
      updateWorkerStatusDot(workerIndex, 'idle');

      // Resolve o job
      const jobInfo = activeJobs.get(data.jobId);
      if (jobInfo) {
        activeJobs.delete(data.jobId);

        const docState = processedDocs.get(jobInfo.fileName);
        if (docState) {
          const text = data.type === 'ocr_success' ? data.text : `[Erro OCR na página ${jobInfo.page}: ${data.message}]`;
          docState.pages.set(jobInfo.page, text);
          docState.completedPages++;

          // Atualizar contadores globais
          ocrPagesCount++;
          statOcrPages.textContent = ocrPagesCount;
          
          completedPagesCount++;
          updateOverallProgress(jobInfo.fileName, jobInfo.page, jobInfo.pageCount);

          // Verifica se o documento de origem completou todas as páginas
          checkDocumentCompletion(jobInfo.fileName);
        }
      }

      // Tenta despachar próximos
      dispatchOcrJobs();

      // Se terminou e não resta mais nada, finaliza
      if (isPipelineFinished && activeJobs.size === 0 && ocrQueue.length === 0) {
        finishProcessing();
      }
    }
  }
}

/**
 * Trata o progresso geral na barra lateral
 */
function updateOverallProgress(fileName, page, pageCount) {
  const pct = totalEstimatedPages > 0 ? Math.round((completedPagesCount / totalEstimatedPages) * 100) : 0;
  updateProgress(
    pct,
    `Página ${completedPagesCount} de ${totalEstimatedPages} processadas (Última: Pág ${page}/${pageCount} de ${fileName})`
  );
}

/**
 * Verifica se um documento teve todas as suas páginas processadas
 */
function checkDocumentCompletion(fileName) {
  const docState = processedDocs.get(fileName);
  if (docState && docState.completedPages === docState.pageCount) {
    logToConsole(`Documento concluído: ${fileName} (${docState.pageCount} páginas)`, 'success');
  }
}

/**
 * Trata as mensagens emitidas pelo Pipeline Worker principal
 */
function handlePipelineMessage(event) {
  const data = event.data;

  switch (data.type) {
    case 'status':
      setStatus('processing', data.message);
      logToConsole(data.message, 'system');
      break;

    case 'log':
      logToConsole(data.message, data.level);
      break;

    case 'doc_start':
      logToConsole(`[${data.index}/${data.total}] Iniciando leitura do arquivo: ${data.fileName}...`, 'info');
      break;

    case 'doc_info':
      // Inicializa o estado de processamento desse documento
      processedDocs.set(data.fileName, {
        pageCount: data.pageCount,
        pages: new Map(),
        completedPages: 0
      });
      totalEstimatedPages += data.pageCount;
      updateOverallProgress(data.fileName, 1, data.pageCount);
      break;

    case 'page_native': {
      const docState = processedDocs.get(data.fileName);
      if (docState) {
        docState.pages.set(data.page, data.content);
        docState.completedPages++;

        // Atualizar estatísticas nativas
        pdfPagesCount++;
        statPdfPages.textContent = pdfPagesCount;

        completedPagesCount++;
        updateOverallProgress(data.fileName, data.page, data.pageCount);

        checkDocumentCompletion(data.fileName);
      }
      break;
    }

    case 'page_ocr_request': {
      // Se for a primeira requisição de OCR, avança a timeline para o passo OCR
      const activeTimelineStep = document.querySelector('.timeline-step.active');
      if (activeTimelineStep && activeTimelineStep.id === 'step-processing') {
        setTimelineStep('step-ocr');
      }

      // Recebemos requisição de OCR da página. Colocamos na fila
      const jobId = ++jobIdCounter;
      ocrQueue.push({
        jobId,
        fileName: data.fileName,
        page: data.page,
        pageCount: data.pageCount,
        width: data.width,
        height: data.height,
        imageBuffer: data.imageBuffer
      });

      activeJobs.set(jobId, {
        fileName: data.fileName,
        page: data.page,
        pageCount: data.pageCount
      });

      // Tenta despachar para workers livres
      dispatchOcrJobs();
      break;
    }

    case 'pipeline_finished':
      isPipelineFinished = true;
      logToConsole('Varredura do arquivo ZIP finalizada pelo Pipeline Worker.', 'system');
      
      // Se não há jobs pendentes nem na fila, finaliza
      if (activeJobs.size === 0 && ocrQueue.length === 0) {
        finishProcessing();
      }
      break;

    case 'error':
      setStatus('warning', 'Erro no Pipeline');
      logToConsole(`Erro crítico no Pipeline: ${data.message}`, 'error');
      terminateAllWorkers();
      setUiProcessing(false);
      break;
  }
}

/**
 * Conclui a consolidação de dados e monta o resultado final
 */
function finishProcessing() {
  setUiProcessing(false, true);
  setStatus('finished', 'Finalizado');
  setTimelineStep('step-xml');

  // Forçar o último passo a também ficar completed (verde)
  const stepXml = document.getElementById('step-xml');
  if (stepXml) {
    stepXml.classList.remove('active');
    stepXml.classList.add('completed');
  }

  statPdfPages.textContent = pdfPagesCount;
  statOcrPages.textContent = ocrPagesCount;

  logToConsole(`Processamento concluído com sucesso! Tempo decorrido: ${statElapsedTime.textContent}`, 'success');
  logToConsole(`Páginas nativas extraídas: ${pdfPagesCount} | Páginas OCR processadas: ${ocrPagesCount}`, 'success');

  // Remontar a hierarquia original respeitando a ordem selecionada
  const finalTree = [];
  currentTree.forEach(event => {
    const eventDocs = [];
    event.documents.forEach(origDoc => {
      const docState = processedDocs.get(origDoc.fileName);
      if (docState) {
        // Ordenar as páginas sequencialmente de 1 a pageCount
        const orderedPages = [];
        for (let p = 1; p <= docState.pageCount; p++) {
          const content = docState.pages.get(p) || '';
          orderedPages.push({
            pagId: p, // Requerido por buildConsolidatedXml
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

  // Gera o XML consolidado final
  consolidatedText = buildConsolidatedXml(finalTree);

  // Ativa os botões
  btnCopyXml.disabled = false;
  btnDownloadXml.disabled = false;

  // Cleanup
  terminateAllWorkers();
}

/**
 * Start the pipeline execution
 */
btnProcess.addEventListener('click', () => {
  const btnText = btnProcess.querySelector('.btn-text');

  // Cancelar processamento se já estiver rodando
  if (activeWorker || ocrWorkers.length > 0) {
    logToConsole('Processamento cancelado pelo usuário.', 'warning');
    terminateAllWorkers();
    setUiProcessing(false);
    setStatus('warning', 'Cancelado');
    updateProgress(0, 'Processamento cancelado pelo usuário.');
    return;
  }

  // Reiniciar se já estiver finalizado
  if (btnText && btnText.textContent === 'Reiniciar') {
    resetToUploadState();
    return;
  }

  if (!currentZipData || !currentTree) return;

  const checkedDocs = Array.from(document.querySelectorAll('.doc-checkbox:checked'));
  const selectedPaths = checkedDocs.map(cb => cb.dataset.path);

  // Mapeia documentos selecionados
  selectedFiles = [];
  currentTree.forEach(event => {
    event.documents.forEach(doc => {
      if (selectedPaths.includes(doc.originalPath)) {
        selectedFiles.push({
          originalPath: doc.originalPath,
          fileName: doc.fileName,
          eventNumber: doc.eventNumber,
          docNumber: doc.docNumber,
          docType: doc.docType,
          extension: doc.extension
        });
      }
    });
  });

  if (selectedFiles.length === 0) {
    logToConsole('Nenhum documento selecionado para processamento.', 'warning');
    return;
  }

  // Zerar variáveis de processamento
  ocrQueue = [];
  activeJobs.clear();
  processedDocs.clear();
  isPipelineFinished = false;
  isPipelinePaused = false;
  jobIdCounter = 0;
  pdfPagesCount = 0;
  ocrPagesCount = 0;
  totalEstimatedPages = 0;
  completedPagesCount = 0;
  consolidatedText = '';

  // Capturar limite de workers
  maxOcrWorkers = parseInt(inputWorkers.value, 10);

  // Mapear modelo do Tesseract para tessdata path
  currentTessDataPath = 'https://tessdata.projectnaptha.com/4.0.0';
  const selectedModel = Array.from(tesseractRadios).find(r => r.checked)?.value;
  if (selectedModel === 'fast') {
    currentTessDataPath = 'https://tessdata.projectnaptha.com/4.0.0_fast';
  } else if (selectedModel === 'best') {
    currentTessDataPath = 'https://tessdata.projectnaptha.com/4.0.0_best';
  }

  // Inicializar os workers de OCR
  startOcrWorkers();

  // Set UI state to processing
  setUiProcessing(true);
  updateProgress(0, `Iniciando processamento de ${selectedFiles.length} documentos...`);
  setTimelineStep('step-processing');

  // Set initial stats
  statPdfPages.textContent = '0';
  statOcrPages.textContent = '0';

  // Instantiate pipeline worker
  activeWorker = new Worker(new URL('./workers/pipeline.worker.js', import.meta.url), {
    type: 'module'
  });
  activeWorker.onmessage = handlePipelineMessage;

  // Enviar comando inicial transferindo buffer
  const zipDataCopy = currentZipData.slice(0);
  activeWorker.postMessage({
    type: 'start',
    zipData: zipDataCopy,
    selectedFiles: selectedFiles
  }, [zipDataCopy.buffer]);
});

/**
 * Copiar resultado consolidado para a Área de Transferência
 */
btnCopyXml.addEventListener('click', () => {
  const content = consolidatedText;
  if (!content) return;

  navigator.clipboard.writeText(content).then(() => {
    const originalText = btnCopyXml.innerHTML;
    btnCopyXml.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span>Copiado!</span>
    `;
    setTimeout(() => {
      btnCopyXml.innerHTML = originalText;
    }, 2000);
  }).catch(err => {
    logToConsole(`Falha ao copiar texto: ${err.message}`, 'error');
  });
});

/**
 * Salvar resultado consolidado como arquivo de texto (.txt)
 */
btnDownloadXml.addEventListener('click', () => {
  const content = consolidatedText;
  if (!content) return;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentZipName}.txt`;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
