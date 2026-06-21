import { useCallback, useEffect, useReducer, useRef } from "react";
import {
	mockDocStatusesData,
	mockSelectedPaths,
	mockTreeData,
	mockWorkerStatusesData,
	mockXmlData,
} from "../utils/mockData.js";
import PipelineCoordinator from "../utils/PipelineCoordinator.js";
import {
	releaseWakeLock,
	requestWakeLock,
	startSilentAudio,
	stopSilentAudio,
} from "../utils/wake-lock-audio.js";
import { buildConsolidatedXml } from "../utils/xml-builder.js";

const formatDuration = (ms) => {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	const ss = s % 60;
	const cs = Math.floor((ms % 1000) / 10);
	return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

const defaultMaxWorkers = Math.max(navigator.hardwareConcurrency || 3, 3);

const createDefaultWorkerStatuses = (count) => {
	const arr = [];
	for (let i = 1; i <= count; i++) {
		arr.push({ index: i, status: "offline", job: "Aguardando Início" });
	}
	return arr;
};

const initialState = {
	status: "idle", // "idle" | "configuring" | "processing" | "completed"
	globalLoading: false,
	zipData: null,
	zipName: "",
	tree: [],
	ignoredFiles: [],
	selectedPaths: new Set(),
	isPaused: false,
	pdfPages: 0,
	ocrPages: 0,
	progressPercentage: 0,
	progressText: "Aguardando início...",
	consolidatedXml: "",
	workerStatuses: createDefaultWorkerStatuses(defaultMaxWorkers),
	docStatuses: {},
	mockState: null,
	maxWorkers: defaultMaxWorkers,
	tessModel: "standard",
	elapsedMs: 0,
};

function pipelineReducer(state, action) {
	switch (action.type) {
		case "SET_LOADING":
			return { ...state, globalLoading: action.payload };
		case "ZIP_PARSED":
			return {
				...state,
				status: "configuring",
				zipData: action.payload.zipData,
				zipName: action.payload.zipName,
				tree: action.payload.tree,
				ignoredFiles: action.payload.ignoredFiles,
				globalLoading: false,
				selectedPaths: new Set(),
			};
		case "SET_SELECTED_PATHS":
			return {
				...state,
				selectedPaths:
					typeof action.payload === "function"
						? action.payload(state.selectedPaths)
						: action.payload,
			};
		case "START_PIPELINE":
			return {
				...state,
				status: "processing",
				isPaused: false,
				pdfPages: 0,
				ocrPages: 0,
				progressPercentage: 0,
				progressText: action.payload.progressText,
				docStatuses: action.payload.docStatuses,
				maxWorkers: action.payload.maxWorkers,
				tessModel: action.payload.tessModel,
				consolidatedXml: "",
				workerStatuses: createDefaultWorkerStatuses(action.payload.maxWorkers),
			};
		case "UPDATE_PROGRESS":
			return {
				...state,
				docStatuses: action.payload.docStatuses,
				pdfPages: action.payload.pdfPages,
				ocrPages: action.payload.ocrPages,
				progressPercentage: action.payload.progressPercentage,
				progressText: action.payload.progressText,
				elapsedMs: action.payload.elapsedMs ?? state.elapsedMs,
			};
		case "PAUSE_PIPELINE":
			return {
				...state,
				isPaused: true,
				progressText: "Processamento pausado pelo usuário.",
			};
		case "RESUME_PIPELINE":
			return {
				...state,
				isPaused: false,
				progressText: "Processamento retomado...",
			};
		case "PIPELINE_FINISHED":
			return {
				...state,
				status: "completed",
				consolidatedXml: action.payload.consolidatedXml,
				docStatuses: action.payload.docStatuses,
				elapsedMs: action.payload.elapsedMs ?? state.elapsedMs,
			};
		case "PIPELINE_ERROR":
			return {
				...state,
				status: "configuring",
			};
		case "CANCEL_PIPELINE":
			return {
				...state,
				status: "configuring",
				isPaused: false,
				pdfPages: 0,
				ocrPages: 0,
				progressPercentage: 0,
				progressText: "Processamento cancelado pelo usuário.",
				docStatuses: {},
			};
		case "RESET_PIPELINE":
			return {
				...initialState,
				maxWorkers: state.maxWorkers,
				tessModel: state.tessModel,
				workerStatuses: createDefaultWorkerStatuses(state.maxWorkers),
			};
		case "SET_MOCK_STATE":
			return {
				...state,
				mockState: action.payload.mockState,
				selectedPaths: action.payload.selectedPaths,
			};
		case "UPDATE_WORKER_STATUS":
			return {
				...state,
				workerStatuses: state.workerStatuses.map((w) => {
					if (w.index === action.payload.index) {
						return { ...w, status: action.payload.status, job: action.payload.job };
					}
					return w;
				}),
			};
		case "SET_WORKERS":
			return { ...state, maxWorkers: action.payload };
		case "SET_TESS_MODEL":
			return { ...state, tessModel: action.payload };
		default:
			return state;
	}
}

// @ts-expect-error
Symbol.dispose ??= Symbol("Symbol.dispose");

class PipelineSession {
	constructor(coordinator, cleanupFn) {
		this.coordinator = coordinator;
		this.cleanupFn = cleanupFn;
		this.active = true;
	}

	[Symbol.dispose]() {
		if (this.active) {
			this.active = false;
			if (typeof this.cleanupFn === "function") {
				this.cleanupFn();
			}
			console.log("[eproc2txt] PipelineSession disposed.");
		}
	}
}

export default function usePipeline() {
	const [state, dispatch] = useReducer(pipelineReducer, initialState);
	const activeSessionRef = useRef(null);

	// Track pause state in ref to avoid scheduleStateUpdate dependency churn
	const isPausedRef = useRef(false);
	useEffect(() => {
		isPausedRef.current = state.isPaused;
	}, [state.isPaused]);

	// Timer refs (used by the isolated Chronometer component via exposed values)
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

		const elapsed = isPausedRef.current
			? accumulatedTimeRef.current
			: accumulatedTimeRef.current + (Date.now() - startTimeRef.current);

		dispatch({
			type: "UPDATE_PROGRESS",
			payload: {
				docStatuses: { ...pendingDocStatusesRef.current },
				pdfPages: pendingPdfPagesRef.current,
				ocrPages: pendingOcrPagesRef.current,
				progressPercentage: pendingProgressPercentageRef.current,
				progressText: pendingProgressTextRef.current,
				elapsedMs: elapsed,
			},
		});
	}, []);

	const scheduleStateUpdate = useCallback(() => {
		if (throttleTimeoutRef.current) return;

		throttleTimeoutRef.current = setTimeout(() => {
			throttleTimeoutRef.current = null;
			const elapsed = isPausedRef.current
				? accumulatedTimeRef.current
				: accumulatedTimeRef.current + (Date.now() - startTimeRef.current);

			dispatch({
				type: "UPDATE_PROGRESS",
				payload: {
					docStatuses: { ...pendingDocStatusesRef.current },
					pdfPages: pendingPdfPagesRef.current,
					ocrPages: pendingOcrPagesRef.current,
					progressPercentage: pendingProgressPercentageRef.current,
					progressText: pendingProgressTextRef.current,
					elapsedMs: elapsed,
				},
			});
		}, 100);
	}, []);

	const startTimer = useCallback(() => {
		accumulatedTimeRef.current = 0;
		startTimeRef.current = Date.now();
	}, []);

	const pauseTimer = useCallback(() => {
		accumulatedTimeRef.current += Date.now() - startTimeRef.current;
	}, []);

	const resumeTimer = useCallback(() => {
		startTimeRef.current = Date.now();
	}, []);

	const stopTimer = useCallback(() => {
		// Interval has been removed, so this is now a no-op
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
				// We don't change state directly here because UPDATE_PROGRESS will be called by OCR callbacks
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
				if (activeSessionRef.current) {
					activeSessionRef.current.active = false;
					activeSessionRef.current[Symbol.dispose]();
					activeSessionRef.current = null;
				}
				stopTimer();
				stopSilentAudio();
				releaseWakeLock();

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

				// Set all docs to done in pending status
				Object.keys(pendingDocStatusesRef.current).forEach((key) => {
					pendingDocStatusesRef.current[key] = {
						...pendingDocStatusesRef.current[key],
						status: "done",
						finishedAt: pendingDocStatusesRef.current[key].finishedAt || Date.now(),
					};
				});

				const finalMs = isPausedRef.current
					? accumulatedTimeRef.current
					: accumulatedTimeRef.current + (Date.now() - startTimeRef.current);

				dispatch({
					type: "PIPELINE_FINISHED",
					payload: {
						consolidatedXml: xmlResult,
						docStatuses: { ...pendingDocStatusesRef.current },
						elapsedMs: finalMs,
					},
				});

				if (throttleTimeoutRef.current) {
					clearTimeout(throttleTimeoutRef.current);
					throttleTimeoutRef.current = null;
				}
			},
			onError: (_message) => {
				if (activeSessionRef.current) {
					activeSessionRef.current.active = false;
					activeSessionRef.current[Symbol.dispose]();
					activeSessionRef.current = null;
				}
				stopTimer();
				dispatch({ type: "PIPELINE_ERROR" });
				flushStateUpdates();
			},
			onWorkerStatusUpdate: (index, status, jobText) => {
				dispatch({
					type: "UPDATE_WORKER_STATUS",
					payload: { index, status, job: jobText },
				});
			},
		});
	}

	const startPipeline = useCallback(
		(selectedFiles) => {
			if (throttleTimeoutRef.current) {
				clearTimeout(throttleTimeoutRef.current);
				throttleTimeoutRef.current = null;
			}

			if (activeSessionRef.current) {
				activeSessionRef.current[Symbol.dispose]();
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

			dispatch({
				type: "START_PIPELINE",
				payload: {
					progressText: pendingProgressTextRef.current,
					docStatuses: initialStatuses,
					maxWorkers: state.maxWorkers,
					tessModel: state.tessModel,
				},
			});

			startTimer();
			startSilentAudio();
			requestWakeLock();

			const activeZipData = state.mockState ? "mock-zip-data" : state.zipData;
			const activeTree = state.mockState ? mockTreeData : state.tree;

			const session = new PipelineSession(coordinatorRef.current, () => {
				coordinatorRef.current.cancel();
				stopTimer();
				stopSilentAudio();
				releaseWakeLock();
			});
			activeSessionRef.current = session;

			// Dispatch coordinator start
			coordinatorRef.current.start(
				activeZipData,
				selectedFiles,
				state.maxWorkers,
				state.tessModel,
				activeTree,
			);
		},
		[
			startTimer,
			state.maxWorkers,
			state.tessModel,
			state.tree,
			state.mockState,
			state.zipData,
			stopTimer,
		],
	);

	const cancelPipeline = useCallback(() => {
		if (throttleTimeoutRef.current) {
			clearTimeout(throttleTimeoutRef.current);
			throttleTimeoutRef.current = null;
		}

		if (activeSessionRef.current) {
			activeSessionRef.current[Symbol.dispose]();
			activeSessionRef.current = null;
		} else {
			coordinatorRef.current.cancel();
			stopTimer();
			stopSilentAudio();
			releaseWakeLock();
		}
		dispatch({ type: "CANCEL_PIPELINE" });
	}, [stopTimer]);

	const resetPipeline = useCallback(() => {
		if (throttleTimeoutRef.current) {
			clearTimeout(throttleTimeoutRef.current);
			throttleTimeoutRef.current = null;
		}

		if (activeSessionRef.current) {
			activeSessionRef.current[Symbol.dispose]();
			activeSessionRef.current = null;
		}
		coordinatorRef.current.reset();
		stopTimer();
		stopSilentAudio();
		releaseWakeLock();
		dispatch({ type: "RESET_PIPELINE" });
	}, [stopTimer]);

	const pausePipeline = useCallback(() => {
		if (state.status !== "processing" || state.isPaused) return;
		pauseTimer();
		coordinatorRef.current.pause();
		dispatch({ type: "PAUSE_PIPELINE" });
	}, [state.status, state.isPaused, pauseTimer]);

	const resumePipeline = useCallback(() => {
		if (state.status !== "processing" || !state.isPaused) return;
		resumeTimer();
		coordinatorRef.current.resume();
		dispatch({ type: "RESUME_PIPELINE" });
	}, [state.status, state.isPaused, resumeTimer]);

	const setWorkers = useCallback(
		(workers) => {
			dispatch({
				type: "SET_WORKERS",
				payload: typeof workers === "function" ? workers(state.maxWorkers) : workers,
			});
		},
		[state.maxWorkers],
	);

	const setTessModel = useCallback((model) => {
		dispatch({ type: "SET_TESS_MODEL", payload: model });
	}, []);

	const setMockState = useCallback((mockVal) => {
		dispatch({
			type: "SET_MOCK_STATE",
			payload: {
				mockState: mockVal,
				selectedPaths: mockVal ? new Set(mockSelectedPaths) : new Set(),
			},
		});
	}, []);

	const setSelectedPaths = useCallback((paths) => {
		dispatch({ type: "SET_SELECTED_PATHS", payload: paths });
	}, []);

	const setGlobalLoading = useCallback((loading) => {
		dispatch({ type: "SET_LOADING", payload: loading });
	}, []);

	const handleZipParsed = useCallback((zipData, zipName, tree, ignoredFiles) => {
		dispatch({
			type: "ZIP_PARSED",
			payload: { zipData, zipName, tree, ignoredFiles },
		});
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (activeSessionRef.current) {
				activeSessionRef.current[Symbol.dispose]();
				activeSessionRef.current = null;
			}
			if (coordinatorRef.current) {
				coordinatorRef.current.terminateAllWorkers();
			}
			if (throttleTimeoutRef.current) {
				clearTimeout(throttleTimeoutRef.current);
			}
		};
	}, []);

	// Derive mocked values if mockState is active
	const mockVal = state.mockState;
	const activeState = {
		status: mockVal
			? mockVal === "loaded"
				? "configuring"
				: mockVal === "processing"
					? "processing"
					: mockVal === "completed"
						? "completed"
						: state.status
			: state.status,
		globalLoading: state.globalLoading,
		zipData: mockVal ? "mock-zip-data" : state.zipData,
		zipName: mockVal ? "processo_mockado.zip" : state.zipName,
		tree: mockVal ? mockTreeData : state.tree,
		ignoredFiles: mockVal
			? [
					{ fileName: "comprovante.png", size: 122880 },
					{ fileName: "audio.mp3", size: 1048576 },
				]
			: state.ignoredFiles,
		selectedPaths: state.selectedPaths,
		isPaused: mockVal ? (mockVal === "processing" ? false : state.isPaused) : state.isPaused,
		pdfPages: mockVal
			? mockVal === "processing"
				? 3
				: mockVal === "completed"
					? 6
					: state.pdfPages
			: state.pdfPages,
		ocrPages: mockVal
			? mockVal === "processing"
				? 1
				: mockVal === "completed"
					? 1
					: state.ocrPages
			: state.ocrPages,
		progressPercentage: mockVal
			? mockVal === "processing"
				? 45
				: mockVal === "completed"
					? 100
					: state.progressPercentage
			: state.progressPercentage,
		progressText: mockVal
			? mockVal === "processing"
				? "Processando Página 4 de 10..."
				: mockVal === "completed"
					? "Processamento finalizado."
					: state.progressText
			: state.progressText,
		consolidatedXml: mockVal
			? mockVal === "completed"
				? mockXmlData
				: state.consolidatedXml
			: state.consolidatedXml,
		workerStatuses: mockVal
			? mockVal === "processing" || mockVal === "completed"
				? mockWorkerStatusesData
				: state.workerStatuses
			: state.workerStatuses,
		docStatuses: mockVal
			? mockVal === "processing" || mockVal === "completed"
				? mockDocStatusesData
				: state.docStatuses
			: state.docStatuses,
		mockState: state.mockState,
		maxWorkers: state.maxWorkers,
		tessModel: state.tessModel,
		elapsedMs: mockVal
			? mockVal === "processing"
				? 4500
				: mockVal === "completed"
					? 12500
					: state.elapsedMs
			: state.elapsedMs,
	};

	return {
		...activeState,
		elapsedTime: formatDuration(activeState.elapsedMs),
		timerStartTime: startTimeRef.current,
		timerAccumulatedMs: accumulatedTimeRef.current,
		startPipeline,
		cancelPipeline,
		resetPipeline,
		pausePipeline,
		resumePipeline,
		setWorkers,
		setTessModel,
		setMockState,
		setSelectedPaths,
		setGlobalLoading,
		handleZipParsed,
	};
}
