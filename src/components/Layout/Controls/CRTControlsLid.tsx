import { useEffect, useRef, useState } from "react";

interface CRTControlsLidProps {
	isOpen: boolean;
}

/**
 * CRTControlsLid - 3D lid that covers controls when not in configuring state.
 * Swings out towards the viewer on a right-edge hinge. The keyframe animation is only
 * attached after the first change, so the lid does not animate on mount.
 */
export default function CRTControlsLid({ isOpen }: CRTControlsLidProps) {
	const initialOpen = useRef(isOpen);
	const [hasToggled, setHasToggled] = useState(false);

	useEffect(() => {
		if (isOpen !== initialOpen.current) setHasToggled(true);
	}, [isOpen]);

	const className = [
		"crt-controls-lid",
		isOpen ? "open" : "",
		hasToggled ? (isOpen ? "opening" : "closing") : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={className}>
			<div className="crt-lid-face">
				<div className="crt-lid-ribs" />
				<span className="crt-lid-label">CONTROLES</span>
				<div className="crt-lid-ribs" />
				<div className="crt-lid-grip" />
			</div>
			<div className="crt-lid-edge" />
			<div className="crt-lid-back" />
		</div>
	);
}
