import { useRef, useState } from "react";
import { parseZipStructure } from "../../../utils/parser.js";
import IsometricViewport3D from "../../Layout/IsometricViewport3D";

// @ts-expect-error
Promise.try ??= (fn) =>
	new Promise((resolve, reject) => {
		try {
			resolve(fn());
		} catch (e) {
			reject(e);
		}
	});

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

		try {
			// @ts-expect-error
			const zipData = await Promise.try(async () => {
				const buffer = await file.arrayBuffer();
				return new Uint8Array(buffer);
			});
			const result = parseZipStructure(zipData);

			if (result.tree.length === 0) {
				setError("Nenhum arquivo válido ou PDF encontrado no ZIP.");
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

							<div
								className={`dropzone-icon-area ${hover ? "hovered" : ""} ${loading ? "loading" : ""}`}
							>
								<div className="dropzone-dashed-ring" />
								<svg
									className={`dropzone-folder-icon ${loading ? "loading" : ""}`}
									viewBox="0 0 64 64"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									aria-hidden="true"
								>
									{/* Folder body */}
									<path
										className="folder-body"
										d="M6 16C6 13.8 7.8 12 10 12H26L30 16H54C56.2 16 58 17.8 58 20V50C58 52.2 56.2 54 54 54H10C7.8 54 6 52.2 6 50V16Z"
									/>
									{/* Folder tab */}
									<path className="folder-tab" d="M6 16C6 13.8 7.8 12 10 12H26L30 16H10" />
									{/* Upload arrow shaft */}
									<line
										className="upload-arrow"
										x1="32"
										y1="42"
										x2="32"
										y2="26"
										strokeLinecap="round"
									/>
									{/* Upload arrow head */}
									<polyline
										className="upload-arrow"
										points="24,33 32,25 40,33"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									{/* Loading spinner arc (only visible when loading) */}
									{loading && (
										<circle
											className="folder-spinner"
											cx="32"
											cy="34"
											r="10"
											strokeLinecap="round"
										/>
									)}
								</svg>
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
