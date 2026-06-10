let audioCtx = null;
let silenceNode = null;
let wakeLock = null;

export function startSilentAudio() {
	if (audioCtx) return;
	try {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		// Create a 1-second silent stereo buffer
		const buffer = audioCtx.createBuffer(1, 44100, 44100);
		silenceNode = audioCtx.createBufferSource();
		silenceNode.buffer = buffer;
		silenceNode.loop = true;
		silenceNode.connect(audioCtx.destination);
		silenceNode.start();
		console.log("[eproc2txt] Prevenção de Tab Freeze (áudio silencioso) ativada.");
	} catch (e) {
		console.warn("[eproc2txt] Falha ao iniciar áudio silencioso:", e);
	}
}

export function stopSilentAudio() {
	if (silenceNode) {
		try {
			silenceNode.stop();
		} catch (_) {}
		silenceNode = null;
	}
	if (audioCtx) {
		try {
			audioCtx.close();
		} catch (_) {}
		audioCtx = null;
		console.log("[eproc2txt] Prevenção de Tab Freeze desativada.");
	}
}

export async function requestWakeLock() {
	if (wakeLock) return;
	try {
		if ("wakeLock" in navigator) {
			wakeLock = await navigator.wakeLock.request("screen");
			console.log("[eproc2txt] Screen Wake Lock ativo.");
			wakeLock.addEventListener("release", () => {
				console.log("[eproc2txt] Screen Wake Lock liberado.");
			});
		}
	} catch (err) {
		console.warn(`[eproc2txt] Não foi possível obter Screen Wake Lock: ${err.message}`);
	}
}

export function releaseWakeLock() {
	if (wakeLock) {
		wakeLock.release().then(() => {
			wakeLock = null;
		});
	}
}
