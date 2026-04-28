// Capacitor wrappers — safely no-op on web.
// Use ImpactStyle.Medium on flip, Heavy on crash for premium-feel rumble.

let HapticsMod = null;
let initialized = false;

async function ensureHaptics() {
    if (initialized) return HapticsMod;
    initialized = true;
    try {
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
            const mod = await import("@capacitor/haptics");
            HapticsMod = mod;
        }
    } catch (e) {
        HapticsMod = null;
    }
    return HapticsMod;
}

export async function hapticLight() {
    const m = await ensureHaptics();
    if (!m) return;
    try {
        await m.Haptics.impact({ style: m.ImpactStyle.Light });
    } catch (e) {
        /* noop */
    }
}

export async function hapticMedium() {
    const m = await ensureHaptics();
    if (!m) return;
    try {
        await m.Haptics.impact({ style: m.ImpactStyle.Medium });
    } catch (e) {
        /* noop */
    }
}

export async function hapticHeavy() {
    const m = await ensureHaptics();
    if (!m) return;
    try {
        await m.Haptics.impact({ style: m.ImpactStyle.Heavy });
    } catch (e) {
        /* noop */
    }
}
