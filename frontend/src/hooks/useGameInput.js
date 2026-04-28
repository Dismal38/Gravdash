import { useEffect } from "react";

/**
 * Wires global keyboard + canvas pointer input to game actions.
 * Phase is read from a ref to avoid re-binding listeners on every state change.
 */
export function useGameInput({ canvasRef, phaseRef, onFlap, onStart, onPause, onResume, onMute }) {
    useEffect(() => {
        const canvasEl = canvasRef.current;

        const onPointer = (e) => {
            if (phaseRef.current !== "playing") return;
            if (e.target && e.target.closest && e.target.closest("[data-ui-overlay='true']")) {
                return;
            }
            e.preventDefault();
            onFlap();
        };

        const onKey = (e) => {
            const cur = phaseRef.current;
            if (e.code === "Space" || e.code === "ArrowUp") {
                if (cur === "playing") {
                    e.preventDefault();
                    onFlap();
                } else if (cur === "menu" || cur === "gameover") {
                    e.preventDefault();
                    onStart();
                }
            } else if (e.code === "KeyP") {
                if (cur === "playing") onPause();
                else if (cur === "paused") onResume();
            } else if (e.code === "KeyM") {
                onMute();
            }
        };

        if (canvasEl) canvasEl.addEventListener("pointerdown", onPointer);
        window.addEventListener("keydown", onKey);
        return () => {
            if (canvasEl) canvasEl.removeEventListener("pointerdown", onPointer);
            window.removeEventListener("keydown", onKey);
        };
    }, [canvasRef, phaseRef, onFlap, onStart, onPause, onResume, onMute]);
}
