import { memo, useEffect, useState } from "react";
import FileIcon from "../FileIcon";
import "./ProcessingScreen.css";
import { formatDuration } from "../../utils/format";

interface DocStatusItem {
	status: string;
	startedAt?: number;
	finishedAt?: number;
	fileName: string;
	extension: string;
	pageCount?: number;
	completedPages: number;
}

interface WorkerStatusItem {
	index: number;
	status: string;
	job?: string;
}

interface TreeDocItem {
	originalPath: string;
	fileName: string;
	eventNumber: number;
	docType: string;
	docNumber: number;
	extension: string;
	size: number;
	isValidExtension?: boolean;
	isValidNaming?: boolean;
	errorDescription?: string;
}

interface TreeEventItem {
	eventNumber: number;
	documents: TreeDocItem[];
}

interface ProcessingScreenProps {
	isPaused: boolean;
	timerStartTime: number;
	timerAccumulatedMs: number;
	elapsedMs: number;
	pdfPages: number;
	ocrPages: number;
	docStatuses: Record<string, DocStatusItem>;
	workerStatuses: WorkerStatusItem[];
	maxWorkers: number;
	onResume: () => void;
	onPause: () => void;
	onCancel: () => void;
	tree?: TreeEventItem[];
}

const workerPositions = [
	{ x: 34, y: 25 },
	{ x: 50, y: 18 },
	{ x: 66, y: 25 },
	{ x: 38, y: 72 },
	{ x: 62, y: 72 },
];

interface RetroComputerProps {
	index: number;
	status: string;
	job?: string;
	tree?: TreeEventItem[];
}

const RetroComputer = memo(function RetroComputer({
	index,
	status,
	job,
	tree,
}: RetroComputerProps) {
	const isProcessing = status === "active";
	const isOffline = status === "offline";
	const isIdle = status === "idle";

	// Odd = old CRT style, Even = new LED style
	const isOld = index % 2 !== 0;
	const typeClass = isOld ? "term-old" : "term-new";
	const stateClass = isOffline ? "offline" : isIdle ? "idle" : "active";

	// Parse file name from jobText
	let fileName = "";
	if (job) {
		const match = job.match(/OCR\s+(.+?)\s+\(Pág/);
		if (match) {
			fileName = match[1];
		} else {
			fileName = job.split(" ")[0] || "";
		}
	}

	// Look up event number for file name
	let evtLabel = "—";
	if (isProcessing && fileName && tree) {
		for (const event of tree) {
			const found = event.documents?.find((d) => d.fileName === fileName);
			if (found) {
				evtLabel = found.eventNumber === -1 ? "ERR" : String(found.eventNumber).padStart(2, "0");
				break;
			}
		}
	}

	return (
		<div className={`terminal-container ${typeClass} ${stateClass}`} title={job || status}>
			<div className="term-case">
				<div className="term-screen-bezel">
					<div className="term-screen retro-screen-display">
						<div className="term-screen-content">
							<div className="term-w-id">{`W#${String(index).padStart(2, "0")}`}</div>
							{isProcessing ? (
								<>
									<div className="term-w-evt">{`EVT ${evtLabel}`}</div>
									<div className="term-w-action blink-fast">ATV</div>
								</>
							) : isIdle ? (
								<>
									<div className="term-w-evt">EVT —</div>
									<div className="term-w-action">AGD</div>
								</>
							) : (
								<>
									<div className="term-w-evt">OFFLINE</div>
									<div className="term-w-action">DES</div>
								</>
							)}
							<div className="term-w-grid-effect" />
						</div>
					</div>
				</div>
				<div className="term-badge" />
				<div className="term-dial-1" />
				<div className="term-dial-2" />
			</div>
			<div className="term-base" />
			<div className="term-feet" />
		</div>
	);
});

interface ChronometerProps {
	isPaused: boolean;
	startTime: number;
	accumulatedMs: number;
}

function Chronometer({ isPaused, startTime, accumulatedMs }: ChronometerProps) {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		if (isPaused) {
			setElapsed(accumulatedMs);
			return;
		}

		// Initial sync
		setElapsed(Date.now() - startTime + accumulatedMs);

		const interval = setInterval(() => {
			setElapsed(Date.now() - startTime + accumulatedMs);
		}, 50);

		return () => clearInterval(interval);
	}, [isPaused, startTime, accumulatedMs]);

	return <>{formatDuration(elapsed)}</>;
}

interface DocRowProps {
	doc: DocStatusItem;
}

const DocRow = memo(function DocRow({ doc }: DocRowProps) {
	const isProcessingDoc = doc.status === "processing";
	const isDoneDoc = doc.status === "done";
	const isQueuedDoc = doc.status === "queued";

	// Calculate elapsed time per document
	const elapsedDocMs = doc.startedAt ? (doc.finishedAt || Date.now()) - doc.startedAt : 0;
	const elapsedDocText = elapsedDocMs > 0 ? formatDuration(elapsedDocMs) : "—";

	return (
		<li className="docs-list-item">
			<FileIcon status={doc.status} ext={doc.extension} />

			<div className="docs-list-item-info">
				<div className="docs-list-item-top">
					<p className="docs-list-item-name">{doc.fileName}</p>
					<span className="docs-list-item-elapsed">{isQueuedDoc ? "—" : elapsedDocText}</span>
				</div>

				<div className="docs-list-item-bottom">
					<span
						className={`docs-list-item-status ${
							isQueuedDoc ? "queued" : isProcessingDoc ? "processing" : "done"
						}`}
					>
						{isQueuedDoc ? "aguardando" : isProcessingDoc ? "processando" : "concluído"}
					</span>

					<span className="docs-list-item-details">
						· ~{isDoneDoc ? doc.pageCount : doc.pageCount || "?"} págs
					</span>
				</div>
			</div>

			{/* Active moving scanline overlay */}
			{isProcessingDoc && (
				<div className="item-scanline-container">
					<div className="scan-line" />
				</div>
			)}
		</li>
	);
});

export default function ProcessingScreen({
	isPaused,
	timerStartTime,
	timerAccumulatedMs,
	elapsedMs,
	pdfPages,
	ocrPages,
	docStatuses,
	workerStatuses,
	maxWorkers,
	onResume,
	onPause,
	onCancel,
	tree,
}: ProcessingScreenProps) {
	// Calculate derived values internally
	const totalPages = Object.values(docStatuses).reduce((s, d) => s + (d.pageCount || 0), 0) || 1;
	const completedPages = pdfPages + ocrPages;
	const elapsedSec = (elapsedMs || 0) / 1000 || 0.1;
	const pagesPerSec = completedPages / elapsedSec;

	const completedDocs = Object.values(docStatuses).filter((d) => d.status === "done").length;
	const totalDocsCount = Object.keys(docStatuses).length || 1;

	const activeWorkersCount = workerStatuses.filter((w) => w.status === "active").length;
	const queuedDocsCount = Object.values(docStatuses).filter((d) => d.status === "queued").length;
	const progressPercentage = Math.min(100, Math.round((completedPages / totalPages) * 100));

	const totalEventsCount = tree ? tree.filter((e) => e.eventNumber !== -1).length : 0;
	const completedEventsCount = tree
		? tree.filter((event) => {
				if (event.eventNumber === -1) return false;
				return event.documents.every((doc) => {
					const statusObj = docStatuses[doc.fileName];
					return statusObj && statusObj.status === "done";
				});
			}).length
		: 0;
	const remainingEvents = Math.max(0, totalEventsCount - completedEventsCount);

	const totalPendingDocs = queuedDocsCount + activeWorkersCount;
	const totalCompletedDocs = completedDocs;

	// Calculate pile heights (cap at 12 layers max for render performance)
	const eventsPileHeight = Math.min(8, remainingEvents);
	const pendingDocsPileHeight = Math.min(12, totalPendingDocs);
	const completedDocsPileHeight = Math.min(12, totalCompletedDocs);

	const renderStack = (count: number, label: string, colorClass: string) => {
		const sheets = [];
		for (let i = 0; i < count; i++) {
			sheets.push(
				<div
					key={i}
					className={`stack-sheet ${colorClass}`}
					style={{
						transform: `rotateX(60deg) rotateZ(-30deg) translateZ(${i * 3}px)`,
						zIndex: i,
					}}
				/>,
			);
		}
		return (
			<div className="doc-stack-wrapper">
				<div className="doc-stack-view">
					{sheets.length === 0 ? (
						<div
							className="stack-sheet empty"
							style={{ transform: "rotateX(60deg) rotateZ(-30deg)" }}
						/>
					) : (
						sheets
					)}
				</div>
				<span className="doc-stack-label">{label}</span>
				<span className="doc-stack-count">{count}</span>
			</div>
		);
	};

	// Calculated textual file size in MB
	const fileSizeMb = (completedPages * 0.045).toFixed(2);

	return (
		<div className="animate-fade-up">
			{/* Top stats glow panel */}
			<div className="panel-glow processing-header-stats">
				<div className="processing-stats-grid">
					<div>
						<p className="processing-stat-label">cronômetro</p>
						<p className="ticker processing-stat-value text-glow">
							<Chronometer
								isPaused={isPaused}
								startTime={timerStartTime}
								accumulatedMs={timerAccumulatedMs}
							/>
						</p>
					</div>
					<div>
						<p className="processing-stat-label">concluídos</p>
						<p className="ticker processing-stat-value">
							{completedDocs} / {totalDocsCount}
						</p>
					</div>
					<div>
						<p className="processing-stat-label">em processo</p>
						<p className="ticker processing-stat-value">{activeWorkersCount}</p>
					</div>
				</div>

				{/* Shimmer progress bar */}
				<div className="processing-progress-container">
					<div className="processing-progress-labels">
						<span>progresso geral</span>
						<span>{progressPercentage}%</span>
					</div>
					<div className="processing-progress-track">
						{/* Colored gradient bar */}
						<div className="processing-progress-fill" style={{ width: `${progressPercentage}%` }} />
						{/* Shimmer overlay */}
						<div
							className="processing-progress-shimmer"
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
					<div className="processing-progress-sublabels">
						<span>
							{completedPages} / {totalPages} págs
						</span>
						<span>{pagesPerSec.toFixed(1)} págs/s</span>
						<span>{queuedDocsCount} na fila</span>
					</div>
				</div>
			</div>

			{/* Side-by-side grids */}
			<div className="processing-layout-grid">
				{/* Left panel: docs list */}
				<div className="panel docs-list-card">
					<div className="docs-list-header">
						<span className="docs-list-header-title">documentos</span>
						<div className="processing-actions-group">
							<button
								type="button"
								className={`btn-pause-process ${isPaused ? "paused" : ""}`}
								onClick={isPaused ? onResume : onPause}
							>
								<span className="material-icons" style={{ fontSize: "14px" }}>
									{isPaused ? "play_arrow" : "pause"}
								</span>
								{isPaused ? "Retomar" : "Pausar"}
							</button>
							<button type="button" className="btn-stop-process" onClick={onCancel}>
								<span className="material-icons" style={{ fontSize: "14px" }}>
									stop
								</span>
								Parar
							</button>
						</div>
					</div>
					<ul className="docs-list-items">
						{Object.values(docStatuses).map((d) => (
							<DocRow key={d.fileName} doc={d} />
						))}
					</ul>
				</div>

				{/* Right panel: Sonar/Radar board */}
				<div className="panel workers-radar-card">
					<div className="workers-list-header">
						<span className="workers-list-title">sonar de processamento paralelo</span>
						<span className="workers-list-count">{activeWorkersCount} ativos</span>
					</div>

					<div className="radar-console-board">
						{/* Left: Document Stacks */}
						<div className="radar-console-left">
							{renderStack(eventsPileHeight, "petições", "stack-event")}
							{renderStack(pendingDocsPileHeight, "anexos", "stack-pending")}
							{renderStack(completedDocsPileHeight, "concluídos", "stack-done")}
						</div>

						{/* Center: Sonar */}
						<div className="radar-console-center">
							<div className="radar-sonar-circle">
								<div className="radar-ring ring-1" />
								<div className="radar-ring ring-2" />
								<div className="radar-ring ring-3" />
								<div className="radar-sweep" />
							</div>
						</div>

						{/* Right: Output File size display */}
						<div className="radar-console-right">
							<div className="retro-text-file-box">
								<div className="retro-file-icon">
									<div className="file-lines-container">
										<div className="file-line line-anim-1" />
										<div className="file-line line-anim-2" />
										<div className="file-line line-anim-3" />
										<div className="file-line line-anim-4" />
									</div>
								</div>
								<span className="file-name-label">eproc_consolidado.txt</span>
								<span className="file-size-label text-glow">{fileSizeMb} MB</span>
							</div>
						</div>

						{/* Positioned retro terminal workers */}
						{workerStatuses.slice(0, 5).map((w, idx) => {
							const pos = workerPositions[idx];
							if (!pos) return null;
							return (
								<div
									key={w.index}
									style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
									className="radar-worker-wrapper"
								>
									<RetroComputer index={w.index} status={w.status} job={w.job} tree={tree} />
								</div>
							);
						})}

						{/* Background connecting data flow lines */}
						<svg className="radar-flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
							<title>Fluxo de dados dos workers</title>
							<defs>
								<filter id="flow-glow" x="-20%" y="-20%" width="140%" height="140%">
									<feGaussianBlur stdDeviation="0.8" result="blur" />
									<feMerge>
										<feMergeNode in="blur" />
										<feMergeNode in="SourceGraphic" />
									</feMerge>
								</filter>
							</defs>

							{workerStatuses.slice(0, maxWorkers).map((w, idx) => {
								const pos = workerPositions[idx];
								if (!pos) return null;

								const isActive = w.status === "active";
								const isOffline = w.status === "offline";

								// Curve calculation (Quadratic Bezier Q)
								const controlX = (pos.x + 88) / 2;
								const controlY = (pos.y + 50) / 2 + (pos.y < 50 ? -6 : 6);

								return (
									<g key={w.index}>
										<path
											d={`M ${pos.x} ${pos.y} Q ${controlX} ${controlY}, 88 50`}
											className={`flow-path-base ${isOffline ? "offline" : ""}`}
										/>
										{isActive && (
											<path
												d={`M ${pos.x} ${pos.y} Q ${controlX} ${controlY}, 88 50`}
												className="flow-path-active"
												filter="url(#flow-glow)"
											/>
										)}
									</g>
								);
							})}
						</svg>
					</div>
				</div>
			</div>
		</div>
	);
}
