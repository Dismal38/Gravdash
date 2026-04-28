import { useEffect, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useLeaderboardScores(limit = 10) {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;
        const run = async () => {
            try {
                const r = await axios.get(`${API}/scores`, { params: { limit } });
                if (mounted) {
                    setScores(r.data || []);
                    setError("");
                }
            } catch (e) {
                console.warn("[GRAV-SHIFT leaderboard] fetch failed:", e);
                if (mounted) setError("Could not load leaderboard");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        run();
        return () => {
            mounted = false;
        };
    }, [limit]);

    return { scores, loading, error };
}
