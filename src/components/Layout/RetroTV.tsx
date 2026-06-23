import type React from "react";
import "./RetroTV.css";
import { useDialControl } from "../../hooks/useDialControl";
import { useFaderControl } from "../../hooks/useFaderControl";
import CRTControlsLid from "./Controls/CRTControlsLid";
import CRTOCRFader from "./Controls/CRTOCRFader";
import CRTPowerSection from "./Controls/CRTPowerSection";
import CRTSpeakerGrille from "./Controls/CRTSpeakerGrille";
import CRTUHFDial from "./Controls/CRTUHFDial";

interface RetroTVProps {
	isSwitchingChannel?: boolean;
	children: React.ReactNode;
	className?: string;
	status: string;
	maxWorkers: number;
	setWorkers: (val: number | ((prev: number) => number)) => void;
	maxAllowedWorkers: number;
	tessModel: string;
	setTessModel: (model: string) => void;
	selectedPathsSize: number;
	handleStartClick: () => void;
	ignoredFiles?: Array<{ fileName: string; size: number }>;
	footer?: React.ReactNode;
	statusLabel: string;
	theme: string;
	toggleTheme: () => void;
}

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
	} = useDialControl({ isDisabled, maxWorkers, maxAllowedWorkers, setWorkers });

	const {
		faderRef,
		onPointerDown: handleFaderPointerDown,
		onPointerMove: handleFaderPointerMove,
		onPointerUp: handleFaderPointerUp,
	} = useFaderControl({ isDisabled, setTessModel });

	const labelMap: Record<string, string> = {
		"Aguardando Arquivo": "AGUARDANDO ARQUIVO",
		Pronto: "PRONTO PARA PROCESSAR",
		Processando: "PROCESSAMENTO EM CURSO",
		"Lendo ZIP...": "PROCESSAMENTO EM CURSO",
		Finalizado: "PROCESSAMENTO CONCLUÍDO",
		Interrompido: "PROCESSAMENTO CANCELADO",
		Cancelado: "PROCESSAMENTO CANCELADO",
	};
	const displayLabel = labelMap[statusLabel] ?? "AGUARDANDO ARQUIVO";
	let ledColor = "orange-pulse";
	if (status === "configuring") ledColor = "orange-solid";
	else if (status === "processing") ledColor = "green-pulse";
	else if (status === "completed") ledColor = "green-solid";

	return (
		<div className={`crt-monitor-frame ${className}`}>
			<div className="crt-chassis">
				<div className="crt-top-handle" />
				<div className="crt-vents" />

				<div className="crt-cabinet-layout">
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
					<div className="crt-bezel-controls">
						<div className="logo-text-wrapper">
							<span className="logo-title">
								eproc<span className="logo-glow-number text-glow">2</span>txt
							</span>
						</div>

						<div className="crt-lid-wrapper">
							<div className={`crt-lid-content${isDisabled ? " locked" : ""}`}>
								<CRTSpeakerGrille />
								<CRTUHFDial
									dialRef={dialRef}
									rotateValue={rotateValue}
									isDisabled={isDisabled}
									maxWorkers={maxWorkers}
									maxAllowedWorkers={maxAllowedWorkers}
									onPointerDown={handleDialPointerDown}
									onPointerMove={handleDialPointerMove}
									onPointerUp={handleDialPointerUp}
									onKeyDown={handleDialKeyDown}
								/>
								<CRTOCRFader
									faderRef={faderRef}
									tessModel={tessModel}
									isDisabled={isDisabled}
									onPointerDown={handleFaderPointerDown}
									onPointerMove={handleFaderPointerMove}
									onPointerUp={handleFaderPointerUp}
								/>
							</div>
							<CRTControlsLid isOpen={!isDisabled} />
						</div>

						<CRTPowerSection
							displayLabel={displayLabel}
							ledColor={ledColor}
							isDisabled={isDisabled}
							selectedPathsSize={selectedPathsSize}
							onStart={handleStartClick}
						/>

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
