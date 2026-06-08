import type React from "react";
import { useEffect, useRef } from "react";
import { TreeDocNode } from "./TreeDocNode";

function EventCheckbox({
	checked,
	indeterminate,
	onChange,
	disabled,
}: {
	checked: boolean;
	indeterminate: boolean;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	disabled?: boolean;
}) {
	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (ref.current) {
			ref.current.indeterminate = indeterminate;
		}
	}, [indeterminate]);

	return (
		<input
			type="checkbox"
			ref={ref}
			className="tree-checkbox event-checkbox"
			checked={checked}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}

interface TreeEventNodeProps {
	event: {
		key?: number;
		eventNumber: number;
		documents: Array<{
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
		}>;
	};
	selectedPaths: Set<string>;
	setSelectedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
}

export function TreeEventNode({
	event,
	selectedPaths,
	setSelectedPaths,
	isCollapsed,
	onToggleCollapse,
}: TreeEventNodeProps) {
	const docs = event.documents;
	const _eventDocsPaths = docs.map((d) => d.originalPath);

	// For event -1, only count valid extension documents for checkbox calculations
	const selectableDocs = docs.filter((d) => d.eventNumber !== -1 || d.isValidExtension);
	const selectablePaths = selectableDocs.map((d) => d.originalPath);

	const checkedDocs = selectablePaths.filter((p) => selectedPaths.has(p));

	const isAllChecked = selectablePaths.length > 0 && checkedDocs.length === selectablePaths.length;
	const isNoneChecked = checkedDocs.length === 0;
	const isIndeterminate = !isAllChecked && !isNoneChecked;
	const isEventDisabled = selectablePaths.length === 0; // Disable if no files can be selected

	const handleEventCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const checked = e.target.checked;
		setSelectedPaths((prev) => {
			const next = new Set(prev);
			selectablePaths.forEach((p) => {
				if (checked) {
					next.add(p);
				} else {
					next.delete(p);
				}
			});
			return next;
		});
	};

	// Label configuration
	let folderLabel = `Evento ${event.eventNumber}`;
	const folderIcon = "folder";
	let folderIconClass = "material-icons node-icon-material";

	if (event.eventNumber === 0) {
		folderLabel = "Capa do Processo";
	} else if (event.eventNumber === -1) {
		folderLabel = "Arquivos Fora do Padrão";
		folderIconClass += " tree-icon-warning";
	}

	return (
		<div className={`tree-node ${isCollapsed ? "collapsed" : ""}`}>
			<div className="tree-node-header">
				{/* biome-ignore lint/a11y/useSemanticElements: using span with role button to maintain custom tree structure layout */}
				<span
					className="tree-toggle"
					onClick={onToggleCollapse}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onToggleCollapse();
						}
					}}
				>
					<span className="material-icons" style={{ fontSize: "16px" }}>
						{isCollapsed ? "chevron_right" : "expand_more"}
					</span>
				</span>
				<EventCheckbox
					checked={isAllChecked}
					indeterminate={isIndeterminate}
					onChange={handleEventCheckboxChange}
					disabled={isEventDisabled}
				/>
				{/* biome-ignore lint/a11y/useSemanticElements: using span with role button to maintain custom tree structure layout */}
				<span
					className="node-label"
					onClick={onToggleCollapse}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onToggleCollapse();
						}
					}}
				>
					<span className={folderIconClass}>{folderIcon}</span>
					<span className="node-name">
						<b>{folderLabel}</b>
						<span className="event-doc-count">
							({checkedDocs.length}/{selectableDocs.length})
						</span>
					</span>
				</span>
			</div>

			<div className="tree-children">
				{docs.map((doc) => {
					const isChecked = selectedPaths.has(doc.originalPath);
					const handleDocCheckboxChange = () => {
						setSelectedPaths((prev) => {
							const next = new Set(prev);
							if (isChecked) {
								next.delete(doc.originalPath);
							} else {
								next.add(doc.originalPath);
							}
							return next;
						});
					};

					return (
						<TreeDocNode
							key={doc.originalPath}
							doc={doc}
							isChecked={isChecked}
							onCheckboxChange={handleDocCheckboxChange}
							eventNumber={event.eventNumber}
						/>
					);
				})}
			</div>
		</div>
	);
}
