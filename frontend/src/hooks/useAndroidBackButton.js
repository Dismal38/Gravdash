// Android hardware back-button handling.
// Behaviour by phase:
//   menu     → tap once shows "Press back again to exit" toast (2s window),
//              second tap within window exits the app.
//   playing  → pause the game.
//   paused   → resume the game.
//   gameover → return to menu.
// No-op on web.

import { useEffect, useRef } from "react";
import { useEvent } from "./useEvent";

const EXIT_PROMPT_WINDOW_MS = 2000;

let AppMod = null;
let appModLoaded = false;

async function getAppMod() {
    if (appModLoaded) return AppMod;
    appModLoaded = true;
    try {
        if (
            window.Capacitor &&
            window.Capacitor.isNativePlatform &&
            window.Capacitor.isNativePlatform()
        ) {
            AppMod = await import("@capacitor/app");
        }
    } catch (e) {
        console.warn("[GRAV-SHIFT back-button] @capacitor/app import failed:", e);
        AppMod = null;
    }
    return AppMod;
}

async function tryExitApp() {
    const mod = await getAppMod();
    if (!mod || !mod.App || !mod.App.exitApp) return false;
    try {
        await mod.App.exitApp();
        return true;
    } catch (e) {
        console.warn("[GRAV-SHIFT back-button] exitApp failed:", e);
        return false;
    }
}

export function useAndroidBackButton({ phaseRef, onPause, onResume, onMenu, onExitPrompt }) {
    const handlePause = useEvent(onPause);
    const handleResume = useEvent(onResume);
    const handleMenu = useEvent(onMenu);
    const handleExitPrompt = useEvent(onExitPrompt);
    const lastBackOnMenuAtRef = useRef(0);

    useEffect(() => {
        // Phase → handler dispatch table for non-menu phases.
        // Menu phase needs special "double-tap-to-exit" handling, kept separate.
        const phaseHandlers = {
            playing: handlePause,
            paused: handleResume,
            gameover: handleMenu,
        };

        const handleMenuBack = async () => {
            const now = Date.now();
            if (now - lastBackOnMenuAtRef.current < EXIT_PROMPT_WINDOW_MS) {
                await tryExitApp();
                return;
            }
            lastBackOnMenuAtRef.current = now;
            handleExitPrompt();
        };

        const route = async () => {
            const phase = phaseRef.current;
            const handler = phaseHandlers[phase];
            if (handler) {
                handler();
                return;
            }
            // Fallthrough = menu (or any unknown phase) → exit-prompt path
            await handleMenuBack();
        };

        let listenerHandle = null;
        (async () => {
            const mod = await getAppMod();
            if (!mod || !mod.App || !mod.App.addListener) return;
            try {
                listenerHandle = await mod.App.addListener("backButton", route);
            } catch (e) {
                console.warn("[GRAV-SHIFT back-button] addListener failed:", e);
            }
        })();

        return () => {
            if (listenerHandle && typeof listenerHandle.remove === "function") {
                listenerHandle.remove();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
