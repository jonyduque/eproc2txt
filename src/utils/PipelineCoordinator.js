if (typeof Promise.try !== "function") {
	Promise.try = (callback, ...args) =>
		new Promise((resolve, reject) => {
			try {
				resolve(callback(...args));
			} catch (err) {
				reject(err);
			}
		});
}

if (typeof Symbol.dispose !== "symbol") {
	Object.defineProperty(Symbol, "dispose", {
		value: Symbol("Symbol.dispose"),
		configurable: false,
		enumerable: false,
		writable: false,
	});
}

export default class PipelineCoordinator {
	constructor(options = {}) {
		this.onDocStart = options.onDocStart || (() => {});
		this.onDocInfo = options.onDocInfo || (() => {});
		this.onPageNative = options.onPageNative || (() => {});
		this.onPageOcrRequest = options.onPageOcrRequest || (() => {});
		this.onOcrSuccess = options.onOcrSuccess || (() => {});
		this.onOcrError = options.onOcrError || (() => {});
		this.onFinished = options.onFinished || (() => {});
		this.onError = options.onError || (() => {});
		this.onWorkerStatusUpdate = options.onWorkerStatusUpdate || (() => {});

		this.pipelineWorker = null;
		this.ocrWorkers = []; // array of { worker, index, active, currentJob }
		this.ocrQueue = [];
		this.activeJobs = new Map();
		this.processedDocs = new Map();
		this.isPipelineFinished = false;
		this.isPipelinePaused = false;
		this.isCoordinatorPaused = false;
		this.jobIdCounter = 0;
		this.totalEstimatedPages = 0;
		this.completedPagesCount = 0;
		this.pdfPagesCount = 0;
		this.ocrPagesCount = 0;
		this.tessDataPath = "";
		this.maxOcrWorkers = 3;
		this.currentTree = null;
	}

	[Symbol.dispose]() {
		this.terminateAllWorkers();
	}

	start(zipData, selectedFiles, maxOcrWorkers, tessModel, currentTree) {
		this.terminateAllWorkers();

		this.ocrQueue = [];
		this.activeJobs.clear();
		this.processedDocs.clear();
		this.isPipelineFinished = false;
		this.isPipelinePaused = false;
		this.isCoordinatorPaused = false;
		this.jobIdCounter = 0;
		this.totalEstimatedPages = 0;
		this.completedPagesCount = 0;
		this.pdfPagesCount = 0;
		this.ocrPagesCount = 0;
		this.maxOcrWorkers = maxOcrWorkers;
		this.currentTree = currentTree;

		// Set Tessdata URL path
		let tessPath = "https://tessdata.projectnaptha.com/4.0.0";
		if (tessModel === "fast") {
			tessPath = "https://tessdata.projectnaptha.com/4.0.0_fast";
		} else if (tessModel === "best") {
			tessPath = "https://tessdata.projectnaptha.com/4.0.0_best";
		}
		this.tessDataPath = tessPath;

		// Start workers
		this.startOcrWorkers(maxOcrWorkers);

		// Spawn pipeline worker
		this.pipelineWorker = new Worker(new URL("../workers/pipeline.worker.js", import.meta.url), {
			type: "module",
		});
		this.pipelineWorker.onmessage = (event) => this.handlePipelineMessage(event);

		// Slice and send ZIP buffer to pipeline worker
		const zipDataCopy = zipData.slice(0);
		this.pipelineWorker.postMessage(
			{
				type: "start",
				zipData: zipDataCopy,
				selectedFiles: selectedFiles,
			},
			[zipDataCopy.buffer],
		);
	}

	pause() {
		this.isCoordinatorPaused = true;
		if (this.pipelineWorker) {
			this.pipelineWorker.postMessage({ type: "pause" });
		}
	}

	resume() {
		this.isCoordinatorPaused = false;
		if (this.pipelineWorker && !this.isPipelinePaused) {
			this.pipelineWorker.postMessage({ type: "resume" });
		}
		this.dispatchOcrJobs();
	}

	cancel() {
		this.terminateAllWorkers();
	}

	reset() {
		this.terminateAllWorkers();
	}

	terminateAllWorkers() {
		if (this.pipelineWorker) {
			this.pipelineWorker.terminate();
			this.pipelineWorker = null;
		}

		this.ocrWorkers.forEach((wRecord) => {
			wRecord.worker.postMessage({ type: "terminate" });
			wRecord.worker.terminate();
			Promise.try(() => this.onWorkerStatusUpdate(wRecord.index, "offline", "Desativado")).catch(
				(err) => {
					console.error("Erro no callback onWorkerStatusUpdate:", err);
				},
			);
		});
		this.ocrWorkers = [];
	}

	startOcrWorkers(count) {
		for (let i = 0; i < count; i++) {
			const workerIndex = i + 1;
			const worker = new Worker(new URL("../workers/ocr.worker.js", import.meta.url), {
				type: "module",
			});

			worker.onmessage = (event) => this.handleOcrWorkerMessage(workerIndex, event);

			this.ocrWorkers.push({
				worker,
				index: workerIndex,
				active: false,
				currentJob: null,
			});

			Promise.try(() => this.onWorkerStatusUpdate(workerIndex, "idle", "Aguardando tarefa")).catch(
				(err) => {
					console.error("Erro no callback onWorkerStatusUpdate:", err);
				},
			);
		}
	}

	dispatchOcrJobs() {
		if (this.isCoordinatorPaused) return;

		for (const wRecord of this.ocrWorkers) {
			if (!wRecord.active && this.ocrQueue.length > 0) {
				const job = this.ocrQueue.shift();
				wRecord.active = true;
				wRecord.currentJob = job;

				Promise.try(() =>
					this.onWorkerStatusUpdate(
						wRecord.index,
						"active",
						`OCR ${job.fileName} (Pág ${job.page}/${job.pageCount})`,
					),
				).catch((err) => {
					console.error("Erro no callback onWorkerStatusUpdate:", err);
				});

				wRecord.worker.postMessage(
					{
						type: "ocr_job",
						jobId: job.jobId,
						width: job.width,
						height: job.height,
						imageBuffer: job.imageBuffer,
						tessDataPath: this.tessDataPath,
					},
					[job.imageBuffer],
				);

				this.checkBackpressure();
			}
		}
	}

	checkBackpressure() {
		if (!this.pipelineWorker) return;

		if (!this.isPipelinePaused && this.ocrQueue.length >= this.maxOcrWorkers * 3) {
			this.isPipelinePaused = true;
			this.pipelineWorker.postMessage({ type: "pause" });
			console.log(
				`[BACKPRESSURE] Activated: Queue length = ${this.ocrQueue.length}. Pausing pipeline worker.`,
			);
		} else if (this.isPipelinePaused && this.ocrQueue.length <= this.maxOcrWorkers * 1.5) {
			this.isPipelinePaused = false;
			if (!this.isCoordinatorPaused) {
				this.pipelineWorker.postMessage({ type: "resume" });
			}
			console.log(
				`[BACKPRESSURE] Released: Queue length = ${this.ocrQueue.length}. Resuming pipeline worker.`,
			);
		}
	}

	handlePipelineMessage(event) {
		const data = event.data;

		switch (data.type) {
			case "status":
				console.log(`[PIPELINE] ${data.message}`);
				break;

			case "log":
				console.log(`[PIPELINE LOG] [${data.level.toUpperCase()}] ${data.message}`);
				break;

			case "doc_start":
				Promise.try(() => this.onDocStart(data.fileName)).catch((err) => {
					console.error("Erro no callback onDocStart:", err);
				});
				break;

			case "doc_info":
				this.processedDocs.set(data.fileName, {
					pageCount: data.pageCount,
					pages: new Map(),
					completedPages: 0,
				});
				this.totalEstimatedPages += data.pageCount;
				Promise.try(() => this.onDocInfo(data.fileName, data.pageCount)).catch((err) => {
					console.error("Erro no callback onDocInfo:", err);
				});
				break;

			case "page_native": {
				const docState = this.processedDocs.get(data.fileName);
				if (docState) {
					docState.pages.set(data.page, data.content);
					docState.completedPages++;
					this.pdfPagesCount++;
					this.completedPagesCount++;
					Promise.try(() =>
						this.onPageNative(
							data.fileName,
							data.page,
							data.pageCount,
							data.content,
							this.pdfPagesCount,
							this.completedPagesCount,
							this.totalEstimatedPages,
						),
					).catch((err) => {
						console.error("Erro no callback onPageNative:", err);
					});
				}
				break;
			}

			case "page_ocr_request": {
				const jobId = ++this.jobIdCounter;
				this.ocrQueue.push({
					jobId,
					fileName: data.fileName,
					page: data.page,
					pageCount: data.pageCount,
					width: data.width,
					height: data.height,
					imageBuffer: data.imageBuffer,
				});

				this.activeJobs.set(jobId, {
					fileName: data.fileName,
					page: data.page,
					pageCount: data.pageCount,
				});

				Promise.try(() =>
					this.onPageOcrRequest(data.fileName, data.page, data.pageCount, jobId),
				).catch((err) => {
					console.error("Erro no callback onPageOcrRequest:", err);
				});
				this.dispatchOcrJobs();
				break;
			}

			case "pipeline_finished":
				this.isPipelineFinished = true;
				console.log("Varredura do arquivo ZIP finalizada pelo Pipeline Worker.");
				this.checkCompletion();
				break;

			case "error":
				console.error(`Erro crítico no Pipeline: ${data.message}`);
				this.terminateAllWorkers();
				Promise.try(() => this.onError(data.message)).catch((err) => {
					console.error("Erro no callback onError:", err);
				});
				break;
		}
	}

	handleOcrWorkerMessage(workerIndex, event) {
		const data = event.data;
		const wRecord = this.ocrWorkers.find((w) => w.index === workerIndex);
		if (!wRecord) return;

		if (data.type === "ocr_success" || data.type === "ocr_error") {
			const job = wRecord.currentJob;
			if (job && job.jobId === data.jobId) {
				wRecord.active = false;
				wRecord.currentJob = null;
				Promise.try(() =>
					this.onWorkerStatusUpdate(workerIndex, "idle", "Aguardando tarefa"),
				).catch((err) => {
					console.error("Erro no callback onWorkerStatusUpdate:", err);
				});

				const jobInfo = this.activeJobs.get(data.jobId);
				if (jobInfo) {
					this.activeJobs.delete(data.jobId);

					const docState = this.processedDocs.get(jobInfo.fileName);
					if (docState) {
						const text =
							data.type === "ocr_success"
								? data.text
								: `[Erro OCR na página ${jobInfo.page}: ${data.message}]`;
						docState.pages.set(jobInfo.page, text);
						docState.completedPages++;
						this.ocrPagesCount++;
						this.completedPagesCount++;

						if (data.type === "ocr_success") {
							Promise.try(() =>
								this.onOcrSuccess(
									data.jobId,
									text,
									jobInfo.fileName,
									jobInfo.page,
									jobInfo.pageCount,
									this.ocrPagesCount,
									this.completedPagesCount,
									this.totalEstimatedPages,
								),
							).catch((err) => {
								console.error("Erro no callback onOcrSuccess:", err);
							});
						} else {
							Promise.try(() =>
								this.onOcrError(
									data.jobId,
									data.message,
									jobInfo.fileName,
									jobInfo.page,
									jobInfo.pageCount,
									this.ocrPagesCount,
									this.completedPagesCount,
									this.totalEstimatedPages,
								),
							).catch((err) => {
								console.error("Erro no callback onOcrError:", err);
							});
						}
					}
				}

				this.dispatchOcrJobs();
				this.checkCompletion();
			}
		}
	}

	checkCompletion() {
		if (this.isPipelineFinished && this.activeJobs.size === 0 && this.ocrQueue.length === 0) {
			Promise.try(() => this.onFinished(this.processedDocs, this.currentTree)).catch((err) => {
				console.error("Erro no callback onFinished:", err);
			});
			this.terminateAllWorkers();
		}
	}
}
