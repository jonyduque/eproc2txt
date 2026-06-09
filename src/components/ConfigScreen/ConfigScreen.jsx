import ConfigPanel from "./ConfigPanel/ConfigPanel";
import FileSummaryBar from "./FileSummaryBar/FileSummaryBar";
import Tree from "./Tree/Tree";
import "./ConfigScreen.css";

export default function ConfigScreen({
	zipName,
	tree,
	ignoredFiles,
	selectedPaths,
	setSelectedPaths,
	workers,
	setWorkers,
	tessModel,
	setTessModel,
	onStart,
	onReset,
}) {
	const maxAllowedWorkers = Math.max(navigator.hardwareConcurrency || 3, 3);

	const handleStartClick = () => {
		const selectedList = [];
		tree.forEach((event) => {
			event.documents.forEach((doc) => {
				if (selectedPaths.has(doc.originalPath)) {
					selectedList.push(doc);
				}
			});
		});
		if (selectedList.length > 0) {
			onStart(selectedList);
		}
	};

	// Calculate document statistics for LOADED VIEW
	let selectedDocsCount = 0;
	let treeDocsCount = 0;
	let selectedPagesEstimate = 0;
	let selectedSize = 0;

	tree.forEach((event) => {
		event.documents.forEach((doc) => {
			treeDocsCount++;
			if (selectedPaths.has(doc.originalPath)) {
				selectedDocsCount++;
				const pages = doc.extension === "pdf" ? Math.max(1, Math.round(doc.size / 25000)) : 1;
				selectedPagesEstimate += pages;
				selectedSize += doc.size;
			}
		});
	});

	return (
		<div className="animate-fade-up">
			<FileSummaryBar
				zipName={zipName}
				selectedDocsCount={selectedDocsCount}
				treeDocsCount={treeDocsCount}
				selectedPagesEstimate={selectedPagesEstimate}
				selectedSize={selectedSize}
				onReset={onReset}
			/>

			{/* Grid configuration and lists */}
			<div className="loaded-layout-grid">
				<Tree
					tree={tree}
					selectedPaths={selectedPaths}
					setSelectedPaths={setSelectedPaths}
					isProcessing={false}
					isCompleted={false}
				/>

				<ConfigPanel
					workers={workers}
					setWorkers={setWorkers}
					maxAllowedWorkers={maxAllowedWorkers}
					tessModel={tessModel}
					setTessModel={setTessModel}
					selectedPathsSize={selectedPaths.size}
					handleStartClick={handleStartClick}
					ignoredFiles={ignoredFiles}
				/>
			</div>
		</div>
	);
}
