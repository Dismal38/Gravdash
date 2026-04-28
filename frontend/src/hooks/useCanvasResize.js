import { useEffect } from "react";

export function useCanvasResize(canvasRef, stateRef) {
    useEffect(() => {
        const handleResize = () => {
            const c = canvasRef.current;
            if (!c) return;
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;
            c.width = Math.floor(w * dpr);
            c.height = Math.floor(h * dpr);
            c.style.width = w + "px";
            c.style.height = h + "px";
            c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
            if (stateRef.current) stateRef.current.viewport = { w, h };
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [canvasRef, stateRef]);
}
