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

interface ProcessingScreenProps {
	isPaused: boolean;
	elapsedTime: string;
	elapsedMs: number;
	pdfPages: number;
	ocrPages: number;
	docStatuses: Record<string, DocStatusItem>;
	workerStatuses: WorkerStatusItem[];
	maxWorkers: number;
	onResume: () => void;
	onPause: () => void;
	onCancel: () => void;
}

export default function ProcessingScreen({
	isPaused,
	elapsedTime,
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
						<p className="ticker processing-stat-value text-glow">{elapsedTime}</p>
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
						{Object.values(docStatuses).map((d) => {
							const isProcessingDoc = d.status === "processing";
							const isDoneDoc = d.status === "done";
							const isQueuedDoc = d.status === "queued";

							// Calculate elapsed time per document
							const elapsedDocMs = d.startedAt ? (d.finishedAt || Date.now()) - d.startedAt : 0;
							const elapsedDocText = elapsedDocMs > 0 ? formatDuration(elapsedDocMs) : "—";

							return (
								<li key={d.fileName} className="docs-list-item">
									<FileIcon status={d.status} ext={d.extension} />

									<div className="docs-list-item-info">
										<div className="docs-list-item-top">
											<p className="docs-list-item-name">{d.fileName}</p>
											<span className="docs-list-item-elapsed">
												{isQueuedDoc ? "—" : elapsedDocText}
											</span>
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
												· ~{isDoneDoc ? d.pageCount : d.pageCount || "?"} págs
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
						})}
					</ul>
				</div>

				{/* Right panel: Workers list */}
				<div className="panel workers-list-card">
					<div className="workers-list-header">
						<span className="workers-list-title">processadores paralelos</span>
						<span className="workers-list-count">{activeWorkersCount}</span>
					</div>

					<ul className="workers-items-list">
						{workerStatuses.slice(0, maxWorkers).map((w) => {
							const isActive = w.status === "active";
							const isIdle = w.status === "idle";

							// Calculate worker progress percent based on Pág current/total
							let progressPercent = 0;
							if (w.job?.includes("Pág ")) {
								const match = w.job.match(/Pág (\d+)\/(\d+)/);
								if (match) {
									const currentPage = parseInt(match[1], 10);
									const totalPages = parseInt(match[2], 10);
									if (totalPages > 0) {
										progressPercent = (currentPage / totalPages) * 100;
									}
								}
							} else if (isActive) {
								progressPercent = 50; // default for active
							}

							return (
								<li key={w.index} className={`worker-card-item ${isActive ? "active" : ""}`}>
									<div className="worker-top-row">
										<span
											className={`worker-status-dot pulse-dot ${
												isActive ? "active animate-blink" : isIdle ? "idle" : "inactive"
											}`}
										/>
										<span className="worker-status-label">
											worker #{String(w.index).padStart(2, "0")}
										</span>
									</div>

									<p className="worker-job-desc" title={w.job}>
										{w.job}
									</p>

									{/* Mini progress line */}
									<div className="worker-progress-track">
										<div
											className="worker-progress-fill"
											style={{ width: `${progressPercent}%` }}
										/>
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			</div>
		</div>
	);
}
