# CRT UI Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement visual refinements (CRT monitor dropzone, glowing text flickering, DoneScreen TXT badge), encapsulate component color variables in `:root` blocks, and replace layout media queries and color alpha variables with custom CSS functions.

**Architecture:** Use modern native CSS custom functions (`@function`) defined in `style.css` to build responsive widths and calculate transparent colors. Scope component-specific color variables within `:root` blocks inside local stylesheets.

**Tech Stack:** React 18, Vite 8, CSS custom functions.

---

### Task 1: CSS Custom Functions and Flicker Keyframes in style.css

**Files:**
- Modify: [style.css](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/style.css)

- [ ] **Step 1: Declare responsive and text-flicker keyframes at the top of style.css**
  
  Insert the following at-rules right above `.text-glow`:
  ```css
  @function --responsive-md(--mobile, --desktop) {
    @media (max-width: 767px) {
      result: var(--mobile);
    }
    @media (min-width: 768px) {
      result: var(--desktop);
    }
  }

  @function --responsive-lg(--mobile, --desktop) {
    @media (max-width: 1023px) {
      result: var(--mobile);
    }
    @media (min-width: 1024px) {
      result: var(--desktop);
    }
  }

  @keyframes text-flicker {
    0%, 100% {
      opacity: 0.98;
      text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
    }
    2.3% {
      opacity: 0.90;
      text-shadow: 0 0 calc(var(--blur-size, 18px) * 0.8) oklch(from currentColor l c h / 0.7);
    }
    3.0% {
      opacity: 1.0;
      text-shadow: 0 0 calc(var(--blur-size, 18px) * 1.25) oklch(from currentColor l c h / 1.0);
    }
    4.3% {
      opacity: 0.85;
      text-shadow: 0 0 calc(var(--blur-size, 18px) * 0.7) oklch(from currentColor l c h / 0.55);
    }
    5.0% {
      opacity: 0.98;
      text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
    }
    50% {
      opacity: 0.98;
      text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
    }
    52.3% {
      opacity: 0.88;
      text-shadow: 0 0 calc(var(--blur-size, 18px) * 0.75) oklch(from currentColor l c h / 0.65);
    }
    53.0% {
      opacity: 0.98;
      text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
    }
    54.0% {
      opacity: 0.92;
      text-shadow: 0 0 calc(var(--blur-size, 18px) * 0.8) oklch(from currentColor l c h / 0.7);
    }
    55.5% {
      opacity: 1.0;
      text-shadow: 0 0 calc(var(--blur-size, 18px) * 1.3) oklch(from currentColor l c h / 1.0);
    }
    56.5% {
      opacity: 0.98;
      text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
    }
  }
  ```

- [ ] **Step 2: Update text-glow classes in style.css to include flicker animation**
  
  Modify `.text-glow` and `.text-glow-magenta` inside `style.css`:
  ```css
  .text-glow {
    color: var(--color-primary) !important;
    animation: pulse-text 3.2s infinite alternate, text-flicker 0.15s infinite;
    --blur-size: 18px;
  }

  .text-glow-magenta {
    color: var(--color-accent) !important;
    animation: pulse-text 3.2s infinite alternate, text-flicker 0.15s infinite;
    --blur-size: 18px;
  }
  ```

- [ ] **Step 3: Define base contrast colors to replace white-alpha variables**
  
  Add the contrast base color in the main `:root` block of `style.css` (around line 45):
  ```css
  --color-contrast-base: #ffffff;
  ```
  And under `body.light-theme` (around line 170):
  ```css
  --color-contrast-base: #000000;
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add style.css
  git commit -m "style: add responsive CSS functions, text flicker animation and contrast base color"
  ```

---

### Task 2: DoneScreen TXT floating file and colors

**Files:**
- Modify: [DoneScreen.tsx](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/DoneScreen/DoneScreen.tsx)
- Modify: [DoneScreen.css](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/DoneScreen/DoneScreen.css)

- [ ] **Step 1: Update DoneScreen.tsx to show TXT badge and new class names**
  
  Replace lines 55-65 in `DoneScreen.tsx`:
  ```tsx
  			<div className="done-header-banner">
  				<div className="done-floating-txt-container">
  					<div className="txt-floating">
  						<div className="file-line title" />
  						<div className="file-line md" />
  						<div className="file-line sh" />
  						<div className="file-line md" />
  						<div className="file-line" />
  						<div className="file-type-badge">TXT</div>
  					</div>
  				</div>
  ```

- [ ] **Step 2: Update DoneScreen.css to support TXT card design and custom functions**
  
  Insert a local `:root` block at the top of `DoneScreen.css` defining component colors:
  ```css
  :root {
  	--txt-floating-bg: --transparent(var(--color-primary), 0.05);
  	--txt-floating-border: var(--color-primary);
  	--txt-floating-line-title: var(--color-primary);
  	--txt-floating-line-sub: --transparent(var(--color-primary), 0.4);
  }
  ```
  Then replace the `.done-floating-xml-container`, `.xml-floating`, and `.xmlFloat` references in `DoneScreen.css`:
  ```css
  .done-floating-txt-container {
  	perspective: 800px;
  	width: 120px;
  	height: 120px;
  	display: flex;
  	align-items: center;
  	justify-content: center;
  	margin: 0 auto var(--space-4) auto;
  	position: relative;
  }

  .txt-floating {
  	width: 70px;
  	height: 90px;
  	background: var(--txt-floating-bg);
  	border: 2.5px solid var(--txt-floating-border);
  	border-radius: var(--border-radius-md);
  	display: flex;
  	flex-direction: column;
  	padding: 10px;
  	gap: 4px;
  	transform: rotateX(25deg) rotateY(-20deg) rotateZ(10deg);
  	animation: txtFloat 3s ease-in-out infinite alternate;
  	position: relative;
  	box-shadow:
  		6px 10px 25px rgba(0, 0, 0, 0.35),
  		0 0 20px --transparent(var(--color-primary), 0.25);
  }

  .txt-floating::after {
  	content: "";
  	position: absolute;
  	top: -2.5px;
  	right: -2.5px;
  	width: 0;
  	height: 0;
  	border-style: solid;
  	border-width: 0 14px 14px 0;
  	border-color: transparent var(--txt-floating-border) transparent transparent;
  }

  .txt-floating .file-line {
  	height: 4px;
  	background: var(--txt-floating-line-sub);
  	border-radius: 2px;
  }

  .txt-floating .file-line.title {
  	background: var(--txt-floating-line-title);
  	width: 50%;
  	margin-bottom: 2px;
  }

  .txt-floating .file-line.sh {
  	width: 40%;
  }

  .txt-floating .file-line.md {
  	width: 75%;
  }

  .txt-floating .file-type-badge {
  	position: absolute;
  	bottom: 8px;
  	right: 8px;
  	font-size: 8px;
  	font-family: var(--font-mono);
  	font-weight: 900;
  	background: var(--txt-floating-border);
  	color: black;
  	padding: 1px 4px;
  	border-radius: 3px;
  }

  @keyframes txtFloat {
  	0% {
  		transform: rotateX(25deg) rotateY(-20deg) rotateZ(10deg) translateY(0px);
  	}
  	100% {
  		transform: rotateX(25deg) rotateY(-20deg) rotateZ(10deg) translateY(-12px);
  		box-shadow:
  			10px 16px 35px rgba(0, 0, 0, 0.45),
  			0 0 30px var(--color-primary);
  	}
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/DoneScreen/DoneScreen.tsx src/components/DoneScreen/DoneScreen.css
  git commit -m "feat: change DoneScreen floating file to TXT and update colors to primary theme"
  ```

---

### Task 3: CRT Monitor Dropzone HTML & CSS

**Files:**
- Modify: [Dropzone.tsx](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/LoadingScreen/Dropzone/Dropzone.tsx)
- Modify: [LoadingScreen.css](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/LoadingScreen/LoadingScreen.css)

- [ ] **Step 1: Wrap the dropzone card inside the CRT chassis and base elements in Dropzone.tsx**
  
  Rewrite the return statement of `Dropzone.tsx` (lines 60-117):
  ```tsx
  	return (
  		<div className="crt-monitor-frame">
  			<div className="crt-chassis">
  				<div className="crt-bezel">
  					<div className="crt-screen-container">
  						<label
  							onDragOver={(e) => {
  								e.preventDefault();
  								setHover(true);
  							}}
  							onDragLeave={() => setHover(false)}
  							onDrop={(e) => {
  								e.preventDefault();
  								setHover(false);
  								const f = e.dataTransfer.files?.[0];
  								if (f) handleFile(f);
  							}}
  							className={`dropzone-card panel scanlines crt-screen ${hover ? "hovered" : ""} ${loading ? "loading" : ""}`}
  						>
  							<input
  								type="file"
								ref={fileInputRef}
								accept=".zip"
								className="visually-hidden"
								onChange={(e) => {
									if (e.target.files && e.target.files.length > 0) {
										handleFile(e.target.files[0]);
									}
								}}
								disabled={loading}
							/>

							{loading && <div className="scan-line" />}

							<IsometricViewport3D
								status="idle"
								maxWorkers={0}
								workerStatuses={[]}
								docStatuses={{}}
								globalLoading={false}
								isDragHovered={hover}
							/>

							<div className="dropzone-icon-wrapper">
								<div className="dropzone-circle-glow" />
								<span className="material-icons dropzone-svg-icon-material">upload_file</span>
							</div>

							<div className="dropzone-text-group">
								<p className="dropzone-prompt">
									{loading ? "Lendo arquivo…" : "Arraste o .zip aqui ou clique para selecionar"}
								</p>
							</div>
						</label>
					</div>
				</div>
				<div className="crt-control-bar">
					<div className="crt-brand">EPROC-TXT CRT-80</div>
					<div className="crt-dials">
						<div className="crt-dial" />
						<div className="crt-dial" />
					</div>
					<div className="crt-power-section">
						<span className="crt-power-label">POWER</span>
						<div className={`crt-power-led ${loading ? "busy" : "active"}`} />
						<button
							type="button"
							className="crt-power-btn"
							onClick={() => fileInputRef.current?.click()}
							title="Carregar arquivo .zip"
						/>
					</div>
				</div>
			</div>
			<div className="crt-neck" />
			<div className="crt-base" />
			{error && <p className="dropzone-error animate-fade-in">{error}</p>}
		</div>
  	);
  ```

- [ ] **Step 2: Update LoadingScreen.css to style the CRT monitor**
  
  Add component-specific variables inside a `:root` block at the top of `LoadingScreen.css`:
  ```css
  :root {
  	--crt-cabinet-bg: linear-gradient(135deg, #2b2e3a 0%, #171821 100%);
  	--crt-bezel-bg: #1c1d24;
  	--crt-border-color: #3b3d4a;
  	--crt-shadow-color: rgba(0, 0, 0, 0.7);
  	--dropzone-circle-border: --transparent(var(--color-primary), 0.4);
  	--dropzone-glow-bg: --transparent(var(--color-primary), 0.1);
  }

  body.light-theme {
  	--crt-cabinet-bg: linear-gradient(135deg, #e5e5e0 0%, #c4c4bc 100%);
  	--crt-bezel-bg: #ababa3;
  	--crt-border-color: #8c8c82;
  	--crt-shadow-color: rgba(0, 0, 0, 0.2);
  }
  ```
  And append these layout classes to `LoadingScreen.css` (replacing older `.dropzone-card` layout styles and configuring alpha elements):
  ```css
  .crt-monitor-frame {
  	margin: var(--space-8) auto 0 auto;
  	max-width: var(--max-w-xl);
  	display: flex;
  	flex-direction: column;
  	align-items: center;
  }

  .crt-chassis {
  	width: 100%;
  	background: var(--crt-cabinet-bg);
  	border: 6px solid var(--crt-border-color);
  	border-radius: var(--border-radius-lg);
  	box-shadow:
  		0 25px 50px -12px var(--crt-shadow-color),
  		inset 2px 2px 0px rgba(255, 255, 255, 0.08),
  		inset -2px -2px 0px rgba(0, 0, 0, 0.3);
  	padding: var(--space-4);
  	box-sizing: border-box;
  	display: flex;
  	flex-direction: column;
  	gap: var(--space-3);
  }

  .crt-bezel {
  	background: var(--crt-bezel-bg);
  	border: 12px solid var(--crt-bezel-bg);
  	border-radius: 20px;
  	box-shadow:
  		inset 2px 2px 5px rgba(0, 0, 0, 0.6),
  		inset -2px -2px 5px rgba(255, 255, 255, 0.1);
  }

  .crt-screen-container {
  	background: #000000;
  	border-radius: 24px;
  	overflow: hidden;
  	border: 3px solid #111;
  	position: relative;
  	box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.95);
  }

  /* Screen Curvature Bulge and Glass Reflection */
  .dropzone-card.panel.crt-screen {
  	position: relative;
  	margin-top: 0;
  	display: block;
  	cursor: pointer;
  	overflow: hidden;
  	border-radius: 24px;
  	padding: var(--space-6) var(--space-6) var(--space-12);
  	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  	background: var(--bg-card);
  	height: 35vh;
  	border: none;
  	box-shadow: none;
  }

  /* Curvature Shadow Overlay */
  .crt-screen-container::after {
  	content: "";
  	position: absolute;
  	inset: 0;
  	background: radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.5) 100%);
  	pointer-events: none;
  	z-index: 4;
  }

  /* Control Panel beneath the Bezel */
  .crt-control-bar {
  	display: flex;
  	align-items: center;
  	justify-content: space-between;
  	padding: var(--space-2) var(--space-4) 0 var(--space-4);
  	border-top: 2px solid var(--crt-border-color);
  }

  .crt-brand {
  	font-family: var(--font-mono);
  	font-size: var(--font-size-2xs);
  	letter-spacing: 0.15em;
  	font-weight: var(--font-weight-bold);
  	color: var(--color-text-muted);
  }

  .crt-dials {
  	display: flex;
  	gap: var(--space-3);
  }

  .crt-dial {
  	width: 14px;
  	height: 14px;
  	border-radius: 50%;
  	background: #111;
  	border: 2px solid var(--crt-border-color);
  	box-shadow: inset 1px 1px 0 rgba(255,255,255,0.1);
  	position: relative;
  }

  .crt-dial::after {
  	content: "";
  	position: absolute;
  	top: 0;
  	left: 50%;
  	width: 2px;
  	height: 6px;
  	background: var(--crt-border-color);
  	transform: translateX(-50%);
  }

  .crt-power-section {
  	display: flex;
  	align-items: center;
  	gap: var(--space-2);
  }

  .crt-power-label {
  	font-family: var(--font-mono);
  	font-size: 8px;
  	color: var(--color-text-muted);
  }

  .crt-power-led {
  	width: 6px;
  	height: 6px;
  	border-radius: 50%;
  	background: #2b2e3a;
  	transition: all 0.3s ease;
  }

  .crt-power-led.active {
  	background: oklch(0.78 0.18 150);
  	box-shadow: 0 0 6px oklch(0.78 0.18 150);
  }

  .crt-power-led.busy {
  	background: oklch(0.82 0.16 85);
  	box-shadow: 0 0 6px oklch(0.82 0.16 85);
  	animation: blink 0.5s ease-in-out infinite;
  }

  .crt-power-btn {
  	width: var(--size-3);
  	height: var(--size-3);
  	border-radius: 50%;
  	background: #901a1e;
  	border: 2.5px solid #5a1114;
  	box-shadow:
  		0 2px 4px rgba(0,0,0,0.5),
  		inset 1px 1px 1px rgba(255,255,255,0.15);
  	cursor: pointer;
  	transition: transform 0.1s ease;
  }

  .crt-power-btn:active {
  	transform: scale(0.95);
  	box-shadow: 0 1px 1px rgba(0,0,0,0.5);
  }

  .crt-neck {
  	width: 140px;
  	height: 16px;
  	background: var(--crt-bezel-bg);
  	border-left: 3px solid var(--crt-border-color);
  	border-right: 3px solid var(--crt-border-color);
  	box-shadow:
  		inset 10px 0 15px rgba(0, 0, 0, 0.4),
  		inset -10px 0 15px rgba(0, 0, 0, 0.4);
  }

  .crt-base {
  	width: 280px;
  	height: 12px;
  	background: var(--crt-cabinet-bg);
  	border: 3px solid var(--crt-border-color);
  	border-radius: 4px 4px 10px 10px;
  	box-shadow:
  		0 10px 20px rgba(0, 0, 0, 0.3),
  		inset 1px 1px 0 rgba(255,255,255,0.1);
  }

  /* Replacing old card icons and texts */
  .dropzone-circle-outer {
  	border-color: --transparent(var(--color-primary), 0.4);
  }

  .dropzone-circle-orbit {
  	border-color: --transparent(var(--color-primary), 0.4);
  }

  .dropzone-circle-glow {
  	background: --transparent(var(--color-primary), 0.1);
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/LoadingScreen/Dropzone/Dropzone.tsx src/components/LoadingScreen/LoadingScreen.css
  git commit -m "feat: design physical CRT monitor frame layout and styling for dropzone"
  ```

---

### Task 4: Replace Media Queries in ConfigScreen and ProcessingScreen

**Files:**
- Modify: [ConfigScreen.css](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/ConfigScreen/ConfigScreen.css)
- Modify: [ProcessingScreen.css](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/ProcessingScreen/ProcessingScreen.css)

- [ ] **Step 1: Replace media queries in ConfigScreen.css with responsive functions**
  
  Rewrite `ConfigScreen.css` lines 10-43:
  ```css
  .dashboard-grid {
  	display: grid;
  	grid-template-columns: --responsive-lg(1fr, 1fr 1fr);
  	gap: 1rem;
  	flex: 1;
  	min-height: 0;
  	overflow: --responsive-lg(auto, hidden);
  }

  .loaded-layout-grid {
  	display: grid;
  	gap: var(--gap-6);
  	grid-template-columns: --responsive-lg(1fr, 1fr 380px);
  }

  .docs-tree-card {
  	grid-column: --responsive-lg(auto, 1);
  }

  .config-panel {
  	grid-column: --responsive-lg(auto, 2);
  }
  ```

- [ ] **Step 2: Replace media queries in ProcessingScreen.css with responsive functions**
  
  Modify lines 7-17 in `ProcessingScreen.css`:
  ```css
  .processing-stats-grid {
  	display: grid;
  	gap: var(--gap-6);
  	text-align: left;
  	grid-template-columns: --responsive-md(1fr, 1.2fr 1fr 1fr);
  }
  ```
  Modify line 90-99 in `ProcessingScreen.css`:
  ```css
  .processing-layout-grid {
  	margin-top: var(--space-6);
  	display: grid;
  	grid-template-columns: 1fr;
  }

  .processing-layout-grid .isometric-viewport {
  	height: --responsive-lg(400px, 480px);
  	max-height: var(--max-h-panel);
  	margin-bottom: 0;
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/ConfigScreen/ConfigScreen.css src/components/ProcessingScreen/ProcessingScreen.css
  git commit -m "style: replace layout media queries with responsive CSS functions"
  ```

---

### Task 5: Replace Alpha Colors in Tree, TessModel, and FileSummaryBar

**Files:**
- Modify: [TessModel.css](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/ConfigScreen/ConfigPanel/TessModel.css)
- Modify: [FileSummaryBar.css](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/ConfigScreen/FileSummaryBar/FileSummaryBar.css)
- Modify: [Tree.css](file:///c:/Users/jonyd/Projetos/eproc2txt/.worktrees/feature-3d-elements/src/components/ConfigScreen/Tree/Tree.css)

- [ ] **Step 1: Replace alpha color properties in TessModel.css**
  
  Add `:root` block to `TessModel.css`:
  ```css
  :root {
  	--tess-container-bg: rgba(0, 0, 0, 0.25);
  	--tess-indicator-bg: --transparent(var(--color-primary), 0.1);
  }

  body.light-theme {
  	--tess-container-bg: --transparent(var(--color-contrast-base), 0.1);
  }
  ```
  Apply variables to elements in `TessModel.css`:
  ```css
  .segmented-control-container {
  	position: relative;
  	display: flex;
  	background: var(--tess-container-bg);
  	border: 1px solid var(--border-color);
  	border-radius: var(--border-radius-lg);
  	padding: 4px;
  	margin-top: var(--space-3);
  	user-select: none;
  }

  /* Remove body.light-theme .segmented-control-container background override since it uses --tess-container-bg */

  .segmented-control-indicator {
  	position: absolute;
  	top: 4px;
  	bottom: 4px;
  	left: 4px;
  	width: calc((100% - 8px) / 3);
  	background: var(--tess-indicator-bg);
  	border: 1px solid var(--color-primary);
  	border-radius: var(--border-radius-md);
  	box-shadow: 0 0 10px var(--color-primary-glow);
  	transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  	transform: translateX(calc(100% * var(--active-index)));
  	pointer-events: none;
  	z-index: 0;
  }
  ```

- [ ] **Step 2: Replace alpha color properties in FileSummaryBar.css**
  
  Add `:root` block to `FileSummaryBar.css`:
  ```css
  :root {
  	--summary-btn-bg: --transparent(var(--color-primary), 0.1);
  	--summary-btn-border: --transparent(var(--color-primary), 0.4);
  }
  ```
  Apply variables to elements in `FileSummaryBar.css`:
  ```css
  .btn-change-file {
  	background: var(--summary-btn-bg);
  	border: 1px solid var(--summary-btn-border);
  	border-radius: var(--border-radius-md);
  	cursor: pointer;
  	font-family: var(--font-mono);
  	font-size: var(--font-size-xs);
  	text-transform: uppercase;
  	letter-spacing: 0.15em;
  	padding: var(--space-2-5) var(--space-5);
  	color: var(--color-primary);
  	transition: all 0.2s ease;
  	display: inline-flex;
  	align-items: center;
  	gap: var(--space-1-5);
  	box-shadow: 0 0 12px var(--color-primary-glow);
  }

  .btn-change-file:hover {
  	background: var(--summary-btn-bg);
  	border-color: var(--color-primary);
  	color: var(--color-primary);
  	box-shadow: 0 0 16px var(--color-primary-glow);
  	filter: brightness(1.1);
  }
  ```

- [ ] **Step 3: Replace alpha color properties in Tree.css**
  
  Add `:root` block to `Tree.css`:
  ```css
  :root {
  	--tree-selected-bg: transparent;
  	--tree-checkbox-bg: rgba(0, 0, 0, 0.25);
  	--tree-checkbox-hover-shadow: var(--color-accent-glow);
  	--tree-checkbox-checked-shadow: var(--color-accent-glow);
  }

  body.light-theme {
  	--tree-selected-bg: --transparent(var(--color-accent), 0.1);
  }
  ```
  Apply variables in `Tree.css`:
  ```css
  body.light-theme .tree-node-header:has(.tree-checkbox:checked),
  body.light-theme .tree-node-header:has(.tree-checkbox:indeterminate) {
  	background: var(--tree-selected-bg);
  }

  .tree-checkbox {
  	appearance: none;
  	width: 14px;
  	height: 14px;
  	border: 1.5px solid var(--color-text-muted);
  	border-radius: 3px;
  	background: var(--tree-checkbox-bg);
  	cursor: pointer;
  	position: relative;
  	display: inline-flex;
  	align-items: center;
  	justify-content: center;
  	outline: none;
  	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  	box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
  	flex-shrink: 0;
  }

  .tree-checkbox:hover:not(:disabled) {
  	border-color: var(--color-accent);
  	box-shadow: 0 0 0 3px --transparent(var(--color-accent), 0.25);
  }

  .tree-checkbox:checked {
  	border-color: var(--color-accent);
  	box-shadow: 0 0 8px --transparent(var(--color-accent), 0.25);
  }

  .tree-checkbox:indeterminate {
  	background-color: var(--color-accent);
  	border-color: var(--color-accent);
  	box-shadow: 0 0 8px --transparent(var(--color-accent), 0.25);
  }
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/ConfigScreen/ConfigPanel/TessModel.css src/components/ConfigScreen/FileSummaryBar/FileSummaryBar.css src/components/ConfigScreen/Tree/Tree.css
  git commit -m "style: scope component colors in local root and replace alpha variables with transparent function"
  ```

---

### Task 6: Verification and Biome lint check

**Files:**
- Test: Build check

- [ ] **Step 1: Run linter to verify formatting and syntax correctness**
  Run: `npm run lint`
  Expected: Biome exits with success and no errors.

- [ ] **Step 2: Run build to ensure production compilation passes**
  Run: `npm run build`
  Expected: Vite compilation completes successfully with no CSS/TypeScript compiler errors.
