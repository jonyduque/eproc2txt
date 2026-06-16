import type React from "react";
import "./RetroTV.css";

interface RetroTVProps {
	brandText?: string;
	isLoading?: boolean;
	isSwitchingChannel?: boolean;
	children: React.ReactNode;
	className?: string;
	onPowerClick?: () => void;
}

export default function RetroTV({
	brandText = "EPROC-TXT CRT-80",
	isLoading = false,
	isSwitchingChannel = false,
	children,
	className = "",
	onPowerClick,
}: RetroTVProps) {
	return (
		<div className={`crt-monitor-frame ${className}`}>
			<div className="crt-chassis">
				<div className="crt-bezel">
					<div className="crt-screen-container">
						{/* CRT Screen Overlays (Scanlines, Flicker, Static) */}
						<div className="crt-screen-effects">
							<div className={`crt-static ${isSwitchingChannel ? "switching" : ""}`} />
							<div className="crt-scanlines" />
							<div className="crt-flicker" />
							<div className="crt-radial-vignette" />
						</div>

						{/* Actual Screen Content */}
						<div className="crt-screen-content">{children}</div>
					</div>
				</div>

				<div className="crt-control-bar">
					<div className="crt-brand">{brandText}</div>
					<div className="crt-dials">
						<div className="crt-dial" />
						<div className="crt-dial" />
					</div>
					<div className="crt-power-section">
						<span className="crt-power-label">POWER</span>
						<div className={`crt-power-led ${isLoading ? "busy" : "active"}`} />
						<button
							type="button"
							className="crt-power-btn"
							onClick={onPowerClick}
							title="Ação do Monitor"
						/>
					</div>
				</div>
			</div>
			<div className="crt-neck" />
			<div className="crt-base" />
		</div>
	);
}
