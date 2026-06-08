import type React from "react";
import { useEffect, useRef, useState } from "react";
import "./BackgroundGradient.css";

export const BackgroundGradientAnimation = ({
	gradientBackgroundStart = "rgba(32, 36, 47, 0.5)",
	gradientBackgroundEnd = "rgba(25, 28, 37, 0.5)",
	firstColor = "34, 211, 238",
	secondColor = "236, 72, 153",
	thirdColor = "96, 165, 250",
	fourthColor = "248, 113, 113",
	fifthColor = "251, 191, 36",
	pointerColor = "156, 163, 175",
	size = "40%",
	blendingValue = "hard-light",
	children,
	className,
	interactive = true,
	containerClassName,
}: {
	gradientBackgroundStart?: string;
	gradientBackgroundEnd?: string;
	firstColor?: string;
	secondColor?: string;
	thirdColor?: string;
	fourthColor?: string;
	fifthColor?: string;
	pointerColor?: string;
	size?: string;
	blendingValue?: string;
	children?: React.ReactNode;
	className?: string;
	interactive?: boolean;
	containerClassName?: string;
}) => {
	const interactiveRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		document.body.style.setProperty("--gradient-background-start", gradientBackgroundStart);
		document.body.style.setProperty("--gradient-background-end", gradientBackgroundEnd);
		document.body.style.setProperty("--first-color", firstColor);
		document.body.style.setProperty("--second-color", secondColor);
		document.body.style.setProperty("--third-color", thirdColor);
		document.body.style.setProperty("--fourth-color", fourthColor);
		document.body.style.setProperty("--fifth-color", fifthColor);
		document.body.style.setProperty("--pointer-color", pointerColor);
		document.body.style.setProperty("--size", size);
		document.body.style.setProperty("--blending-value", blendingValue);
	}, [
		gradientBackgroundStart,
		gradientBackgroundEnd,
		firstColor,
		secondColor,
		thirdColor,
		fourthColor,
		fifthColor,
		pointerColor,
		size,
		blendingValue,
	]);

	useEffect(() => {
		if (!interactive) return;
		const handleGlobalMouseMove = (event: MouseEvent) => {
			if (interactiveRef.current) {
				const rect = interactiveRef.current.parentElement?.getBoundingClientRect() || {
					left: 0,
					top: 0,
				};
				const x = event.clientX - rect.left;
				const y = event.clientY - rect.top;
				interactiveRef.current.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
			}
		};
		window.addEventListener("mousemove", handleGlobalMouseMove);
		return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
	}, [interactive]);

	const [isSafari, setIsSafari] = useState(false);
	useEffect(() => {
		setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
	}, []);

	return (
		<div className={`bg-gradient-container ${containerClassName || ""}`.trim()}>
			<svg className="hidden-svg">
				<title>Gradient Filter</title>
				<defs>
					<filter id="blurMe">
						<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
						<feColorMatrix
							in="blur"
							mode="matrix"
							values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
							result="goo"
						/>
						<feBlend in="SourceGraphic" in2="goo" />
					</filter>
				</defs>
			</svg>

			<div className={className || ""}>{children}</div>

			<div className={`gradients-container ${isSafari ? "safari-blur" : "default-blur"}`}>
				<div className="gradient-bubble bubble-first"></div>
				<div className="gradient-bubble bubble-second"></div>
				<div className="gradient-bubble bubble-third"></div>
				<div className="gradient-bubble bubble-fourth"></div>
				<div className="gradient-bubble bubble-fifth"></div>

				{interactive && <div ref={interactiveRef} className="bubble-interactive"></div>}
			</div>
		</div>
	);
};
