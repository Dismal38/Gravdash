import { useEffect, useRef } from "react";
import { step as engineStep, draw as engineDraw } from "../lib/gameEngine";

/**
 * Run the requestAnimationFrame loop. Reads phase from a ref so the effect
 * subscribes once. Forwards engine events to React via callbacks.
 */
export function useGameLoop({
    canvasRef,
    stateRef,
    phaseRef,
    onScore,
    onGravityChange,
    onDeath,
}) {
    const lastTimeRef = useRef(0);
    const rafRef = useRef(null);
    const lastGravityRef = useRef(1);

    useEffect(() => {
        const tick = (t) => {
            const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000 || 0);
            lastTimeRef.current = t;
            const s = stateRef.current;
            if (s && phaseRef.current === "playing") {
                const result = engineStep(s, dt, { onScore });
                if (result.gravityDir !== lastGravityRef.current) {
                    lastGravityRef.current = result.gravityDir;
                    onGravityChange(result.gravityDir);
                }
                if (result.died) onDeath(result.score);
            }
            engineDraw(canvasRef.current, s);
            rafRef.current = requestAnimationFrame(tick);
        };
        lastTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [canvasRef, stateRef, phaseRef, onScore, onGravityChange, onDeath]);
}
