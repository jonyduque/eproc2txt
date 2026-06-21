# Architecture & Developer Guide: eproc2txt

## 1. Technical Stack
*   **Framework:** React 18 (Vite-powered, client-only SPA)
*   **Bundler:** Vite (v8.0.12)
*   **Compression:** FFlate (lightweight, zero-dependency zip decompressor)
*   **Document Engines:**
    *   **@hyzyla/pdfium (WASM):** Renders PDF pages to images and extracts native text
    *   **Tesseract.js:** Language OCR engine (Portuguese) running inside worker processes
*   **Threading model:** Multithreaded Web Workers coordinated by `PipelineCoordinator.js` (`pipeline.worker.js` + a pool of up to 5 `ocr.worker.js` instances)
*   **Linting:** Biome (v2.4.16)

---

## 2. Web Workers & Pipeline Flow
The application processes documents in parallel to prevent UI blocking and achieve extreme speed.

### Work Division
```
[User Zip File] -> FFlate -> [Unzipped Event Tree]
                                |
                                v
                       [Pipeline Worker]
                      /        |        \
            (HTML Text)    (PDF Text)    (Rasterized Scans)
                 |             |                 |
                 v             v                 v
            [Save Text]   [Save Text]     [OCR Worker Pool]
                                                 |
                                                 v
                                           [Tesseract OCR]
                                                 |
                                                 v
                                            [Save Text]
```

1.  **Pipeline Worker (`src/workers/pipeline.worker.js`):**
    *   Accepts the raw ZIP file `ArrayBuffer` and the list of selected files.
    *   Reads and processes files sequentially.
    *   For **HTML** files: Detects encoding (UTF-8, ISO-8859-1, Windows-1252), sanitizes elements (removes script/style/svg blocks, strips tags, decodes HTML entities), extracts core text, and saves it.
    *   For **PDF** files: Opens PDFium, inspects pages. If a page has native selectable text (>5 chars), it is extracted immediately. If not, it rasterizes the page as a high-resolution pixel buffer (2.0x scale, BGRA), applies Otsu binarization converting to RGBA, and posts an OCR request with the transferable buffer.
    *   Uses `using` pattern (TC39 Explicit Resource Management) for automatic disposal of PDFium documents and pages.

2.  **OCR Workers (`src/workers/ocr.worker.js`):**
    *   A pool of workers initialized dynamically matching the user's selector (1-5 workers).
    *   Each worker manages an isolated instance of **Tesseract.js** configured with Portuguese dictionary.
    *   Accepts a binarized pixel buffer, renders it on an `OffscreenCanvas`, and runs Tesseract OCR.
    *   Returns OCR texts back to the coordinator, transferring the image buffer back to free worker memory.

---

## 3. Backpressure & Memory Management
To prevent browser crashes on large files (e.g. 500MB+ court processes), `PipelineCoordinator.js` implements a **backpressure threshold**:
*   If the OCR worker queue grows larger than `maxWorkers * 3` items, it posts a `pause` command to the pipeline worker.
*   Once the queue empties below `maxWorkers * 1.5` items, it posts a `resume` command.
*   Memory references (buffers and WASM structures) are aggressively released using `using`/`Symbol.dispose` pattern immediately after extraction. Image buffers are sent as transferable objects to eliminate memory duplication.

---

## 4. Key Components & Modules

### Core Orchestration
*   **`PipelineCoordinator.js`** (`src/utils/PipelineCoordinator.js`): The core orchestrator. Coordinates worker instantiation, queueing, message routing, backpressure checks, and XML final building. Implements `Symbol.dispose` for cleanup.
*   **`usePipeline.js`** (`src/hooks/usePipeline.js`): The state machine layer. Provides state management for React and throttles progress updates to 100ms intervals using reference buffers to avoid UI lag. Manages `PipelineSession` with `Symbol.dispose`.
*   **`parser.js`** (`src/utils/parser.js`): Parses ZIP structure using `fflate.unzipSync` with filter-only mode (no decompression). Validates filenames against e-Proc regex patterns and builds the sorted event-document tree.
*   **`xml-builder.js`** (`src/utils/xml-builder.js`): Builds the consolidated XML output string from the processed document tree. Handles XML escaping and generates `<indice>`, `<capa>`, `<evento>`, and `<arquivo_fora_padrao>` sections.
*   **`wake-lock-audio.js`** (`src/utils/wake-lock-audio.js`): Provides `SilentAudioSession` and `WakeLockSession` classes (both with `Symbol.dispose`) plus convenience functions (`startSilentAudio`, `stopSilentAudio`, `requestWakeLock`, `releaseWakeLock`).
*   **`format.js`** (`src/utils/format.js`): Utility functions `formatDuration(ms)` → `mm:ss.cc` and `formatBytes(b)` → human-readable size.

### React Screens (`src/components/`)
*   **`App.jsx`**: Directs layout stages by mounting modular screen components. Manages RetroTV channel-switching animation and status indicators.
*   **`LoadingScreen`** → Drag & drop area for the zip file.
*   **`ConfigScreen`** → Event/document interactive tree and file summary bar.
*   **`ProcessingScreen`** → Chronometer panel, progress bar, isometric 3D viewport with worker status, and document status rows.
*   **`DoneScreen`** → Converted summary, clipboard copy, file download (`.txt`), and restart option.

### Layout Components (`src/components/Layout/`)
*   **`RetroTV.tsx`**: CRT monitor frame with scanlines, flicker, static, and vignette effects. Wraps all screen content.
*   **`BackgroundGradient.tsx`**: Animated gradient background with floating color bubbles and interactive cursor-following bubble.
*   **`BackgroundFX.jsx`**: Grid overlay, top glow line, and bottom glow circle.
*   **`IsometricViewport3D.tsx`**: 3D isometric scene showing document pile, processor cores (W1-W5), output file, and animated page/text particles flowing through lanes.

### Workers (`src/workers/`)
*   **`pipeline.worker.js`**: Sequential file processor (FFlate → PDFium/Tesseract).
*   **`ocr.worker.js`**: Tesseract.js OCR processor with OffscreenCanvas.

---

## 5. Development Guidelines
*   **Pure Custom CSS:** Styles are defined in modular component CSS files (e.g., `LoadingScreen.css`, `ProcessingScreen.css`) and a global `style.css`. Use custom semantic classes instead of utility-style class names. Do not use Tailwind or Bootstrap.
*   **Windows Environment:** Use Powershell formatting.
*   **Resource Disposal Pattern:** Always use `using` keyword or explicit `Symbol.dispose` for resources that need cleanup (PDFium docs/pages, Blob URLs via `DisposableUrl`, workers, audio contexts, wake locks).
*   **Clean Worker Disposal:** Always invoke `terminateAllWorkers()` during hook cleanup or component resets to avoid background thread leaks.
*   **Tabular Numbers:** Keep numeric clocks in monospace fields with `font-variant-numeric: tabular-nums` to avoid visual jumps.
*   **Transferable Objects:** Always pass buffers as transferable in `postMessage(data, [transferables])` to avoid memory duplication.

---

## 6. Documentação Completa
Para consultar guias detalhados sobre cada aspect do projeto, consulte a documentação dedicada:
*   **[Manual de Arquitetura](docs/ARCHITECTURE.md):** Detalhes da thread de Workers, fluxo de dados e controle de contra-pressão.
*   **[Referência de API](docs/API_REFERENCE.md):** Assinaturas de hooks, métodos do coordenador e formato de mensagens.
*   **[Guia do Desenvolvedor](docs/DEVELOPER_GUIDE.md):** Padrões visuais de CSS customizado, Biome e Web Workers.
*   **[Guia do Usuário](docs/USER_GUIDE.md):** Regras de nomenclatura e-Proc e guia passo a passo da interface.
*   **[Instruções de Inicialização](README.md):** Guia rápido de instalação, comandos disponíveis e build de produção.
*   **[Requisitos do Produto](PRD.md):** Requisitos funcionais, regras de negócio e especificação do formato de saída.
*   **[Guia de Design](DESIGN.md):** Definições visuais, paleta de cores, tipografia e componentes.
