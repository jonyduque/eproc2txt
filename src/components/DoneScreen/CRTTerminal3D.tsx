import { useEffect, useRef, useState } from "react";
import "./CRTTerminal3D.css";

interface CRTTerminal3DProps {
	xmlText: string;
}

export default function CRTTerminal3D({ xmlText }: CRTTerminal3DProps) {
	const [rotation, setRotation] = useState({ x: 4, y: -4 });
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();

			// Calculate mouse position relative to terminal container center
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const dx = e.clientX - centerX;
			const dy = e.clientY - centerY;

			// Map to rotation angles (limit to -8 to 8 degrees for subtle effect)
			const rotateY = (dx / window.innerWidth) * 16;
			const rotateX = -(dy / window.innerHeight) * 16;

			setRotation({ x: rotateX + 3, y: rotateY - 3 });
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	return (
		<div className="crt-terminal-container" ref={containerRef}>
			<div
				className="crt-monitor-casing"
				style={{
					transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
				}}
			>
				{/* 3D Sides of the Monitor Casing */}
				<div className="crt-side top" />
				<div className="crt-side bottom" />
				<div className="crt-side left" />
				<div className="crt-side right" />

				{/* CRT Bezel / Frame */}
				<div className="crt-bezel">
					{/* Inner screen area */}
					<div className="crt-screen-wrapper">
						<div className="crt-screen-glass">
							<div className="crt-screen-content">
								<div className="crt-glow-overlay" />
								<div className="crt-scanlines" />
								<div className="crt-flicker" />

								{/* Retro Console Header */}
								<div className="crt-terminal-header">
									<div className="crt-dots">
										<span className="crt-dot dot-red" />
										<span className="crt-dot dot-yellow" />
										<span className="crt-dot dot-green" />
									</div>
									<span className="crt-terminal-title">E-PROC CONTEXT CONSOLE v1.0.2</span>
									<span className="crt-terminal-status">ONLINE</span>
								</div>

								{/* Scrollable XML Content */}
								<pre className="crt-xml-preview">
									<code>{xmlText}</code>
								</pre>
							</div>
						</div>
					</div>

					{/* Controls bezel area (brand, dials, power) */}
					<div className="crt-controls">
						<div className="crt-brand">
							<span>EPROC-CRT</span>
							<span className="crt-brand-model">84-T</span>
						</div>
						<div className="crt-dials">
							<div className="crt-dial-group">
								<span className="crt-dial-label">BRIGHT</span>
								<div className="crt-dial" style={{ transform: "rotate(45deg)" }} />
							</div>
							<div className="crt-dial-group">
								<span className="crt-dial-label">CONTRAST</span>
								<div className="crt-dial" style={{ transform: "rotate(110deg)" }} />
							</div>
							<div className="crt-power-group">
								<div className="crt-power-led active" />
								<div className="crt-power-switch active" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
