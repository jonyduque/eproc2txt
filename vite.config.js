import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react-oxc";
import { defineConfig } from "vite";

// Commit + build time, shown in the diagnostic log (src/utils/run-log.js)
function buildId() {
	let commit = "sem-git";
	try {
		commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
			.toString()
			.trim();
	} catch {}
	return `${commit} (${new Date().toISOString()})`;
}

export default defineConfig({
	plugins: [react()],
	define: {
		__BUILD_ID__: JSON.stringify(buildId()),
	},
	// Same isolation headers as production (deploy/nginx) for `npm run dev` and `npm run preview`
	server: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
	preview: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
	optimizeDeps: {
		exclude: ["@hyzyla/pdfium"],
	},
});
