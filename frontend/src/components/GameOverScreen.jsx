import React, { useState } from "react";
import axios from "axios";
import { buildShareCard, shareCardBlob, downloadBlob } from "../lib/shareCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GameOverScreen({
    score,
    highScore,
    isNewHigh,
    globalRank,
    setGlobalRank,
    playerName,
    setPlayerName,
    onRetry,
    onMenu,
    onShowLeaderboard,
}) {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [sharing, setSharing] = useState(false);
    const [shareStatus, setShareStatus] = useState("");

    const handleSubmit = async () => {
        if (submitting || submitted) return;
        const name = (playerName || "").trim().toUpperCase().slice(0, 12);
        if (!name) {
            setSubmitError("Enter a name");
            return;
        }
        setSubmitting(true);
        setSubmitError("");
        try {
            await axios.post(`${API}/scores`, { name, score });
            localStorage.setItem("gravshift_name", name);
            setSubmitted(true);
            try {
                const r = await axios.get(`${API}/scores/rank`, { params: { score } });
                setGlobalRank(r.data);
            } catch (rankErr) {
                console.warn("[GRAV-SHIFT] rank refresh failed:", rankErr);
            }
        } catch (e) {
            console.warn("[GRAV-SHIFT] score submit failed:", e);
            setSubmitError("Could not submit. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleShareOrDownload = async (mode) => {
        if (sharing) return;
        setSharing(true);
        setShareStatus("");
        try {
            const blob = await buildShareCard({
                score,
                rank: globalRank ? globalRank.rank : null,
                total: globalRank ? globalRank.total : null,
                isNewHigh,
                name: playerName,
            });
            if (!blob) throw new Error("blob generation failed");
            if (mode === "download") {
                downloadBlob(blob, `gravshift-${score}.png`);
                setShareStatus("✓ SAVED");
            } else {
                const res = await shareCardBlob(blob, {
                    score,
                    rank: globalRank ? globalRank.rank : null,
                    name: playerName,
                });
                setShareStatus(res.method === "download" ? "✓ DOWNLOADED" : "✓ SHARED");
            }
        } catch (e) {
            console.warn("[GRAV-SHIFT] share/download failed:", e);
            setShareStatus("⚠ COULD NOT SHARE");
        } finally {
            setSharing(false);
            setTimeout(() => setShareStatus(""), 2400);
        }
    };

    const handleNameChange = (e) => {
        setPlayerName(
            e.target.value.replace(/[^a-zA-Z0-9 _\-.!]/g, "").toUpperCase(),
        );
    };

    return (
        <div
            data-ui-overlay="true"
            className="absolute inset-0 z-40 flex items-center justify-center px-4"
            style={{ background: "rgba(5,5,8,0.85)" }}
        >
            <div className="panel w-full max-w-md p-8 text-center" data-testid="gameover-panel">
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

                <div className="mt-8">
                    <input
                        data-testid="player-name-input"
                        className="input-arcade"
                        placeholder="ENTER NAME"
                        maxLength={12}
                        value={playerName}
                        disabled={submitted}
                        onChange={handleNameChange}
                    />
                    {submitError && (
                        <div
                            className="mt-2 font-mono text-xs uppercase tracking-widest"
                            style={{ color: "#FF3366" }}
                            data-testid="submit-error"
                        >
                            {submitError}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                    <button
                        type="button"
                        data-testid="submit-score-button"
                        onClick={handleSubmit}
                        disabled={
                            submitting || submitted || !playerName.trim() || score === 0
                        }
                        className="btn-primary w-full"
                    >
                        {submitted
                            ? "✓ SUBMITTED"
                            : submitting
                              ? "SENDING…"
                              : "SUBMIT SCORE"}
                    </button>

                    <div className="flex gap-3 justify-center">
                        <button
                            type="button"
                            data-testid="share-card-button"
                            onClick={() => handleShareOrDownload("share")}
                            disabled={sharing || score === 0}
                            className="btn-secondary"
                            style={{ borderColor: "#39FF14", color: "#39FF14" }}
                        >
                            {sharing ? "…" : "↗ SHARE"}
                        </button>
                        <button
                            type="button"
                            data-testid="download-card-button"
                            onClick={() => handleShareOrDownload("download")}
                            disabled={sharing || score === 0}
                            className="btn-secondary"
                            style={{ borderColor: "#FFD600", color: "#FFD600" }}
                        >
                            ⤓ SAVE PNG
                        </button>
                    </div>
                    {shareStatus && (
                        <div
                            className="font-mono uppercase tracking-[0.3em] text-xs text-center"
                            style={{ color: "rgba(244,244,245,0.7)" }}
                            data-testid="share-status"
                        >
                            {shareStatus}
                        </div>
                    )}

                    <div className="flex gap-3 justify-center">
                        <button
                            type="button"
                            data-testid="retry-button"
                            onClick={onRetry}
                            className="btn-secondary"
                        >
                            ↻ RETRY
                        </button>
                        <button
                            type="button"
                            data-testid="leaderboard-button-go"
                            onClick={onShowLeaderboard}
                            className="btn-secondary"
                        >
                            ◆ BOARD
                        </button>
                        <button
                            type="button"
                            data-testid="menu-button"
                            onClick={onMenu}
                            className="btn-ghost"
                        >
                            MENU
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
