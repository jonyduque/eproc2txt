import { useCallback, useEffect, useRef, useState } from "react";
import "./ProcessBinder3D.css";

interface ProcessBinder3DProps {
	zipName: string;
	documentCount: number;
	selectedPathsCount: number;
}

export default function ProcessBinder3D({
	zipName,
	documentCount,
	selectedPathsCount,
}: ProcessBinder3DProps) {
	const [rotation, setRotation] = useState({ x: -15, y: -25 });
	const [isOpen, setIsOpen] = useState(false);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);
	const isDraggingRef = useRef(false);

	// Automatically open the binder if the user has selected some documents
	useEffect(() => {
		if (selectedPathsCount > 0) {
			setIsOpen(true);
		} else {
			setIsOpen(false);
		}
	}, [selectedPathsCount]);

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDraggingRef.current || !dragStartRef.current) return;
		const deltaX = e.clientX - dragStartRef.current.x;
		const deltaY = e.clientY - dragStartRef.current.y;

		setRotation((prev) => ({
			x: Math.max(-60, Math.min(60, prev.x - deltaY * 0.5)),
			y: prev.y + deltaX * 0.5,
		}));

		dragStartRef.current = { x: e.clientX, y: e.clientY };
	}, []);

	const handleMouseUp = useCallback(() => {
		isDraggingRef.current = false;
		dragStartRef.current = null;
		window.removeEventListener("mousemove", handleMouseMove);
		window.removeEventListener("mouseup", handleMouseUp);
	}, [handleMouseMove]);

	const handleMouseDown = (e: React.MouseEvent) => {
		isDraggingRef.current = true;
		dragStartRef.current = { x: e.clientX, y: e.clientY };
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
	};

	// Clean up listeners on unmount
	useEffect(() => {
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [handleMouseMove, handleMouseUp]);

	// Calculate thickness based on document count (min 3 pages, max 12)
	const thickness = Math.max(3, Math.min(12, Math.round(documentCount * 1.5)));
	const pageElements = [];

	// Render page layers inside the book to simulate thickness and fanning
	for (let i = 0; i < thickness; i++) {
		let pageRotation = 0;
		if (isOpen) {
			// Fan out the pages when open (from -10 to -150 degrees)
			const progress = i / (thickness - 1 || 1);
			pageRotation = -15 - progress * 135;
		}

		pageElements.push(
			<div
				key={i}
				className="binder-page"
				style={{
					transform: `translateZ(${1.5 + i * 1.2}px) rotateY(${pageRotation}deg)`,
					transition: isDraggingRef.current
						? "none"
						: "transform 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)",
				}}
			>
				{i === thickness - 1 && isOpen && (
					<div className="binder-page-content">
						<div className="binder-content-lines">
							<div className="binder-line header-line" />
							<div className="binder-line" />
							<div className="binder-line" />
							<div className="binder-line short" />
							<div className="binder-line" />
							<div className="binder-line short" />
						</div>
					</div>
				)}
			</div>,
		);
	}

	const displayZipName = zipName.length > 20 ? `${zipName.substring(0, 18)}...` : zipName;

	return (
		<div className="binder-3d-scene">
			<div className="binder-help-text">Arraste para girar a pasta</div>
			<section
				className={`binder-3d-wrapper ${isOpen ? "open" : "closed"}`}
				onMouseDown={handleMouseDown}
				aria-label="Processo digital 3D"
				style={{
					transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
					transition: isDraggingRef.current ? "none" : "transform 0.1s ease",
				}}
			>
				{/* Spine */}
				<div className="binder-spine" />

				{/* Back Cover */}
				<div className="binder-cover back" />

				{/* Inside Page Sheets */}
				{pageElements}

				{/* Front Cover */}
				<div
					className="binder-cover front"
					style={{
						transform: isOpen ? "rotateY(-155deg)" : "rotateY(0deg)",
						transition: isDraggingRef.current
							? "none"
							: "transform 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)",
					}}
				>
					<div className="binder-cover-details">
						<div className="binder-emblem">
							<span className="material-icons emblem-icon">gavel</span>
						</div>
						<h3 className="binder-title">PROCESSO DIGITAL</h3>
						<p className="binder-subtitle">{displayZipName || "eproc_pacote.zip"}</p>
						<div className="binder-badge">{documentCount} DOCS</div>
					</div>
				</div>
			</section>
		</div>
	);
}
