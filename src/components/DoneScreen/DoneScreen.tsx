import { useState } from "react";
import { downloadText } from "../../utils/run-log.js";
import RunIssues, { type RunIssue } from "../RunIssues/RunIssues";
import "./DoneScreen.css";

interface DoneScreenProps {
	zipName?: string;
	totalDocsCount: number;
	pdfPages: number;
	ocrPages: number;
	maxWorkers: number;
	tessModel: string;
	elapsedTime: string;
	consolidatedXml: string;
	errors?: RunIssue[];
	errorPages?: number;
	onDownloadLog?: () => void;
	onReset: () => void;
}

export default function DoneScreen({
	zipName,
	totalDocsCount,
	pdfPages,
	ocrPages,
	maxWorkers,
	tessModel,
	elapsedTime,
	consolidatedXml,
	errors = [],
	errorPages = 0,
	onDownloadLog,
	onReset,
}: DoneScreenProps) {
	const [copied, setCopied] = useState(false);
	const completedPages = pdfPages + ocrPages + errorPages;

	const handleCopyXml = async () => {
		if (!consolidatedXml) return;
		try {
			await navigator.clipboard.writeText(consolidatedXml);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch (err) {
			console.error("Falha ao copiar XML:", err);
		}
	};

	const handleDownloadXml = () => {
		if (!consolidatedXml) return;
		const downloadFileName = zipName ? `${zipName.replace(/\.zip$/i, "")}.txt` : "consolidado.txt";
		downloadText(downloadFileName, consolidatedXml);
	};

	const errorDocs = new Set(errors.map((e) => e.fileName).filter(Boolean)).size;

	return (
		<div className="done-view-container animate-fade-up">
			<div className="done-header-banner">
				<div className="done-floating-txt-container">
					<div className="txt-floating">
						<div className="file-line title" />
						<div className="file-line md" />
						<div className="file-line sh" />
						<div className="file-line md" />
						<div className="file-line" />
						<div className="file-type-badge">TXT</div>
					</div>
				</div>
				<p className="done-status-tagline">
					{errors.length > 0
						? "// processamento concluído com problemas"
						: "// processamento concluído"}
				</p>
				<h2 className="done-title">{totalDocsCount} documentos convertidos</h2>
				<p className="done-summary-details">
					{completedPages} págs · {maxWorkers} workers · ocr{" "}
					{tessModel === "fast" ? "rápido" : tessModel === "best" ? "preciso" : "normal"}
				</p>
			</div>

			{/* Stats card grid */}
			<div className="done-stats-grid">
				<div className="panel done-stats-card">
					<p className="done-stats-label">tempo total</p>
					<p className="ticker done-stats-value text-glow">{elapsedTime}</p>
				</div>
				<div className="panel done-stats-card">
					<p className="done-stats-label">documentos</p>
					<p className="ticker done-stats-value">{totalDocsCount}</p>
				</div>
				<div className="panel done-stats-card">
					<p className="done-stats-label">páginas</p>
					<p className="ticker done-stats-value">{completedPages}</p>
				</div>
			</div>

			{errors.length > 0 && (
				<RunIssues
					title={`${errors.length} ${errors.length === 1 ? "problema" : "problemas"} em ${errorDocs} ${errorDocs === 1 ? "documento" : "documentos"}`}
					hint="O resultado foi gerado mesmo assim. Cada página afetada aparece no arquivo como [Erro ...] no lugar do texto. O log ajuda a investigar a causa."
					issues={errors}
					onDownloadLog={onDownloadLog}
				/>
			)}

			{/* Export actions */}
			<div className="done-actions-row">
				<button type="button" onClick={handleCopyXml} className="btn-copy-xml">
					<span className="material-icons" style={{ fontSize: "16px" }}>
						{copied ? "check" : "content_copy"}
					</span>
					{copied ? "copiado" : "copiar resultado"}
				</button>

				<button type="button" onClick={handleDownloadXml} className="btn-download-xml">
					<span className="material-icons" style={{ fontSize: "16px" }}>
						save
					</span>
					salvar arquivo .txt
				</button>

				<button type="button" onClick={onReset} className="btn-restart">
					<span className="material-icons" style={{ fontSize: "16px" }}>
						refresh
					</span>
					processar novo arquivo
				</button>
			</div>

			{errors.length === 0 && onDownloadLog && (
				<div className="done-log-row">
					<button type="button" className="done-log-link" onClick={onDownloadLog}>
						baixar log do processamento
					</button>
				</div>
			)}
		</div>
	);
}
