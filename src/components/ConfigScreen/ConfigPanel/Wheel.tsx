// biome-ignore-all lint/a11y/noStaticElementInteractions: custom dial component handled by adjacent accessible buttons
// biome-ignore-all lint/a11y/useKeyWithClickEvents: custom dial component handled by adjacent accessible buttons
import type React from "react";
import { useEffect, useRef } from "react";
import "./Wheel.css";

interface WheelProps {
	workers: number;
	maxAllowedWorkers: number;
	setWorkers:
		| React.Dispatch<React.SetStateAction<number>>
		| ((val: number | ((prev: number) => number)) => void);
}

export default function Wheel({ workers, setWorkers, maxAllowedWorkers }: WheelProps) {
	const isDraggingRef = useRef(false);
	const dragStartRef = useRef<number | null>(null);
	const initialValueRef = useRef<number>(workers);

	// Refs to hold the latest prop values to prevent stale closures in the window listener
	const workersRef = useRef(workers);
	const maxAllowedWorkersRef = useRef(maxAllowedWorkers);
	const setWorkersRef = useRef(setWorkers);

	// Keep refs updated on every render
	useEffect(() => {
		workersRef.current = workers;
		maxAllowedWorkersRef.current = maxAllowedWorkers;
		setWorkersRef.current = setWorkers;
	});

	// Register window listeners once on mount
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDraggingRef.current || dragStartRef.current === null) return;
			const deltaX = dragStartRef.current - e.clientX;
			const steps = Math.round(deltaX / 30); // 30px per worker step
			const newValue = Math.max(
				1,
				Math.min(maxAllowedWorkersRef.current, initialValueRef.current + steps),
			);
			setWorkersRef.current(newValue);
		};

		const handleMouseUp = () => {
			isDraggingRef.current = false;
			dragStartRef.current = null;
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	// Mouse Drag triggers
	const handleMouseDown = (e: React.MouseEvent) => {
		isDraggingRef.current = true;
		dragStartRef.current = e.clientX;
		initialValueRef.current = workersRef.current;
	};

	// Touch swipe to scroll dial horizontally
	const handleTouchStart = (e: React.TouchEvent) => {
		if (e.touches.length === 1) {
			isDraggingRef.current = true;
			dragStartRef.current = e.touches[0].clientX;
			initialValueRef.current = workersRef.current;
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (!isDraggingRef.current || dragStartRef.current === null || e.touches.length !== 1) return;
		const deltaX = dragStartRef.current - e.touches[0].clientX;
		const steps = Math.round(deltaX / 30);
		const newValue = Math.max(
			1,
			Math.min(maxAllowedWorkersRef.current, initialValueRef.current + steps),
		);
		setWorkersRef.current(newValue);
	};

	const handleTouchEnd = () => {
		isDraggingRef.current = false;
		dragStartRef.current = null;
	};

	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		if (e.deltaY < 0) {
			setWorkersRef.current((prev) => Math.min(maxAllowedWorkersRef.current, prev + 1));
		} else {
			setWorkersRef.current((prev) => Math.max(1, prev - 1));
		}
	};

	const renderNumbers = () => {
		const items: number[] = [];
		for (let i = workers - 2; i <= workers + 2; i++) {
			if (i >= 1 && i <= maxAllowedWorkers) {
				items.push(i);
			}
		}

		return items.map((val) => {
			const offset = val - workers;
			const angle = offset * 28; // Smaller angle for 3D visibility of outer numbers
			const scale = 1 - Math.abs(offset) * 0.15; // 1.0, 0.85, 0.70
			const opacity = 1 - Math.abs(offset) * 0.32; // Higher opacity (1.0, 0.68, 0.36) to show outer numbers clearly
			const isActive = offset === 0;
			return (
				<div
					key={val}
					onClick={() => setWorkers(val)}
					className={`wheel-item ${isActive ? "active" : ""}`}
					style={{
						transform: `rotateY(${angle}deg) translateZ(75px) scale(${scale})`,
						opacity: opacity > 0 ? opacity : 0,
						pointerEvents: Math.abs(offset) > 2 ? "none" : "auto",
					}}
				>
					{val}
				</div>
			);
		});
	};

	return (
		<div className="workers-slider-wrapper">
			<button
				type="button"
				className="btn btn-secondary btn-xs btn-workers-adjust"
				disabled={workers <= 1}
				onClick={() => setWorkers((prev) => Math.max(1, prev - 1))}
			>
				<span className="material-icons" style={{ fontSize: "14px" }}>
					remove
				</span>
			</button>

			<div className="workers-speed-dial-container">
				<div className="wheel-window">
					<div className="wheel-indicator" />
					<div
						className="wheel-drum"
						style={{ "--wheel-offset": workers } as React.CSSProperties}
						onMouseDown={handleMouseDown}
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
						onWheel={handleWheel}
					>
						{renderNumbers()}
					</div>
				</div>
			</div>

			<button
				type="button"
				className="btn btn-secondary btn-xs btn-workers-adjust"
				disabled={workers >= maxAllowedWorkers}
				onClick={() => setWorkers((prev) => Math.min(maxAllowedWorkers, prev + 1))}
			>
				<span className="material-icons" style={{ fontSize: "14px" }}>
					add
				</span>
			</button>
		</div>
	);
}
