interface TreeDocNodeProps {
	doc: {
		originalPath: string;
		fileName: string;
		eventNumber: number;
		docType: string;
		docNumber: number;
		extension: string;
		size: number;
		isValidExtension?: boolean;
		isValidNaming?: boolean;
		errorDescription?: string;
	};
	isChecked: boolean;
	onCheckboxChange: () => void;
	eventNumber: number;
}

export function TreeDocNode({ doc, isChecked, onCheckboxChange, eventNumber }: TreeDocNodeProps) {
	const isPdf = doc.extension === "pdf";
	const isNonStandard = eventNumber === -1;
	const isDisabled = isNonStandard && !doc.isValidExtension;

	// Define icons and classes
	let iconName = isPdf ? "description" : "code";
	let iconClass = "material-icons node-icon-material";

	if (isNonStandard) {
		if (!doc.isValidExtension) {
			iconName = "error";
			iconClass += " tree-icon-error";
		} else if (!doc.isValidNaming) {
			iconName = "warning";
			iconClass += " tree-icon-warning";
		}
	}

	const handleLabelClick = () => {
		if (!isDisabled) {
			onCheckboxChange();
		}
	};

	return (
		<div className={`tree-node-header doc-node ${isDisabled ? "has-error" : ""}`}>
			<input
				type="checkbox"
				className="tree-checkbox doc-checkbox"
				checked={isChecked}
				onChange={onCheckboxChange}
				disabled={isDisabled}
			/>
			{/* biome-ignore lint/a11y/useSemanticElements: using span with role button to maintain custom tree layout and avoid browser default button styles */}
			<span
				className="node-label"
				onClick={handleLabelClick}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleLabelClick();
					}
				}}
			>
				<span className={iconClass}>{iconName}</span>
				<span className="node-name" title={doc.fileName}>
					{isNonStandard
						? doc.fileName
						: eventNumber === 0
							? doc.fileName
							: `${doc.docType}${doc.docNumber}.${doc.extension}`}
					{isNonStandard && doc.errorDescription && (
						<span className={!doc.isValidExtension ? "doc-error-desc" : "doc-warning-desc"}>
							({doc.errorDescription})
						</span>
					)}
				</span>
			</span>
		</div>
	);
}
