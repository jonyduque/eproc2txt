/* global __BUILD_ID__ */

const MAX_ENTRIES = 20000;

/**
 * Diagnostic log of one processing run, downloadable as text for debugging.
 * Holds environment, settings, a timeline and the errors. Never stores document text:
 * only file names, page numbers and messages.
 */
export default class RunLog {
	constructor(meta) {
		this.startedAt = Date.now();
		this.meta = meta;
		this.entries = [];
		this.dropped = 0;
		this.errors = [];
	}

	add(level, source, message) {
		if (this.entries.length >= MAX_ENTRIES) {
			this.dropped++;
			if (level !== "error") return;
		}
		this.entries.push({ t: Date.now() - this.startedAt, level, source, message });
	}

	/** Errors are kept apart from the timeline so the UI can list them */
	addError(error) {
		this.errors.push({ t: Date.now() - this.startedAt, ...error });
	}

	toText(summary = {}) {
		const lines = [];
		const env = collectEnvironment();
		lines.push("eproc2txt - log de processamento");
		lines.push(`gerado em: ${new Date().toISOString()}`);
		lines.push(`início:    ${new Date(this.startedAt).toISOString()}`);
		lines.push("");
		lines.push("== ambiente");
		for (const [k, v] of Object.entries(env)) lines.push(`${k}: ${v}`);
		lines.push("");
		lines.push("== configuração");
		for (const [k, v] of Object.entries(this.meta)) lines.push(`${k}: ${v}`);
		lines.push("");
		lines.push("== resumo");
		for (const [k, v] of Object.entries(summary)) lines.push(`${k}: ${v}`);
		lines.push(`erros: ${this.errors.length}`);
		lines.push("");
		lines.push(`== erros (${this.errors.length})`);
		for (const e of this.errors) {
			const where = e.page ? `${e.fileName} pág ${e.page}` : e.fileName || "(geral)";
			lines.push(`[${fmt(e.t)}] ${e.kind} · ${where}: ${e.message}`);
		}
		lines.push("");
		lines.push(`== linha do tempo (${this.entries.length} eventos)`);
		if (this.dropped > 0) {
			lines.push(`(${this.dropped} eventos de baixa prioridade descartados por limite de tamanho)`);
		}
		for (const e of this.entries) {
			lines.push(`[${fmt(e.t)}] ${e.level.toUpperCase().padEnd(5)} ${e.source}: ${e.message}`);
		}
		return `${lines.join("\n")}\n`;
	}
}

function fmt(ms) {
	const m = Math.floor(ms / 60000);
	const s = Math.floor((ms % 60000) / 1000);
	const r = ms % 1000;
	return `+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(r).padStart(3, "0")}`;
}

function collectEnvironment() {
	const nav = typeof navigator !== "undefined" ? navigator : {};
	return {
		versão: typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev",
		url: typeof location !== "undefined" ? location.origin : "?",
		navegador: nav.userAgent ?? "?",
		idioma: nav.language ?? "?",
		"núcleos lógicos": nav.hardwareConcurrency ?? "?",
		"memória (GB, aprox.)": nav.deviceMemory ?? "?",
		crossOriginIsolated: typeof crossOriginIsolated !== "undefined" ? crossOriginIsolated : "?",
		online: nav.onLine ?? "?",
		"WebAssembly SIMD": detectWasmSimd(),
	};
}

function detectWasmSimd() {
	try {
		// Smallest module using a v128 op; validates only where SIMD is supported
		const bytes = new Uint8Array([
			0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253,
			15, 253, 98, 11,
		]);
		return WebAssembly.validate(bytes) ? "sim" : "não";
	} catch {
		return "?";
	}
}

/** Saves a text file through a temporary object URL */
export function downloadText(fileName, text) {
	const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	// Revoking in the same tick can abort the download in Firefox/Safari
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
