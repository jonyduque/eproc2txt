export default function GuideCards() {
	const steps = [
		["01", "Envie o ZIP", "Extraímos e catalogamos cada PDF e HTML automaticamente."],
		["02", "Configure os núcleos", "Ajuste a quantidade de núcleos e o preset do OCR."],
		["03", "Copie ou baixe o resultado", "Gere um arquivo estruturado pronto para usar com IA."],
	];

	return (
		<div className="guide-cards-grid">
			{steps.map(([n, t, d]) => (
				<div key={n} className="panel guide-card">
					<span className="text-glow-magenta guide-card-number">
						{n} - {t}
					</span>
					<p className="guide-card-description">{d}</p>
				</div>
			))}
		</div>
	);
}
