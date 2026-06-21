import type React from "react";
import { useEffect, useRef } from "react";
import "./RetroTV.css";

/**
 * Properties for the RetroTV component.
 */
interface RetroTVProps {
	/** Indicates if the channel is currently switching (shows full static noise) */
	isSwitchingChannel?: boolean;
	/** Main content to render inside the CRT screen */
	children: React.ReactNode;
	/** Custom class name applied to the outermost container */
	className?: string;

	// Config panel properties
	/** Current operational status of the application ('configuring', 'processing', 'completed', etc.) */
	status: string;
	/** Current number of active workers selected */
	maxWorkers: number;
	/** Callback to update the workers count */
	setWorkers: (val: number | ((prev: number) => number)) => void;
	/** Maximum allowed workers based on hardware capability */
	maxAllowedWorkers: number;
	/** Selected OCR language model quality preset */
	tessModel: string;
	/** Callback to update the OCR model selection */
	setTessModel: (model: string) => void;
	/** Count of files selected for processing */
	selectedPathsSize: number;
	/** Callback function to start the pipeline execution */
	handleStartClick: () => void;
	/** Optional list of ignored files detected during initialization */
	ignoredFiles?: Array<{ fileName: string; size: number }>;

	// Theme and Status Label properties
	/** Current descriptive status label */
	statusLabel: string;
	/** Current active theme */
	theme: string;
	/** Callback to toggle the theme */
	toggleTheme: () => void;
}

/**
 * RetroTV component - Renders a portable CRT TV chassis with integrated control dials.
 * Controls the worker count (UHF dial) and OCR quality level (Fader preset button).
 */
export default function RetroTV({
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

	statusLabel,
	theme,
	toggleTheme,
}: RetroTVProps) {
	const isDisabled = status !== "configuring";
	const dialRef = useRef<HTMLDivElement>(null);

	// Convert status label to match reference wording
	let displayLabel = "AGUARDANDO ARQUIVO";
	switch (statusLabel) {
		case "Aguardando Arquivo":
			displayLabel = "AGUARDANDO ARQUIVO";
			break;
		case "Pronto":
			displayLabel = "PRONTO PARA PROCESSAR";
			break;
		case "Processando":
		case "Lendo ZIP...":
			displayLabel = "PROCESSAMENTO EM CURSO";
			break;
		case "Finalizado":
			displayLabel = "PROCESSAMENTO CONCLUÍDO";
			break;
		case "Interrompido":
		case "Cancelado":
			displayLabel = "PROCESSAMENTO CANCELADO";
			break;
		default:
			break;
	}

	// Calculate rotation angle for UHF knob (from -135deg to +135deg over 1 to maxAllowedWorkers)
	const workersVal = maxWorkers || 1;
	const maxAllowedVal = maxAllowedWorkers || 1;
	const rotateValue = maxAllowedVal > 1 ? ((workersVal - 1) / (maxAllowedVal - 1)) * 270 - 135 : 0;

	// Drag-to-rotate state refs (no re-render needed for drag tracking)
	const dragStateRef = useRef<{
		active: boolean;
		startAngle: number;
		startWorkers: number;
		lastAngle: number;
		totalDelta: number;
	} | null>(null);

	// Compute angle of pointer relative to dial center
	const getAngleToDial = (clientX: number, clientY: number): number => {
		const dial = dialRef.current;
		if (!dial) return 0;
		const rect = dial.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
	};

	const handleDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (isDisabled) return;
		e.preventDefault();
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		const angle = getAngleToDial(e.clientX, e.clientY);
		dragStateRef.current = {
			active: true,
			startAngle: angle,
			startWorkers: maxWorkers,
			lastAngle: angle,
			totalDelta: 0,
		};
	};

	const handleDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const ds = dragStateRef.current;
		if (!ds?.active || isDisabled) return;
		const angle = getAngleToDial(e.clientX, e.clientY);

		// Compute shortest angular delta (handles 180/-180 wraparound)
		let delta = angle - ds.lastAngle;
		if (delta > 180) delta -= 360;
		if (delta < -180) delta += 360;

		ds.totalDelta += delta;
		ds.lastAngle = angle;

		// 270 degrees of arc spans all workers. Each worker step = 270 / (max-1) degrees
		const degreesPerWorker = maxAllowedVal > 1 ? 270 / (maxAllowedVal - 1) : 270;
		const rawSteps = ds.totalDelta / degreesPerWorker;
		const newWorkers = Math.round(ds.startWorkers + rawSteps);
		setWorkers(Math.max(1, Math.min(maxAllowedWorkers, newWorkers)));
	};

	const handleDialPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		if (dragStateRef.current) {
			// If barely moved (< 5°), treat as click → advance by 1
			if (Math.abs(dragStateRef.current.totalDelta) < 5 && !isDisabled) {
				setWorkers((prev) => (prev >= maxAllowedWorkers ? 1 : prev + 1));
			}
			dragStateRef.current = null;
		}
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	};

	// Use passive: false event listener for dial wheel to prevent console warnings/errors
	useEffect(() => {
		const handleWheel = (e: WheelEvent) => {
			if (isDisabled) return;
			e.preventDefault();
			if (e.deltaY < 0) {
				setWorkers((prev) => Math.min(maxAllowedWorkers, prev + 1));
			} else {
				setWorkers((prev) => Math.max(1, prev - 1));
			}
		};

		const dial = dialRef.current;
		if (dial) {
			dial.addEventListener("wheel", handleWheel, { passive: false });
		}

		return () => {
			if (dial) {
				dial.removeEventListener("wheel", handleWheel);
			}
		};
	}, [isDisabled, maxAllowedWorkers, setWorkers]);

	// Handle key presses on dial for keyboard accessibility
	const handleDialKeyDown = (e: React.KeyboardEvent) => {
		if (isDisabled) return;
		if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp" || e.key === "ArrowRight") {
			e.preventDefault();
			setWorkers((prev) => Math.min(maxAllowedWorkers, prev + 1));
		} else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
			e.preventDefault();
			setWorkers((prev) => Math.max(1, prev - 1));
		} else if (e.key === "Home") {
			e.preventDefault();
			setWorkers(1);
		} else if (e.key === "End") {
			e.preventDefault();
			setWorkers(maxAllowedWorkers);
		}
	};

	// Determine power LED class based on status/pipeline state
	let ledColor = "orange-pulse"; // Aguardando arquivo
	if (status === "configuring") {
		ledColor = "orange-solid"; // Pronto para processar
	} else if (status === "processing") {
		ledColor = "green-pulse"; // Processamento em curso
	} else if (status === "completed") {
		ledColor = "green-solid"; // Processamento concluído
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
							<div className="crt-screen-content">
								{children}

								{/* Placard for Ignored Files inside screen */}
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
					</div>

					{/* Right: Integrated Controls Panel */}
					<div className={`crt-bezel-controls ${isDisabled ? "controls-disabled" : ""}`}>
						{/* Logo Title placed above Speaker Grille */}
						<div className="logo-text-wrapper">
							<span className="logo-title">
								eproc<span className="logo-glow-number text-glow">2</span>txt
							</span>
						</div>

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
								ref={dialRef}
								className="crt-uhf-dial"
								onPointerDown={handleDialPointerDown}
								onPointerMove={handleDialPointerMove}
								onPointerUp={handleDialPointerUp}
								onPointerCancel={handleDialPointerUp}
								onKeyDown={handleDialKeyDown}
								style={{ transform: `rotate(${rotateValue}deg)` }}
								title="Arraste para girar / Role para ajustar"
								role="slider"
								aria-valuenow={maxWorkers}
								aria-valuemin={1}
								aria-valuemax={maxAllowedWorkers}
								aria-disabled={isDisabled}
								aria-label="Worker selection"
								tabIndex={isDisabled ? -1 : 0}
							>
								<div className="dial-notch" />
								<div className="dial-groove" />
							</div>
							<span className="crt-control-value">
								{maxWorkers} / {maxAllowedWorkers}
							</span>
						</div>

						{/* Theme Toggle Button placed between controls */}
						<div className="crt-control-group">
							<span className="crt-control-label">TEMA</span>
							<button
								type="button"
								className="crt-theme-btn"
								title="Alternar Tema"
								onClick={toggleTheme}
								aria-label="Alternar Tema"
							>
								{theme === "dark" ? (
									<span className="material-icons">light_mode</span>
								) : (
									<span className="material-icons">dark_mode</span>
								)}
							</button>
						</div>

						{/* Fader/Slider (OCR Level Selector) */}
						<div className="crt-control-group">
							<span className="crt-control-label">OCR LEVEL</span>
							<div className="crt-fader-track">
								<button
									type="button"
									className="fader-preset-btn best"
									onClick={() => !isDisabled && setTessModel("best")}
									disabled={isDisabled}
									aria-label="OCR Preciso"
									aria-pressed={tessModel === "best"}
									title="Preciso"
								/>
								<button
									type="button"
									className="fader-preset-btn standard"
									onClick={() => !isDisabled && setTessModel("standard")}
									disabled={isDisabled}
									aria-label="OCR Normal"
									aria-pressed={tessModel === "standard"}
									title="Normal"
								/>
								<button
									type="button"
									className="fader-preset-btn fast"
									onClick={() => !isDisabled && setTessModel("fast")}
									disabled={isDisabled}
									aria-label="OCR Rápido"
									aria-pressed={tessModel === "fast"}
									title="Rápido"
								/>
								<div className={`crt-fader-knob position-${tessModel || "standard"}`} />
							</div>
							<span className="crt-control-value value-yellow">
								{tessModel === "fast" ? "Rápido" : tessModel === "best" ? "Preciso" : "Normal"}
							</span>
						</div>

						{/* Power Section (Status label without "POWER:" label) */}
						<div className="crt-power-section">
							<span className="status-badge-label">{displayLabel}</span>
							<div className="crt-power-row">
								<div className={`crt-power-led led-${ledColor}`} />
								<button
									type="button"
									className="crt-power-btn"
									disabled={isDisabled || selectedPathsSize === 0}
									onClick={handleStartClick}
									aria-label="Iniciar Processamento"
									title="Iniciar Processamento"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
