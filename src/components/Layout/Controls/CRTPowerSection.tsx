interface CRTPowerSectionProps {
	displayLabel: string;
	ledColor: string;
	isDisabled: boolean;
	selectedPathsSize: number;
	onStart: () => void;
}

/**
 * CRTPowerSection - Status LCD and the backlit start key, whose colour shows the status.
 */
export default function CRTPowerSection({
	displayLabel,
	ledColor,
	isDisabled,
	selectedPathsSize,
	onStart,
}: CRTPowerSectionProps) {
	return (
		<div className="crt-power-section">
			<span className="status-badge-label">{displayLabel}</span>
			<div className="crt-power-row">
				{/* The key's backlight is the status light (it replaced the LED) */}
				<button
					type="button"
					className={`crt-power-btn tone-${ledColor}`}
					disabled={isDisabled || selectedPathsSize === 0}
					onClick={onStart}
					aria-label="Iniciar Processamento"
					title="Iniciar Processamento"
				>
					<svg className="crt-play-icon" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M6 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 6 3.5Z"
							fill="currentColor"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
}
