import { useRef, useState } from "react";
import { parseZipStructure } from "../../../utils/parser.js";
import IsometricViewport3D from "../../Layout/IsometricViewport3D";

interface DropzoneProps {
	onZipParsed: (
		zipData: Uint8Array,
		zipName: string,
		parsedTree: unknown[],
		ignored: unknown[],
	) => void;
	onLoadingChange?: (loading: boolean) => void;
}

export default function Dropzone({ onZipParsed, onLoadingChange }: DropzoneProps) {
	const [hover, setHover] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = async (file: File) => {
		setError(null);
		if (!file?.name.endsWith(".zip")) {
			setError("Por favor, envie um arquivo ZIP válido.");
			return;
		}

		setLoading(true);
		if (onLoadingChange) onLoadingChange(true);

		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				if (!e.target?.result) {
					throw new Error("Falha ao ler o conteúdo do arquivo.");
				}
				const zipData = new Uint8Array(e.target.result as ArrayBuffer);
				const result = parseZipStructure(zipData);

				if (result.tree.length === 0) {
					setError("Nenhum arquivo válido ou PDF encontrado no ZIP.");
					setLoading(false);
					if (onLoadingChange) onLoadingChange(false);
					return;
				}

				const zipName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
				onZipParsed(zipData, zipName, result.tree, result.ignored);
			} catch (err) {
				console.error(err);
				setError(`Erro ao ler arquivo ZIP: ${err instanceof Error ? err.message : String(err)}`);
			} finally {
				setLoading(false);
				if (onLoadingChange) onLoadingChange(false);
			}
		};
		reader.readAsArrayBuffer(file);
	};

	return (
		<div className="crt-monitor-frame">
			<div className="crt-chassis">
				<div className="crt-bezel">
					<div className="crt-screen-container">
						<label
							onDragOver={(e) => {
								e.preventDefault();
								setHover(true);
							}}
							onDragLeave={() => setHover(false)}
							onDrop={(e) => {
								e.preventDefault();
								setHover(false);
								const f = e.dataTransfer.files?.[0];
								if (f) handleFile(f);
							}}
							className={`dropzone-card panel scanlines crt-screen ${hover ? "hovered" : ""} ${loading ? "loading" : ""}`}
						>
							<input
								type="file"
								ref={fileInputRef}
								accept=".zip"
								className="visually-hidden"
								onChange={(e) => {
									if (e.target.files && e.target.files.length > 0) {
										handleFile(e.target.files[0]);
									}
								}}
								disabled={loading}
							/>

							{loading && <div className="scan-line" />}

							<IsometricViewport3D
								status="idle"
								maxWorkers={0}
								workerStatuses={[]}
								docStatuses={{}}
								globalLoading={false}
								isDragHovered={hover}
							/>

							<div className="dropzone-icon-wrapper">
								<div className="dropzone-circle-outer" />
								<div className="dropzone-circle-orbit" />
								<div className="dropzone-circle-glow" />
								<span className="material-icons dropzone-svg-icon-material">upload_file</span>
							</div>

							<div className="dropzone-text-group">
								<p className="dropzone-prompt">
									{loading ? "Lendo arquivo…" : "Arraste o .zip aqui ou clique para selecionar"}
								</p>
							</div>
						</label>
					</div>
				</div>
				<div className="crt-control-bar">
					<div className="crt-brand">EPROC-TXT CRT-80</div>
					<div className="crt-dials">
						<div className="crt-dial" />
						<div className="crt-dial" />
					</div>
					<div className="crt-power-section">
						<span className="crt-power-label">POWER</span>
						<div className={`crt-power-led ${loading ? "busy" : "active"}`} />
						<button
							type="button"
							className="crt-power-btn"
							onClick={() => fileInputRef.current?.click()}
							title="Carregar arquivo .zip"
						/>
					</div>
				</div>
			</div>
			<div className="crt-neck" />
			<div className="crt-base" />
			{error && <p className="dropzone-error animate-fade-in">{error}</p>}
		</div>
	);
}
