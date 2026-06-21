import { useEffect, useRef, useState } from "react";
import ConfigPanel from "./components/ConfigScreen/ConfigPanel/ConfigPanel.tsx";
import ConfigScreen from "./components/ConfigScreen/ConfigScreen.jsx";
import DoneScreen from "./components/DoneScreen/DoneScreen.tsx";
import BackgroundFX from "./components/Layout/Background/BackgroundFX.jsx";
import { BackgroundGradientAnimation } from "./components/Layout/Background/BackgroundGradient.tsx";
import Footer from "./components/Layout/Footer.jsx";
import Header from "./components/Layout/Header.jsx";
import RetroTV from "./components/Layout/RetroTV.tsx";
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

	const [isSwitchingChannel, setIsSwitchingChannel] = useState(false);
	const prevStatusRef = useRef(status);

	useEffect(() => {
		if (prevStatusRef.current !== status) {
			setIsSwitchingChannel(true);
			const timer = setTimeout(() => {
				setIsSwitchingChannel(false);
			}, 400);
			prevStatusRef.current = status;
			return () => clearTimeout(timer);
		}
	}, [status]);

	const handleStartClick = () => {
		const selectedList = [];
		if (tree) {
			for (const event of tree) {
				for (const doc of event.documents) {
					if (selectedPaths.has(doc.originalPath)) {
						selectedList.push(doc);
					}
				}
			}
		}
		if (selectedList.length > 0) {
			startPipeline(selectedList);
		}
	};

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
					zipName={zipName}
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
					selectedPaths={selectedPaths}
					setSelectedPaths={setSelectedPaths}
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
				<div className="retro-tv-layout-grid">
					<div className="retro-tv-left-column">
						<RetroTV
							isSwitchingChannel={isSwitchingChannel}
							isLoading={globalLoading || status === "processing"}
						>
							{renderScreen()}
						</RetroTV>
					</div>
					<div className="retro-tv-right-column">
						<ConfigPanel
							disabled={status !== "configuring"}
							workers={maxWorkers}
							setWorkers={setWorkers}
							maxAllowedWorkers={Math.max(navigator.hardwareConcurrency || 3, 3)}
							tessModel={tessModel}
							setTessModel={setTessModel}
							selectedPathsSize={selectedPaths?.size || 0}
							handleStartClick={handleStartClick}
							ignoredFiles={ignoredFiles}
						/>
					</div>
				</div>
			</section>

			<Footer mockState={mockState} setMockState={setMockState} />
		</main>
	);
}
