import { useEffect, useRef } from "react";
import "./HolographicSonar3D.css";

interface WorkerStatusItem {
	index: number;
	status: string;
	job?: string;
}

interface HolographicSonar3DProps {
	workerStatuses: WorkerStatusItem[];
	maxWorkers: number;
	rotationX: number;
	rotationY: number;
}

// Flat 2D positions of the 5 workers relative to center (50, 50)
const workerCoords = [
	{ x: 34 - 50, y: 25 - 50 }, // W0
	{ x: 50 - 50, y: 18 - 50 }, // W1
	{ x: 66 - 50, y: 25 - 50 }, // W2
	{ x: 38 - 50, y: 72 - 50 }, // W3
	{ x: 62 - 50, y: 72 - 50 }, // W4
];

export default function HolographicSonar3D({
	workerStatuses,
	maxWorkers,
	rotationX,
	rotationY,
}: HolographicSonar3DProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const sweepAngleRef = useRef(0);
	const blipBrightnessesRef = useRef<number[]>([0, 0, 0, 0, 0]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrameId: number;
		canvas.width = 280;
		canvas.height = 280;

		// Handle high DPI display
		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			canvas.width = rect.width * (window.devicePixelRatio || 1);
			canvas.height = rect.height * (window.devicePixelRatio || 1);
		};
		window.addEventListener("resize", resize);
		resize();

		// 3D Projection Configuration
		const perspective = 160;
		const tiltAngle = rotationX * (Math.PI / 180); // Dynamic tilt X-axis (Pitch)
		const cosTilt = Math.cos(tiltAngle);
		const sinTilt = Math.sin(tiltAngle);

		const yawAngle = rotationY * (Math.PI / 180); // Dynamic rotation Y-axis (Yaw)
		const cosYaw = Math.cos(yawAngle);
		const sinYaw = Math.sin(yawAngle);

		// Project flat relative X, Y coordinates to 3D projected screen coordinates
		const project3D = (relX: number, relY: number, h: number = 0) => {
			const cx = canvas.width / 2;
			const cy = canvas.height / 2 + 15; // Shift down slightly for perspective spacing
			const radiusScale = Math.min(canvas.width, canvas.height) * 0.42;

			// Convert to 3D space: lies on horizontal XZ plane, Z is depth (pointing in)
			let x3d = (relX / 50) * radiusScale;
			const z3d = -(relY / 50) * radiusScale; // Negative relative Y goes deep in Z
			const y3d = h; // height/elevation

			// Rotate around Y-axis (Yaw)
			const xRotY = x3d * cosYaw - z3d * sinYaw;
			const zRotY = x3d * sinYaw + z3d * cosYaw;
			x3d = xRotY;

			// Rotate XZ plane around X-axis (tilt forward/Pitch)
			const yRot = y3d * cosTilt - zRotY * sinTilt;
			const zRot = y3d * sinTilt + zRotY * cosTilt;

			// Apply perspective projection
			const scale = perspective / (perspective + zRot);
			const px = cx + x3d * scale;
			const py = cy + yRot * scale;

			return { x: px, y: py, scale };
		};

		// Animation loop
		const render = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Dynamically read current theme primary color (cyan) and accent (magenta)
			const style = getComputedStyle(document.body);
			const primaryColor =
				style.getPropertyValue("--color-primary").trim() || "rgba(34, 211, 238, ";
			const accentColor = style.getPropertyValue("--color-accent").trim() || "rgba(236, 72, 153, ";

			// Extract RGB values for custom alpha rendering
			let primaryRGB = "34, 211, 238";
			let accentRGB = "236, 72, 153";

			if (primaryColor.includes("oklch")) {
				// Fallback to project standard colors if browser does not parse oklch easily inside Canvas
				const isLight = document.body.classList.contains("light-theme");
				primaryRGB = isLight ? "79, 70, 229" : "34, 211, 238"; // Indigo or Cyan
				accentRGB = isLight ? "219, 39, 119" : "236, 72, 153"; // Pink or Magenta
			} else {
				// Parse rgb/rgba
				const matchPri = primaryColor.match(/\d+,\s*\d+,\s*\d+/);
				if (matchPri) primaryRGB = matchPri[0];
				const matchAcc = accentColor.match(/\d+,\s*\d+,\s*\d+/);
				if (matchAcc) accentRGB = matchAcc[0];
			}

			// Update sweep angle (slow circular radar scan)
			sweepAngleRef.current = (sweepAngleRef.current + 0.012) % (Math.PI * 2);
			const sweepAngle = sweepAngleRef.current;

			// Draw 3D grid circles (concentric rings)
			const ringRadii = [15, 32, 50]; // radii in percentage terms
			ctx.lineWidth = 1;

			for (const radius of ringRadii) {
				ctx.beginPath();
				ctx.strokeStyle = `rgba(${primaryRGB}, 0.15)`;

				// Draw circles by joining projected segment points
				for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.1) {
					const rx = Math.cos(a) * radius;
					const ry = Math.sin(a) * radius;
					const pt = project3D(rx, ry);
					if (a === 0) ctx.moveTo(pt.x, pt.y);
					else ctx.lineTo(pt.x, pt.y);
				}
				ctx.stroke();
			}

			// Draw 3D radial grid lines (axises)
			const axisAngles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
			ctx.strokeStyle = `rgba(${primaryRGB}, 0.08)`;
			for (const angle of axisAngles) {
				ctx.beginPath();
				const pt1 = project3D(Math.cos(angle) * 50, Math.sin(angle) * 50);
				const pt2 = project3D(-Math.cos(angle) * 50, -Math.sin(angle) * 50);
				ctx.moveTo(pt1.x, pt1.y);
				ctx.lineTo(pt2.x, pt2.y);
				ctx.stroke();
			}

			// Draw Holographic vertical height markers / virtual dome lines
			ctx.strokeStyle = `rgba(${primaryRGB}, 0.04)`;
			for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
				ctx.beginPath();
				const bottomPt = project3D(Math.cos(a) * 50, Math.sin(a) * 50);
				const topPt = project3D(Math.cos(a) * 50, Math.sin(a) * 50, -18); // height of dome
				ctx.moveTo(bottomPt.x, bottomPt.y);
				ctx.lineTo(topPt.x, topPt.y);
				ctx.stroke();
			}

			// Draw radar sweep cone/beam in 3D projection
			// We draw a filled polygon representing the swept angle trail
			const trailSegments = 24;
			const trailSpan = 0.8; // arc size of trail in radians

			ctx.beginPath();
			const centerPt = project3D(0, 0);
			ctx.moveTo(centerPt.x, centerPt.y);

			for (let i = 0; i <= trailSegments; i++) {
				const stepAngle = sweepAngle - (i / trailSegments) * trailSpan;
				const pt = project3D(Math.cos(stepAngle) * 50, Math.sin(stepAngle) * 50);

				// Alpha fades as we get further back in time (trailing edge)
				const alpha = (1 - i / trailSegments) * 0.22;
				ctx.fillStyle = `rgba(${primaryRGB}, ${alpha})`;

				ctx.lineTo(pt.x, pt.y);
			}
			ctx.closePath();
			ctx.fill();

			// Sweep leading edge bright line
			ctx.beginPath();
			ctx.strokeStyle = `rgba(${primaryRGB}, 0.65)`;
			ctx.lineWidth = 1.5;
			const leadPt = project3D(Math.cos(sweepAngle) * 50, Math.sin(sweepAngle) * 50);
			ctx.moveTo(centerPt.x, centerPt.y);
			ctx.lineTo(leadPt.x, leadPt.y);
			ctx.stroke();

			// Draw active blips corresponding to workers
			workerStatuses.slice(0, maxWorkers).forEach((w, idx) => {
				const coords = workerCoords[idx];
				if (!coords) return;

				const isActive = w.status === "active";
				const isIdle = w.status === "idle";

				if (isActive) {
					// Check angle similarity with sweep to light up
					// In screen coordinates: Y is positive down. Math.atan2(y, x) is worker angle
					const workerAngle = Math.atan2(coords.y, coords.x);
					// Normalize both to [0, 2PI]
					const normSweep = (sweepAngle + Math.PI * 2) % (Math.PI * 2);
					const normWorker = (workerAngle + Math.PI * 2) % (Math.PI * 2);

					let angleDiff = Math.abs(normSweep - normWorker);
					if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

					// If sweep is scanning over the worker, set brightness to maximum
					if (angleDiff < 0.15) {
						blipBrightnessesRef.current[idx] = 1.0;
					}
				} else if (isIdle) {
					blipBrightnessesRef.current[idx] = 0.12; // faint glow for idle
				} else {
					blipBrightnessesRef.current[idx] = 0.0; // dark for offline
				}

				// Decay brightness over time
				if (isActive) {
					blipBrightnessesRef.current[idx] = Math.max(
						0.25,
						blipBrightnessesRef.current[idx] - 0.012,
					);
				}

				const brightness = blipBrightnessesRef.current[idx];
				if (brightness > 0) {
					const pt = project3D(coords.x, coords.y);

					// Draw connection height line (from ground to floating blip)
					const floatingHeight = -8 - brightness * 6;
					const ptAir = project3D(coords.x, coords.y, floatingHeight);

					ctx.beginPath();
					ctx.strokeStyle = `rgba(${primaryRGB}, ${brightness * 0.25})`;
					ctx.lineWidth = 1;
					ctx.moveTo(pt.x, pt.y);
					ctx.lineTo(ptAir.x, ptAir.y);
					ctx.stroke();

					// Ground footprint dot
					ctx.beginPath();
					ctx.arc(pt.x, pt.y, 2 * pt.scale, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(${primaryRGB}, ${brightness * 0.3})`;
					ctx.fill();

					// Floating holographic target blip
					const size = (3 + brightness * 3) * ptAir.scale;
					ctx.beginPath();
					ctx.arc(ptAir.x, ptAir.y, size, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(${accentRGB}, ${brightness * 0.85})`;
					ctx.fill();

					// Outer pulsing scan ring
					ctx.beginPath();
					ctx.arc(ptAir.x, ptAir.y, size * (1.5 + (1 - brightness) * 1.5), 0, Math.PI * 2);
					ctx.strokeStyle = `rgba(${accentRGB}, ${brightness * 0.3})`;
					ctx.lineWidth = 1;
					ctx.stroke();
				}
			});

			animationFrameId = requestAnimationFrame(render);
		};

		render();

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener("resize", resize);
		};
	}, [workerStatuses, maxWorkers, rotationX, rotationY]);

	return (
		<div className="holographic-sonar-3d-scene">
			<canvas ref={canvasRef} className="holographic-sonar-canvas" />
		</div>
	);
}
