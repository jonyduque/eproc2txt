if (typeof Symbol.dispose !== "symbol") {
	Object.defineProperty(Symbol, "dispose", {
		value: Symbol("Symbol.dispose"),
		configurable: false,
		enumerable: false,
		writable: false,
	});
}

export class SilentAudioSession {
	constructor() {
		this.audioCtx = null;
		this.silenceNode = null;
	}

	start() {
		return new Promise((resolve, reject) => {
			if (this.audioCtx) {
				resolve(this);
				return;
			}
			try {
				this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
				// Create a 1-second silent stereo buffer
				const buffer = this.audioCtx.createBuffer(1, 44100, 44100);
				this.silenceNode = this.audioCtx.createBufferSource();
				this.silenceNode.buffer = buffer;
				this.silenceNode.loop = true;
				this.silenceNode.connect(this.audioCtx.destination);
				this.silenceNode.start();
				console.log("[eproc2txt] Prevenção de Tab Freeze (áudio silencioso) ativada.");
				resolve(this);
			} catch (e) {
				console.warn("[eproc2txt] Falha ao iniciar áudio silencioso:", e);
				reject(e);
			}
		});
	}

	stop() {
		return new Promise((resolve) => {
			if (this.silenceNode) {
				try {
					this.silenceNode.stop();
				} catch (_) {}
				this.silenceNode = null;
			}
			if (this.audioCtx) {
				try {
					this.audioCtx.close();
				} catch (_) {}
				this.audioCtx = null;
				console.log("[eproc2txt] Prevenção de Tab Freeze desativada.");
			}
			resolve();
		});
	}

	[Symbol.dispose]() {
		this.stop();
	}
}

export class WakeLockSession {
	constructor() {
		this.wakeLock = null;
	}

	async start() {
		if (this.wakeLock) return this;
		try {
			if ("wakeLock" in navigator) {
				this.wakeLock = await navigator.wakeLock.request("screen");
				console.log("[eproc2txt] Screen Wake Lock ativo.");
				this.wakeLock.addEventListener("release", () => {
					console.log("[eproc2txt] Screen Wake Lock liberado.");
				});
			} else {
				console.warn("[eproc2txt] Screen Wake Lock não suportado pelo navegador.");
			}
			return this;
		} catch (err) {
			console.warn(`[eproc2txt] Não foi possível obter Screen Wake Lock: ${err.message}`);
			throw err;
		}
	}

	async stop() {
		if (this.wakeLock) {
			try {
				await this.wakeLock.release();
			} catch (_) {}
			this.wakeLock = null;
		}
	}

	[Symbol.dispose]() {
		this.stop();
	}
}

let defaultAudioSession = null;
let defaultWakeLockSession = null;

export async function startSilentAudio() {
	if (!defaultAudioSession) {
		defaultAudioSession = new SilentAudioSession();
	}
	return defaultAudioSession.start();
}

export async function stopSilentAudio() {
	if (defaultAudioSession) {
		await defaultAudioSession.stop();
		defaultAudioSession = null;
	}
}

export async function requestWakeLock() {
	if (!defaultWakeLockSession) {
		defaultWakeLockSession = new WakeLockSession();
	}
	return defaultWakeLockSession.start();
}

export async function releaseWakeLock() {
	if (defaultWakeLockSession) {
		await defaultWakeLockSession.stop();
		defaultWakeLockSession = null;
	}
}
