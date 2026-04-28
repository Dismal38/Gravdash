import React, { useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NameSubmitForm({
    score,
    playerName,
    setPlayerName,
    setGlobalRank,
}) {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const onChange = (e) => {
        setPlayerName(e.target.value.replace(/[^a-zA-Z0-9 _\-.!]/g, "").toUpperCase());
    };

    const onSubmit = async () => {
        if (submitting || submitted) return;
        const name = (playerName || "").trim().toUpperCase().slice(0, 12);
        if (!name) {
            setError("Enter a name");
            return;
        }
        setSubmitting(true);
        setError("");
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
            setError("Could not submit. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="mt-8">
                <input
                    data-testid="player-name-input"
                    className="input-arcade"
                    placeholder="ENTER NAME"
                    maxLength={12}
                    value={playerName}
                    disabled={submitted}
                    onChange={onChange}
                />
                {error && (
                    <div
                        className="mt-2 font-mono text-xs uppercase tracking-widest"
                        style={{ color: "#FF3366" }}
                        data-testid="submit-error"
                    >
                        {error}
                    </div>
                )}
            </div>

            <button
                type="button"
                data-testid="submit-score-button"
                onClick={onSubmit}
                disabled={
                    submitting || submitted || !playerName.trim() || score === 0
                }
                className="btn-primary w-full mt-6"
            >
                {submitted ? "✓ SUBMITTED" : submitting ? "SENDING…" : "SUBMIT SCORE"}
            </button>
        </>
    );
}
