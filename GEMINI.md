# Architecture & Developer Guide: eproc2txt

## 1. Technical Stack
*   **Framework:** React 18 (Vite-powered, client-only SPA)
*   **Bundler:** Vite (v8.0.12)
*   **Compression:** FFlate (lightweight, zero-dependency zip decompressor)
*   **Document Engines:** 
    *   **PDFium.js (WASM):** Renders PDF pages to images and extracts native text
    *   **Tesseract.js:** Language OCR engine running inside worker processes
*   **Threading model:** Multithreaded Web Workers coordinated by `PipelineCoordinator.js` (`pipeline.worker.js` + a pool of up to 5 `ocr.worker.js` instances)

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
    *   For **HTML** files: Sanitizes elements, extracts core inner text, and saves it.
    *   For **PDF** files: Opens PDFium, inspects pages. If a page has native selectable text, it is extracted immediately. If not, it rasterizes the page as a high-resolution pixel buffer (2.0x scale), applies Otsu binarization/grayscale, and posts an OCR request.
2.  **OCR Workers (`src/workers/ocr.worker.js`):**
    *   A pool of workers initialized dynamically matching the user's selector (1-5 workers).
    *   Accepts a binarized pixel buffer, renders it on an `OffscreenCanvas`, and runs Tesseract OCR.
    *   Returns OCR texts back to the coordinator.

---

## 3. Backpressure & Memory Management
To prevent browser crashes on large files (e.g. 500MB+ court processes), `PipelineCoordinator.js` implements a **backpressure threshold**:
*   If the OCR worker queue grows larger than `maxWorkers * 3` items, it posts a `pause` command to the pipeline worker.
*   Once the queue empties below `maxWorkers * 1.5` items, it posts a `resume` command.
*   Memory references (buffers and WASM structures) are aggressively released using `destroy()` and GC wrappers immediately after extraction. Image buffers are sent as transferable objects to eliminate memory duplication.

---

## 4. Key Components

*   **`PipelineCoordinator.js`:** The core orchestrator. Coordinates worker instantiation, queueing, message routing, backpressure checks, and xml final building.
*   **`usePipeline.js`:** The state machine layer. Provides state management for React and throttles progress updates to 100ms intervals using reference buffers to avoid UI lag.
*   **`App.jsx`:** Directs layout stages by mounting modular screen components:
    *   `LoadingScreen` -> Drag & drop area for the zip file.
    *   `ConfigScreen` -> Event/document interactive tree and settings (workers pool size, OCR model).
    *   `ProcessingScreen` -> Chronometer panel, progress bar, active workers status cards, and document status rows.
    *   `DoneScreen` -> Converted summary, clipboard copy, file download, and scrollable preview panel.

---

## 5. Development Guidelines
*   **Pure Custom CSS:** Styles are defined in modular component CSS files (e.g., `LoadingScreen.css`, `ProcessingScreen.css`) and a global `style.css`. Use custom semantic classes instead of utility-style class names. Do not use Tailwind or Bootstrap.
*   **Windows Environment:** Use Powershell formatting.
*   **Clean Worker Disposal:** Always invoke `terminateAllWorkers()` during hook cleanup or component resets to avoid background thread leaks.
*   **Tabular Numbers:** Keep numeric clocks in monospace fields with `font-variant-numeric: tabular-nums` to avoid visual jumps.

---

## 6. Documentação Completa
Para consultar guias detalhados sobre cada aspect do projeto, consulte a documentação dedicada:
*   **[Manual de Arquitetura (docs/ARCHITECTURE.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/docs/ARCHITECTURE.md):** Detalhes da thread de Workers, fluxo de dados e controle de contra-pressão.
*   **[Referência de API (docs/API_REFERENCE.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/docs/API_REFERENCE.md):** Assinaturas de hooks, métodos do coordenador e formato de mensagens.
*   **[Guia do Desenvolvedor (docs/DEVELOPER_GUIDE.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/docs/DEVELOPER_GUIDE.md):** Padrões visuais de CSS customizado, Biome e Web Workers.
*   **[Guia do Usuário (docs/USER_GUIDE.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/docs/USER_GUIDE.md):** Regras de nomenclatura e-Proc e guia passo a passo da interface.
*   **[Instruções de Inicialização (README.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/README.md):** Guia rápido de instalação, comandos disponíveis e build de produção.
