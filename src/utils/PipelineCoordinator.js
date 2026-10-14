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

/**
 * Where each OCR model is downloaded from. The LSTM-only Tesseract core used by tesseract.js
 * cannot run the float `4.0.0_best` models (aborts with "missing function DotProductSSE"),
 * so "best" uses the integer conversion `4.0.0_best_int`, which projectnaptha does not host.
 */
export const TESS_MODEL_PATHS = {
	fast: "https://tessdata.projectnaptha.com/4.0.0_fast",
	standard: "https://tessdata.projectnaptha.com/4.0.0",
	best: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/por/4.0.0_best_int",
};

export default class PipelineCoordinator {
	constructor(options = {}) {
		this.onDocStart = options.onDocStart || (() => {});
		this.onDocInfo = options.onDocInfo || (() => {});
		this.onDocError = options.onDocError || (() => {});
		this.onPageNative = options.onPageNative || (() => {});
		this.onPageOcrRequest = options.onPageOcrRequest || (() => {});
		this.onOcrSuccess = options.onOcrSuccess || (() => {});
		this.onPageError = options.onPageError || (() => {});
		this.onFinished = options.onFinished || (() => {});
		this.onError = options.onError || (() => {});
		this.onWorkerStatusUpdate = options.onWorkerStatusUpdate || (() => {});
		// (level: "debug"|"info"|"warn"|"error", source: string, message: string) => void
		this.onLog = options.onLog || (() => {});

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

	/** Runs a consumer callback without letting its exceptions break the coordinator */
	emit(name, ...args) {
		Promise.try(() => this[name](...args)).catch((err) => {
			console.error(`Erro no callback ${name}:`, err);
		});
	}

	log(level, source, message) {
		this.emit("onLog", level, source, message);
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
		this.tessDataPath = TESS_MODEL_PATHS[tessModel] ?? TESS_MODEL_PATHS.standard;

		this.log(
			"info",
			"coordenador",
			`Início: ${selectedFiles.length} documentos, ${maxOcrWorkers} workers OCR, modelo ${tessModel} (${this.tessDataPath})`,
		);

		// Start workers
		this.startOcrWorkers(maxOcrWorkers);

		// Spawn pipeline worker
		this.pipelineWorker = new Worker(new URL("../workers/pipeline.worker.js", import.meta.url), {
			type: "module",
		});
		this.pipelineWorker.onmessage = (event) => this.handlePipelineMessage(event);
		// Uncaught error or failed module load inside the worker: nothing else would ever finish the run
		this.pipelineWorker.onerror = (event) => {
			event.preventDefault?.();
			this.failPipeline(`Worker do pipeline falhou: ${describeErrorEvent(event)}`);
		};

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
		this.log("info", "coordenador", "Pausado pelo usuário");
		if (this.pipelineWorker) {
			this.pipelineWorker.postMessage({ type: "pause" });
		}
	}

	resume() {
		this.isCoordinatorPaused = false;
		this.log("info", "coordenador", "Retomado pelo usuário");
		if (this.pipelineWorker && !this.isPipelinePaused) {
			this.pipelineWorker.postMessage({ type: "resume" });
		}
		this.dispatchOcrJobs();
	}

	cancel() {
		if (this.pipelineWorker || this.ocrWorkers.length > 0) {
			this.log("warn", "coordenador", "Cancelado pelo usuário");
		}
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
			this.emit("onWorkerStatusUpdate", wRecord.index, "offline", "Desativado");
		});
		this.ocrWorkers = [];
	}

	failPipeline(message) {
		this.log("error", "pipeline", message);
		console.error(`Erro crítico no Pipeline: ${message}`);
		this.terminateAllWorkers();
		this.emit("onError", message);
	}

	startOcrWorkers(count) {
		for (let i = 0; i < count; i++) {
			const workerIndex = i + 1;
			const worker = new Worker(new URL("../workers/ocr.worker.js", import.meta.url), {
				type: "module",
			});

			worker.onmessage = (event) => this.handleOcrWorkerMessage(workerIndex, event);
			worker.onerror = (event) => {
				event.preventDefault?.();
				this.handleOcrWorkerCrash(workerIndex, describeErrorEvent(event));
			};

			this.ocrWorkers.push({
				worker,
				index: workerIndex,
				active: false,
				currentJob: null,
			});

			this.emit("onWorkerStatusUpdate", workerIndex, "idle", "Aguardando tarefa");
		}
	}

	/**
	 * An OCR worker threw outside its own try/catch (or failed to load). Its current job is
	 * failed, the worker is dropped from the pool, and if no worker is left the queued pages
	 * are failed too, so the run still completes instead of waiting forever.
	 */
	handleOcrWorkerCrash(workerIndex, reason) {
		const wRecord = this.ocrWorkers.find((w) => w.index === workerIndex);
		if (!wRecord) return;

		this.log("error", `ocr-${workerIndex}`, `Worker de OCR falhou e foi descartado: ${reason}`);
		wRecord.worker.terminate();
		this.ocrWorkers = this.ocrWorkers.filter((w) => w !== wRecord);
		this.emit("onWorkerStatusUpdate", workerIndex, "offline", "Falhou");

		if (wRecord.currentJob) {
			this.completeOcrJob(wRecord.currentJob.jobId, null, `worker de OCR falhou: ${reason}`);
		}

		if (this.ocrWorkers.length === 0) {
			for (const job of this.ocrQueue.splice(0)) {
				this.completeOcrJob(job.jobId, null, "nenhum worker de OCR disponível");
			}
		}

		this.dispatchOcrJobs();
		this.checkBackpressure();
		this.checkCompletion();
	}

	dispatchOcrJobs() {
		if (this.isCoordinatorPaused) return;

		for (const wRecord of this.ocrWorkers) {
			if (!wRecord.active && this.ocrQueue.length > 0) {
				const job = this.ocrQueue.shift();
				wRecord.active = true;
				wRecord.currentJob = job;
				job.startedAt = performance.now();

				this.emit(
					"onWorkerStatusUpdate",
					wRecord.index,
					"active",
					`OCR ${job.fileName} (Pág ${job.page}/${job.pageCount})`,
				);

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
			this.log(
				"debug",
				"coordenador",
				`Contra-pressão ativada (fila OCR = ${this.ocrQueue.length}); leitura de PDFs pausada`,
			);
		} else if (this.isPipelinePaused && this.ocrQueue.length <= this.maxOcrWorkers * 1.5) {
			this.isPipelinePaused = false;
			if (!this.isCoordinatorPaused) {
				this.pipelineWorker.postMessage({ type: "resume" });
			}
			this.log(
				"debug",
				"coordenador",
				`Contra-pressão liberada (fila OCR = ${this.ocrQueue.length})`,
			);
		}
	}

	/** Registers a document that failed before (or without) reporting its page count */
	ensureDocState(fileName, pageCount = 0) {
		let docState = this.processedDocs.get(fileName);
		if (!docState) {
			docState = { pageCount, pages: new Map(), completedPages: 0, errors: [] };
			this.processedDocs.set(fileName, docState);
		}
		return docState;
	}

	handlePipelineMessage(event) {
		const data = event.data;

		switch (data.type) {
			case "status":
				this.log("info", "pipeline", data.message);
				break;

			case "log":
				this.log(data.level === "success" ? "info" : data.level, "pipeline", data.message);
				break;

			case "doc_start":
				this.log("debug", "pipeline", `Documento ${data.index}/${data.total}: ${data.fileName}`);
				this.emit("onDocStart", data.fileName);
				break;

			case "doc_info": {
				const docState = this.ensureDocState(data.fileName);
				docState.pageCount = data.pageCount;
				this.totalEstimatedPages += data.pageCount;
				this.log("debug", "pipeline", `${data.fileName}: ${data.pageCount} página(s)`);
				this.emit("onDocInfo", data.fileName, data.pageCount);
				break;
			}

			case "doc_error": {
				// Whole document unusable (not in the ZIP, corrupt PDF...): keep it in the output
				const docState = this.ensureDocState(data.fileName);
				docState.docError = data.message;
				this.log(
					"error",
					"pipeline",
					`${data.fileName}: documento não processado: ${data.message}`,
				);
				this.emit("onDocError", data.fileName, data.message);
				break;
			}

			case "page_native": {
				const docState = this.processedDocs.get(data.fileName);
				if (docState) {
					docState.pages.set(data.page, data.content);
					docState.completedPages++;
					this.pdfPagesCount++;
					this.completedPagesCount++;
					this.emit(
						"onPageNative",
						data.fileName,
						data.page,
						data.pageCount,
						data.content,
						this.pdfPagesCount,
						this.completedPagesCount,
						this.totalEstimatedPages,
					);
				}
				break;
			}

			case "page_error":
				this.recordPageError(data.fileName, data.page, data.pageCount, data.stage, data.message);
				break;

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

				this.log(
					"debug",
					"pipeline",
					`OCR job ${jobId}: ${data.fileName} pág ${data.page}/${data.pageCount} (${data.width}x${data.height})`,
				);
				this.emit("onPageOcrRequest", data.fileName, data.page, data.pageCount, jobId);
				this.dispatchOcrJobs();
				break;
			}

			case "pipeline_finished":
				this.isPipelineFinished = true;
				this.log("info", "pipeline", "Leitura do ZIP concluída");
				this.checkCompletion();
				break;

			case "error":
				this.failPipeline(data.message);
				break;
		}
	}

	recordPageError(fileName, page, pageCount, stage, message) {
		const docState = this.ensureDocState(fileName, pageCount);
		const text = `[Erro ${stage === "ocr" ? "de OCR" : "ao ler"} na página ${page}: ${message}]`;
		docState.pages.set(page, text);
		docState.completedPages++;
		docState.errors.push({ page, stage, message });
		this.completedPagesCount++;
		this.log("error", stage === "ocr" ? "ocr" : "pipeline", `${fileName} pág ${page}: ${message}`);
		this.emit("onPageError", fileName, page, pageCount, stage, message);
	}

	/** Settles an OCR job exactly once, with text or with an error message */
	completeOcrJob(jobId, text, errorMessage) {
		const jobInfo = this.activeJobs.get(jobId);
		if (!jobInfo) return;
		this.activeJobs.delete(jobId);

		if (errorMessage !== null && errorMessage !== undefined) {
			this.recordPageError(jobInfo.fileName, jobInfo.page, jobInfo.pageCount, "ocr", errorMessage);
			return;
		}

		const docState = this.processedDocs.get(jobInfo.fileName);
		if (!docState) return;
		docState.pages.set(jobInfo.page, text);
		docState.completedPages++;
		this.ocrPagesCount++;
		this.completedPagesCount++;
		this.emit(
			"onOcrSuccess",
			jobId,
			text,
			jobInfo.fileName,
			jobInfo.page,
			jobInfo.pageCount,
			this.ocrPagesCount,
			this.completedPagesCount,
			this.totalEstimatedPages,
		);
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
				this.emit("onWorkerStatusUpdate", workerIndex, "idle", "Aguardando tarefa");

				const ms = Math.round(performance.now() - (job.startedAt ?? performance.now()));
				if (data.type === "ocr_success") {
					this.log(
						"debug",
						`ocr-${workerIndex}`,
						`Job ${data.jobId} ok em ${ms} ms (${data.text.length} caracteres)`,
					);
					this.completeOcrJob(data.jobId, data.text, null);
				} else {
					this.completeOcrJob(data.jobId, null, data.message);
				}

				this.dispatchOcrJobs();
				this.checkCompletion();
			}
		}
	}

	checkCompletion() {
		if (this.isPipelineFinished && this.activeJobs.size === 0 && this.ocrQueue.length === 0) {
			this.log(
				"info",
				"coordenador",
				`Fim: ${this.pdfPagesCount} páginas nativas, ${this.ocrPagesCount} por OCR`,
			);
			this.emit("onFinished", this.processedDocs, this.currentTree);
			this.terminateAllWorkers();
		}
	}
}

function describeErrorEvent(event) {
	const where = event.filename ? ` (${event.filename}:${event.lineno ?? "?"})` : "";
	return `${event.message || "erro desconhecido (falha ao carregar o script?)"}${where}`;
}
