import type React from "react";

interface CRTUHFDialProps {
	rotateValue: number;
	isDisabled: boolean;
	maxWorkers: number;
	maxAllowedWorkers: number;
	dialRef: React.RefObject<HTMLDivElement | null>;
	onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * CRTUHFDial - Drag-to-rotate dial for selecting parallel worker count.
 */
export default function CRTUHFDial({
	rotateValue,
	isDisabled,
	maxWorkers,
	maxAllowedWorkers,
	dialRef,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	onKeyDown,
}: CRTUHFDialProps) {
	return (
		<div className="crt-control-group">
			<span className="crt-control-label">WORKERS (UHF)</span>
			<div
				ref={dialRef}
				className="crt-uhf-dial"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				onKeyDown={onKeyDown}
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
	);
}
