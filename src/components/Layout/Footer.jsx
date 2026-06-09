import "./Footer.css";

export default function Footer({ mockState, setMockState }) {
	const isDev =
		import.meta.env.DEV ||
		window.location.hostname === "localhost" ||
		window.location.hostname === "127.0.0.1";

	if (!isDev) {
		return (
			<footer className="app-footer">
				eproc2txt {"// processamento paralelo de documentos judiciais"}
			</footer>
		);
	}

	return (
		<footer className="app-footer dev-footer">
			<div className="footer-brand">
				eproc2txt <span className="dev-badge">MODO DEV</span>
			</div>
			<div className="dev-toolbar">
				<button
					type="button"
					className={`btn-dev ${mockState === null ? "active" : ""}`}
					onClick={() => setMockState(null)}
				>
					Nativo
				</button>
				<button
					type="button"
					className={`btn-dev ${mockState === "loaded" ? "active" : ""}`}
					onClick={() => setMockState("loaded")}
				>
					Mock: Loaded
				</button>
				<button
					type="button"
					className={`btn-dev ${mockState === "processing" ? "active" : ""}`}
					onClick={() => setMockState("processing")}
				>
					Mock: Processing
				</button>
				<button
					type="button"
					className={`btn-dev ${mockState === "completed" ? "active" : ""}`}
					onClick={() => setMockState("completed")}
				>
					Mock: Done
				</button>
			</div>
		</footer>
	);
}
