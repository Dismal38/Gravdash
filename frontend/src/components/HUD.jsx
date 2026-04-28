import React from "react";

export default function HUD({ score, gravityDir }) {
    return (
        <>
            <div
                className="absolute left-1/2 -translate-x-1/2 top-10 z-20 pointer-events-none font-display"
                style={{
                    fontSize: "min(18vw, 9rem)",
                    color: "rgba(244,244,245,0.18)",
                    fontWeight: 900,
                }}
                data-testid="hud-score"
            >
                {score.toString().padStart(2, "0")}
            </div>
            <div
                className="absolute top-4 left-4 z-20 font-mono uppercase text-xs tracking-[0.3em] flex items-center gap-3 pointer-events-none"
                data-testid="hud-gravity"
            >
                <span
                    className={gravityDir > 0 ? "yellow-glow" : "coral-glow"}
                    style={{
                        color: gravityDir > 0 ? "#FFD600" : "#FF3366",
                        fontSize: "1.2rem",
                    }}
                >
                    {gravityDir > 0 ? "↓" : "↑"}
                </span>
                <span style={{ color: "rgba(244,244,245,0.6)" }}>
                    GRAVITY {gravityDir > 0 ? "DOWN" : "UP"}
                </span>
            </div>
        </>
    );
}
