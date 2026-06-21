# Portable TV Redesign & Control Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the TV chassis into a 1980s portable CRT television and integrate all configuration controls (workers dial, OCR fader, power trigger, and warnings placard) directly into the right bezel of the cabinet.

**Architecture:** Refactor `RetroTV.tsx` to handle the settings state, replacing the separate `ConfigPanel` sidebar. Re-style `RetroTV.css` to model a flat grey ABS plastic portable TV cabinet (no stand/neck, slimmer borders) with integrated 3D dials and vertical sliders.

**Tech Stack:** React, Pure CSS, CSS Transitions/Transforms.

---

### Task 1: Update RetroTV Component Signature and State Integration

**Files:**
- Modify: `src/components/Layout/RetroTV.tsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Declare new properties in RetroTVProps interface**
Update `src/components/Layout/RetroTV.tsx` to accept configuration properties:
```typescript
interface RetroTVProps {
	brandText?: string;
	isLoading?: boolean;
	isSwitchingChannel?: boolean;
	children: React.ReactNode;
	className?: string;
	onPowerClick?: () => void;
	
	// Config panel properties
	status: string;
	maxWorkers: number;
	setWorkers: (val: number | ((prev: number) => number)) => void;
	maxAllowedWorkers: number;
	tessModel: string;
	setTessModel: (model: string) => void;
	selectedPathsSize: number;
	handleStartClick: () => void;
	ignoredFiles?: Array<{ fileName: string; size: number }>;
}
```

- [ ] **Step 2: Implement integrated controls inside RetroTV.tsx**
Replace the control bar at the bottom of the TV with a vertical control panel on the right side of the TV bezel. Keep the screen container on the left.
Update `RetroTV.tsx` to render the controls:
```typescript
export default function RetroTV({
	brandText = "EPROC-TXT CRT-80",
	isLoading = false,
	isSwitchingChannel = false,
	children,
	className = "",
	
	status,
	maxWorkers,
	setWorkers,
	maxAllowedWorkers,
	tessModel,
	setTessModel,
	selectedPathsSize,
	handleStartClick,
	ignoredFiles = [],
}: RetroTVProps) {
	const isDisabled = status !== "configuring";

	// Calculate rotation angle for UHF knob (from -135deg to +135deg over 1 to maxAllowedWorkers)
	const rotateValue = maxAllowedWorkers > 1
		? ((maxWorkers - 1) / (maxAllowedWorkers - 1)) * 270 - 135
		: 0;

	// Cycle workers on dial click
	const handleDialClick = () => {
		if (isDisabled) return;
		setWorkers((prev) => (prev >= maxAllowedWorkers ? 1 : prev + 1));
	};

	// Handle wheel scroll on dial
	const handleDialWheel = (e: React.WheelEvent) => {
		if (isDisabled) return;
		e.preventDefault();
		if (e.deltaY < 0) {
			setWorkers((prev) => Math.min(maxAllowedWorkers, prev + 1));
		} else {
			setWorkers((prev) => Math.max(1, prev - 1));
		}
	};

	// Determine power LED class and status label
	let ledColor = "off";
	let powerStatusText = "STANDBY";
	if (status === "configuring") {
		ledColor = "ready";
		powerStatusText = "READY";
	} else if (status === "processing") {
		ledColor = "active";
		powerStatusText = "ACTIVE";
	} else if (status === "completed") {
		ledColor = "finished";
		powerStatusText = "FINISHED";
	}

	return (
		<div className={`crt-monitor-frame ${className}`}>
			<div className="crt-chassis">
				{/* Top handle and vents */}
				<div className="crt-top-handle" />
				<div className="crt-vents" />

				<div className="crt-cabinet-layout">
					{/* Left: Screen */}
					<div className="crt-screen-bezel">
						<div className="crt-screen-container">
							<div className="crt-screen-effects">
								<div className={`crt-static ${isSwitchingChannel ? "switching" : ""}`} />
								<div className="crt-scanlines" />
								<div className="crt-flicker" />
								<div className="crt-radial-vignette" />
							</div>
							<div className="crt-screen-content">{children}</div>
						</div>
						<div className="crt-brand">{brandText}</div>
					</div>

					{/* Right: Integrated Controls Panel */}
					<div className={`crt-bezel-controls ${isDisabled ? "controls-disabled" : ""}`}>
						{/* Speaker Grille */}
						<div className="crt-speaker-grille">
							<div className="speaker-slot" />
							<div className="speaker-slot" />
							<div className="speaker-slot" />
							<div className="speaker-slot" />
							<div className="speaker-slot" />
						</div>

						{/* UHF Dial (Parallel Processors Selector) */}
						<div className="crt-control-group">
							<span className="crt-control-label">WORKERS (UHF)</span>
							<div 
								className="crt-uhf-dial"
								onClick={handleDialClick}
								onWheel={handleDialWheel}
								style={{ transform: `rotate(${rotateValue}deg)` }}
								title="Clique para alternar / Role para ajustar"
							>
								<div className="dial-notch" />
								<div className="dial-groove" />
							</div>
							<span className="crt-control-value">{maxWorkers} / {maxAllowedWorkers}</span>
						</div>

						{/* Fader/Slider (OCR Level Selector) */}
						<div className="crt-control-group">
							<span className="crt-control-label">OCR LEVEL</span>
							<div className="crt-fader-track">
								<button 
									type="button" 
									className={`fader-preset-btn best ${tessModel === "best" ? "active" : ""}`}
									onClick={() => !isDisabled && setTessModel("best")}
									title="Preciso"
								/>
								<button 
									type="button" 
									className={`fader-preset-btn standard ${tessModel === "standard" ? "active" : ""}`}
									onClick={() => !isDisabled && setTessModel("standard")}
									title="Normal"
								/>
								<button 
									type="button" 
									className={`fader-preset-btn fast ${tessModel === "fast" ? "active" : ""}`}
									onClick={() => !isDisabled && setTessModel("fast")}
									title="Rápido"
								/>
								<div 
									className="crt-fader-knob"
									style={{
										bottom: tessModel === "best" ? "38px" : tessModel === "standard" ? "18px" : "-2px"
									}}
								/>
							</div>
							<span className="crt-control-value value-yellow">
								{tessModel === "fast" ? "Rápido" : tessModel === "best" ? "Preciso" : "Normal"}
							</span>
						</div>

						{/* Power Section */}
						<div className="crt-power-section">
							<span className="crt-power-text">POWER: {powerStatusText}</span>
							<div className="crt-power-row">
								<div className={`crt-power-led led-${ledColor}`} />
								<button
									type="button"
									className="crt-power-btn"
									disabled={isDisabled || selectedPathsSize === 0}
									onClick={handleStartClick}
									title="Iniciar Processamento"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Placard for Ignored Files */}
				{ignoredFiles && ignoredFiles.length > 0 && status === "configuring" && (
					<div className="crt-ignored-placard">
						<div className="placard-title">
							<span className="material-icons info-icon">warning</span>
							ARQUIVOS IGNORADOS:
						</div>
						<ul className="placard-list">
							{ignoredFiles.map((f) => (
								<li key={f.fileName}>
									{f.fileName} ({(f.size / 1024).toFixed(1)} KB)
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
}
```

- [ ] **Step 3: Run Biome check to verify compilation of TSX markup**
Run: `npx biome check src/components/Layout/RetroTV.tsx`
Expected: Success

- [ ] **Step 4: Commit**
```bash
git add src/components/Layout/RetroTV.tsx
git commit -m "feat: integrate config props and render markup inside RetroTV.tsx"
```

---

### Task 2: Re-style RetroTV.css for Portable Plastic TV Cabinet

**Files:**
- Modify: `src/components/Layout/RetroTV.css`

- [ ] **Step 1: Replace styles in RetroTV.css**
Remove the old woodgrain styles, neck, base, and bottom-bar layout. Add portable TV styles:
```css
/* RetroTV.css */

:root {
	--crt-cabinet-bg: linear-gradient(135deg, #373b47 0%, #21242d 100%);
	--crt-bezel-bg: #1c1e26;
	--crt-border-color: #4b5061;
	--crt-shadow-color: rgba(0, 0, 0, 0.7);
	--crt-glass-reflection: linear-gradient(
		135deg,
		rgba(255, 255, 255, 0.08) 0%,
		rgba(255, 255, 255, 0) 50%
	);
}

body.light-theme {
	--crt-cabinet-bg: linear-gradient(135deg, #d8d8d0 0%, #b8b8b0 100%);
	--crt-bezel-bg: #e2e2da;
	--crt-border-color: #a4a49c;
	--crt-shadow-color: rgba(0, 0, 0, 0.2);
}

.crt-monitor-frame {
	margin: var(--space-4) auto;
	max-width: min(95%, 920px);
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative;
}

/* Cabinet/Chassis */
.crt-chassis {
	width: 100%;
	background: var(--crt-cabinet-bg);
	border: 6px solid var(--crt-border-color);
	border-radius: 20px;
	box-shadow:
		0 25px 50px -10px var(--crt-shadow-color),
		inset 2px 2px 2px rgba(255, 255, 255, 0.1),
		inset -3px -3px 4px rgba(0, 0, 0, 0.35);
	padding: var(--space-4);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	position: relative;
}

/* Molded handle at the top */
.crt-top-handle {
	position: absolute;
	top: -6px;
	left: 50%;
	transform: translateX(-50%);
	width: 140px;
	height: 8px;
	background: #18191f;
	border: 2px solid var(--crt-border-color);
	border-top: none;
	border-radius: 0 0 8px 8px;
	box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
	opacity: 0.8;
}

/* Simulated cooling slots */
.crt-vents {
	position: absolute;
	top: -6px;
	left: 10%;
	right: 10%;
	height: 3px;
	background: repeating-linear-gradient(
		90deg,
		rgba(0, 0, 0, 0.4) 0px,
		rgba(0, 0, 0, 0.4) 6px,
		transparent 6px,
		transparent 12px
	);
	opacity: 0.6;
}

/* Remove old neck and base styles */
.crt-neck, .crt-base {
	display: none;
}

/* Layout: Screen on left, Controls on right */
.crt-cabinet-layout {
	display: flex;
	gap: var(--space-4);
	width: 100%;
}

.crt-screen-bezel {
	flex: 7;
	background: var(--crt-bezel-bg);
	border: 8px solid var(--crt-bezel-bg);
	border-radius: 16px;
	box-shadow:
		inset 2px 2px 4px rgba(0, 0, 0, 0.6),
		inset -2px -2px 4px rgba(255, 255, 255, 0.1),
		0 4px 8px rgba(0, 0, 0, 0.3);
	display: flex;
	flex-direction: column;
}

/* Bezel Controls Column */
.crt-bezel-controls {
	flex: 3;
	background: #252833;
	border: 4px solid #1c1e26;
	border-radius: 12px;
	padding: var(--space-3) var(--space-2);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.5);
	transition: opacity 0.3s ease;
	min-width: 160px;
}

body.light-theme .crt-bezel-controls {
	background: #eaeae2;
	border-color: #d2d2ca;
}

.controls-disabled {
	opacity: 0.5;
	pointer-events: none;
}

/* Speaker Grille */
.crt-speaker-grille {
	display: flex;
	flex-direction: column;
	gap: 3px;
	margin-bottom: var(--space-3);
}

.speaker-slot {
	height: 2px;
	background: #121317;
	border-radius: 1px;
	opacity: 0.8;
}

body.light-theme .speaker-slot {
	background: #9a9a90;
}

/* Control Group UI */
.crt-control-group {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-2);
	margin-bottom: var(--space-3);
}

.crt-control-label {
	font-family: var(--font-mono);
	font-size: 9px;
	font-weight: var(--font-weight-bold);
	color: var(--color-text-muted);
	letter-spacing: 0.05em;
	text-align: center;
}

.crt-control-value {
	font-family: var(--font-mono);
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-bold);
	color: #ffffff;
}

body.light-theme .crt-control-value {
	color: #121317;
}

.value-yellow {
	color: var(--color-accent);
}

/* UHF Dial Knob */
.crt-uhf-dial {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: #18191f;
	border: 3px solid var(--crt-border-color);
	box-shadow:
		2px 3px 6px rgba(0, 0, 0, 0.6),
		inset 1px 1px 2px rgba(255, 255, 255, 0.1);
	position: relative;
	cursor: pointer;
	transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

body.light-theme .crt-uhf-dial {
	background: #dcdcd4;
	box-shadow:
		1px 2px 4px rgba(0, 0, 0, 0.2),
		inset 1px 1px 1px rgba(255, 255, 255, 0.6);
}

.dial-notch {
	position: absolute;
	top: 3px;
	left: 50%;
	transform: translateX(-50%);
	width: 4px;
	height: 12px;
	background: #ff4a5a;
	border-radius: 2px;
}

.dial-groove {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 28px;
	height: 8px;
	background: var(--crt-border-color);
	border-radius: 4px;
	box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.5);
}

/* Fader/Slider for OCR */
.crt-fader-track {
	width: 16px;
	height: 60px;
	background: #121317;
	border-radius: 8px;
	border: 2px solid var(--crt-border-color);
	position: relative;
	box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.8);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 4px 0;
}

body.light-theme .crt-fader-track {
	background: #c8c8c0;
	box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.fader-preset-btn {
	width: 100%;
	height: 12px;
	background: transparent;
	border: none;
	cursor: pointer;
	z-index: 5;
}

.crt-fader-knob {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	width: 24px;
	height: 12px;
	background: #4a5061;
	border: 2px solid #121317;
	border-radius: 3px;
	box-shadow:
		1px 2px 3px rgba(0, 0, 0, 0.6),
		inset 1px 1px 0 rgba(255, 255, 255, 0.15);
	transition: bottom 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

body.light-theme .crt-fader-knob {
	background: #94948a;
	border-color: #e2e2da;
}

/* Power Section */
.crt-power-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-2);
	border-top: 2px solid #1c1e26;
	padding-top: var(--space-3);
	width: 100%;
}

body.light-theme .crt-power-section {
	border-top-color: #d2d2ca;
}

.crt-power-text {
	font-family: var(--font-mono);
	font-size: 8px;
	font-weight: var(--font-weight-bold);
	color: var(--color-text-muted);
	letter-spacing: 0.05em;
}

.crt-power-row {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.crt-power-led {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: #1b1c22;
	border: 1px solid rgba(0, 0, 0, 0.4);
	transition: all 0.3s ease;
}

.crt-power-led.led-ready {
	background: #ff3b30;
	box-shadow: 0 0 8px #ff3b30;
}

.crt-power-led.led-active {
	background: #0071e3;
	box-shadow: 0 0 10px #0071e3;
	animation: crt-led-blink 0.5s ease-in-out infinite;
}

.crt-power-led.led-finished {
	background: #34c759;
	box-shadow: 0 0 8px #34c759;
}

/* Vintage Rectangular Red Power Button */
.crt-power-btn {
	width: 24px;
	height: 24px;
	background: #992226;
	border: 2px solid #1c1e26;
	border-radius: 4px;
	box-shadow:
		0 2px 4px rgba(0, 0, 0, 0.4),
		inset 1px 1px 1px rgba(255, 255, 255, 0.2);
	cursor: pointer;
	position: relative;
	transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.crt-power-btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.crt-power-btn::after {
	content: "";
	position: absolute;
	inset: 1px;
	border-radius: 2px;
	background: linear-gradient(135deg, #c92f34 0%, #7d1519 100%);
}

.crt-power-btn:not(:disabled):active {
	transform: scale(0.92) translate3d(0, 1px, 0);
	box-shadow: 
		0 1px 1px rgba(0, 0, 0, 0.6),
		inset 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* Brand styling on Bezel */
.crt-brand {
	font-family: var(--font-mono);
	font-size: 8px;
	letter-spacing: 0.15em;
	font-weight: var(--font-weight-bold);
	color: var(--color-text-muted);
	opacity: 0.6;
	text-align: center;
	padding: var(--space-1) 0;
}

/* Glass Screen Container styling tweaks */
.crt-screen-container {
	background: #000000;
	border-radius: 10px;
	overflow: hidden;
	border: 3px solid #0d0e12;
	position: relative;
	box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.98);
}

/* Ignored Placard Styling (looks like a sticker on the TV) */
.crt-ignored-placard {
	margin-top: var(--space-3);
	background: #fdfbef;
	border: 2px dashed #d5c898;
	border-radius: 4px;
	padding: var(--space-3);
	color: #665c36;
	font-family: var(--font-mono);
	box-shadow: 1px 2px 4px rgba(0, 0, 0, 0.1);
	animation: placard-peel 0.4s ease-out;
}

.placard-title {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-bold);
	display: flex;
	align-items: center;
	gap: var(--space-2);
	margin-bottom: var(--space-2);
	color: #8c7623;
}

.info-icon {
	font-size: 14px;
}

.placard-list {
	list-style-type: square;
	padding-left: var(--space-4);
	font-size: 10px;
	margin: 0;
}

.placard-list li {
	margin-bottom: 2px;
}

@keyframes placard-peel {
	0% { transform: translateY(5px); opacity: 0; }
	100% { transform: translateY(0); opacity: 1; }
}
```

- [ ] **Step 2: Run Biome check to verify CSS formatting**
Run: `npx biome check src/components/Layout/RetroTV.css`
Expected: Success

- [ ] **Step 3: Commit**
```bash
git add src/components/Layout/RetroTV.css
git commit -m "style: transform CRT TV styling into a flat gray portable TV casing with right bezel controls"
```

---

### Task 3: Refactor App.jsx Layout and Props Binding

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update RetroTV declaration in App.jsx**
Pass all required configuration and status props into `RetroTV` component:
```javascript
						<RetroTV
							isSwitchingChannel={isSwitchingChannel}
							isLoading={globalLoading || status === "processing"}
							status={status}
							maxWorkers={maxWorkers}
							setWorkers={setWorkers}
							maxAllowedWorkers={Math.max(navigator.hardwareConcurrency || 3, 3)}
							tessModel={tessModel}
							setTessModel={setTessModel}
							selectedPathsSize={selectedPaths?.size || 0}
							handleStartClick={handleStartClick}
							ignoredFiles={ignoredFiles}
						>
							{renderScreen()}
						</RetroTV>
```

- [ ] **Step 2: Remove old right-column ConfigPanel rendering**
Remove the `ConfigPanel` import and its rendering section from `App.jsx`.
Remove lines 170-182:
```javascript
					<div className="retro-tv-right-column">
						<ConfigPanel
							disabled={status !== "configuring"}
							workers={maxWorkers}
							setWorkers={setWorkers}
							maxAllowedWorkers={Math.max(navigator.hardwareConcurrency || 3, 3)}
							tessModel={tessModel}
							setTessModel={setTessModel}
							selectedPathsSize={selectedPaths?.size || 0}
							handleStartClick={handleStartClick}
							ignoredFiles={ignoredFiles}
						/>
					</div>
```
Modify `App.jsx` layouts:
```javascript
			<section className="app-content-wrapper">
				<div className="retro-tv-layout-grid-single">
					<RetroTV
						isSwitchingChannel={isSwitchingChannel}
						isLoading={globalLoading || status === "processing"}
						status={status}
						maxWorkers={maxWorkers}
						setWorkers={setWorkers}
						maxAllowedWorkers={Math.max(navigator.hardwareConcurrency || 3, 3)}
						tessModel={tessModel}
						setTessModel={setTessModel}
						selectedPathsSize={selectedPaths?.size || 0}
						handleStartClick={handleStartClick}
						ignoredFiles={ignoredFiles}
					>
						{renderScreen()}
					</RetroTV>
				</div>
			</section>
```
Also remove the unused import of `ConfigPanel` at the top of `src/App.jsx`.

- [ ] **Step 3: Run Biome check to verify compilation**
Run: `npx biome check src/App.jsx`
Expected: Success

- [ ] **Step 4: Commit**
```bash
git add src/App.jsx
git commit -m "refactor: integrate ConfigPanel into RetroTV and unify layout grid to a single TV element"
```

---

### Task 4: Clean up Layout styles and CSS Grid

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Adapt grid columns in style.css**
Since we removed the separate right column, we can update the grid to be a centered single column layout that showcases the TV monitor in its full scale.
Find and replace `.retro-tv-layout-grid` and related styles in `style.css`:
```css
.retro-tv-layout-grid-single {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	max-width: 960px;
	margin: 0 auto;
	padding: var(--space-4) 0;
}
```

- [ ] **Step 2: Run Biome check on style.css**
Run: `npx biome check style.css`
Expected: Success

- [ ] **Step 3: Commit**
```bash
git add style.css
git commit -m "style: update global layout styles to display single TV component"
```

---

### Task 5: Compilation and Verification

**Files:**
- None (verification task)

- [ ] **Step 1: Run linter check**
Run: `npx biome check src`
Expected: Clean success (no errors, no warnings)

- [ ] **Step 2: Compile production build**
Run: `npm run build`
Expected: Success. Checks the WASM and Worker asset files are generated.

- [ ] **Step 3: Commit final build confirmation**
```bash
git commit --allow-empty -m "build: verify final package builds and lint passes"
```
