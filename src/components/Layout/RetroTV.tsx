import type React from "react";
import { useEffect, useRef } from "react";
import "./RetroTV.css";

/**
 * Properties for the RetroTV component.
 */
interface RetroTVProps {
	/** Brand name text displayed at the bottom of the bezel */
	brandText?: string;
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
}

/**
 * RetroTV component - Renders a portable CRT TV chassis with integrated control dials.
 * Controls the worker count (UHF dial) and OCR quality level (Fader preset button).
 */
export default function RetroTV({
	brandText = "EPROC-TXT CRT-80",
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
	const dialRef = useRef<HTMLDivElement>(null);

	// Calculate rotation angle for UHF knob (from -135deg to +135deg over 1 to maxAllowedWorkers)
	const rotateValue =
		maxAllowedWorkers > 1 ? ((maxWorkers - 1) / (maxAllowedWorkers - 1)) * 270 - 135 : 0;

	// Cycle workers on dial click
	const handleDialClick = () => {
		if (isDisabled) return;
		setWorkers((prev) => (prev >= maxAllowedWorkers ? 1 : prev + 1));
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
								ref={dialRef}
								className="crt-uhf-dial"
								onClick={handleDialClick}
								onKeyDown={handleDialKeyDown}
								style={{ transform: `rotate(${rotateValue}deg)` }}
								title="Clique para alternar / Role para ajustar"
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

						{/* Fader/Slider (OCR Level Selector) */}
						<div className="crt-control-group">
							<span className="crt-control-label">OCR LEVEL</span>
							<div className="crt-fader-track">
								<button
									type="button"
									className={`fader-preset-btn best ${tessModel === "best" ? "active" : ""}`}
									onClick={() => !isDisabled && setTessModel("best")}
									disabled={isDisabled}
									aria-label="OCR Preciso"
									aria-pressed={tessModel === "best"}
									title="Preciso"
								/>
								<button
									type="button"
									className={`fader-preset-btn standard ${tessModel === "standard" ? "active" : ""}`}
									onClick={() => !isDisabled && setTessModel("standard")}
									disabled={isDisabled}
									aria-label="OCR Normal"
									aria-pressed={tessModel === "standard"}
									title="Normal"
								/>
								<button
									type="button"
									className={`fader-preset-btn fast ${tessModel === "fast" ? "active" : ""}`}
									onClick={() => !isDisabled && setTessModel("fast")}
									disabled={isDisabled}
									aria-label="OCR Rápido"
									aria-pressed={tessModel === "fast"}
									title="Rápido"
								/>
								<div className={`crt-fader-knob position-${tessModel}`} />
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
									aria-label="Iniciar Processamento"
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
