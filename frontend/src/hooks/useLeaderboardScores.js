import { useEffect, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useLeaderboardScores(limit = 10) {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        const run = async () => {
            try {
                const r = await axios.get(`${API}/scores`, {
                    params: { limit },
                    signal: controller.signal,
                });
                setScores(r.data || []);
                setError("");
            } catch (e) {
                if (axios.isCancel(e) || e.name === "CanceledError") return;
                console.warn("[GRAV-SHIFT leaderboard] fetch failed:", e);
                setError("Could not load leaderboard");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        run();
        return () => controller.abort();
    }, [limit]);

    return { scores, loading, error };
}
