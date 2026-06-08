import { useEffect, useState } from "react";

export default function Header({ statusLabel }) {
	const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

	useEffect(() => {
		if (theme === "light") {
			document.body.classList.add("light-theme");
		} else {
			document.body.classList.remove("light-theme");
		}
		localStorage.setItem("theme", theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "dark" ? "light" : "dark"));
	};

	// Convert status label to match reference wording
	let displayLabel = "AGUARDANDO ARQUIVO";
	let dotClass = "status-dot-idle";

	if (statusLabel === "Aguardando Arquivo") {
		displayLabel = "AGUARDANDO ARQUIVO";
		dotClass = "status-dot-idle pulse-dot";
	} else if (statusLabel === "Pronto") {
		displayLabel = "PRONTO PARA PROCESSAR";
		dotClass = "status-dot-ready pulse-dot";
	} else if (statusLabel === "Processando" || statusLabel === "Lendo ZIP...") {
		displayLabel = "PROCESSAMENTO EM CURSO";
		dotClass = "status-dot-processing animate-blink";
	} else if (statusLabel === "Finalizado") {
		displayLabel = "PROCESSAMENTO CONCLUÍDO";
		dotClass = "status-dot-completed";
	} else if (statusLabel === "Interrompido" || statusLabel === "Cancelado") {
		displayLabel = "PROCESSAMENTO CANCELADO";
		dotClass = "status-dot-canceled";
	}

	return (
		<header className="app-header-nav">
			{/* Brand logo & tagline */}
			<div className="logo-text-group">
				<div className="logo-text-wrapper">
					<span className="logo-title">
						eproc<span className="logo-glow-number text-glow">2</span>txt
					</span>
					<span className="logo-subtitle">ocr · processamento paralelo · ia</span>
				</div>
			</div>

			{/* Header controls & status badge */}
			<div className="header-controls">
				<div className="status-badge">
					<span className={`status-badge-dot ${dotClass}`} />
					<span className="status-badge-label">{displayLabel}</span>
				</div>

				{/* Theme Toggle Button */}
				<button
					type="button"
					className="btn btn-secondary btn-theme-toggle"
					title="Alternar Tema"
					onClick={toggleTheme}
				>
					{theme === "dark" ? (
						<span className="material-icons theme-icon-material" style={{ fontSize: "14px" }}>
							light_mode
						</span>
					) : (
						<span className="material-icons theme-icon-material" style={{ fontSize: "14px" }}>
							dark_mode
						</span>
					)}
				</button>
			</div>
		</header>
	);
}
