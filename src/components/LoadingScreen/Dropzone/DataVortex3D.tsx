import { useEffect, useRef } from "react";

interface DataVortex3DProps {
	isHovered: boolean;
	isLoading: boolean;
}

interface Particle {
	x: number;
	y: number;
	z: number;
	ox: number; // original relative x
	oy: number; // original relative y
	oz: number; // original relative z
	angle: number;
	radius: number;
	speed: number;
	color: string;
	size: number;
}

export default function DataVortex3D({ isHovered, isLoading }: DataVortex3DProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const mouseRef = useRef({ x: 0, y: 0, rx: 0, ry: 0 }); // rx, ry are target reactive values
	const dragOverActiveRef = useRef(isHovered);
	const loadingActiveRef = useRef(isLoading);

	// Sync props to refs to avoid recreating loop
	useEffect(() => {
		dragOverActiveRef.current = isHovered;
		loadingActiveRef.current = isLoading;
	}, [isHovered, isLoading]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrameId: number;
		canvas.width = 240;
		canvas.height = 240;
		const perspective = 180;

		// Handle resize / high DPI if needed (keeps it sharp)
		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			canvas.width = rect.width * (window.devicePixelRatio || 1);
			canvas.height = rect.height * (window.devicePixelRatio || 1);
		};
		window.addEventListener("resize", resize);
		resize();

		// Track mouse movement relative to canvas
		const handleMouseMove = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left - rect.width / 2;
			const y = e.clientY - rect.top - rect.height / 2;
			// Normalize
			mouseRef.current.rx = x * (window.devicePixelRatio || 1);
			mouseRef.current.ry = y * (window.devicePixelRatio || 1);
		};
		const handleMouseLeave = () => {
			mouseRef.current.rx = 0;
			mouseRef.current.ry = 0;
		};
		window.addEventListener("mousemove", handleMouseMove);
		canvas.addEventListener("mouseleave", handleMouseLeave);

		// Initialize 3D particles
		const particleCount = 140;
		const particles: Particle[] = [];

		const colorPalette = [
			"rgba(34, 211, 238, ", // Cyan
			"rgba(236, 72, 153, ", // Magenta
			"rgba(99, 102, 241, ", // Indigo
		];

		for (let i = 0; i < particleCount; i++) {
			const angle = Math.random() * Math.PI * 2;
			const radius = 30 + Math.random() * 85;
			const z = -60 + Math.random() * 120;
			const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];

			particles.push({
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
				z: z,
				ox: Math.cos(angle) * radius,
				oy: Math.sin(angle) * radius,
				oz: z,
				angle: angle,
				radius: radius,
				speed: 0.015 + Math.random() * 0.025,
				color: color,
				size: 1 + Math.random() * 2,
			});
		}

		// Animation Loop
		const render = () => {
			const cw = canvas.width;
			const ch = canvas.height;
			const cx = cw / 2;
			const cy = ch / 2;

			ctx.clearRect(0, 0, cw, ch);

			// Interpolate mouse coordinates smoothly
			mouseRef.current.x += (mouseRef.current.rx - mouseRef.current.x) * 0.1;
			mouseRef.current.y += (mouseRef.current.ry - mouseRef.current.y) * 0.1;

			// Sort particles by Z depth (painter's algorithm for proper 3D overlay)
			particles.sort((a, b) => b.z - a.z);

			for (const p of particles) {
				// Rotate around Y axis (3D rotation)
				const rotationSpeed = loadingActiveRef.current
					? p.speed * 3.5
					: dragOverActiveRef.current
						? p.speed * 2.0
						: p.speed;
				p.angle += rotationSpeed;

				// Target radius based on current state
				let targetRadius = p.radius;
				let targetZ = p.oz;

				if (loadingActiveRef.current) {
					// Ingest funnel effect (spiraling into center)
					targetRadius = 12 + Math.sin(p.angle * 2) * 5;
					targetZ = p.z - 4;
					if (targetZ < -100) targetZ = 100; // loop Z depth
				} else if (dragOverActiveRef.current) {
					// Compact sphere effect
					targetRadius = 45 + Math.sin(p.angle * 4) * 8;
				}

				// Smooth interpolation to target state
				const lerpFactor = 0.06;
				const currentRadius = p.radius + (targetRadius - p.radius) * lerpFactor;
				p.radius = currentRadius;
				p.z += (targetZ - p.z) * lerpFactor;

				p.x = Math.cos(p.angle) * p.radius;
				p.y = Math.sin(p.angle) * p.radius;

				// Gravity pull from cursor
				if (isHovered && !loadingActiveRef.current) {
					const dx = mouseRef.current.x - p.x;
					const dy = mouseRef.current.y - p.y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist < 100) {
						const force = ((100 - dist) / 100) * 0.15;
						p.x += dx * force;
						p.y += dy * force;
					}
				}

				// Projection logic (3D to 2D)
				const scale = perspective / (perspective + p.z);
				const px = cx + p.x * scale;
				const py = cy + p.y * scale;

				// Fade opacity out as it goes deep into the background (Z depth)
				const zAlpha = (p.z + 100) / 200; // 0 to 1 range
				const opacity = Math.max(0.1, Math.min(0.85, zAlpha * scale));

				ctx.beginPath();
				ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
				ctx.fillStyle = `${p.color}${opacity.toFixed(2)})`;
				ctx.fill();

				// Light tail/bloom effect for active center
				if (scale > 1.2 && !loadingActiveRef.current) {
					ctx.beginPath();
					ctx.arc(px, py, p.size * scale * 2.5, 0, Math.PI * 2);
					ctx.fillStyle = `${p.color}${(opacity * 0.22).toFixed(2)})`;
					ctx.fill();
				}
			}

			// Draw a faint digital scanning grid behind/around the central icon
			ctx.strokeStyle = "rgba(34, 211, 238, 0.04)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(cx, cy, 60, 0, Math.PI * 2);
			ctx.stroke();

			animationFrameId = requestAnimationFrame(render);
		};

		render();

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener("resize", resize);
			window.removeEventListener("mousemove", handleMouseMove);
			canvas.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [isHovered]);

	return (
		<canvas
			ref={canvasRef}
			style={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				pointerEvents: "none",
				zIndex: 2,
			}}
		/>
	);
}
