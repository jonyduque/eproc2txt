import Dropzone from "./Dropzone/Dropzone";
import "./LoadingScreen.css";

export default function LoadingScreen({ onZipParsed, onLoadingChange }) {
	return (
		<div className="loading-screen-container animate-fade-up">
			<Dropzone onZipParsed={onZipParsed} onLoadingChange={onLoadingChange} />
		</div>
	);
}
