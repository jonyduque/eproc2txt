import type React from "react";
import { useRef } from "react";

interface FaderControlOptions {
	isDisabled: boolean;
	setTessModel: (model: string) => void;
}

interface FaderControlReturn {
	faderRef: React.RefObject<HTMLDivElement>;
	onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export function useFaderControl({
	isDisabled,
	setTessModel,
}: FaderControlOptions): FaderControlReturn {
	const faderRef = useRef<HTMLDivElement>(null);
	const faderActiveRef = useRef<boolean>(false);

	const updateFaderFromY = (clientY: number) => {
		const track = faderRef.current;
		if (!track) return;
		const rect = track.getBoundingClientRect();
		const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
		if (relY < 0.33) setTessModel("best");
		else if (relY < 0.67) setTessModel("standard");
		else setTessModel("fast");
	};

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (isDisabled) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		faderActiveRef.current = true;
		updateFaderFromY(e.clientY);
	};

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!faderActiveRef.current || isDisabled) return;
		updateFaderFromY(e.clientY);
	};

	const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		faderActiveRef.current = false;
		e.currentTarget.releasePointerCapture(e.pointerId);
	};

	return {
		faderRef,
		onPointerDown,
		onPointerMove,
		onPointerUp,
	};
}
