import IsometricViewport3D from "../Layout/IsometricViewport3D";
import Dropzone from "./Dropzone/Dropzone";
import GuideCards from "./GuideCards/GuideCards";
import "./LoadingScreen.css";

export default function LoadingScreen({ onZipParsed, onLoadingChange }) {
	return (
		<div className="loading-screen-container animate-fade-up">
			<IsometricViewport3D
				status="idle"
				maxWorkers={0}
				workerStatuses={[]}
				docStatuses={{}}
				globalLoading={false}
			/>
			<p className="text-glow-magenta loading-subtitle">{"// entrada · arquivo .zip"}</p>

			<h1 className="loading-title">
				Converta processos do
				<br />
				<span className="idle-title-highlight text-glow animate-text-glow">eproc</span> em texto.
			</h1>

			<GuideCards />

			<Dropzone onZipParsed={onZipParsed} onLoadingChange={onLoadingChange} />
		</div>
	);
}
