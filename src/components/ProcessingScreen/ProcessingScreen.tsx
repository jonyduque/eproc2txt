import { memo, useEffect, useState } from "react";
import FileIcon from "../FileIcon";
import IsometricViewport3D from "../Layout/IsometricViewport3D";
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

				<IsometricViewport3D
					status="processing"
					maxWorkers={maxWorkers}
					workerStatuses={workerStatuses}
					docStatuses={docStatuses}
					globalLoading={false}
				/>
			</div>
		</div>
	);
}
