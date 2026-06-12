// Generates a 1080x1080 share card image and provides share/download fallbacks.

import {
    SHARE_CARD,
    drawBackground,
    drawPanel,
    drawHeader,
    drawScoreNumber,
    drawRankBadge,
    drawFooter,
    drawScanlines,
} from "./shareCardDraw";

async function waitForFonts() {
    try {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }
    } catch (e) {
        console.warn("[GRAVDASH shareCard] font wait failed:", e);
    }
}

export async function buildShareCard({ score, rank, total, isNewHigh, name }) {
    await waitForFonts();

    const canvas = document.createElement("canvas");
    canvas.width = SHARE_CARD.W;
    canvas.height = SHARE_CARD.H;
    const ctx = canvas.getContext("2d");

    drawBackground(ctx);
    const panel = drawPanel(ctx);
    drawHeader(ctx, panel, name);
    drawScoreNumber(ctx, panel, score, isNewHigh);
    drawRankBadge(ctx, panel, rank, total);
    drawFooter(ctx, panel);
    drawScanlines(ctx);

    return new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png", 0.92);
    });
}

export function downloadBlob(blob, filename = "gravdash-score.png") {
    const url = URL.createObjectURL(blob);
    // 1) Try the standard "download attribute" trick (works on desktop + most
    //    mobile Chrome). On mobile, also open the URL in a new tab as a backup
    //    in case the browser silently blocked the download — the user can then
    //    long-press the image and "Save to gallery".
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();

    // 2) Mobile fallback: also pop a new tab. This guarantees the user sees
    //    SOMETHING happen — they can long-press to save from there.
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
        (typeof navigator !== "undefined" && navigator.userAgent) || ""
    );
    if (isMobile) {
        try {
            window.open(url, "_blank", "noopener");
        } catch (e) {
            /* noop */
        }
    }

    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function isNativePlatform() {
    return !!(
        window.Capacitor &&
        window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform()
    );
}

// Save a blob to the user's device. On native (Android via Capacitor) this
// writes the PNG to the app's Documents folder and then opens the native
// share sheet so the user can save to Photos/Files/etc. On web it falls back
// to the standard <a download> approach.
export async function saveBlobToDevice(blob, filename = "gravdash-score.png") {
    if (!isNativePlatform()) {
        downloadBlob(blob, filename);
        return { method: "web-download", filename };
    }
    try {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const base64 = await blobToBase64(blob);
        const writeResult = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
        });
        // Open the native share sheet so the user can route it to Photos/Files/etc.
        try {
            const { Share } = await import("@capacitor/share");
            await Share.share({
                title: "GRAVDASH score",
                url: writeResult.uri,
                dialogTitle: "Save your score card",
            });
            return { method: "capacitor-save+share", uri: writeResult.uri };
        } catch (e) {
            console.warn("[GRAVDASH shareCard] native share open failed:", e);
            return { method: "capacitor-save-only", uri: writeResult.uri };
        }
    } catch (e) {
        console.warn("[GRAVDASH shareCard] native save failed:", e);
        // Last-resort fallback: try a web download (may or may not work in WebView).
        downloadBlob(blob, filename);
        return { method: "web-download-fallback", filename };
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            // Strip the "data:image/png;base64," prefix
            const idx = dataUrl.indexOf(",");
            resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ===== Share strategies (each returns a method-name on success, null otherwise) =====

async function tryCapacitorShare(text) {
    try {
        if (
            window.Capacitor &&
            window.Capacitor.isNativePlatform &&
            window.Capacitor.isNativePlatform()
        ) {
            const { Share } = await import("@capacitor/share");
            await Share.share({
                title: "GRAVDASH score",
                text,
                dialogTitle: "Share your run",
            });
            return "capacitor-share";
        }
    } catch (e) {
        console.warn("[GRAVDASH shareCard] capacitor share failed:", e);
    }
    return null;
}

async function tryWebShareFiles(file, text) {
    try {
        if (
            typeof navigator !== "undefined" &&
            navigator.canShare &&
            navigator.canShare({ files: [file] })
        ) {
            await navigator.share({ files: [file], title: "GRAVDASH score", text });
            return "web-share-files";
        }
    } catch (e) {
        console.warn("[GRAVDASH shareCard] web file share failed:", e);
    }
    return null;
}

async function tryWebShareText(text) {
    try {
        if (typeof navigator !== "undefined" && navigator.share) {
            await navigator.share({ title: "GRAVDASH score", text });
            return "web-share-text";
        }
    } catch (e) {
        console.warn("[GRAVDASH shareCard] web text share failed:", e);
    }
    return null;
}

export async function shareCardBlob(blob, { score, rank } = {}) {
    const text = `I scored ${score} on GRAVDASH${
        rank ? ` — global rank #${rank}` : ""
    }. Can you beat it?`;
    const file = new File([blob], "gravdash-score.png", { type: "image/png" });

    const strategies = [
        () => tryCapacitorShare(text),
        () => tryWebShareFiles(file, text),
        () => tryWebShareText(text),
    ];
    for (const run of strategies) {
        const method = await run();
        if (method) return { method };
    }

    downloadBlob(blob);
    return { method: "download" };
}
