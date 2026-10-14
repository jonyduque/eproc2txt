import { useState } from "react";
import "./RunIssues.css";

export interface RunIssue {
	kind: string;
	fileName?: string;
	page?: number;
	message: string;
}

interface RunIssuesProps {
	title: string;
	hint?: string;
	issues: RunIssue[];
	onDownloadLog?: () => void;
	onDismiss?: () => void;
	tone?: "warning" | "error";
}

const COLLAPSED_LIMIT = 8;

/**
 * Panel listing what went wrong in a run (page, document or whole-run failures),
 * with a button to save the diagnostic log.
 */
export default function RunIssues({
	title,
	hint,
	issues,
	onDownloadLog,
	onDismiss,
	tone = "warning",
}: RunIssuesProps) {
	const [expanded, setExpanded] = useState(false);
	const visible = expanded ? issues : issues.slice(0, COLLAPSED_LIMIT);
	const hidden = issues.length - visible.length;

	return (
		<section className={`run-issues run-issues-${tone}`} role="alert">
			<header className="run-issues-header">
				<span className="material-icons run-issues-icon" aria-hidden="true">
					{tone === "error" ? "error" : "warning"}
				</span>
				<div className="run-issues-heading">
					<p className="run-issues-title">{title}</p>
					{hint && <p className="run-issues-hint">{hint}</p>}
				</div>
				{onDismiss && (
					<button
						type="button"
						className="run-issues-dismiss"
						onClick={onDismiss}
						aria-label="Fechar aviso"
					>
						<span className="material-icons">close</span>
					</button>
				)}
			</header>

			{visible.length > 0 && (
				<ul className="run-issues-list">
					{visible.map((issue, i) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: list is append-only and never reordered
							key={i}
							className="run-issues-item"
						>
							<span className="run-issues-kind">{issue.kind}</span>
							<span className="run-issues-where">
								{issue.fileName ?? "processamento"}
								{issue.page ? ` · pág ${issue.page}` : ""}
							</span>
							<span className="run-issues-message">{issue.message}</span>
						</li>
					))}
				</ul>
			)}

			<footer className="run-issues-footer">
				{hidden > 0 && (
					<button type="button" className="run-issues-link" onClick={() => setExpanded(true)}>
						mostrar mais {hidden}
					</button>
				)}
				{onDownloadLog && (
					<button type="button" className="run-issues-log-btn" onClick={onDownloadLog}>
						<span className="material-icons" style={{ fontSize: "16px" }}>
							bug_report
						</span>
						baixar log para diagnóstico
					</button>
				)}
			</footer>
		</section>
	);
}
