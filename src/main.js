import './style.css';
import { parseZipStructure } from './utils/parser.js';
import { buildConsolidatedXml } from './utils/xml-builder.js';

// Application state
let currentZipData = null;
let currentTree = null;
let activeWorker = null;

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

const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('status-text');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressPercentage = document.getElementById('progress-percentage');
const progressCounter = document.getElementById('progress-counter');

const btnCopyXml = document.getElementById('btn-copy-xml');
const btnDownloadXml = document.getElementById('btn-download-xml');
const xmlOutput = document.getElementById('xml-output');

const ignoredFilesCard = document.getElementById('ignored-files-card');
const ignoredFilesList = document.getElementById('ignored-files-list');

const statElapsedTime = document.getElementById('stat-elapsed-time');
const statPdfPages = document.getElementById('stat-pdf-pages');
const statOcrPages = document.getElementById('stat-ocr-pages');

// Tesseract Selector Elements
const tesseractRadios = document.getElementsByName('tesseract-model');
const tesseractTable = document.querySelector('.tesseract-table');

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
 * Update the highlighted column in the Tesseract selector table
 */
function updateTesseractHighlighting() {
  if (!tesseractTable) return;
  const selectedIndex = Array.from(tesseractRadios).findIndex(r => r.checked);
  if (selectedIndex === -1) return;
  
  // Clear existing highlights
  tesseractTable.querySelectorAll('.active-col').forEach(el => el.classList.remove('active-col'));
  
  // Columns: Index 0 is label, Index 1 is fast, Index 2 is standard, Index 3 is best
  const colIndex = selectedIndex + 1;
  tesseractTable.querySelectorAll('tr').forEach(row => {
    const cells = row.children;
    if (cells[colIndex]) {
      cells[colIndex].classList.add('active-col');
    }
  });
}

// Add event listener to each radio button
tesseractRadios.forEach(radio => {
  radio.addEventListener('change', updateTesseractHighlighting);
});

// Initialize highlighting
updateTesseractHighlighting();

/**
 * Updates UI State when process is running or idle
 */
function setUiProcessing(processing) {
  const btnText = btnProcess.querySelector('.btn-text');
  if (processing) {
    if (btnText) btnText.textContent = 'Parar';
    btnProcess.classList.add('btn-parar');
  } else {
    if (btnText) btnText.textContent = 'Iniciar';
    btnProcess.classList.remove('btn-parar');
  }
  
  fileInput.disabled = processing;
  btnSelectAll.disabled = processing;
  btnDeselectAll.disabled = processing;
  
  document.querySelectorAll('.tree-checkbox').forEach(cb => {
    cb.disabled = processing;
  });

  tesseractRadios.forEach(radio => {
    radio.disabled = processing;
  });

  if (processing) {
    progressContainer.classList.remove('hidden');
    setStatus('processing', 'Processando');
    startTimer();
    xmlOutput.value = '';
    btnCopyXml.disabled = true;
    btnDownloadXml.disabled = true;
  } else {
    stopTimer();
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
 * Start the pipeline execution
 */
btnProcess.addEventListener('click', () => {
  if (activeWorker) {
    logToConsole('Processamento cancelado pelo usuário.', 'warning');
    activeWorker.terminate();
    activeWorker = null;
    setUiProcessing(false);
    setStatus('warning', 'Cancelado');
    updateProgress(0, 'Processamento cancelado pelo usuário.');
    return;
  }

  if (!currentZipData || !currentTree) return;

  const checkedDocs = Array.from(document.querySelectorAll('.doc-checkbox:checked'));
  const selectedPaths = checkedDocs.map(cb => cb.dataset.path);

  // Flatten selected documents to pass to worker
  const selectedFiles = [];
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

  if (selectedFiles.length === 0) return;

  // Set UI state to processing
  setUiProcessing(true);
  updateProgress(0, `Iniciando processamento de ${selectedFiles.length} documentos...`);
  setTimelineStep('step-processing');
  
  // Set initial stats
  statPdfPages.textContent = '0';
  statOcrPages.textContent = '0';

  // Instantiate worker
  activeWorker = new Worker(new URL('./workers/pipeline.worker.js', import.meta.url), {
    type: 'module'
  });

  let currentDocIndex = 0;
  let pdfPagesCount = 0;
  let ocrPagesCount = 0;
  const totalFiles = selectedFiles.length;

  activeWorker.onmessage = (event) => {
    const data = event.data;

    switch (data.type) {
      case 'status':
        setStatus('processing', data.message);
        logToConsole(data.message, 'system');
        break;
      
      case 'log':
        logToConsole(data.message, data.level);
        if (data.message.includes('[PDF-OCR]')) {
          setTimelineStep('step-ocr');
        }
        break;

      case 'doc_start':
        currentDocIndex = data.index;
        logToConsole(`[${data.index}/${data.total}] Processando: ${data.fileName}...`, 'info');
        updateProgress(
          Math.round(((data.index - 1) / totalFiles) * 100),
          `Processando ${data.fileName} (${data.index} de ${totalFiles})`
        );
        break;

      case 'page_complete': {
        if (data.method === 'ocr') {
          ocrPagesCount++;
          statOcrPages.textContent = ocrPagesCount;
          setTimelineStep('step-ocr');
        } else {
          pdfPagesCount++;
          statPdfPages.textContent = pdfPagesCount;
          setTimelineStep('step-processing');
        }

        const docProgress = (data.page - 1) / data.pageCount;
        const overallProgress = (currentDocIndex - 1 + docProgress) / totalFiles;
        const pct = Math.round(overallProgress * 100);
        updateProgress(
          pct,
          `Página ${data.page}/${data.pageCount} de ${data.fileName}`
        );
        break;
      }

      case 'complete': {
        setUiProcessing(false);
        setStatus('finished', 'Finalizado');
        setTimelineStep('step-xml');
        
        statPdfPages.textContent = data.pdfPagesCount;
        statOcrPages.textContent = data.ocrPagesCount;

        logToConsole(`Pipeline finalizado com sucesso! Tempo total decorrido: ${statElapsedTime.textContent}`, 'success');
        logToConsole(`Total de páginas extraídas nativamente: ${data.pdfPagesCount} | Total via OCR: ${data.ocrPagesCount}`, 'success');

        // Reconstruct tree hierarchy with text contents
        const finalTree = [];
        currentTree.forEach(event => {
          const eventDocs = [];
          event.documents.forEach(origDoc => {
            const processedDoc = data.resultTree.find(
              d => d.eventNumber === origDoc.eventNumber && d.docNumber === origDoc.docNumber
            );
            if (processedDoc) {
              eventDocs.push(processedDoc);
            }
          });

          if (eventDocs.length > 0) {
            finalTree.push({
              eventNumber: event.eventNumber,
              documents: eventDocs
            });
          }
        });

        // Build XML
        const xml = buildConsolidatedXml(finalTree);
        xmlOutput.value = xml;

        // Enable copy/download buttons
        btnCopyXml.disabled = false;
        btnDownloadXml.disabled = false;

        // Cleanup
        activeWorker.terminate();
        activeWorker = null;
        break;
      }

      case 'error':
        setUiProcessing(false);
        setStatus('warning', 'Erro no Pipeline');
        logToConsole(`Erro no processador: ${data.message}`, 'error');
        activeWorker.terminate();
        activeWorker = null;
        break;
    }
  };

  // Map selected Tesseract model to Project Naptha CDN path
  let tessDataPath = 'https://tessdata.projectnaptha.com/4.0.0'; // Default
  const selectedModel = Array.from(tesseractRadios).find(r => r.checked)?.value;
  if (selectedModel === 'fast') {
    tessDataPath = 'https://tessdata.projectnaptha.com/4.0.0_fast';
  } else if (selectedModel === 'best') {
    tessDataPath = 'https://tessdata.projectnaptha.com/4.0.0_best';
  }

  // Clone zipData to pass to worker, keeping the main thread reference valid
  const zipDataCopy = currentZipData.slice(0);
  activeWorker.postMessage({
    type: 'start',
    zipData: zipDataCopy,
    selectedFiles: selectedFiles,
    tessDataPath: tessDataPath
  }, [zipDataCopy.buffer]);
});

/**
 * Handle copy to clipboard action
 */
btnCopyXml.addEventListener('click', () => {
  const content = xmlOutput.value;
  if (!content) return;

  navigator.clipboard.writeText(content).then(() => {
    const originalText = btnCopyXml.textContent;
    btnCopyXml.textContent = 'Copiado!';
    setTimeout(() => {
      btnCopyXml.textContent = originalText;
    }, 2000);
  }).catch(err => {
    logToConsole(`Falha ao copiar XML: ${err.message}`, 'error');
  });
});

/**
 * Handle download XML action
 */
btnDownloadXml.addEventListener('click', () => {
  const content = xmlOutput.value;
  if (!content) return;

  const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'eproc_consolidado.xml';
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
