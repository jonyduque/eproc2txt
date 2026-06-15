# eproc2txt Modernization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize core pipeline and utility files using ES2025/ES2026 features, specifically implementing Explicit Resource Management (`using` and `Symbol.dispose`), `Promise.try` for callbacks and handlers, and proper Promise-returning class structures.

**Architecture:** 
1. Convert `wake-lock-audio.js` to expose `SilentAudioSession` and `WakeLockSession` classes supporting `Symbol.dispose` while preserving existing wrapper functions.
2. Update `PipelineCoordinator.js` to implement `Symbol.dispose` (releasing workers) and wrap all external callback triggers in `Promise.try`.
3. Update `pipeline.worker.js` to use `using` statement for scoped resource lifecycle management of FFlate unzipped buffers, PDFium documents, and pages, and apply `Promise.try` in the `onmessage` listener.

**Tech Stack:** JavaScript (ES2025/ES2026), Web Audio API, Screen Wake Lock API, PDFium (WASM), FFlate.

---

### Task 1: Modernize `wake-lock-audio.js` and `PipelineCoordinator.js`

**Files:**
- Modify: `src/utils/wake-lock-audio.js`
- Modify: `src/utils/PipelineCoordinator.js`

- [ ] **Step 1: Update `src/utils/wake-lock-audio.js`**
  Modify the file to declare the two new session classes: `SilentAudioSession` and `WakeLockSession` with `Symbol.dispose` support, and make all methods return Promises. Update the existing exports to use singleton instances.

- [ ] **Step 2: Update `src/utils/PipelineCoordinator.js`**
  Add the polyfill for `Promise.try` if it does not exist. Implement `[Symbol.dispose]` in the class to terminate workers, and wrap all callback invocations (`onDocStart`, `onDocInfo`, `onPageNative`, `onPageOcrRequest`, `onOcrSuccess`, `onOcrError`, `onFinished`, `onError`, `onWorkerStatusUpdate`) inside `Promise.try`.

- [ ] **Step 3: Run linter and formatter**
  Run: `npm run lint`
  Expected: Passes without errors or formatting issues.

---

### Task 2: Modernize `pipeline.worker.js`

**Files:**
- Modify: `src/workers/pipeline.worker.js`

- [ ] **Step 4: Update `src/workers/pipeline.worker.js`**
  Add the `Promise.try` polyfill if it does not exist. Add `Promise.try` in `onmessage` to trigger pipeline execution. Refactor resource loading so `unzipped` buffers, PDFium `doc`, and `page` utilize the `using` declaration and `Symbol.dispose` mapping.

- [ ] **Step 5: Run linter and formatter**
  Run: `npm run lint`
  Expected: Passes without errors.

- [ ] **Step 6: Build project**
  Run: `npm run build`
  Expected: Build succeeds without bundle errors.
