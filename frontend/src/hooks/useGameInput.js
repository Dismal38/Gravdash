import { useEffect } from "react";
import { useEvent } from "./useEvent";

/**
 * Wires global keyboard + canvas pointer input to game actions.
 * All handlers go through stable refs so the effect subscribes once.
 */
export function useGameInput({ canvasRef, phaseRef, onFlap, onStart, onPause, onResume, onMute }) {
    const handleFlap = useEvent(onFlap);
    const handleStart = useEvent(onStart);
    const handlePause = useEvent(onPause);
    const handleResume = useEvent(onResume);
    const handleMute = useEvent(onMute);

    useEffect(() => {
        const canvasEl = canvasRef.current;

        const onPointer = (e) => {
            if (phaseRef.current !== "playing") return;
            if (e.target && e.target.closest && e.target.closest("[data-ui-overlay='true']")) {
                return;
            }
            e.preventDefault();
            handleFlap();
        };

        const onKey = (e) => {
            const cur = phaseRef.current;
            if (e.code === "Space" || e.code === "ArrowUp") {
                if (cur === "playing") {
                    e.preventDefault();
                    handleFlap();
                } else if (cur === "menu" || cur === "gameover") {
                    e.preventDefault();
                    handleStart();
                }
            } else if (e.code === "KeyP") {
                if (cur === "playing") handlePause();
                else if (cur === "paused") handleResume();
            } else if (e.code === "KeyM") {
                handleMute();
            }
        };

        if (canvasEl) canvasEl.addEventListener("pointerdown", onPointer);
        window.addEventListener("keydown", onKey);
        return () => {
            if (canvasEl) canvasEl.removeEventListener("pointerdown", onPointer);
            window.removeEventListener("keydown", onKey);
        };
        // Refs and useEvent wrappers are all stable. Single subscription.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
