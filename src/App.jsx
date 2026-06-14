import ConfigScreen from "./components/ConfigScreen/ConfigScreen.jsx";
import DoneScreen from "./components/DoneScreen/DoneScreen.jsx";
import BackgroundFX from "./components/Layout/Background/BackgroundFX.jsx";
import { BackgroundGradientAnimation } from "./components/Layout/Background/BackgroundGradient.tsx";
import Footer from "./components/Layout/Footer.jsx";
import Header from "./components/Layout/Header.jsx";
import IsometricViewport3D from "./components/Layout/IsometricViewport3D";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen.jsx";
import ProcessingScreen from "./components/ProcessingScreen/ProcessingScreen.jsx";
import usePipeline from "./hooks/usePipeline.js";

export default function App() {
	const {
		status,
		globalLoading,
		zipName,
		tree,
		ignoredFiles,
		selectedPaths,
		isPaused,
		pdfPages,
		ocrPages,
		consolidatedXml,
		workerStatuses,
		docStatuses,
		mockState,
		maxWorkers,
		tessModel,
		elapsedTime,
		elapsedMs,
		timerStartTime,
		timerAccumulatedMs,
		startPipeline,
		cancelPipeline,
		resetPipeline,
		pausePipeline,
		resumePipeline,
		setWorkers,
		setTessModel,
		setMockState,
		setSelectedPaths,
		setGlobalLoading,
		handleZipParsed,
	} = usePipeline();

	// Determine status indicators for the header
	let statusClass = "loading pulse-radar-dot";
	let statusLabel = "Aguardando Arquivo";

	if (globalLoading) {
		statusClass = "processing";
		statusLabel = "Lendo ZIP...";
	} else if (status === "configuring") {
		statusClass = "loading";
		statusLabel = "Pronto";
	} else if (status === "processing") {
		statusClass = "processing";
		statusLabel = "Processando";
	} else if (status === "completed") {
		statusClass = "finished";
		statusLabel = "Finalizado";
	}

	const renderScreen = () => {
		if (status === "completed") {
			const totalDocsCount = Object.keys(docStatuses).length || 1;
			return (
				<DoneScreen
					totalDocsCount={totalDocsCount}
					pdfPages={pdfPages}
					ocrPages={ocrPages}
					maxWorkers={maxWorkers}
					tessModel={tessModel}
					elapsedTime={elapsedTime}
					consolidatedXml={consolidatedXml}
					onReset={resetPipeline}
				/>
			);
		}

		if (status === "processing") {
			return (
				<ProcessingScreen
					isPaused={isPaused}
					timerStartTime={timerStartTime}
					timerAccumulatedMs={timerAccumulatedMs}
					elapsedMs={elapsedMs}
					pdfPages={pdfPages}
					ocrPages={ocrPages}
					docStatuses={docStatuses}
					workerStatuses={workerStatuses}
					maxWorkers={maxWorkers}
					onResume={resumePipeline}
					onPause={pausePipeline}
					onCancel={cancelPipeline}
					tree={tree}
				/>
			);
		}

		if (status === "configuring") {
			return (
				<ConfigScreen
					zipName={zipName}
					tree={tree}
					ignoredFiles={ignoredFiles}
					selectedPaths={selectedPaths}
					setSelectedPaths={setSelectedPaths}
					workers={maxWorkers}
					setWorkers={setWorkers}
					tessModel={tessModel}
					setTessModel={setTessModel}
					onStart={startPipeline}
					onReset={resetPipeline}
				/>
			);
		}

		return <LoadingScreen onZipParsed={handleZipParsed} onLoadingChange={setGlobalLoading} />;
	};

	return (
		<main className="app-main-layout">
			{/* Animated gradient background overlay */}
			<BackgroundGradientAnimation
				containerClassName="app-fixed-background-gradient"
				interactive={true}
			/>

			<BackgroundFX />

			<Header statusClass={statusClass} statusLabel={statusLabel} />

			<section className="app-content-wrapper">
				<IsometricViewport3D
					status={status}
					maxWorkers={maxWorkers}
					workerStatuses={workerStatuses}
					docStatuses={docStatuses}
					globalLoading={globalLoading}
				/>
				{renderScreen()}
			</section>

			<Footer mockState={mockState} setMockState={setMockState} />
		</main>
	);
}
