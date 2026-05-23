import React, { useState } from "react";
import { buildShareCard, shareCardBlob, downloadBlob } from "../../lib/shareCard";

export default function ShareSection({ score, isNewHigh, globalRank, playerName }) {
    const [sharing, setSharing] = useState(false);
    const [status, setStatus] = useState("");

    const generate = async (mode) => {
        if (sharing) return;
        setSharing(true);
        setStatus("");
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
                downloadBlob(blob, `gravdash-${score}.png`);
                setStatus("✓ SAVED");
            } else {
                const res = await shareCardBlob(blob, {
                    score,
                    rank: globalRank ? globalRank.rank : null,
                    name: playerName,
                });
                setStatus(res.method === "download" ? "✓ DOWNLOADED" : "✓ SHARED");
            }
        } catch (e) {
            console.warn("[GRAVDASH] share/download failed:", e);
            setStatus("⚠ COULD NOT SHARE");
        } finally {
            setSharing(false);
            setTimeout(() => setStatus(""), 2400);
        }
    };

    const disabled = sharing || score === 0;

    return (
        <>
            <div className="flex gap-3 justify-center">
                <button
                    type="button"
                    data-testid="share-card-button"
                    onClick={() => generate("share")}
                    disabled={disabled}
                    className="btn-secondary"
                    style={{ borderColor: "#39FF14", color: "#39FF14" }}
                >
                    {sharing ? "…" : "↗ SHARE"}
                </button>
                <button
                    type="button"
                    data-testid="download-card-button"
                    onClick={() => generate("download")}
                    disabled={disabled}
                    className="btn-secondary"
                    style={{ borderColor: "#FFD600", color: "#FFD600" }}
                >
                    ⤓ SAVE PNG
                </button>
            </div>
            {status && (
                <div
                    className="font-mono uppercase tracking-[0.3em] text-xs text-center"
                    style={{ color: "rgba(244,244,245,0.7)" }}
                    data-testid="share-status"
                >
                    {status}
                </div>
            )}
        </>
    );
}
