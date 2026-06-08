import { PDFiumLibrary } from "@hyzyla/pdfium/browser/cdn";
import { unzipSync } from "fflate";

let pdfiumLib = null;
let isPaused = false;
let resolveResume = null;

/**
 * Aguarda a retomada se o pipeline estiver pausado por contra-pressão
 */
async function checkPause() {
	if (isPaused) {
		self.postMessage({
			type: "status",
			message: "Aguardando liberação de memória...",
		});
		await new Promise((resolve) => {
			resolveResume = resolve;
		});
	}
}

/**
 * Converts BGRA pixel data in-place to RGBA, applies grayscale, and performs Otsu's threshold binarization.
 */
function binarizeBgraToRgba(data) {
	const len = data.length;
	const grayscale = new Uint8Array(len / 4);

	// 1. Convert BGRA to Grayscale
	for (let i = 0; i < len; i += 4) {
		const b = data[i];
		const g = data[i + 1];
		const r = data[i + 2];
		grayscale[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
	}

	// 2. Compute Otsu's Threshold
	const histogram = new Int32Array(256);
	for (let i = 0; i < grayscale.length; i++) {
		histogram[grayscale[i]]++;
	}

	const total = grayscale.length;
	let sum = 0;
	for (let t = 0; t < 256; t++) {
		sum += t * histogram[t];
	}

	let sumB = 0;
	let wB = 0;
	let wF = 0;
	let varMax = 0;
	let threshold = 128; // fallback

	for (let t = 0; t < 256; t++) {
		wB += histogram[t];
		if (wB === 0) continue;
		wF = total - wB;
		if (wF === 0) break;

		sumB += t * histogram[t];
		const mB = sumB / wB;
		const mF = (sum - sumB) / wF;

		const varBetween = wB * wF * (mB - mF) * (mB - mF);
		if (varBetween > varMax) {
			varMax = varBetween;
			threshold = t;
		}
	}

	// 3. Write binarized pixels back as RGBA (Canvas expectation)
	for (let i = 0; i < len; i += 4) {
		const gray = grayscale[i / 4];
		const val = gray >= threshold ? 255 : 0;
		data[i] = val; // R
		data[i + 1] = val; // G
		data[i + 2] = val; // B
		data[i + 3] = 255; // A (opaque)
	}
}

const HTML_ENTITIES = {
	nbsp: " ",
	lt: "<",
	gt: ">",
	amp: "&",
	quot: '"',
	apos: "'",
	deg: "°",
	ordm: "º",
	ordf: "ª",
	middot: "·",
	bull: "•",
	ndash: "–",
	mdash: "—",
	copy: "©",
	reg: "®",
	trade: "™",
	euro: "€",
	pound: "£",
	cent: "¢",
	yen: "¥",

	// Portuguese accents and other common latin-1 chars
	aacute: "á",
	Aacute: "Á",
	acirc: "â",
	Acirc: "Â",
	agrave: "à",
	Agrave: "À",
	atilde: "ã",
	Atilde: "Ã",
	ccedil: "ç",
	Ccedil: "Ç",
	eacute: "é",
	Eacute: "É",
	ecirc: "ê",
	Ecirc: "Ê",
	egrave: "è",
	Egrave: "È",
	iacute: "í",
	Iacute: "Í",
	icirc: "î",
	Icirc: "Î",
	igrave: "ì",
	Igrave: "Ì",
	ntilde: "ñ",
	Ntilde: "Ñ",
	oacute: "ó",
	Oacute: "Ó",
	ocirc: "ô",
	Ocirc: "Ô",
	ograve: "ò",
	Ograve: "Ò",
	otilde: "õ",
	Otilde: "Õ",
	uacute: "ú",
	Uacute: "Ú",
	ucirc: "û",
	Ucirc: "Û",
	ugrave: "ù",
	Ugrave: "Ù",
	uuml: "ü",
	Uuml: "Ü",
	yacute: "ý",
	Yacute: "Ý",
};

function cleanHtmlContent(html) {
	if (!html) return "";

	let text = html;

	// Remove content within style, script, and svg blocks
	text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
	text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
	text = text.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");

	// Strip all other HTML tags
	text = text.replace(/<[^>]+>/g, " ");

	// Decode common HTML entities (named, decimal, hex)
	text = text
		.replace(/&([a-zA-Z0-9]+);/g, (match, entity) => {
			if (HTML_ENTITIES[entity]) return HTML_ENTITIES[entity];
			const lower = entity.toLowerCase();
			if (HTML_ENTITIES[lower]) return HTML_ENTITIES[lower];
			return match;
		})
		.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec))
		.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));

	// Collapse excess whitespace
	text = text.replace(/\s+/g, " ");

	return text.trim();
}

function decodeHtmlBytes(bytes) {
	try {
		const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
		return utf8Decoder.decode(bytes);
	} catch (_e) {
		const headerBytes = bytes.slice(0, 4096);
		const latin1Decoder = new TextDecoder("iso-8859-1");
		const headerText = latin1Decoder.decode(headerBytes);

		let charset = null;

		const charsetMatch = headerText.match(/<meta\s+charset=["']?([a-zA-Z0-9_-]+)["']?/i);
		if (charsetMatch?.[1]) {
			charset = charsetMatch[1].toLowerCase();
		} else {
			const contentTypeMatch = headerText.match(
				/<meta[^>]+http-equiv=["']?content-type["']?[^>]+content=["']?[^"'>]*charset=([a-zA-Z0-9_-]+)/i,
			);
			if (contentTypeMatch?.[1]) {
				charset = contentTypeMatch[1].toLowerCase();
			} else {
				const contentPatternMatch = headerText.match(
					/<meta[^>]+content=["']?[^"'>]*charset=([a-zA-Z0-9_-]+)[^>]*http-equiv=["']?content-type/i,
				);
				if (contentPatternMatch?.[1]) {
					charset = contentPatternMatch[1].toLowerCase();
				}
			}
		}

		if (charset && charset !== "utf-8" && charset !== "utf8") {
			try {
				const decoder = new TextDecoder(charset);
				return decoder.decode(bytes);
			} catch (_err) {
				// fallback
			}
		}

		const fallbackDecoder = new TextDecoder("windows-1252");
		return fallbackDecoder.decode(bytes);
	}
}

/**
 * Main pipeline processor (Sem OCR direto)
 */
async function processPipeline(zipData, selectedFiles) {
	// 1. Initialize PDFium
	self.postMessage({
		type: "status",
		message: "Inicializando motor PDFium...",
	});
	if (!pdfiumLib) {
		pdfiumLib = await PDFiumLibrary.init();
	}

	self.postMessage({
		type: "status",
		message: "Iniciando processamento dos arquivos...",
	});

	const totalFiles = selectedFiles.length;

	for (let index = 0; index < totalFiles; index++) {
		const file = selectedFiles[index];
		self.postMessage({
			type: "doc_start",
			fileName: file.fileName,
			index: index + 1,
			total: totalFiles,
		});

		// Extrai os bytes correspondentes do ZIP
		const targetPath = file.originalPath;
		const unzipped = unzipSync(zipData, {
			filter: (f) => f.name === targetPath,
		});

		const fileBytes = unzipped[targetPath];
		if (!fileBytes) {
			self.postMessage({
				type: "log",
				level: "error",
				message: `Falha ao extrair arquivo do ZIP: ${file.fileName}`,
			});
			continue;
		}

		if (file.extension === "html") {
			const htmlText = decodeHtmlBytes(fileBytes);
			const cleaned = cleanHtmlContent(htmlText);

			self.postMessage({
				type: "page_native",
				fileName: file.fileName,
				page: 1,
				pageCount: 1,
				content: cleaned,
			});

			self.postMessage({
				type: "log",
				level: "success",
				message: `[HTML] ${file.fileName}: Texto limpo extraído.`,
			});
		} else if (file.extension === "pdf") {
			try {
				const doc = await pdfiumLib.loadDocument(fileBytes);
				const pageCount = doc.getPageCount();

				// Informa os metadados do documento antes de ler as páginas
				self.postMessage({
					type: "doc_info",
					fileName: file.fileName,
					pageCount: pageCount,
				});

				for (let p = 0; p < pageCount; p++) {
					// Verifica contra-pressão
					await checkPause();

					const page = doc.getPage(p);
					let text = page.getText();
					if (text) {
						text = text.replace(/\s+/g, " ").trim();
					}

					if (text && text.length > 5) {
						self.postMessage({
							type: "page_native",
							fileName: file.fileName,
							page: p + 1,
							pageCount: pageCount,
							content: text,
						});
					} else {
						self.postMessage({
							type: "log",
							level: "info",
							message: `[PDF-OCR] Página ${p + 1}/${pageCount} de ${file.fileName} identificada como escaneada. Renderizando...`,
						});

						const render = await page.render({
							scale: 2.0,
							colorSpace: "BGRA",
						});
						binarizeBgraToRgba(render.data);

						const buffer = render.data.buffer;
						self.postMessage(
							{
								type: "page_ocr_request",
								fileName: file.fileName,
								page: p + 1,
								pageCount: pageCount,
								width: render.width,
								height: render.height,
								imageBuffer: buffer,
							},
							[buffer],
						); // Transfere posse do buffer da imagem
					}
				}
				doc.destroy();
			} catch (err) {
				self.postMessage({
					type: "log",
					level: "error",
					message: `Erro ao processar PDF ${file.fileName}: ${err.message}`,
				});
			}
		}

		// Libera do garbage collector
		delete unzipped[targetPath];
	}

	// Notifica conclusão da varredura sequencial
	self.postMessage({
		type: "pipeline_finished",
	});
}

self.onmessage = async (event) => {
	const { type, zipData, selectedFiles } = event.data;
	if (type === "start") {
		try {
			await processPipeline(zipData, selectedFiles);
		} catch (err) {
			self.postMessage({ type: "error", message: err.message });
		}
	} else if (type === "pause") {
		isPaused = true;
	} else if (type === "resume") {
		isPaused = false;
		if (resolveResume) {
			resolveResume();
			resolveResume = null;
		}
	}
};
