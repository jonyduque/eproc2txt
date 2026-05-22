/**
 * Escapes special XML characters in a string.
 *
 * @param {string} unsafe - The raw string to escape.
 * @returns {string} The escaped XML-safe string.
 */
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
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
  let xml = '';

  // 1. Generate Indice
  xml += '<indice>\n';
  for (const event of tree) {
    if (event.eventNumber === 0) {
      // Sum pages of all docs in event 0 (should typically be just 1 cover document)
      let pageCount = 0;
      for (const doc of event.documents) {
        pageCount += doc.pages ? doc.pages.length : 0;
      }
      const pageLabel = pageCount === 1 ? '1 página' : `${pageCount} páginas`;
      xml += `- Capa do processo: ${pageLabel}\n`;
    } else {
      xml += `- Evento ${event.eventNumber}\n`;
      for (const doc of event.documents) {
        const pageCount = doc.pages ? doc.pages.length : 0;
        const pageLabel = pageCount === 1 ? '1 página' : `${pageCount} páginas`;
        xml += `\t- Doc ${doc.docNumber}: ${pageLabel}\n`;
      }
    }
  }
  xml += '</indice>\n';

  // 2. Generate content elements
  for (const event of tree) {
    if (event.eventNumber === 0) {
      xml += `<capa>\n`;
      for (const doc of event.documents) {
        if (doc.pages) {
          for (const page of doc.pages) {
            const escapedContent = escapeXml(page.content);
            xml += `\t<pag n="${page.pagId}">\n`;
            const lines = escapedContent.split('\n');
            const indentedContent = lines
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .map(line => `\t\t${line}`)
              .join('\n');
            if (indentedContent) {
              xml += `${indentedContent}\n`;
            }
            xml += `\t</pag>\n`;
          }
        }
      }
      xml += `</capa>\n`;
    } else {
      xml += `<evento n="${event.eventNumber}">\n`;
      for (const doc of event.documents) {
        xml += `\t<doc n="${doc.docNumber}">\n`;
        if (doc.pages) {
          for (const page of doc.pages) {
            const escapedContent = escapeXml(page.content);
            xml += `\t\t<pag n="${page.pagId}">\n`;
            // Indent content for readability, preserving lines but trimming start/end of whole block
            const lines = escapedContent.split('\n');
            const indentedContent = lines
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .map(line => `\t\t\t${line}`)
              .join('\n');
            if (indentedContent) {
              xml += `${indentedContent}\n`;
            }
            xml += `\t\t</pag>\n`;
          }
        }
        xml += `\t</doc>\n`;
      }
      xml += `</evento>\n`;
    }
  }

  return xml;
}
