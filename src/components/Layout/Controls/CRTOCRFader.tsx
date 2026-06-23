import type React from "react";

interface CRTOCRFaderProps {
	faderRef: React.RefObject<HTMLDivElement | null>;
	tessModel: string;
	isDisabled: boolean;
	onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * CRTOCRFader - Drag slider for selecting OCR quality level.
 */
export default function CRTOCRFader({
	faderRef,
	tessModel,
	isDisabled,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: CRTOCRFaderProps) {
	return (
		<div className="crt-control-group">
			<span className="crt-control-label">OCR LEVEL</span>
			<div className="crt-fader-container">
				<div
					ref={faderRef}
					className="crt-fader-track"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
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
					<span className={`crt-fader-label-item ${tessModel === "best" ? "active" : ""}`}>
						Preciso
					</span>
					<span className={`crt-fader-label-item ${tessModel === "standard" ? "active" : ""}`}>
						Normal
					</span>
					<span className={`crt-fader-label-item ${tessModel === "fast" ? "active" : ""}`}>
						Rápido
					</span>
				</div>
			</div>
		</div>
	);
}
