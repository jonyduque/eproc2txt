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

	tesseractWorker = await createWorker("por", 1, { langPath: tessDataPath });
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
			const cleanedText = text ? text.replace(/\s+/g, " ").trim() : "";

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
			self.postMessage(
				{
					type: "ocr_error",
					jobId,
					message: err.message,
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
