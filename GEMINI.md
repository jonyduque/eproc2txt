# Architecture & Developer Guide: eproc2txt

## 1. Technical Stack
*   **Framework:** React 18 (Vite-powered, client-only SPA)
*   **Bundler:** Vite (v8.0.12)
*   **Compression:** FFlate (lightweight, zero-dependency zip decompressor)
*   **Document Engines:** 
    *   **PDFium.js (WASM):** Renders PDF pages to images and extracts native text
    *   **Tesseract.js:** Language OCR engine running inside worker processes
*   **Threading model:** Multithreaded Web Workers (`pipeline.worker.js` + a pool of up to 5 `ocr.worker.js` instances)

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
    *   For **PDF** files: Opens PDFium, inspects pages. If a page has native selectable text, it is extracted immediately. If not, it rasterizes the page as a high-resolution pixel buffer and posts an OCR request.
2.  **OCR Workers (`src/workers/ocr.worker.js`):**
    *   A pool of workers initialized dynamically matching the user's selector (1-5 workers).
    *   Accepts a pixel buffer, executes binarization and scaling, and runs Tesseract OCR.
    *   Returns OCR texts back to the hook.

---

## 3. Backpressure & Memory Management
To prevent browser crashes on large files (e.g. 500MB+ court processes), `usePipeline.js` implements a **backpressure threshold**:
*   If the OCR worker queue grows larger than `maxWorkers * 3` items, it posts a `pause` command to the pipeline worker.
*   Once the queue empties below `maxWorkers * 1.5` items, it posts a `resume` command.
*   Memory references (buffers and WASM structures) are aggressively released using `destroy()` and GC wrappers immediately after extraction.

---

## 4. Key Components

*   **`usePipeline.js`:** The core state machine. Coordinates worker instantiation, messaging, progress percentages, and formats the output XML.
*   **`App.jsx`:** Directs layout stages:
    *   `IdleView` -> Drag & drop area.
    *   `LoadedView` -> Event/document interactive tree and settings.
    *   `ProcessingView` -> Timer panel, progress bar, active workers status cards, and document status rows.
    *   `DoneView` -> Converted summary, clipboard copy, file download, and scrollable preview panel.

---

## 5. Development Guidelines
*   **Pure Custom CSS:** All styles are defined globally in [style.css](file:///c:/Users/jonyd/Projetos/eproc2txt/style.css). Use custom semantic classes (`.panel`, `.panel-glow`, `.text-glow`, `.pulse-dot`, etc.) instead of utility-style class names.
*   **Windows Environment:** Use Powershell formatting.
*   **Clean Worker Disposal:** Always invoke `terminateAllWorkers()` during hook cleanup or component resets to avoid background thread leaks.
*   **Tabular Numbers:** Keep numeric clocks in monospace fields with `font-variant-numeric: tabular-nums` to avoid visual jumps.
