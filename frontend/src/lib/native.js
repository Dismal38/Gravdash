// Capacitor wrappers — safely no-op on web.

let HapticsMod = null;
let initialized = false;

async function ensureHaptics() {
    if (initialized) return HapticsMod;
    initialized = true;
    try {
        if (
            window.Capacitor &&
            window.Capacitor.isNativePlatform &&
            window.Capacitor.isNativePlatform()
        ) {
            HapticsMod = await import("@capacitor/haptics");
        }
    } catch (e) {
        console.warn("[GRAV-SHIFT native] haptics import failed:", e);
        HapticsMod = null;
    }
    return HapticsMod;
}

async function impact(style) {
    const m = await ensureHaptics();
    if (!m) return;
    try {
        await m.Haptics.impact({ style });
    } catch (e) {
        console.warn("[GRAV-SHIFT native] haptics impact failed:", e);
    }
}

export async function hapticLight() {
    const m = await ensureHaptics();
    if (!m) return;
    return impact(m.ImpactStyle.Light);
}

export async function hapticMedium() {
    const m = await ensureHaptics();
    if (!m) return;
    return impact(m.ImpactStyle.Medium);
}

export async function hapticHeavy() {
    const m = await ensureHaptics();
    if (!m) return;
    return impact(m.ImpactStyle.Heavy);
}
