import { unzipSync } from 'fflate';

/**
 * Parses the ZIP file structure using fflate without fully decompressing it into memory.
 * Collects metadata for matching eproc documents and logs ignored files.
 *
 * @param {Uint8Array} zipData - The raw Uint8Array of the ZIP file.
 * @returns {{ tree: Array<{ eventNumber: number, documents: Array<{ originalPath: string, fileName: string, eventNumber: number, docType: string, docNumber: number, extension: string, size: number }> }>, ignored: Array<{ originalPath: string, fileName: string, size: number }> }}
 */
export function parseZipStructure(zipData) {
  const fileList = [];

  // Use fflate.unzipSync with filter returning false to just gather metadata
  unzipSync(zipData, {
    filter(file) {
      fileList.push({
        name: file.name,
        size: file.originalSize
      });
      return false; // Do not decompress
    }
  });

  const groups = {};
  const ignored = [];

  // Regex to match: Evento {n} - {TIPO}{n}.{pdf|html}
  // Supporting spaces and typical Portuguese characters in the doc type
  const eprocRegex = /^Evento\s+(\d+)\s*-\s*([a-zA-Z\u00C0-\u00FF\s_.-]+?)(\d+)\.(pdf|html)$/i;
  const capaRegex = /^Capa\s+do\s+processo\.(pdf|html)$/i;

  for (const file of fileList) {
    const name = file.name;
    
    // Ignore folders or macOS metadata folders
    if (name.endsWith('/') || name.includes('__MACOSX')) {
      continue;
    }

    // Extract filename from potential path
    const baseName = name.substring(name.lastIndexOf('/') + 1);
    if (!baseName) continue;

    const extMatch = baseName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    const isValidExtension = (ext === 'pdf' || ext === 'html');

    const capaMatch = baseName.match(capaRegex);
    const eprocMatch = baseName.match(eprocRegex);

    if (isValidExtension && capaMatch) {
      if (!groups[0]) {
        groups[0] = [];
      }
      groups[0].push({
        originalPath: name,
        fileName: baseName,
        eventNumber: 0,
        docType: 'Capa',
        docNumber: 0,
        extension: ext,
        size: file.size,
        isValidExtension: true,
        isValidNaming: true
      });
    } else if (isValidExtension && eprocMatch) {
      const eventNum = parseInt(eprocMatch[1], 10);
      const docType = eprocMatch[2].trim();
      const docNum = parseInt(eprocMatch[3], 10);

      if (!groups[eventNum]) {
        groups[eventNum] = [];
      }

      groups[eventNum].push({
        originalPath: name,
        fileName: baseName,
        eventNumber: eventNum,
        docType: docType,
        docNumber: docNum,
        extension: ext,
        size: file.size,
        isValidExtension: true,
        isValidNaming: true
      });
    } else {
      const errorDescription = !isValidExtension
        ? `Formato inválido: ${ext.toUpperCase()}`
        : 'Nomenclatura fora do padrão';

      if (!groups[-1]) {
        groups[-1] = [];
      }

      groups[-1].push({
        originalPath: name,
        fileName: baseName,
        eventNumber: -1,
        docType: 'Fora do Padrão',
        docNumber: 0,
        extension: ext,
        size: file.size,
        isValidExtension: isValidExtension,
        isValidNaming: false,
        errorDescription: errorDescription
      });
    }
  }

  // Sort events chronologically, and documents within events by document number
  const sortedTree = Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)
    .map(eventNum => {
      const documents = groups[eventNum];
      if (eventNum === -1) {
        documents.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base' }));
      } else {
        documents.sort((a, b) => a.docNumber - b.docNumber);
      }
      return {
        eventNumber: eventNum,
        documents: documents
      };
    });

  return {
    tree: sortedTree,
    ignored: []
  };
}
