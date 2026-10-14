// Deploy to https://eproc2text.duque.cloud (VPS root@duque.cloud, bare-metal nginx).
// Usage: npm run deploy [-- --skip-build]
// Builds dist/, uploads it with the vhost and the remote installer to /tmp/eproc2text/,
// runs deploy/remote-install.sh over ssh, then checks this site and the neighbours still answer.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

const REMOTE = "root@duque.cloud";
const DOMAIN = "eproc2text.duque.cloud";
const STAGE = "/tmp/eproc2text";
const NEIGHBOURS = [
	"https://duque.cloud/",
	"https://dejesp.duque.cloud/",
	"https://jur.duque.cloud/",
	"https://sorteio.duque.cloud/",
	"https://vieiraduque.com.br/",
];

const skipBuild = process.argv.includes("--skip-build");
const isWindows = process.platform === "win32";

function run(cmd, args) {
	console.log(`> ${cmd} ${args.join(" ")}`);
	execFileSync(cmd, args, { stdio: "inherit", shell: isWindows && cmd === "npm" });
}

async function status(url) {
	try {
		const res = await fetch(url, { redirect: "manual" });
		return res;
	} catch (err) {
		return { status: `erro (${err.cause?.code ?? err.message})`, headers: new Headers() };
	}
}

// Neighbours are measured before touching anything, so a site that was already down is not blamed on us
const before = {};
for (const url of NEIGHBOURS) before[url] = (await status(url)).status;

if (!skipBuild) {
	run("npm", ["run", "lint"]);
	run("npm", ["run", "build"]);
}

// Relative path on purpose: GNU tar (Git Bash) reads "C:\..." as host:path
const tgz = "dist.tgz";
try {
	run("tar", ["-czf", tgz, "-C", "dist", "."]);
	run("ssh", [REMOTE, `rm -rf ${STAGE} && mkdir -p ${STAGE}`]);
	run("scp", [
		tgz,
		"deploy/remote-install.sh",
		`deploy/nginx/${DOMAIN}.conf`,
		`${REMOTE}:${STAGE}/`,
	]);
	// tr strips CR in case the script was checked out with CRLF line endings
	run("ssh", [
		REMOTE,
		`tr -d '\\r' < ${STAGE}/remote-install.sh > ${STAGE}/install.sh && bash ${STAGE}/install.sh`,
	]);
} finally {
	rmSync(tgz, { force: true });
}

let failed = false;
const site = await status(`https://${DOMAIN}/`);
const coep = site.headers.get("cross-origin-embedder-policy");
console.log(`https://${DOMAIN}/ -> ${site.status} (COEP: ${coep ?? "ausente"})`);
if (site.status !== 200 || coep !== "require-corp") failed = true;

for (const url of NEIGHBOURS) {
	const now = (await status(url)).status;
	const changed = now !== before[url];
	console.log(`${url} -> ${now}${changed ? ` (antes: ${before[url]})` : ""}`);
	if (changed) failed = true;
}

if (failed) {
	console.error("Verificação pós-deploy falhou.");
	process.exit(1);
}
console.log("Deploy ok.");
