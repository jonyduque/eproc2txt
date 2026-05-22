import { unzipSync } from 'fflate';
import { PDFiumLibrary } from '@hyzyla/pdfium/browser/cdn';
import { createWorker } from 'tesseract.js';

let pdfiumLib = null;
let tesseractWorker = null;

/**
 * Converts BGRA pixel data in-place to RGBA, applies grayscale, and performs Otsu's threshold binarization.
 * 
 * @param {Uint8Array} data - The raw BGRA pixel data array.
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
    data[i] = val;       // R
    data[i + 1] = val;   // G
    data[i + 2] = val;   // B
    data[i + 3] = 255;   // A (opaque)
  }
}

const HTML_ENTITIES = {
  'nbsp': ' ', 'lt': '<', 'gt': '>', 'amp': '&', 'quot': '"', 'apos': "'",
  'deg': '°', 'ordm': 'º', 'ordf': 'ª', 'middot': '·', 'bull': '•',
  'ndash': '–', 'mdash': '—', 'copy': '©', 'reg': '®', 'trade': '™',
  'euro': '€', 'pound': '£', 'cent': '¢', 'yen': '¥',
  
  // Portuguese accents and other common latin-1 chars
  'aacute': 'á', 'Aacute': 'Á',
  'acirc': 'â', 'Acirc': 'Â',
  'agrave': 'à', 'Agrave': 'À',
  'atilde': 'ã', 'Atilde': 'Ã',
  'ccedil': 'ç', 'Ccedil': 'Ç',
  'eacute': 'é', 'Eacute': 'É',
  'ecirc': 'ê', 'Ecirc': 'Ê',
  'egrave': 'è', 'Egrave': 'È',
  'iacute': 'í', 'Iacute': 'Í',
  'icirc': 'î', 'Icirc': 'Î',
  'igrave': 'ì', 'Igrave': 'Ì',
  'ntilde': 'ñ', 'Ntilde': 'Ñ',
  'oacute': 'ó', 'Oacute': 'Ó',
  'ocirc': 'ô', 'Ocirc': 'Ô',
  'ograve': 'ò', 'Ograve': 'Ò',
  'otilde': 'õ', 'Otilde': 'Õ',
  'uacute': 'ú', 'Uacute': 'Ú',
  'ucirc': 'û', 'Ucirc': 'Û',
  'ugrave': 'ù', 'Ugrave': 'Ù',
  'uuml': 'ü', 'Uuml': 'Ü',
  'yacute': 'ý', 'Yacute': 'Ý'
};

/**
 * Regex-based HTML cleaner that strips styles, scripts, SVGs, tags,
 * decodes entities, and collapses spaces.
 * 
 * @param {string} html - The raw HTML string.
 * @returns {string} Cleaned plain text.
 */
function cleanHtmlContent(html) {
  if (!html) return '';

  let text = html;

  // Remove content within style, script, and svg blocks
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');

  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities (named, decimal, hex)
  text = text
    .replace(/&([a-zA-Z0-9]+);/g, (match, entity) => {
      if (HTML_ENTITIES[entity]) return HTML_ENTITIES[entity];
      const lower = entity.toLowerCase();
      if (HTML_ENTITIES[lower]) return HTML_ENTITIES[lower];
      return match;
    })
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Collapse excess whitespace
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}

/**
 * Decodes HTML bytes using the charset declared in the HTML meta tag or
 * automatically falls back to UTF-8 or Windows-1252.
 * 
 * @param {Uint8Array} bytes - The HTML file raw bytes.
 * @returns {string} The decoded HTML string.
 */
function decodeHtmlBytes(bytes) {
  // 1. First, attempt to decode as UTF-8 with fatal: true.
  // UTF-8 validation is extremely reliable for detecting if a file contains valid UTF-8 sequences.
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    return utf8Decoder.decode(bytes);
  } catch (e) {
    // UTF-8 decoding failed, meaning the file contains invalid UTF-8 sequences.
    // We fall back to looking at the meta tags or using Windows-1252.
    
    // Decode the first 4096 bytes as latin1 (iso-8859-1) to check for a charset meta tag.
    // latin1 is safe because it maps bytes 0-255 1-to-1 to unicode code points 0-255 without throwing.
    const headerBytes = bytes.slice(0, 4096);
    const latin1Decoder = new TextDecoder('iso-8859-1');
    const headerText = latin1Decoder.decode(headerBytes);
    
    let charset = null;
    
    // Try to find <meta charset="...">
    const charsetMatch = headerText.match(/<meta\s+charset=["']?([a-zA-Z0-9_-]+)["']?/i);
    if (charsetMatch && charsetMatch[1]) {
      charset = charsetMatch[1].toLowerCase();
    } else {
      // Try to find <meta http-equiv="Content-Type" content="...charset=...">
      const contentTypeMatch = headerText.match(/<meta[^>]+http-equiv=["']?content-type["']?[^>]+content=["']?[^"'>]*charset=([a-zA-Z0-9_-]+)/i);
      if (contentTypeMatch && contentTypeMatch[1]) {
        charset = contentTypeMatch[1].toLowerCase();
      } else {
        const contentPatternMatch = headerText.match(/<meta[^>]+content=["']?[^"'>]*charset=([a-zA-Z0-9_-]+)[^>]*http-equiv=["']?content-type/i);
        if (contentPatternMatch && contentPatternMatch[1]) {
          charset = contentPatternMatch[1].toLowerCase();
        }
      }
    }
    
    // If a non-UTF-8 charset was declared, attempt to use it.
    // Note: We skip 'utf-8' and 'utf8' here because we already know it failed UTF-8 validation.
    if (charset && charset !== 'utf-8' && charset !== 'utf8') {
      try {
        const decoder = new TextDecoder(charset);
        return decoder.decode(bytes);
      } catch (err) {
        // If specified charset is invalid or unsupported, fallback
      }
    }
    
    // Default fallback to windows-1252 for Portuguese single-byte encoding
    const fallbackDecoder = new TextDecoder('windows-1252');
    return fallbackDecoder.decode(bytes);
  }
}

/**
 * Main pipeline processor
 */
async function processPipeline(zipData, selectedFiles, tessDataPath) {
  // 1. Initialize dependencies
  self.postMessage({ type: 'status', message: 'Inicializando motor PDFium...' });
  if (!pdfiumLib) {
    pdfiumLib = await PDFiumLibrary.init();
  }

  self.postMessage({ type: 'status', message: 'Inicializando motor Tesseract OCR (Português)...' });
  if (!tesseractWorker) {
    tesseractWorker = await createWorker('por', 1, { langPath: tessDataPath });
  }

  self.postMessage({ type: 'status', message: 'Iniciando processamento dos arquivos...' });

  const totalFiles = selectedFiles.length;
  let pdfPagesCount = 0;
  let ocrPagesCount = 0;

  const resultTree = [];

  for (let index = 0; index < totalFiles; index++) {
    const file = selectedFiles[index];
    self.postMessage({ 
      type: 'doc_start', 
      fileName: file.fileName, 
      index: index + 1, 
      total: totalFiles 
    });

    // Extract the specific file data from ZIP in a memory-efficient way
    const targetPath = file.originalPath;
    const unzipped = unzipSync(zipData, {
      filter: (f) => f.name === targetPath
    });
    
    const fileBytes = unzipped[targetPath];
    if (!fileBytes) {
      self.postMessage({
        type: 'log',
        level: 'error',
        message: `Falha ao extrair arquivo do ZIP: ${file.fileName}`
      });
      continue;
    }

    const docResult = {
      eventNumber: file.eventNumber,
      docNumber: file.docNumber,
      docType: file.docType,
      fileName: file.fileName,
      extension: file.extension,
      pages: []
    };

    if (file.extension === 'html') {
      // Decode HTML using detected charset, falling back to UTF-8 / Windows-1252
      const htmlText = decodeHtmlBytes(fileBytes);
      const cleaned = cleanHtmlContent(htmlText);

      docResult.pages.push({
        pagId: 1,
        content: cleaned,
        method: 'native'
      });

      self.postMessage({
        type: 'log',
        level: 'success',
        message: `[HTML] ${file.fileName}: Texto limpo extraído.`
      });
    } else if (file.extension === 'pdf') {
      try {
        const doc = await pdfiumLib.loadDocument(fileBytes);
        const pageCount = doc.getPageCount();

        for (let p = 0; p < pageCount; p++) {
          const page = doc.getPage(p);
          let text = page.getText();
          if (text) {
            text = text.replace(/\s+/g, ' ').trim();
          }

          if (text && text.length > 5) { // Threshold for valid native text length
            docResult.pages.push({
              pagId: p + 1,
              content: text,
              method: 'native'
            });
            pdfPagesCount++;
            self.postMessage({
              type: 'page_complete',
              method: 'native',
              fileName: file.fileName,
              page: p + 1,
              pageCount: pageCount
            });
          } else {
            // Scanned page - render to bitmap and run Tesseract OCR
            self.postMessage({
              type: 'log',
              level: 'info',
              message: `[PDF-OCR] Página ${p + 1}/${pageCount} de ${file.fileName} identificada como escaneada. Renderizando...`
            });

            // Render page at scale 2.0 for higher OCR quality
            const render = await page.render({ scale: 2.0, colorSpace: 'BGRA' });
            
            // Apply binarization in-place and convert to RGBA
            binarizeBgraToRgba(render.data);

            // Setup OffscreenCanvas
            const canvas = new OffscreenCanvas(render.width, render.height);
            const ctx = canvas.getContext('2d');
            const imgData = new ImageData(new Uint8ClampedArray(render.data), render.width, render.height);
            ctx.putImageData(imgData, 0, 0);

            // Execute Tesseract OCR
            const { data: { text: ocrText } } = await tesseractWorker.recognize(canvas);
            const cleanedOcrText = ocrText ? ocrText.replace(/\s+/g, ' ').trim() : '';

            docResult.pages.push({
              pagId: p + 1,
              content: cleanedOcrText,
              method: 'ocr'
            });
            ocrPagesCount++;
            self.postMessage({
              type: 'page_complete',
              method: 'ocr',
              fileName: file.fileName,
              page: p + 1,
              pageCount: pageCount
            });
          }
        }
        doc.destroy(); // Free document resources immediately
      } catch (err) {
        self.postMessage({
          type: 'log',
          level: 'error',
          message: `Erro ao processar PDF ${file.fileName}: ${err.message}`
        });
      }
    }

    resultTree.push(docResult);

    // Explicitly delete references to free memory
    delete unzipped[targetPath];
  }

  // Cleanup workers and WASM instances to free memory
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }

  self.postMessage({
    type: 'complete',
    resultTree,
    pdfPagesCount,
    ocrPagesCount
  });
}

self.onmessage = async (event) => {
  const { type, zipData, selectedFiles, tessDataPath } = event.data;
  if (type === 'start') {
    try {
      await processPipeline(zipData, selectedFiles, tessDataPath);
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
      if (tesseractWorker) {
        await tesseractWorker.terminate();
        tesseractWorker = null;
      }
    }
  }
};
