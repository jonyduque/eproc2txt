import { useState } from "react";
import "./DoneScreen.css";

// @ts-expect-error
Symbol.dispose ??= Symbol("Symbol.dispose");

class DisposableUrl {
	url: string;
	constructor(url: string) {
		this.url = url;
	}
	[Symbol.dispose]() {
		URL.revokeObjectURL(this.url);
	}
}

interface DoneScreenProps {
	totalDocsCount: number;
	pdfPages: number;
	ocrPages: number;
	maxWorkers: number;
	tessModel: string;
	elapsedTime: string;
	consolidatedXml: string;
	onReset: () => void;
}

export default function DoneScreen({
	totalDocsCount,
	pdfPages,
	ocrPages,
	maxWorkers,
	tessModel,
	elapsedTime,
	consolidatedXml,
	onReset,
}: DoneScreenProps) {
	const [copied, setCopied] = useState(false);
	const completedPages = pdfPages + ocrPages;

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
		const blob = new Blob([consolidatedXml], {
			type: "text/plain;charset=utf-8",
		});
		using disposable = new DisposableUrl(URL.createObjectURL(blob));
		const a = document.createElement("a");
		a.href = disposable.url;
		a.download = "consolidado.txt";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	return (
		<div className="done-view-container animate-fade-up">
			<div className="done-header-banner">
				<div className="done-success-icon-wrapper animate-glow-pulse">
					<span className="material-icons done-success-material">check_circle</span>
				</div>
				<p className="done-status-tagline">{"// processamento concluído"}</p>
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
		</div>
	);
}
