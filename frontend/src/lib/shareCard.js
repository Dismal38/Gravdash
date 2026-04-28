// Generates a 1080x1080 share card image for the game-over screen.
// Returns a Blob (PNG). All drawing is done on an offscreen <canvas>.

const W = 1080;
const H = 1080;

function rounded(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
}

export async function buildShareCard({ score, rank, total, isNewHigh, name }) {
    // Wait for fonts, otherwise fallback to system mono
    try {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }
    } catch (e) {
        /* noop */
    }

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    // Diagonal neon stripes top-left
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(-Math.PI / 8);
    ctx.fillStyle = "rgba(255, 51, 102, 0.18)";
    for (let i = 0; i < 6; i++) {
        ctx.fillRect(-200, i * 90 - 200, 800, 18);
    }
    ctx.fillStyle = "rgba(0, 240, 255, 0.12)";
    for (let i = 0; i < 6; i++) {
        ctx.fillRect(-200, i * 90 - 220, 600, 8);
    }
    ctx.restore();

    // Inner panel
    const px = 70;
    const py = 110;
    const pw = W - px * 2;
    const ph = H - py * 2;
    ctx.fillStyle = "rgba(12, 12, 18, 0.85)";
    rounded(ctx, px, py, pw, ph, 24);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.55)";
    ctx.shadowColor = "rgba(0, 240, 255, 0.6)";
    ctx.shadowBlur = 30;
    rounded(ctx, px, py, pw, ph, 24);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title bar — small badge
    ctx.fillStyle = "#FFD600";
    ctx.shadowColor = "rgba(255, 214, 0, 0.5)";
    ctx.shadowBlur = 18;
    ctx.font = '700 28px "Azeret Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillText("● GRAV-SHIFT", px + 50, py + 70);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(244, 244, 245, 0.55)";
    ctx.font = '600 22px "Azeret Mono", monospace';
    ctx.textAlign = "right";
    ctx.fillText("ARCADE.RUN", W - px - 50, py + 70);

    // Player name
    if (name) {
        ctx.fillStyle = "rgba(244, 244, 245, 0.7)";
        ctx.font = '600 28px "Azeret Mono", monospace';
        ctx.textAlign = "center";
        const dispName = name.toUpperCase().slice(0, 14);
        ctx.fillText(`OPERATOR · ${dispName}`, W / 2, py + 160);
    }

    // "FINAL SCORE" label
    ctx.fillStyle = "#00F0FF";
    ctx.shadowColor = "rgba(0, 240, 255, 0.6)";
    ctx.shadowBlur = 14;
    ctx.font = '600 32px "Azeret Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("FINAL SCORE", W / 2, py + 240);
    ctx.shadowBlur = 0;

    // Big score number
    const scoreStr = String(score).padStart(4, "0");
    ctx.fillStyle = "#F4F4F5";
    ctx.shadowColor = "rgba(0, 240, 255, 0.55)";
    ctx.shadowBlur = 40;
    ctx.font = '900 280px "Unbounded", "Azeret Mono", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(scoreStr, W / 2, py + 510);
    // chroma split
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0, 240, 255, 0.45)";
    ctx.fillText(scoreStr, W / 2 - 4, py + 510);
    ctx.fillStyle = "rgba(255, 51, 102, 0.45)";
    ctx.fillText(scoreStr, W / 2 + 4, py + 510);
    ctx.fillStyle = "#F4F4F5";
    ctx.shadowColor = "rgba(0, 240, 255, 0.55)";
    ctx.shadowBlur = 40;
    ctx.fillText(scoreStr, W / 2, py + 510);
    ctx.shadowBlur = 0;

    // New High badge
    if (isNewHigh) {
        ctx.fillStyle = "#39FF14";
        ctx.shadowColor = "rgba(57, 255, 20, 0.6)";
        ctx.shadowBlur = 18;
        ctx.font = '700 30px "Azeret Mono", monospace';
        ctx.textAlign = "center";
        ctx.fillText("★ NEW HIGH SCORE ★", W / 2, py + 580);
        ctx.shadowBlur = 0;
    }

    // Global rank box
    const rankY = py + 660;
    if (rank) {
        ctx.fillStyle = "rgba(255, 214, 0, 0.12)";
        rounded(ctx, px + 80, rankY, pw - 160, 130, 16);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 214, 0, 0.7)";
        rounded(ctx, px + 80, rankY, pw - 160, 130, 16);
        ctx.stroke();

        ctx.fillStyle = "#FFD600";
        ctx.shadowColor = "rgba(255, 214, 0, 0.5)";
        ctx.shadowBlur = 14;
        ctx.font = '600 28px "Azeret Mono", monospace';
        ctx.textAlign = "left";
        ctx.fillText("GLOBAL RANK", px + 120, rankY + 55);

        ctx.font = '900 70px "Unbounded", "Azeret Mono", sans-serif';
        ctx.textAlign = "right";
        const rankText = `#${rank}`;
        ctx.fillText(rankText, W - px - 120, rankY + 90);

        if (total) {
            ctx.fillStyle = "rgba(244, 244, 245, 0.55)";
            ctx.shadowBlur = 0;
            ctx.font = '600 22px "Azeret Mono", monospace';
            ctx.textAlign = "left";
            ctx.fillText(`OF ${total} OPERATORS`, px + 120, rankY + 95);
        }
        ctx.shadowBlur = 0;
    }

    // Footer
    ctx.fillStyle = "rgba(244, 244, 245, 0.45)";
    ctx.font = '600 24px "Azeret Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("CAN YOU BEAT IT?  ·  #GRAVSHIFT", W / 2, py + ph - 50);

    // Scanlines (subtle)
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
    }

    return new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png", 0.92);
    });
}

export function downloadBlob(blob, filename = "gravshift-score.png") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function shareCardBlob(blob, { score, rank, name } = {}) {
    const text = `I scored ${score} on GRAV-SHIFT${rank ? ` — global rank #${rank}` : ""}. Can you beat it?`;
    const file = new File([blob], "gravshift-score.png", { type: "image/png" });

    // Try Capacitor Share plugin first (mobile native)
    try {
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
            const { Share } = await import("@capacitor/share");
            const { Filesystem, Directory } = await import("@capacitor/filesystem").catch(() => ({}));
            // Native share with text only as a robust fallback (file sharing requires Filesystem on Android)
            await Share.share({
                title: "GRAV-SHIFT score",
                text,
                dialogTitle: "Share your run",
            });
            return { method: "capacitor-share" };
        }
    } catch (e) {
        // fall through
    }

    // Web Share API with file
    try {
        if (
            typeof navigator !== "undefined" &&
            navigator.canShare &&
            navigator.canShare({ files: [file] })
        ) {
            await navigator.share({
                files: [file],
                title: "GRAV-SHIFT score",
                text,
            });
            return { method: "web-share-files" };
        }
    } catch (e) {
        // fall through
    }

    // Web Share API (text only)
    try {
        if (typeof navigator !== "undefined" && navigator.share) {
            await navigator.share({ title: "GRAV-SHIFT score", text });
            return { method: "web-share-text" };
        }
    } catch (e) {
        // fall through
    }

    // Final fallback: download the image
    downloadBlob(blob);
    return { method: "download" };
}
