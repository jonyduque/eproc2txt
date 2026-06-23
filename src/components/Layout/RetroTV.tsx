import type React from "react";
import "./RetroTV.css";
import { useDialControl } from "../../hooks/useDialControl";
import { useFaderControl } from "../../hooks/useFaderControl";

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
	/** Optional footer content rendered at the bottom of the TV chassis */
	footer?: React.ReactNode;

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
	footer,

	statusLabel,
	theme,
	toggleTheme,
}: RetroTVProps) {
	const isDisabled = status !== "configuring";

	const {
		dialRef,
		rotateValue,
		onPointerDown: handleDialPointerDown,
		onPointerMove: handleDialPointerMove,
		onPointerUp: handleDialPointerUp,
		onKeyDown: handleDialKeyDown,
	} = useDialControl({
		isDisabled,
		maxWorkers,
		maxAllowedWorkers,
		setWorkers,
	});

	const {
		faderRef,
		onPointerDown: handleFaderPointerDown,
		onPointerMove: handleFaderPointerMove,
		onPointerUp: handleFaderPointerUp,
	} = useFaderControl({
		isDisabled,
		setTessModel,
	});

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
					<div className="crt-bezel-controls">
						{/* Logo Title - always visible */}
						<div className="logo-text-wrapper">
							<span className="logo-title">
								eproc<span className="logo-glow-number text-glow">2</span>txt
							</span>
						</div>

						{/* Lid wrapper: speaker + workers + OCR covered when disabled */}
						<div className="crt-lid-wrapper">
							<div className={`crt-lid-content${isDisabled ? " locked" : ""}`}>
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

								{/* Fader/Slider (OCR Level Selector) — drag to set */}
								<div className="crt-control-group">
									<span className="crt-control-label">OCR LEVEL</span>
									<div className="crt-fader-container">
										<div
											ref={faderRef}
											className="crt-fader-track"
											onPointerDown={handleFaderPointerDown}
											onPointerMove={handleFaderPointerMove}
											onPointerUp={handleFaderPointerUp}
											onPointerCancel={handleFaderPointerUp}
											role="slider"
											aria-label="OCR Level"
											aria-valuenow={tessModel === "best" ? 2 : tessModel === "standard" ? 1 : 0}
											aria-valuemin={0}
											aria-valuemax={2}
											aria-disabled={isDisabled}
											tabIndex={isDisabled ? -1 : 0}
											title="Arraste para ajustar o nível OCR"
										>
											<div className={`crt-fader-knob position-${tessModel || "standard"}`} />
										</div>
										<div className="crt-fader-labels">
											<span
												className={`crt-fader-label-item ${tessModel === "best" ? "active" : ""}`}
											>
												Preciso
											</span>
											<span
												className={`crt-fader-label-item ${tessModel === "standard" ? "active" : ""}`}
											>
												Normal
											</span>
											<span
												className={`crt-fader-label-item ${tessModel === "fast" ? "active" : ""}`}
											>
												Rápido
											</span>
										</div>
									</div>
								</div>
							</div>

							{/* 3D Lid - covers controls when not configuring */}
							<div className={`crt-controls-lid${isDisabled ? "" : " open"}`}>
								<div className="crt-lid-face">
									<div className="crt-lid-ribs" />
									<span className="crt-lid-label">CONTROLES</span>
									<div className="crt-lid-ribs" />
								</div>
							</div>
						</div>

						{/* Power Section - always visible */}
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

						{/* Theme Toggle - below power section, always visible */}
						<div className="crt-control-group crt-theme-group">
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
					</div>
				</div>

				{footer && <div className="crt-chassis-footer">{footer}</div>}
			</div>
		</div>
	);
}
