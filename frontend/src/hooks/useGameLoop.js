import { useEffect, useRef } from "react";
import { step as engineStep, draw as engineDraw } from "../lib/gameEngine";
import { useEvent } from "./useEvent";

/**
 * Run the requestAnimationFrame loop. All handlers are routed through stable
 * refs so the effect subscribes exactly once for the component's lifetime.
 */
export function useGameLoop({
    canvasRef,
    stateRef,
    phaseRef,
    onScore,
    onGravityChange,
    onDeath,
}) {
    const handleScore = useEvent(onScore);
    const handleGravityChange = useEvent(onGravityChange);
    const handleDeath = useEvent(onDeath);

    const lastTimeRef = useRef(0);
    const rafRef = useRef(null);
    const lastGravityRef = useRef(1);

    useEffect(() => {
        const tick = (t) => {
            const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000 || 0);
            lastTimeRef.current = t;
            const s = stateRef.current;
            if (s && phaseRef.current === "playing") {
                const result = engineStep(s, dt, { onScore: handleScore });
                if (result.gravityDir !== lastGravityRef.current) {
                    lastGravityRef.current = result.gravityDir;
                    handleGravityChange(result.gravityDir);
                }
                if (result.died) handleDeath(result.score);
            }
            engineDraw(canvasRef.current, s);
            rafRef.current = requestAnimationFrame(tick);
        };
        lastTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
        // canvasRef/stateRef/phaseRef are mutable refs (stable identity),
        // and handleScore/handleGravityChange/handleDeath are useEvent stable
        // wrappers — none of them should be deps. Single subscription.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
