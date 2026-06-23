interface CRTControlsLidProps {
	isOpen: boolean;
}

/**
 * CRTControlsLid - 3D lid that covers controls when not in configuring state.
 */
export default function CRTControlsLid({ isOpen }: CRTControlsLidProps) {
	return (
		<div className={`crt-controls-lid${isOpen ? " open" : ""}`}>
			<div className="crt-lid-face">
				<div className="crt-lid-ribs" />
				<span className="crt-lid-label">CONTROLES</span>
				<div className="crt-lid-ribs" />
			</div>
		</div>
	);
}
