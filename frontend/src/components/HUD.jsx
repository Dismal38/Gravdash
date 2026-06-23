import React from "react";

export default function HUD({ score, gravityDir, mode, personalBest }) {
    const beatBest = personalBest > 0 && score > personalBest;
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

            {/* Personal best ghost number (top-right). Turns into "NEW BEST!" once surpassed. */}
            {personalBest > 0 && (
                <div
                    className="absolute top-4 right-32 z-20 font-mono uppercase tracking-[0.25em] pointer-events-none text-right"
                    data-testid="hud-personal-best"
                >
                    {beatBest ? (
                        <div
                            style={{
                                color: "#39FF14",
                                fontSize: "0.85rem",
                                textShadow: "0 0 12px rgba(57, 255, 20, 0.7)",
                                animation: "pulseGlow 1.2s ease-in-out infinite",
                            }}
                        >
                            ★ NEW BEST!
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    fontSize: "0.65rem",
                                    color: "rgba(244,244,245,0.35)",
                                }}
                            >
                                BEST
                            </div>
                            <div
                                style={{
                                    fontSize: "0.95rem",
                                    color: "rgba(244,244,245,0.55)",
                                }}
                            >
                                {personalBest.toString().padStart(2, "0")}
                            </div>
                        </>
                    )}
                </div>
            )}

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
