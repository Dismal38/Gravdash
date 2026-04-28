// Safe localStorage wrapper. Only used for non-sensitive UX data
// (high score, player name) that is intentionally device-local.
// Wrapping in try/catch protects against private-mode + storage quota errors.

export function readNumber(key, fallback = 0) {
    try {
        const raw = window.localStorage.getItem(key);
        if (raw == null) return fallback;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? n : fallback;
    } catch (e) {
        console.warn("[GRAV-SHIFT storage] read failed:", key, e);
        return fallback;
    }
}

export function readString(key, fallback = "") {
    try {
        return window.localStorage.getItem(key) || fallback;
    } catch (e) {
        console.warn("[GRAV-SHIFT storage] read failed:", key, e);
        return fallback;
    }
}

export function writeValue(key, value) {
    try {
        window.localStorage.setItem(key, String(value));
    } catch (e) {
        console.warn("[GRAV-SHIFT storage] write failed:", key, e);
    }
}
