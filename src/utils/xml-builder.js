/**
 * Escapes special XML characters in a string.
 *
 * @param {string} unsafe - The raw string to escape.
 * @returns {string} The escaped XML-safe string.
 */
function escapeXml(unsafe) {
	if (!unsafe) return "";
	return unsafe.replace(/[<>&'"]/g, (c) => {
		switch (c) {
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case "&":
				return "&amp;";
			case "'":
				return "&apos;";
			case '"':
				return "&quot;";
			default:
				return c;
		}
	});
}

/**
 * Builds the consolidated XML output string from the processed document tree.
 *
 * @param {Array<{ eventNumber: number, documents: Array<{ docNumber: number, pages: Array<{ pagId: number, content: string }> }> }>} tree - The processed event-document tree.
 * @returns {string} The consolidated XML content.
 */
export function buildConsolidatedXml(tree) {
	let xml = "";

	// 1. Generate Indice
	xml += "<indice>\n";
	tree.values().forEach((event) => {
		if (event.eventNumber === 0) {
			// Sum pages of all docs in event 0 (should typically be just 1 cover document)
			const pageCount = event.documents
				.values()
				.map((doc) => (doc.pages ? doc.pages.length : 0))
				.reduce((sum, count) => sum + count, 0);
			const pageLabel = pageCount === 1 ? "1 página" : `${pageCount} páginas`;
			xml += `- Capa do processo: ${pageLabel}\n`;
		} else if (event.eventNumber === -1) {
			xml += `- Arquivos fora de padrão:\n`;
			event.documents.values().forEach((doc) => {
				const pageCount = doc.pages ? doc.pages.length : 0;
				const pageLabel = pageCount === 1 ? "1 página" : `${pageCount} páginas`;
				xml += `\t- ${doc.fileName}: ${pageLabel}\n`;
			});
		} else {
			xml += `- Evento ${event.eventNumber}\n`;
			event.documents.values().forEach((doc) => {
				const pageCount = doc.pages ? doc.pages.length : 0;
				const pageLabel = pageCount === 1 ? "1 página" : `${pageCount} páginas`;
				xml += `\t- Doc ${doc.docNumber}: ${pageLabel}\n`;
			});
		}
	});
	xml += "</indice>\n";

	// 2. Generate content elements
	tree.values().forEach((event) => {
		if (event.eventNumber === 0) {
			xml += `<capa>\n`;
			event.documents.values().forEach((doc) => {
				if (doc.pages) {
					doc.pages.values().forEach((page) => {
						const escapedContent = escapeXml(page.content);
						xml += `\t<pag n="${page.pagId}">\n`;
						const lines = escapedContent.split("\n");
						const indentedContent = lines
							.map((line) => line.trim())
							.filter((line) => line.length > 0)
							.map((line) => `\t\t${line}`)
							.join("\n");
						if (indentedContent) {
							xml += `${indentedContent}\n`;
						}
						xml += `\t</pag>\n`;
					});
				}
			});
			xml += `</capa>\n`;
		} else if (event.eventNumber === -1) {
			event.documents.values().forEach((doc) => {
				xml += `<arquivo_fora_padrao nome="${escapeXml(doc.fileName)}">\n`;
				if (doc.pages) {
					doc.pages.values().forEach((page) => {
						const escapedContent = escapeXml(page.content);
						xml += `\t<pag n="${page.pagId}">\n`;
						const lines = escapedContent.split("\n");
						const indentedContent = lines
							.map((line) => line.trim())
							.filter((line) => line.length > 0)
							.map((line) => `\t\t${line}`)
							.join("\n");
						if (indentedContent) {
							xml += `${indentedContent}\n`;
						}
						xml += `\t</pag>\n`;
					});
				}
				xml += `</arquivo_fora_padrao>\n`;
			});
		} else {
			xml += `<evento n="${event.eventNumber}">\n`;
			event.documents.values().forEach((doc) => {
				xml += `\t<doc n="${doc.docNumber}">\n`;
				if (doc.pages) {
					doc.pages.values().forEach((page) => {
						const escapedContent = escapeXml(page.content);
						xml += `\t\t<pag n="${page.pagId}">\n`;
						// Indent content for readability, preserving lines but trimming start/end of whole block
						const lines = escapedContent.split("\n");
						const indentedContent = lines
							.map((line) => line.trim())
							.filter((line) => line.length > 0)
							.map((line) => `\t\t\t${line}`)
							.join("\n");
						if (indentedContent) {
							xml += `${indentedContent}\n`;
						}
						xml += `\t\t</pag>\n`;
					});
				}
				xml += `\t</doc>\n`;
			});
			xml += `</evento>\n`;
		}
	});

	return xml;
}
