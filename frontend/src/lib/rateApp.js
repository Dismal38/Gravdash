// Opens the Google Play page for this app so the user can rate/review it.
// On native Android (Capacitor), uses the market:// intent which opens the
// Play Store app directly. On web/iOS, falls back to the standard https URL.

const PACKAGE_NAME = "com.gravdash.game";
const MARKET_URL = `market://details?id=${PACKAGE_NAME}`;
const WEB_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;

function isNativePlatform() {
    return !!(
        typeof window !== "undefined" &&
        window.Capacitor &&
        window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform()
    );
}

export async function openPlayStoreForRating() {
    if (isNativePlatform()) {
        try {
            // Open the Play Store app directly via Android intent.
            window.location.href = MARKET_URL;
            return { method: "market-intent" };
        } catch (e) {
            // Fall through to web URL on failure
        }
    }
    try {
        window.open(WEB_URL, "_blank", "noopener");
        return { method: "web" };
    } catch (e) {
        window.location.href = WEB_URL;
        return { method: "web-fallback" };
    }
}
