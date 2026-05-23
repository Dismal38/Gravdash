// Drawing helpers for the 1080x1080 GRAVDASH share card.
// Each helper takes a 2D context and the geometry it needs.

export const SHARE_CARD = { W: 1080, H: 1080 };

export function rounded(ctx, x, y, w, h, r) {
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

export function drawBackground(ctx) {
    const { W, H } = SHARE_CARD;
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, W, H);

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
}

export function drawPanel(ctx) {
    const { W, H } = SHARE_CARD;
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
    return { px, py, pw, ph };
}

export function drawHeader(ctx, panel, name) {
    const { W } = SHARE_CARD;
    const { px, py } = panel;

    ctx.fillStyle = "#FFD600";
    ctx.shadowColor = "rgba(255, 214, 0, 0.5)";
    ctx.shadowBlur = 18;
    ctx.font = '700 28px "Azeret Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillText("● GRAVDASH", px + 50, py + 70);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(244, 244, 245, 0.55)";
    ctx.font = '600 22px "Azeret Mono", monospace';
    ctx.textAlign = "right";
    ctx.fillText("ARCADE.RUN", W - px - 50, py + 70);

    if (name) {
        ctx.fillStyle = "rgba(244, 244, 245, 0.7)";
        ctx.font = '600 28px "Azeret Mono", monospace';
        ctx.textAlign = "center";
        ctx.fillText(`OPERATOR · ${name.toUpperCase().slice(0, 14)}`, W / 2, py + 160);
    }
}

export function drawScoreNumber(ctx, panel, score, isNewHigh) {
    const { W } = SHARE_CARD;
    const { py } = panel;

    ctx.fillStyle = "#00F0FF";
    ctx.shadowColor = "rgba(0, 240, 255, 0.6)";
    ctx.shadowBlur = 14;
    ctx.font = '600 32px "Azeret Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("FINAL SCORE", W / 2, py + 240);
    ctx.shadowBlur = 0;

    const scoreStr = String(score).padStart(4, "0");
    ctx.font = '900 280px "Unbounded", "Azeret Mono", sans-serif';
    ctx.textAlign = "center";

    ctx.fillStyle = "rgba(0, 240, 255, 0.45)";
    ctx.fillText(scoreStr, W / 2 - 4, py + 510);
    ctx.fillStyle = "rgba(255, 51, 102, 0.45)";
    ctx.fillText(scoreStr, W / 2 + 4, py + 510);
    ctx.fillStyle = "#F4F4F5";
    ctx.shadowColor = "rgba(0, 240, 255, 0.55)";
    ctx.shadowBlur = 40;
    ctx.fillText(scoreStr, W / 2, py + 510);
    ctx.shadowBlur = 0;

    if (isNewHigh) {
        ctx.fillStyle = "#39FF14";
        ctx.shadowColor = "rgba(57, 255, 20, 0.6)";
        ctx.shadowBlur = 18;
        ctx.font = '700 30px "Azeret Mono", monospace';
        ctx.fillText("★ NEW HIGH SCORE ★", W / 2, py + 580);
        ctx.shadowBlur = 0;
    }
}

export function drawRankBadge(ctx, panel, rank, total) {
    if (!rank) return;
    const { W } = SHARE_CARD;
    const { px, py, pw } = panel;
    const rankY = py + 660;

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
    ctx.fillText(`#${rank}`, W - px - 120, rankY + 90);

    if (total) {
        ctx.fillStyle = "rgba(244, 244, 245, 0.55)";
        ctx.shadowBlur = 0;
        ctx.font = '600 22px "Azeret Mono", monospace';
        ctx.textAlign = "left";
        ctx.fillText(`OF ${total} OPERATORS`, px + 120, rankY + 95);
    }
    ctx.shadowBlur = 0;
}

export function drawFooter(ctx, panel) {
    const { W } = SHARE_CARD;
    const { py, ph } = panel;
    ctx.fillStyle = "rgba(244, 244, 245, 0.45)";
    ctx.font = '600 24px "Azeret Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("CAN YOU BEAT IT?  ·  #GRAVSHIFT", W / 2, py + ph - 50);
}

export function drawScanlines(ctx) {
    const { W, H } = SHARE_CARD;
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
    }
}
