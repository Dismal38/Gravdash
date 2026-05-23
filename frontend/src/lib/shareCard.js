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
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
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
