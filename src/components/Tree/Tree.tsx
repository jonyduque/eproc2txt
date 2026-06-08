import type React from "react";
import { useEffect, useRef, useState } from "react";
import { TreeEventNode } from "./TreeEventNode";
import { TreeSelectionTools } from "./TreeSelectionTools";
import "./Tree.css";

interface TreeEventItem {
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
}

interface TreeProps {
	tree: TreeEventItem[];
	selectedPaths: Set<string>;
	setSelectedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
	isProcessing: boolean;
	isCompleted: boolean;
}

export default function Tree({
	tree,
	selectedPaths,
	setSelectedPaths,
	isProcessing,
	isCompleted,
}: TreeProps) {
	const [collapsedEvents, setCollapsedEvents] = useState<Set<number>>(new Set());
	const hasInitializedRef = useRef(false);
	const lastTreeRef = useRef<TreeEventItem[] | null>(null);

	// Initialize selection tree: all valid paths selected by default & collapse events on first load
	useEffect(() => {
		if (
			tree &&
			tree.length > 0 &&
			(!hasInitializedRef.current || lastTreeRef.current !== tree) &&
			!isProcessing &&
			!isCompleted
		) {
			const allPaths = new Set<string>();
			const initialCollapsed = new Set<number>();
			tree.forEach((event) => {
				initialCollapsed.add(event.eventNumber);
				event.documents.forEach((doc) => {
					// Do not select invalid extensions
					if (doc.eventNumber === -1 && !doc.isValidExtension) {
						return;
					}
					allPaths.add(doc.originalPath);
				});
			});
			setSelectedPaths(allPaths);
			setCollapsedEvents(initialCollapsed);
			hasInitializedRef.current = true;
			lastTreeRef.current = tree;
		}
	}, [tree, isProcessing, isCompleted, setSelectedPaths]);

	const handleCollapseAllEvents = () => {
		const collapsed = new Set<number>();
		tree.forEach((event) => {
			collapsed.add(event.eventNumber);
		});
		setCollapsedEvents(collapsed);
	};

	const handleExpandAllEvents = () => {
		setCollapsedEvents(new Set());
	};

	const toggleEventCollapse = (eventNum: number) => {
		setCollapsedEvents((prev) => {
			const next = new Set(prev);
			if (next.has(eventNum)) {
				next.delete(eventNum);
			} else {
				next.add(eventNum);
			}
			return next;
		});
	};

	const handleSelectAll = () => {
		const allPaths = new Set<string>();
		tree.forEach((event) => {
			event.documents.forEach((doc) => {
				// Do not select invalid extensions
				if (doc.eventNumber === -1 && !doc.isValidExtension) {
					return;
				}
				allPaths.add(doc.originalPath);
			});
		});
		setSelectedPaths(allPaths);
	};

	const handleDeselectAll = () => {
		setSelectedPaths(new Set());
	};

	return (
		<div className="panel docs-tree-card">
			<div className="tree-card-header">
				<span className="config-card-label">documentos detectados</span>
				<div className="tree-selection-tools">
					<TreeSelectionTools
						handleSelectAll={handleSelectAll}
						handleDeselectAll={handleDeselectAll}
						handleCollapseAllEvents={handleCollapseAllEvents}
						handleExpandAllEvents={handleExpandAllEvents}
					/>
				</div>
			</div>

			<div className="tree-container tree-container-transparent">
				{tree.map((event) => (
					<TreeEventNode
						key={event.eventNumber}
						event={event}
						selectedPaths={selectedPaths}
						setSelectedPaths={setSelectedPaths}
						isCollapsed={collapsedEvents.has(event.eventNumber)}
						onToggleCollapse={() => toggleEventCollapse(event.eventNumber)}
					/>
				))}
			</div>
		</div>
	);
}
