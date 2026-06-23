import type React from "react";
import { useEffect, useRef } from "react";

interface DialControlOptions {
	isDisabled: boolean;
	maxWorkers: number;
	maxAllowedWorkers: number;
	setWorkers: (val: number | ((prev: number) => number)) => void;
}

interface DialControlReturn {
	dialRef: React.RefObject<HTMLDivElement>;
	rotateValue: number;
	onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
}

export function useDialControl({
	isDisabled,
	maxWorkers,
	maxAllowedWorkers,
	setWorkers,
}: DialControlOptions): DialControlReturn {
	const dialRef = useRef<HTMLDivElement>(null);

	// Drag-to-rotate state refs (no re-render needed for drag tracking)
	const dragStateRef = useRef<{
		active: boolean;
		startAngle: number;
		startWorkers: number;
		lastAngle: number;
		totalDelta: number;
	} | null>(null);

	// Calculate rotation angle for UHF knob (from -135deg to +135deg over 1 to maxAllowedWorkers)
	const workersVal = maxWorkers || 1;
	const maxAllowedVal = maxAllowedWorkers || 1;
	const rotateValue = maxAllowedVal > 1 ? ((workersVal - 1) / (maxAllowedVal - 1)) * 270 - 135 : 0;

	// Compute angle of pointer relative to dial center
	const getAngleToDial = (clientX: number, clientY: number): number => {
		const dial = dialRef.current;
		if (!dial) return 0;
		const rect = dial.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
	};

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (isDisabled) return;
		e.preventDefault();
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		const angle = getAngleToDial(e.clientX, e.clientY);
		dragStateRef.current = {
			active: true,
			startAngle: angle,
			startWorkers: maxWorkers,
			lastAngle: angle,
			totalDelta: 0,
		};
	};

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const ds = dragStateRef.current;
		if (!ds?.active || isDisabled) return;
		const angle = getAngleToDial(e.clientX, e.clientY);

		// Compute shortest angular delta (handles 180/-180 wraparound)
		let delta = angle - ds.lastAngle;
		if (delta > 180) delta -= 360;
		if (delta < -180) delta += 360;

		ds.totalDelta += delta;
		ds.lastAngle = angle;

		// 270 degrees of arc spans all workers. Each worker step = 270 / (max-1) degrees
		const degreesPerWorker = maxAllowedVal > 1 ? 270 / (maxAllowedVal - 1) : 270;
		const rawSteps = ds.totalDelta / degreesPerWorker;
		const newWorkers = Math.round(ds.startWorkers + rawSteps);
		setWorkers(Math.max(1, Math.min(maxAllowedWorkers, newWorkers)));
	};

	const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		if (dragStateRef.current) {
			// If barely moved (< 5°), treat as click → advance by 1
			if (Math.abs(dragStateRef.current.totalDelta) < 5 && !isDisabled) {
				setWorkers((prev) => (prev >= maxAllowedWorkers ? 1 : prev + 1));
			}
			dragStateRef.current = null;
		}
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
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
	const onKeyDown = (e: React.KeyboardEvent) => {
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

	return {
		dialRef,
		rotateValue,
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onKeyDown,
	};
}
