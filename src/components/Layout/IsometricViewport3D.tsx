import { useEffect, useState } from "react";
import "./IsometricViewport3D.css";

interface WorkerStatusItem {
	index: number;
	status: string;
	job?: string;
}

interface IsometricViewport3DProps {
	status: string;
	maxWorkers: number;
	workerStatuses: WorkerStatusItem[];
	docStatuses: Record<string, { status: string; fileName: string }>;
	globalLoading: boolean;
	isDragHovered?: boolean;
}

export default function IsometricViewport3D({
	status,
	maxWorkers,
	workerStatuses,
	docStatuses,
	globalLoading: _globalLoading,
	isDragHovered = false,
}: IsometricViewport3DProps) {
	const activeWorkers = workerStatuses.filter((w) => w.status === "active").length;

	// Calculate dynamic stack size
	const queuedCount = Object.values(docStatuses).filter((d) => d.status === "queued").length;
	const stackHeight = Math.min(4, Math.max(1, Math.round(queuedCount / 3)));

	const getStageClass = () => {
		if (status === "completed") return "viewport-completed";
		if (status === "processing") return "viewport-processing";
		if (status === "configuring") return "viewport-configuring";
		return "viewport-idle";
	};

	const [styleMarkup, setStyleMarkup] = useState<string>("");
	const [laneElements, setLaneElements] = useState<React.ReactNode[]>([]);

	useEffect(() => {
		if (status !== "processing" || activeWorkers === 0) {
			setStyleMarkup("");
			setLaneElements([]);
			return;
		}

		const corePositions = [
			{ x: -48, y: -48 }, // W1
			{ x: 48, y: -48 }, // W2
			{ x: -48, y: 48 }, // W3
			{ x: 48, y: 48 }, // W4
			{ x: 0, y: 0 }, // W5
		];

		let rules = "";
		const elements: React.ReactNode[] = [];

		for (let index = 0; index < workerStatuses.length; index++) {
			const worker = workerStatuses[index];
			if (worker.status !== "active" || index >= 5) continue;
			const pos = corePositions[index];

			// Parse filename
			let jobFileName = "";
			if (worker.job) {
				const match = worker.job.match(/OCR\s+(.+?)\s+\(Pág/);
				jobFileName = match ? match[1] : worker.job.split(" ")[0] || "arquivo.pdf";
			}
			if (jobFileName.length > 18) {
				jobFileName = `${jobFileName.substring(0, 16)}...`;
			}

			elements.push(
				<div
					key={`page-${worker.index}`}
					className="page-particle"
					style={{
						animation: `flowPageLane-${index} 4s infinite cubic-bezier(0.4, 0, 0.2, 1)`,
						animationDelay: `${index * 0.8}s`,
					}}
				/>,
			);

			elements.push(
				<div
					key={`text-${worker.index}`}
					className="text-particle"
					style={{
						animation: `flowTextLane-${index} 4s infinite linear`,
						animationDelay: `${index * 0.8 + 1.8}s`,
					}}
				>
					{jobFileName}
				</div>,
			);

			rules += `
            @keyframes flowPageLane-${index} {
              0% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(-190px, 0, 20px) scale(0.95); opacity: 0; }
              10% { opacity: 1; }
              40% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(${pos.x}px, ${pos.y}px, 20px) scale(0.7); opacity: 1; background: #ffffff; border-color: var(--color-primary); }
              45%, 55% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(${pos.x}px, ${pos.y}px, 5px) scale(0.6); opacity: 0.8; background: var(--color-primary-glow); border-color: var(--color-primary); }
              60% { opacity: 0; transform: rotateX(52deg) rotateZ(-35deg) translate3d(${pos.x}px, ${pos.y}px, 5px) scale(0.45); }
              100% { opacity: 0; }
            }
            @keyframes flowTextLane-${index} {
              0% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(${pos.x}px, ${pos.y}px, 10px); opacity: 0; }
              10% { opacity: 1; color: var(--color-primary); }
              80% { opacity: 1; color: var(--color-success); }
              100% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(180px, -20px, 30px); opacity: 0; }
            }
          `;
		}

		setStyleMarkup(rules);
		setLaneElements(elements);
	}, [status, activeWorkers, workerStatuses]);

	const coreIndexes = [0, 1, 2, 3, 4];
	const coreStyles = [
		{ top: "15px", left: "15px" },
		{ top: "15px", left: "111px" },
		{ top: "111px", left: "15px" },
		{ top: "111px", left: "111px" },
		{ top: "63px", left: "63px" },
	];

	return (
		<div className={`panel isometric-viewport ${getStageClass()}`}>
			<div className="iso-grid" />
			{styleMarkup && <style>{styleMarkup}</style>}

			<div className="scene-container">
				<div id="dynamic-lanes-container">{laneElements}</div>

				{/* Pile */}
				<div className="object-3d pile-container">
					<div
						className="pile-box"
						style={{ borderColor: isDragHovered ? "var(--color-accent)" : "" }}
					>
						{Array.from({ length: stackHeight }).map((_, i) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: stackHeight is a static count for pile rendering layers
								key={i}
								className="doc-sheet"
								style={{ transform: `translate3d(${i * 2}px, ${-i * 2}px, ${i * 4}px)` }}
							>
								<div className="doc-line md" />
								<div className="doc-line" />
								<div className="doc-line sh" />
							</div>
						))}
					</div>
				</div>

				{/* Processor */}
				<div className="object-3d processor-container">
					<div className="proc-box">
						{coreIndexes.map((i) => {
							const isActive = status === "processing" && i < maxWorkers;
							const isWorking = isActive && workerStatuses[i]?.status === "active";
							return (
								<div
									key={i}
									className={`mini-core ${isWorking ? "active" : ""}`}
									style={coreStyles[i]}
								>
									{`W${i + 1}`}
									<div className="core-laser" />
								</div>
							);
						})}
					</div>
				</div>

				{/* Output File */}
				<div className="object-3d output-file-container">
					<div
						className={`output-platform ${status === "completed" || status === "processing" ? "active" : ""}`}
					>
						<div className="isometric-text-file">
							<div className="file-line title" />
							<div className="file-line md" />
							<div className="file-line sh" />
							<div className="file-line md" />
							<div className="file-line" />
							<div className="file-type-badge">{status === "completed" ? "XML" : "TXT"}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
