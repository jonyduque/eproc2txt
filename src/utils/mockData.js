export const mockTreeData = [
	{
		eventNumber: 0,
		documents: [
			{
				originalPath: "capa_processo.pdf",
				fileName: "capa_processo.pdf",
				eventNumber: 0,
				docType: "Capa do Processo",
				docNumber: 1,
				extension: "pdf",
				size: 102400,
				isValidExtension: true,
				isValidNaming: true,
			},
		],
	},
	{
		eventNumber: 1,
		documents: [
			{
				originalPath: "Evento 1/Petição Inicial.pdf",
				fileName: "Petição Inicial.pdf",
				eventNumber: 1,
				docType: "Petição Inicial",
				docNumber: 1,
				extension: "pdf",
				size: 512000,
				isValidExtension: true,
				isValidNaming: true,
			},
			{
				originalPath: "Evento 1/Comprovante Custas.html",
				fileName: "Comprovante Custas.html",
				eventNumber: 1,
				docType: "Comprovante",
				docNumber: 2,
				extension: "html",
				size: 45000,
				isValidExtension: true,
				isValidNaming: true,
			},
		],
	},
	{
		eventNumber: -1,
		documents: [
			{
				originalPath: "Evento 2/Documento_Invalido.docx",
				fileName: "Documento_Invalido.docx",
				eventNumber: -1,
				docType: "Outros",
				docNumber: 1,
				extension: "docx",
				size: 15000,
				isValidExtension: false,
				isValidNaming: false,
				errorDescription: "Extensão '.docx' não suportada.",
			},
			{
				originalPath: "Evento 2/Declaração eproc.pdf",
				fileName: "Declaração eproc.pdf",
				eventNumber: -1,
				docType: "Declaração",
				docNumber: 2,
				extension: "pdf",
				size: 204800,
				isValidExtension: true,
				isValidNaming: true,
			},
		],
	},
];

export const mockSelectedPaths = new Set([
	"capa_processo.pdf",
	"Evento 1/Petição Inicial.pdf",
	"Evento 1/Comprovante Custas.html",
	"Evento 2/Declaração eproc.pdf",
]);

export const mockWorkerStatusesData = [
	{ index: 1, status: "active", job: "Petição Inicial.pdf (Pág 2)" },
	{ index: 2, status: "idle", job: "Aguardando tarefa" },
	{ index: 3, status: "offline", job: "Desativado" },
	{ index: 4, status: "offline", job: "Desativado" },
	{ index: 5, status: "offline", job: "Desativado" },
];

export const mockDocStatusesData = {
	"capa_processo.pdf": {
		status: "done",
		fileName: "capa_processo.pdf",
		pageCount: 1,
		completedPages: 1,
	},
	"Petição Inicial.pdf": {
		status: "processing",
		fileName: "Petição Inicial.pdf",
		pageCount: 5,
		completedPages: 2,
	},
	"Comprovante Custas.html": {
		status: "queued",
		fileName: "Comprovante Custas.html",
		pageCount: 1,
		completedPages: 0,
	},
	"Declaração eproc.pdf": {
		status: "queued",
		fileName: "Declaração eproc.pdf",
		pageCount: 2,
		completedPages: 0,
	},
};

export const mockXmlData = `<?xml version="1.0" encoding="UTF-8"?>
<processo>
  <evento numero="0">
    <documento numero="1" tipo="Capa do Processo" extensao="pdf">
      ESTADO DO RIO GRANDE DO SUL
      PODER JUDICIÁRIO
      TRIBUNAL DE JUSTIÇA
      COMARCA DE PORTO ALEGRE
      
      Autos do Processo nº 5000123-45.2026.8.21.0001
      Autor: João da Silva
      Réu: Estado do Rio Grande do Sul
      
      Este é o texto simulado da Capa do Processo extraído via PDFium nativo.
    </documento>
  </evento>
  <evento numero="1">
    <documento numero="1" tipo="Petição Inicial" extensao="pdf">
      EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE PORTO ALEGRE - RS
      
      JOÃO DA SILVA, já devidamente qualificado nos autos, vem perante Vossa Excelência propor a presente
      AÇÃO ORDINÁRIA DE COBRANÇA
      em face do ESTADO DO RIO GRANDE DO SUL, pelos fatos e fundamentos a seguir expostos...
      
      [Texto Simulado Extraído via OCR no Evento 1]
    </documento>
    <documento numero="2" tipo="Comprovante" extensao="html">
      COMPROVANTE DE PAGAMENTO DE CUSTAS PROCESSUAIS
      Banco do Brasil S.A.
      Data de Processamento: 08/06/2026
      Valor Total: R$ 154,20
      Situação: Transação efetuada com sucesso.
    </documento>
  </evento>
</processo>
`;
