import type React from "react";
import { useEffect, useRef, useState } from "react";
import "./BackgroundGradient.css";

export const BackgroundGradientAnimation = ({
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

	const containerStyle: Record<string, string> = {};
	if (gradientBackgroundStart) {
		containerStyle["--gradient-background-start"] = gradientBackgroundStart;
	}
	if (gradientBackgroundEnd) {
		containerStyle["--gradient-background-end"] = gradientBackgroundEnd;
	}
	if (firstColor) {
		containerStyle["--first-color"] = firstColor;
	}
	if (secondColor) {
		containerStyle["--second-color"] = secondColor;
	}
	if (thirdColor) {
		containerStyle["--third-color"] = thirdColor;
	}
	if (fourthColor) {
		containerStyle["--fourth-color"] = fourthColor;
	}
	if (fifthColor) {
		containerStyle["--fifth-color"] = fifthColor;
	}
	if (pointerColor) {
		containerStyle["--pointer-color"] = pointerColor;
	}
	if (size) {
		containerStyle["--size"] = size;
	}
	if (blendingValue) {
		containerStyle["--blending-value"] = blendingValue;
	}

	return (
		<div
			className={`bg-gradient-container ${containerClassName || ""}`.trim()}
			style={containerStyle as React.CSSProperties}
		>
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
