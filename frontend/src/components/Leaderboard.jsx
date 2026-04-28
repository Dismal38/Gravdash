import React from "react";
import { useLeaderboardScores } from "../hooks/useLeaderboardScores";

const RANK_COLORS = {
    1: { color: "#FFD600", glow: "rgba(255,214,0,0.55)" },
    2: { color: "#00F0FF", glow: "rgba(0,240,255,0.55)" },
    3: { color: "#FF3366", glow: "rgba(255,51,102,0.55)" },
};

function LeaderboardRow({ entry, rank }) {
    const rc = RANK_COLORS[rank] || {
        color: "rgba(244,244,245,0.7)",
        glow: "transparent",
    };
    const isPodium = rank <= 3;
    return (
        <div
            data-testid={`leaderboard-row-${rank}`}
            className="grid items-center font-mono uppercase tracking-[0.15em]"
            style={{
                gridTemplateColumns: "60px 1fr auto",
                padding: "12px 14px",
                background: isPodium ? "rgba(255,255,255,0.03)" : "transparent",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                color: rc.color,
                textShadow: isPodium ? `0 0 8px ${rc.glow}` : "none",
            }}
        >
            <span style={{ fontWeight: 700 }}>#{rank.toString().padStart(2, "0")}</span>
            <span
                style={{
                    color: isPodium ? rc.color : "#F4F4F5",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {entry.name}
            </span>
            <span
                style={{
                    color: isPodium ? rc.color : "#F4F4F5",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                }}
            >
                {String(entry.score).padStart(4, "0")}
            </span>
        </div>
    );
}

function LeaderboardBody({ loading, error, scores }) {
    if (loading) {
        return (
            <div
                className="font-mono uppercase tracking-[0.3em] text-center py-12 text-sm"
                style={{ color: "rgba(244,244,245,0.5)" }}
                data-testid="leaderboard-loading"
            >
                LOADING…
            </div>
        );
    }
    if (error) {
        return (
            <div
                className="font-mono uppercase tracking-[0.3em] text-center py-12 text-sm"
                style={{ color: "#FF3366" }}
                data-testid="leaderboard-error"
            >
                {error}
            </div>
        );
    }
    if (scores.length === 0) {
        return (
            <div
                className="font-mono uppercase tracking-[0.3em] text-center py-12 text-sm"
                style={{ color: "rgba(244,244,245,0.5)" }}
                data-testid="leaderboard-empty"
            >
                NO ENTRIES YET — BE THE FIRST.
            </div>
        );
    }
    return (
        <div
            className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto no-scrollbar"
            data-testid="leaderboard-list"
        >
            {scores.map((entry, idx) => (
                <LeaderboardRow key={entry.id} entry={entry} rank={idx + 1} />
            ))}
        </div>
    );
}

export default function Leaderboard({ onClose }) {
    const { scores, loading, error } = useLeaderboardScores(10);

    return (
        <div
            data-ui-overlay="true"
            className="absolute inset-0 z-40 flex items-center justify-center px-4"
            style={{ background: "rgba(5,5,8,0.9)" }}
            data-testid="leaderboard-screen"
        >
            <div className="panel w-full max-w-2xl p-8">
                <div className="flex items-baseline justify-between mb-8 gap-4">
                    <div
                        className="font-display"
                        style={{
                            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                            color: "#00F0FF",
                            textShadow: "0 0 12px rgba(0,240,255,0.5)",
                            fontWeight: 900,
                            letterSpacing: "0.05em",
                        }}
                    >
                        TOP OPERATORS
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="close-leaderboard-button"
                        className="btn-ghost"
                    >
                        ✕ CLOSE
                    </button>
                </div>
                <LeaderboardBody loading={loading} error={error} scores={scores} />
            </div>
        </div>
    );
}
