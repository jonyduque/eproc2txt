# Prevent Tab Freeze & Sleep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the browser from freezing the background tab (Tab Freeze) or putting the computer to sleep during large ZIP processing operations.

**Architecture:** Create a utility module containing Web Audio API silent loop generation and Screen Wake Lock API bindings. Integrate this utility into the lifecycle of `usePipeline.js` to trigger locks and silence playback when processing starts, and release them when processing finishes, cancels, or unmounts.

**Tech Stack:** React 18, Web Audio API, Screen Wake Lock API.

---

### Task 1: Create the Wake Lock & Audio Utility File

**Files:**
- Create: `src/utils/wake-lock-audio.js`
- Test: Manual check via console logs and `npm run lint`

- [ ] **Step 1: Write utility helper code**

Create `src/utils/wake-lock-audio.js` with functions to start/stop the silent audio loop and request/release the screen wake lock.

```javascript
let audioCtx = null;
let silenceNode = null;
let wakeLock = null;

export function startSilentAudio() {
	if (audioCtx) return;
	try {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		// Create a 1-second silent stereo buffer
		const buffer = audioCtx.createBuffer(1, 44100, 44100);
		silenceNode = audioCtx.createBufferSource();
		silenceNode.buffer = buffer;
		silenceNode.loop = true;
		silenceNode.connect(audioCtx.destination);
		silenceNode.start();
		console.log("[eproc2txt] Prevenção de Tab Freeze (áudio silencioso) ativada.");
	} catch (e) {
		console.warn("[eproc2txt] Falha ao iniciar áudio silencioso:", e);
	}
}

export function stopSilentAudio() {
	if (silenceNode) {
		try {
			silenceNode.stop();
		} catch (_) {}
		silenceNode = null;
	}
	if (audioCtx) {
		try {
			audioCtx.close();
		} catch (_) {}
		audioCtx = null;
		console.log("[eproc2txt] Prevenção de Tab Freeze desativada.");
	}
}

export async function requestWakeLock() {
	if (wakeLock) return;
	try {
		if ("wakeLock" in navigator) {
			wakeLock = await navigator.wakeLock.request("screen");
			console.log("[eproc2txt] Screen Wake Lock ativo.");
			wakeLock.addEventListener("release", () => {
				console.log("[eproc2txt] Screen Wake Lock liberado.");
			});
		}
	} catch (err) {
		console.warn(`[eproc2txt] Não foi possível obter Screen Wake Lock: ${err.message}`);
	}
}

export function releaseWakeLock() {
	if (wakeLock) {
		wakeLock.release().then(() => {
			wakeLock = null;
		});
	}
}
```

- [ ] **Step 2: Verify code style with Biome**

Run: `npm run lint`
Expected: PASS (no formatting or syntax errors)

- [ ] **Step 3: Commit**

```bash
git add src/utils/wake-lock-audio.js
git commit -m "feat: add screen wake lock and silent audio prevention utility"
```

---

### Task 2: Integrate Utility into `usePipeline.js` Lifecycle

**Files:**
- Modify: `src/hooks/usePipeline.js`
- Test: Manual check via console logs and `npm run lint`

- [ ] **Step 1: Add imports to `usePipeline.js`**

Add the import statement for the utility helpers at the top of the file around line 11.

```javascript
import {
	startSilentAudio,
	stopSilentAudio,
	requestWakeLock,
	releaseWakeLock,
} from "../utils/wake-lock-audio.js";
```

- [ ] **Step 2: Trigger utility on `onFinished` callback**

Insert `stopSilentAudio()` and `releaseWakeLock()` in the `onFinished` callback around line 334.

```javascript
			onFinished: (processedDocs, currentTree) => {
				stopTimer();
				stopSilentAudio();
				releaseWakeLock();
```

- [ ] **Step 3: Trigger utility in `startPipeline` function**

Insert `startSilentAudio()` and `requestWakeLock()` inside `startPipeline` around line 454.

```javascript
			startTimer();
			startSilentAudio();
			requestWakeLock();
```

- [ ] **Step 4: Trigger utility in `cancelPipeline` and `resetPipeline` functions**

Insert `stopSilentAudio()` and `releaseWakeLock()` inside both `cancelPipeline` and `resetPipeline` callback bodies.

```javascript
	const cancelPipeline = useCallback(() => {
		if (throttleTimeoutRef.current) {
			clearTimeout(throttleTimeoutRef.current);
			throttleTimeoutRef.current = null;
		}

		coordinatorRef.current.cancel();
		stopTimer();
		stopSilentAudio();
		releaseWakeLock();
		dispatch({ type: "CANCEL_PIPELINE" });
	}, [stopTimer]);

	const resetPipeline = useCallback(() => {
		if (throttleTimeoutRef.current) {
			clearTimeout(throttleTimeoutRef.current);
			throttleTimeoutRef.current = null;
		}

		coordinatorRef.current.reset();
		stopTimer();
		stopSilentAudio();
		releaseWakeLock();
		dispatch({ type: "RESET_PIPELINE" });
	}, [stopTimer]);
```

- [ ] **Step 5: Trigger cleanup inside `useEffect` hook**

Add cleanup triggers inside the unmount effect hook around line 545.

```javascript
	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (coordinatorRef.current) {
				coordinatorRef.current.terminateAllWorkers();
			}
			stopTimer();
			stopSilentAudio();
			releaseWakeLock();
			if (throttleTimeoutRef.current) {
				clearTimeout(throttleTimeoutRef.current);
			}
		};
	}, [stopTimer]);
```

- [ ] **Step 6: Run checks**

Run: `npm run lint`
Expected: PASS (no formatting or syntax errors)

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePipeline.js
git commit -m "feat: integrate tab freeze and wake locks into usePipeline lifecycle"
```
