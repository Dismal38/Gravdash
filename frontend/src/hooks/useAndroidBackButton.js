// Android hardware back-button handling.
// Behaviour by phase:
//   menu     → tap once shows "Press back again to exit" toast (2s window),
//              second tap within window exits the app.
//   playing  → pause the game.
//   paused   → resume the game.
//   gameover → return to menu.
// No-op on web.

import { useEffect } from "react";
import { useEvent } from "./useEvent";

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

export function useAndroidBackButton({ phaseRef, onPause, onResume, onMenu, onExitPrompt }) {
    const handlePause = useEvent(onPause);
    const handleResume = useEvent(onResume);
    const handleMenu = useEvent(onMenu);
    const handleExitPrompt = useEvent(onExitPrompt);

    useEffect(() => {
        let listenerHandle = null;
        let lastBackOnMenuAt = 0;

        const route = async () => {
            const cur = phaseRef.current;
            if (cur === "playing") {
                handlePause();
                return;
            }
            if (cur === "paused") {
                handleResume();
                return;
            }
            if (cur === "gameover") {
                handleMenu();
                return;
            }
            // menu — double-tap-to-exit
            const now = Date.now();
            if (now - lastBackOnMenuAt < 2000) {
                const mod = await getAppMod();
                if (mod && mod.App && mod.App.exitApp) {
                    try {
                        await mod.App.exitApp();
                        return;
                    } catch (e) {
                        console.warn("[GRAV-SHIFT back-button] exitApp failed:", e);
                    }
                }
            } else {
                lastBackOnMenuAt = now;
                handleExitPrompt();
            }
        };

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
