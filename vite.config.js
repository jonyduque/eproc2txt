import react from "@vitejs/plugin-react-oxc";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	server: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
	optimizeDeps: {
		exclude: ["@hyzyla/pdfium"],
	},
});
