import React from "react";

export default function ScoreDisplay({ score, isNewHigh, highScore, globalRank }) {
    return (
        <>
            <div
                className="font-display coral-glow"
                style={{
                    fontSize: "clamp(2.5rem, 7vw, 4rem)",
                    color: "#FF3366",
                    fontWeight: 900,
                }}
            >
                GAME OVER
            </div>

            <div
                className="font-display mt-4"
                style={{
                    fontSize: "clamp(3rem, 12vw, 6rem)",
                    color: "#F4F4F5",
                    fontWeight: 900,
                    lineHeight: 1,
                }}
                data-testid="final-score"
            >
                {score.toString().padStart(4, "0")}
            </div>

            {isNewHigh && (
                <div
                    className="hiscore-blink green-glow font-mono uppercase tracking-[0.4em] text-sm mt-3"
                    style={{ color: "#39FF14" }}
                    data-testid="new-high-badge"
                >
                    ★ NEW HIGH SCORE ★
                </div>
            )}

            <div
                className="mt-2 font-mono uppercase tracking-[0.3em] text-xs"
                style={{ color: "rgba(244,244,245,0.55)" }}
            >
                BEST · {Math.max(score, highScore).toString().padStart(4, "0")}
                {globalRank && (
                    <span style={{ color: "#00F0FF", marginLeft: 12 }}>
                        GLOBAL · #{globalRank.rank}
                    </span>
                )}
            </div>
        </>
    );
}
