interface CRTPowerSectionProps {
	displayLabel: string;
	ledColor: string;
	isDisabled: boolean;
	selectedPathsSize: number;
	onStart: () => void;
}

/**
 * CRTPowerSection - Status LCD, power LED, and start button.
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
				<div className={`crt-power-led led-${ledColor}`} />
				<button
					type="button"
					className="crt-power-btn"
					disabled={isDisabled || selectedPathsSize === 0}
					onClick={onStart}
					aria-label="Iniciar Processamento"
					title="Iniciar Processamento"
				/>
			</div>
		</div>
	);
}
