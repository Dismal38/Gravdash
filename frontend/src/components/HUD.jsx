import React from "react";

export default function HUD({ score, gravityDir, mode, personalBest }) {
    const hasBest = personalBest > 0;
    const beatBest = hasBest && score > personalBest;
    const remaining = hasBest && !beatBest ? personalBest - score + 1 : 0;
    return (
        <>
            {/* Paired score display: CURRENT and BEST side by side, top-right (below mute/pause). */}
            <div
                className="absolute top-14 right-3 z-20 pointer-events-none"
                data-testid="hud-score-block"
                style={{ textAlign: "right" }}
            >
                {beatBest && hasBest && (
                    <div
                        data-testid="hud-new-best"
                        className="font-mono uppercase tracking-[0.25em]"
                        style={{
                            color: "#39FF14",
                            fontSize: "0.78rem",
                            textShadow: "0 0 12px rgba(57, 255, 20, 0.75)",
                            animation: "pulseGlow 1.2s ease-in-out infinite",
                            marginBottom: 4,
                        }}
                    >
                        ★ NEW BEST!
                    </div>
                )}
                <div className="flex items-baseline gap-3 justify-end">
                    <div
                        data-testid="hud-score"
                        className="font-display"
                        style={{
                            fontSize: "2.6rem",
                            fontWeight: 900,
                            color: "#F4F4F5",
                            textShadow: "0 0 16px rgba(244,244,245,0.45)",
                            lineHeight: 0.9,
                        }}
                    >
                        {score.toString().padStart(2, "0")}
                    </div>
                    {hasBest && (
                        <div
                            data-testid="hud-personal-best"
                            className="font-mono uppercase tracking-[0.2em]"
                            style={{ color: "rgba(244,244,245,0.45)" }}
                        >
                            <div style={{ fontSize: "0.55rem", marginBottom: 2 }}>BEST</div>
                            <div style={{ fontSize: "0.95rem", lineHeight: 1 }}>
                                {personalBest.toString().padStart(2, "0")}
                            </div>
                        </div>
                    )}
                </div>
                {hasBest && !beatBest && remaining <= 5 && remaining > 0 && (
                    <div
                        data-testid="hud-remaining"
                        className="font-mono uppercase tracking-[0.25em]"
                        style={{
                            color: "#FFD600",
                            fontSize: "0.65rem",
                            textShadow: "0 0 8px rgba(255, 214, 0, 0.55)",
                            marginTop: 4,
                        }}
                    >
                        {remaining} TO BEAT
                    </div>
                )}
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
            {mode === "daily" && (
                <div
                    className="absolute top-12 left-4 z-20 font-mono uppercase text-[10px] tracking-[0.3em] pointer-events-none"
                    data-testid="hud-daily-badge"
                    style={{
                        color: "#39FF14",
                        textShadow: "0 0 8px rgba(57, 255, 20, 0.6)",
                    }}
                >
                    ★ DAILY
                </div>
            )}
        </>
    );
}
