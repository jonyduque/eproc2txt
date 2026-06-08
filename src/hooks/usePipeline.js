import { useCallback, useEffect, useRef, useState } from "react";
import PipelineCoordinator from "../utils/PipelineCoordinator.js";
import { buildConsolidatedXml } from "../utils/xml-builder.js";

const formatDuration = (ms) => {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	const ss = s % 60;
	const cs = Math.floor((ms % 1000) / 10);
	return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

export default function usePipeline() {
	const [isProcessing, setIsProcessing] = useState(false);
	const [isCompleted, setIsCompleted] = useState(false);
	const [elapsedTime, setElapsedTime] = useState("00:00.00");
	const [elapsedMs, setElapsedMs] = useState(0);
	const [pdfPages, setPdfPages] = useState(0);
	const [ocrPages, setOcrPages] = useState(0);
	const [progressPercentage, setProgressPercentage] = useState(0);
	const [progressText, setProgressText] = useState("Aguardando início...");
	const [consolidatedXml, setConsolidatedXml] = useState("");
	const [timelineStep, setTimelineStep] = useState("step-upload");
	const [isPaused, setIsPaused] = useState(false);

	// Document live status tracking
	const [docStatuses, setDocStatuses] = useState({});

	const [workerStatuses, setWorkerStatuses] = useState([
		{ index: 1, status: "offline", job: "Aguardando Início" },
		{ index: 2, status: "offline", job: "Aguardando Início" },
		{ index: 3, status: "offline", job: "Aguardando Início" },
		{ index: 4, status: "offline", job: "Aguardando Início" },
		{ index: 5, status: "offline", job: "Aguardando Início" },
	]);

	// Timer refs
	const timerIntervalRef = useRef(null);
	const startTimeRef = useRef(0);
	const accumulatedTimeRef = useRef(0);

	// Throttled state update refs
	const pendingDocStatusesRef = useRef({});
	const pendingPdfPagesRef = useRef(0);
	const pendingOcrPagesRef = useRef(0);
	const pendingCompletedPagesRef = useRef(0);
	const pendingTotalPagesRef = useRef(0);
	const pendingProgressTextRef = useRef("");
	const pendingProgressPercentageRef = useRef(0);
	const throttleTimeoutRef = useRef(null);

	const flushStateUpdates = useCallback(() => {
		if (throttleTimeoutRef.current) {
			clearTimeout(throttleTimeoutRef.current);
			throttleTimeoutRef.current = null;
		}

		setDocStatuses({ ...pendingDocStatusesRef.current });
		setPdfPages(pendingPdfPagesRef.current);
		setOcrPages(pendingOcrPagesRef.current);
		setProgressPercentage(pendingProgressPercentageRef.current);
		setProgressText(pendingProgressTextRef.current);
	}, []);

	const scheduleStateUpdate = useCallback(() => {
		if (throttleTimeoutRef.current) return;

		throttleTimeoutRef.current = setTimeout(() => {
			throttleTimeoutRef.current = null;
			setDocStatuses({ ...pendingDocStatusesRef.current });
			setPdfPages(pendingPdfPagesRef.current);
			setOcrPages(pendingOcrPagesRef.current);
			setProgressPercentage(pendingProgressPercentageRef.current);
			setProgressText(pendingProgressTextRef.current);
		}, 100);
	}, []);

	const startTimer = useCallback(() => {
		accumulatedTimeRef.current = 0;
		startTimeRef.current = Date.now();
		setElapsedTime("00:00.00");
		setElapsedMs(0);
		timerIntervalRef.current = setInterval(() => {
			const elapsed = Date.now() - startTimeRef.current;
			setElapsedMs(elapsed);
			setElapsedTime(formatDuration(elapsed));
		}, 50);
	}, []);

	const pauseTimer = useCallback(() => {
		if (timerIntervalRef.current) {
			clearInterval(timerIntervalRef.current);
			timerIntervalRef.current = null;
		}
		accumulatedTimeRef.current += Date.now() - startTimeRef.current;
	}, []);

	const resumeTimer = useCallback(() => {
		startTimeRef.current = Date.now();
		timerIntervalRef.current = setInterval(() => {
			const elapsed = Date.now() - startTimeRef.current + accumulatedTimeRef.current;
			setElapsedMs(elapsed);
			setElapsedTime(formatDuration(elapsed));
		}, 50);
	}, []);

	const stopTimer = useCallback(() => {
		if (timerIntervalRef.current) {
			clearInterval(timerIntervalRef.current);
			timerIntervalRef.current = null;
		}
		accumulatedTimeRef.current = 0;
	}, []);

	const updateOverallProgress = useCallback(
		(fileName, page, pageCount) => {
			const total = pendingTotalPagesRef.current;
			const completed = pendingCompletedPagesRef.current;
			const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
			pendingProgressPercentageRef.current = pct;
			pendingProgressTextRef.current = `Página ${completed} de ${total} processadas (Última: Pág ${page}/${pageCount} de ${fileName})`;
			scheduleStateUpdate();
		},
		[scheduleStateUpdate],
	);

	// Initialize the PipelineCoordinator
	const coordinatorRef = useRef(null);
	if (!coordinatorRef.current) {
		coordinatorRef.current = new PipelineCoordinator({
			onDocStart: (fileName) => {
				pendingDocStatusesRef.current[fileName] = {
					...pendingDocStatusesRef.current[fileName],
					status: "processing",
					startedAt: Date.now(),
				};
				scheduleStateUpdate();
			},
			onDocInfo: (fileName, pageCount) => {
				pendingDocStatusesRef.current[fileName] = {
					...pendingDocStatusesRef.current[fileName],
					pageCount: pageCount,
					status: "processing",
					startedAt: pendingDocStatusesRef.current[fileName]?.startedAt || Date.now(),
				};
				pendingTotalPagesRef.current += pageCount;
				updateOverallProgress(fileName, 1, pageCount);
			},
			onPageNative: (fileName, page, pageCount) => {
				const doc = pendingDocStatusesRef.current[fileName];
				if (doc) {
					const comp = doc.completedPages + 1;
					const isFinished = comp === doc.pageCount;
					pendingDocStatusesRef.current[fileName] = {
						...doc,
						completedPages: comp,
						status: isFinished ? "done" : "processing",
						finishedAt: isFinished ? Date.now() : null,
					};
				}
				pendingPdfPagesRef.current++;
				pendingCompletedPagesRef.current++;
				updateOverallProgress(fileName, page, pageCount);
			},
			onPageOcrRequest: () => {
				setTimelineStep((prev) => (prev === "step-processing" ? "step-ocr" : prev));
			},
			onOcrSuccess: (_jobId, _text, fileName, page, pageCount) => {
				const doc = pendingDocStatusesRef.current[fileName];
				if (doc) {
					const comp = doc.completedPages + 1;
					const isFinished = comp === doc.pageCount;
					pendingDocStatusesRef.current[fileName] = {
						...doc,
						completedPages: comp,
						status: isFinished ? "done" : "processing",
						finishedAt: isFinished ? Date.now() : null,
					};
				}
				pendingOcrPagesRef.current++;
				pendingCompletedPagesRef.current++;
				updateOverallProgress(fileName, page, pageCount);
			},
			onOcrError: (_jobId, _message, fileName, page, pageCount) => {
				const doc = pendingDocStatusesRef.current[fileName];
				if (doc) {
					const comp = doc.completedPages + 1;
					const isFinished = comp === doc.pageCount;
					pendingDocStatusesRef.current[fileName] = {
						...doc,
						completedPages: comp,
						status: isFinished ? "done" : "processing",
						finishedAt: isFinished ? Date.now() : null,
					};
				}
				pendingOcrPagesRef.current++;
				pendingCompletedPagesRef.current++;
				updateOverallProgress(fileName, page, pageCount);
			},
			onFinished: (processedDocs, currentTree) => {
				stopTimer();
				setIsProcessing(false);
				setIsCompleted(true);
				setTimelineStep("step-xml");

				// Build the final XML data based on the processed files
				const finalTree = [];
				if (currentTree) {
					currentTree.forEach((event) => {
						const eventDocs = [];
						event.documents.forEach((origDoc) => {
							const docState = processedDocs.get(origDoc.fileName);
							if (docState) {
								const orderedPages = [];
								for (let p = 1; p <= docState.pageCount; p++) {
									const content = docState.pages.get(p) || "";
									orderedPages.push({
										pagId: p,
										content: content,
									});
								}

								eventDocs.push({
									eventNumber: origDoc.eventNumber,
									docNumber: origDoc.docNumber,
									docType: origDoc.docType,
									extension: origDoc.extension,
									fileName: origDoc.fileName,
									pages: orderedPages,
								});
							}
						});

						if (eventDocs.length > 0) {
							finalTree.push({
								eventNumber: event.eventNumber,
								documents: eventDocs,
							});
						}
					});
				}

				const xmlResult = buildConsolidatedXml(finalTree);
				setConsolidatedXml(xmlResult);

				// Set all docs to done in pending status
				Object.keys(pendingDocStatusesRef.current).forEach((key) => {
					pendingDocStatusesRef.current[key] = {
						...pendingDocStatusesRef.current[key],
						status: "done",
						finishedAt: pendingDocStatusesRef.current[key].finishedAt || Date.now(),
					};
				});

				flushStateUpdates();
			},
			onError: (_message) => {
				stopTimer();
				setIsProcessing(false);
				setTimelineStep("step-processing");
				flushStateUpdates();
			},
			onWorkerStatusUpdate: (index, status, jobText) => {
				setWorkerStatuses((prev) =>
					prev.map((w) => {
						if (w.index === index) {
							let resolvedJob = jobText;
							if (!resolvedJob) {
								if (status === "offline") resolvedJob = "Desativado";
								else if (status === "idle") resolvedJob = "Aguardando tarefa";
								else if (status === "active") resolvedJob = "Processando...";
							}
							return { ...w, status, job: resolvedJob };
						}
						return w;
					}),
				);
			},
		});
	}

	const startPipeline = useCallback(
		(zipData, selectedFiles, maxOcrWorkers, tessModel, currentTree) => {
			if (throttleTimeoutRef.current) {
				clearTimeout(throttleTimeoutRef.current);
				throttleTimeoutRef.current = null;
			}

			// Initialize pending state refs
			const initialStatuses = {};
			selectedFiles.forEach((file) => {
				initialStatuses[file.fileName] = {
					status: "queued",
					fileName: file.fileName,
					originalPath: file.originalPath,
					extension: file.extension,
					pageCount: file.extension === "html" ? 1 : 0,
					completedPages: 0,
					startedAt: null,
					finishedAt: null,
				};
			});

			pendingDocStatusesRef.current = initialStatuses;
			pendingPdfPagesRef.current = 0;
			pendingOcrPagesRef.current = 0;
			pendingCompletedPagesRef.current = 0;
			pendingTotalPagesRef.current = selectedFiles.reduce(
				(sum, file) => sum + (file.extension === "html" ? 1 : 0),
				0,
			);
			pendingProgressPercentageRef.current = 0;
			pendingProgressTextRef.current = `Iniciando processamento de ${selectedFiles.length} documentos...`;

			// Apply immediate states
			setDocStatuses(initialStatuses);
			setPdfPages(0);
			setOcrPages(0);
			setProgressPercentage(0);
			setProgressText(pendingProgressTextRef.current);
			setConsolidatedXml("");

			// Set UI states
			setIsProcessing(true);
			setIsCompleted(false);
			setIsPaused(false);
			setTimelineStep("step-processing");

			startTimer();

			// Dispatch coordinator start
			coordinatorRef.current.start(zipData, selectedFiles, maxOcrWorkers, tessModel, currentTree);
		},
		[startTimer],
	);

	const cancelPipeline = useCallback(() => {
		if (throttleTimeoutRef.current) {
			clearTimeout(throttleTimeoutRef.current);
			throttleTimeoutRef.current = null;
		}

		coordinatorRef.current.cancel();
		stopTimer();

		setIsProcessing(false);
		setIsCompleted(false);
		setIsPaused(false);
		setTimelineStep("step-mapping");
		setProgressPercentage(0);
		setProgressText("Processamento cancelado pelo usuário.");
		setDocStatuses({});
	}, [stopTimer]);

	const resetPipeline = useCallback(() => {
		if (throttleTimeoutRef.current) {
			clearTimeout(throttleTimeoutRef.current);
			throttleTimeoutRef.current = null;
		}

		coordinatorRef.current.reset();
		stopTimer();

		setIsProcessing(false);
		setIsCompleted(false);
		setIsPaused(false);
		setElapsedTime("00:00.00");
		setElapsedMs(0);
		setPdfPages(0);
		setOcrPages(0);
		setProgressPercentage(0);
		setProgressText("Aguardando início...");
		setConsolidatedXml("");
		setTimelineStep("step-upload");
		setDocStatuses({});
	}, [stopTimer]);

	const pausePipeline = useCallback(() => {
		if (!isProcessing || isPaused) return;
		setIsPaused(true);
		pauseTimer();
		coordinatorRef.current.pause();
		setProgressText("Processamento pausado pelo usuário.");
	}, [isProcessing, isPaused, pauseTimer]);

	const resumePipeline = useCallback(() => {
		if (!isProcessing || !isPaused) return;
		setIsPaused(false);
		resumeTimer();
		coordinatorRef.current.resume();
		setProgressText("Processamento retomado...");
	}, [isProcessing, isPaused, resumeTimer]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (coordinatorRef.current) {
				coordinatorRef.current.terminateAllWorkers();
			}
			stopTimer();
			if (throttleTimeoutRef.current) {
				clearTimeout(throttleTimeoutRef.current);
			}
		};
	}, [stopTimer]);

	return {
		isProcessing,
		isCompleted,
		isPaused,
		elapsedTime,
		elapsedMs,
		pdfPages,
		ocrPages,
		progressPercentage,
		progressText,
		consolidatedXml,
		timelineStep,
		workerStatuses,
		docStatuses,
		startPipeline,
		cancelPipeline,
		resetPipeline,
		pausePipeline,
		resumePipeline,
		setTimelineStep,
	};
}
