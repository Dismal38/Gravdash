import { useEffect, useRef } from "react";

/**
 * Returns a stable callback that always invokes the latest version of `fn`.
 * Use this to pass handlers into long-lived effects without making the effect
 * re-subscribe whenever the handler identity changes.
 */
export function useEvent(fn) {
    const ref = useRef(fn);
    useEffect(() => {
        ref.current = fn;
    });
    // Stable wrapper — never changes identity for the lifetime of the component.
    const stable = useRef((...args) => ref.current(...args));
    return stable.current;
}
