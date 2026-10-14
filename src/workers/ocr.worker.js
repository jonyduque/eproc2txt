import { createWorker } from "tesseract.js";

let tesseractWorker = null;
let currentTessDataPath = null;

/**
 * Inicializa ou re-inicializa o worker do Tesseract se o caminho do modelo mudou
 */
async function getTesseractWorker(tessDataPath) {
	if (tesseractWorker && currentTessDataPath === tessDataPath) {
		return tesseractWorker;
	}

	// Se o caminho mudou ou é a primeira inicialização, destrói o anterior
	if (tesseractWorker) {
		await tesseractWorker.terminate();
		tesseractWorker = null;
	}

	// tesseract.js caches traineddata in IndexedDB under `${cachePath}/por.traineddata`, without
	// the langPath; a per-model cachePath keeps fast/standard/best from reusing each other's file
	const modelName = tessDataPath.replace(/\/+$/, "").split("/").pop();

	// createWorker only rejects when the core fails to load; a failed traineddata download or
	// initialize is swallowed and the promise never settles. errorHandler receives those failures
	// (as strings), so we race it to turn them into an error instead of a hung job.
	let rejectInit = null;
	const initFailed = new Promise((_resolve, reject) => {
		rejectInit = reject;
	});
	const created = createWorker("por", 1, {
		langPath: tessDataPath,
		cachePath: `tessdata-${modelName}`,
		errorHandler: (message) => rejectInit?.(message),
	});
	try {
		tesseractWorker = await Promise.race([created, initFailed]);
	} finally {
		// After init, recognize() rejects on its own; errorHandler must not throw anywhere
		rejectInit = null;
	}
	currentTessDataPath = tessDataPath;
	return tesseractWorker;
}

self.onmessage = async (event) => {
	const { type, jobId, width, height, imageBuffer, tessDataPath } = event.data;

	if (type === "ocr_job") {
		try {
			const worker = await getTesseractWorker(tessDataPath);

			// Reconstrói a imagem usando os pixels transferidos em um OffscreenCanvas
			const canvas = new OffscreenCanvas(width, height);
			const ctx = canvas.getContext("2d");
			const imgData = new ImageData(new Uint8ClampedArray(imageBuffer), width, height);
			ctx.putImageData(imgData, 0, 0);

			// Executa o OCR
			const {
				data: { text },
			} = await worker.recognize(canvas);
			const cleanedText = text
				? text
						.replace(/(?:\r?\n\s*)+/g, "\n")
						.replace(/[ \t]+/g, " ")
						.trim()
				: "";

			// Retorna o resultado para a Main Thread, devolvendo o buffer de imagem se necessário (opcional)
			self.postMessage(
				{
					type: "ocr_success",
					jobId,
					text: cleanedText,
					imageBuffer: imageBuffer,
				},
				[imageBuffer],
			); // Transfere o buffer de volta para liberar memória do worker
		} catch (err) {
			console.error(`[OCR] Falha no job ${jobId}:`, err);
			self.postMessage(
				{
					type: "ocr_error",
					jobId,
					// tesseract.js rejects with err.toString(), a plain string, not an Error
					message: err instanceof Error ? err.message : String(err),
					imageBuffer: imageBuffer,
				},
				[imageBuffer],
			);
		}
	} else if (type === "terminate") {
		if (tesseractWorker) {
			await tesseractWorker.terminate();
			tesseractWorker = null;
		}
		self.close();
	}
};
