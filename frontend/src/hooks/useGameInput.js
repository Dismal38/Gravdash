import { useEffect } from "react";
import { useEvent } from "./useEvent";

const FLAP_KEYS = new Set(["Space", "ArrowUp"]);

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

        // Phase-specific reaction to the "primary action" (tap / space / arrow-up)
        const primaryActionByPhase = {
            playing: handleFlap,
            menu: handleStart,
            gameover: handleStart,
        };

        // Phase-specific reaction to the pause/resume key (P)
        const pauseKeyByPhase = {
            playing: handlePause,
            paused: handleResume,
        };

        const onPointer = (e) => {
            if (phaseRef.current !== "playing") return;
            if (e.target && e.target.closest && e.target.closest("[data-ui-overlay='true']")) {
                return;
            }
            e.preventDefault();
            handleFlap();
        };

        const onKey = (e) => {
            if (FLAP_KEYS.has(e.code)) {
                const action = primaryActionByPhase[phaseRef.current];
                if (action) {
                    e.preventDefault();
                    action();
                }
                return;
            }
            if (e.code === "KeyP") {
                const action = pauseKeyByPhase[phaseRef.current];
                if (action) action();
                return;
            }
            if (e.code === "KeyM") {
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
