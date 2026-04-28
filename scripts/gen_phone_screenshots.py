"""
Generate Play Store phone screenshots (1080x2400 portrait, 9:20 aspect).
Both screenshots are pixel-accurate recreations of the GRAV-SHIFT UI/canvas.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
from pathlib import Path

OUT = Path("/app/resources")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 2400  # Play Store phone-portrait

# Brand palette
BG = (5, 5, 8)
CYAN = (0, 240, 255)
CORAL = (255, 51, 102)
YELLOW = (255, 214, 0)
GREEN = (57, 255, 20)
WHITE = (244, 244, 245)
GREY = (161, 161, 170)
GREY_DIM = (130, 130, 140)

FONT_BOLD = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
FONT_REG = "/usr/share/fonts/truetype/freefont/FreeSans.ttf"


def f(size, bold=True):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def text_size(t, size, bold=True):
    bbox = f(size, bold).getbbox(t)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def draw_grid(d, w, h, spacing, color, alpha=14):
    for x in range(0, w, spacing):
        d.line([(x, 0), (x, h)], fill=color + (alpha,), width=2)
    for y in range(0, h, spacing):
        d.line([(0, y), (w, y)], fill=color + (alpha,), width=2)


def neon_text(canvas, text, xy, size, color, glow_radius=10, bold=True):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text(xy, text, font=f(size, bold), fill=color + (255,))
    glow = layer.filter(ImageFilter.GaussianBlur(glow_radius))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer)


def chroma_title(canvas, text, xy, size, glow_radius=18):
    """Title with cyan/coral chroma split + white center, like the in-game CSS."""
    x, y = xy
    neon_text(canvas, text, (x + 6, y), size, CORAL, glow_radius=glow_radius)
    neon_text(canvas, text, (x - 6, y), size, CYAN, glow_radius=glow_radius)
    neon_text(canvas, text, (x, y), size, WHITE, glow_radius=14)


def draw_pipe(canvas, x, gap_y, gap_h, h, is_flip=False):
    color = CORAL if is_flip else CYAN
    glow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    pipe_w = 130
    top = gap_y - gap_h // 2
    bot = gap_y + gap_h // 2

    # Pipe body fill (very dark, almost transparent black inside)
    body_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(body_layer)
    bd.rectangle([x, 0, x + pipe_w, top], fill=(0, 0, 0, 165))
    bd.rectangle([x, bot, x + pipe_w, h], fill=(0, 0, 0, 165))
    canvas.alpha_composite(body_layer)

    # Outline (with glow)
    gd.rectangle([x, 0, x + pipe_w, top], outline=color + (255,), width=4)
    gd.rectangle([x, bot, x + pipe_w, h], outline=color + (255,), width=4)
    # Gap edge ticks
    gd.rectangle([x - 8, top - 26, x + pipe_w + 8, top - 14], fill=color + (255,))
    gd.rectangle([x - 8, bot + 14, x + pipe_w + 8, bot + 26], fill=color + (255,))
    # Flip-pipe stripes
    if is_flip:
        for yy in range(40, top - 40, 36):
            gd.rectangle([x + 18, yy, x + pipe_w - 18, yy + 8], fill=color + (255,))
        for yy in range(bot + 40, h - 40, 36):
            gd.rectangle([x + 18, yy, x + pipe_w - 18, yy + 8], fill=color + (255,))

    glow = glow_layer.filter(ImageFilter.GaussianBlur(20))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(glow_layer)


def draw_orb(canvas, x, y, t=0.0):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pulse = 1 + math.sin(t * 6) * 0.15
    r = int(22 * pulse)
    d.ellipse([x - r, y - r, x + r, y + r], fill=GREEN + (255,))
    # Highlight
    d.ellipse([x - 6, y - 8, x + 2, y - 2], fill=(255, 255, 255, 220))
    # Up/down arrows
    d.line([(x, y - 38), (x - 8, y - 30)], fill=GREEN + (255,), width=4)
    d.line([(x, y - 38), (x + 8, y - 30)], fill=GREEN + (255,), width=4)
    d.line([(x, y + 38), (x - 8, y + 30)], fill=GREEN + (255,), width=4)
    d.line([(x, y + 38), (x + 8, y + 30)], fill=GREEN + (255,), width=4)
    glow = layer.filter(ImageFilter.GaussianBlur(28))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer)


def draw_ship(canvas, cx, cy, size=44, rotation=-0.15):
    """Ship facing right with optional rotation (radians)."""
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = size

    # Pre-rotated points (manually compute to avoid PIL rotate quality loss)
    def rot(px, py):
        cos, sin = math.cos(rotation), math.sin(rotation)
        rx = px * cos - py * sin
        ry = px * sin + py * cos
        return (cx + rx, cy + ry)

    body = [
        rot(s + 8, 0),         # nose
        rot(-s + 4, -s),       # top-back
        rot(-s + 16, 0),       # tail notch
        rot(-s + 4, s),        # bottom-back
    ]
    d.polygon(body, fill=YELLOW + (255,))

    tail = [rot(-s + 16, -8), rot(-s - 12, 0), rot(-s + 16, 8)]
    d.polygon(tail, fill=CYAN + (255,))

    # Eye
    eye = rot(8, -6)
    d.ellipse(
        [eye[0] - 5, eye[1] - 5, eye[0] + 5, eye[1] + 5],
        fill=BG + (255,),
    )

    glow = layer.filter(ImageFilter.GaussianBlur(28))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer)


def draw_particles(canvas, cx, cy, n=10, color=CYAN):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    import random
    random.seed(42)
    for i in range(n):
        ang = random.uniform(math.pi * 0.6, math.pi * 1.4)  # leftward spread
        dist = random.randint(20, 90)
        px = cx + math.cos(ang) * dist
        py = cy + math.sin(ang) * dist
        r = random.randint(3, 6)
        a = max(50, 220 - dist * 2)
        d.ellipse([px - r, py - r, px + r, py + r], fill=color + (a,))
    glow = layer.filter(ImageFilter.GaussianBlur(8))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer)


def draw_scanlines(canvas, alpha=30):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for y in range(0, canvas.size[1], 4):
        d.rectangle([0, y, canvas.size[0], y + 1], fill=(0, 0, 0, alpha))
    canvas.alpha_composite(layer)


# =============================================================
# Phone 1 — Menu screen (recreates the React menu pixel-faithfully)
# =============================================================
def make_phone_1():
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    draw_grid(d, W, H, 110, CYAN, alpha=12)

    # Horizon line
    d.line([(0, H // 2), (W, H // 2)], fill=CYAN + (28,), width=2)

    # Top corner: SOUND ON
    neon_text(img, "SOUND ON", (W - 280, 70), 36, GREY_DIM, glow_radius=4, bold=False)

    # Title
    title = "GRAV-SHIFT"
    tw, _ = text_size(title, 220)
    chroma_title(img, title, ((W - tw) // 2, 760), 220, glow_radius=22)

    # Subtitle
    sub = "ONE TAP // FLIP GRAVITY // SURVIVE"
    sw, _ = text_size(sub, 38, bold=False)
    neon_text(img, sub, ((W - sw) // 2, 1010), 38, GREY_DIM, glow_radius=4, bold=False)

    # PLAY button
    btn_w, btn_h = 360, 130
    bx = (W - btn_w) // 2
    by = 1180
    # outer glow box
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rectangle([bx, by, bx + btn_w, by + btn_h], outline=CYAN + (255,), width=4)
    glow_blur = glow.filter(ImageFilter.GaussianBlur(16))
    img.alpha_composite(glow_blur)
    img.alpha_composite(glow)
    # Triangle "play" icon (drawn as polygon, not unicode)
    tri_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    tld = ImageDraw.Draw(tri_layer)
    tld.polygon(
        [(bx + 90, by + 38), (bx + 90, by + 92), (bx + 138, by + 65)],
        fill=CYAN + (255,),
    )
    img.alpha_composite(tri_layer.filter(ImageFilter.GaussianBlur(8)))
    img.alpha_composite(tri_layer)
    neon_text(img, "PLAY", (bx + 165, by + 40), 56, CYAN, glow_radius=8)

    # LEADERBOARD button
    by2 = 1360
    bw2, bh2 = 460, 100
    bx2 = (W - bw2) // 2
    glow2 = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd2 = ImageDraw.Draw(glow2)
    gd2.rectangle([bx2, by2, bx2 + bw2, by2 + bh2], outline=CORAL + (255,), width=3)
    glow2_blur = glow2.filter(ImageFilter.GaussianBlur(10))
    img.alpha_composite(glow2_blur)
    img.alpha_composite(glow2)
    # Diamond icon (drawn as polygon)
    dia_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dld = ImageDraw.Draw(dia_layer)
    dcx, dcy = bx2 + 60, by2 + 50
    dld.polygon(
        [(dcx, dcy - 18), (dcx + 18, dcy), (dcx, dcy + 18), (dcx - 18, dcy)],
        fill=CORAL + (255,),
    )
    img.alpha_composite(dia_layer.filter(ImageFilter.GaussianBlur(6)))
    img.alpha_composite(dia_layer)
    neon_text(img, "LEADERBOARD", (bx2 + 100, by2 + 30), 44, CORAL, glow_radius=6)

    # Controls hint (3 lines, color-coded keywords)
    hint_y = 1640
    line1 = "TAP / SPACE: FLAP"
    lw1, _ = text_size(line1, 32, bold=False)
    neon_text(img, line1, ((W - lw1) // 2, hint_y), 32, GREY_DIM, glow_radius=2, bold=False)

    line2_parts = [("GREEN ORB", GREEN), (": FLIP GRAVITY · ", GREY_DIM), ("RED PIPES", CORAL), (": ", GREY_DIM)]
    total_w2 = sum(text_size(t, 28, bold=False)[0] for t, _ in line2_parts)
    cur_x = (W - total_w2) // 2
    for text, color in line2_parts:
        neon_text(img, text, (cur_x, hint_y + 60), 28, color, glow_radius=3, bold=False)
        cur_x += text_size(text, 28, bold=False)[0]

    line3_parts = [("AUTO-FLIP · ", GREY_DIM), ("EVERY 22S", YELLOW), (": GLOBAL FLIP", GREY_DIM)]
    total_w3 = sum(text_size(t, 28, bold=False)[0] for t, _ in line3_parts)
    cur_x = (W - total_w3) // 2
    for text, color in line3_parts:
        neon_text(img, text, (cur_x, hint_y + 110), 28, color, glow_radius=3, bold=False)
        cur_x += text_size(text, 28, bold=False)[0]

    # BEST · 0047
    best = "BEST · 0047"
    bw, _ = text_size(best, 32, bold=False)
    neon_text(img, best, ((W - bw) // 2, 1880), 32, GREY_DIM, glow_radius=4, bold=False)

    draw_scanlines(img, alpha=22)
    img.convert("RGB").save(OUT / "phone-1.png", "PNG", optimize=True)
    print("✓ phone-1.png (menu, 1080x2400)")


# =============================================================
# Phone 2 — Gameplay action shot
# =============================================================
def make_phone_2():
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    draw_grid(d, W, H, 110, CYAN, alpha=12)
    d.line([(0, H // 2), (W, H // 2)], fill=CYAN + (28,), width=2)

    # ---- Big translucent score "12" centered horizontally, near top ----
    score = "12"
    sw, sh = text_size(score, 600)
    score_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(score_layer)
    sd.text(((W - sw) // 2, 200), score, font=f(600), fill=(244, 244, 245, 56))
    img.alpha_composite(score_layer)

    # ---- Top-left: gravity indicator (custom-drawn arrow, not unicode) ----
    arrow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    al = ImageDraw.Draw(arrow_layer)
    al.polygon([(70, 55), (110, 55), (90, 105)], fill=YELLOW + (255,))
    al.rectangle([83, 35, 97, 60], fill=YELLOW + (255,))
    img.alpha_composite(arrow_layer.filter(ImageFilter.GaussianBlur(8)))
    img.alpha_composite(arrow_layer)
    neon_text(img, "GRAVITY DOWN", (140, 60), 32, GREY, glow_radius=2, bold=False)

    # Top-right: SOUND ON / PAUSE (text only, no unicode)
    neon_text(img, "SOUND ON", (W - 480, 65), 30, GREY_DIM, glow_radius=2, bold=False)
    # Pause = two vertical bars drawn as rectangles
    pl = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pld = ImageDraw.Draw(pl)
    pld.rectangle([W - 230, 60, W - 220, 90], fill=GREY_DIM + (255,))
    pld.rectangle([W - 210, 60, W - 200, 90], fill=GREY_DIM + (255,))
    img.alpha_composite(pl)
    neon_text(img, "PAUSE", (W - 185, 65), 30, GREY_DIM, glow_radius=2, bold=False)

    # ---- Pipes (3 pairs across the screen) ----
    # Pipe 1 (cyan, mid-left)
    draw_pipe(img, x=140, gap_y=900, gap_h=420, h=H, is_flip=False)
    # Pipe 2 (RED FLIP-PIPE — incoming on right)
    draw_pipe(img, x=720, gap_y=1500, gap_h=420, h=H, is_flip=True)
    # Pipe 3 (cyan, far right edge - distant)
    draw_pipe(img, x=1180, gap_y=1100, gap_h=420, h=H, is_flip=False)

    # ---- Ship: just past pipe 1, banking up slightly ----
    ship_x, ship_y = 320, 1080
    draw_particles(img, ship_x - 50, ship_y, n=14, color=CYAN)
    draw_ship(img, ship_x, ship_y, size=44, rotation=-0.25)

    # ---- Orb between pipes 1 and 2 ----
    draw_orb(img, x=540, y=1200, t=0.5)

    # ---- Watermark / hint at bottom ----
    hint = "GRAV-SHIFT  ·  ONE TAP  ·  FLIP GRAVITY"
    hw, _ = text_size(hint, 32, bold=False)
    neon_text(img, hint, ((W - hw) // 2, H - 100), 32, GREY_DIM, glow_radius=3, bold=False)

    draw_scanlines(img, alpha=22)
    img.convert("RGB").save(OUT / "phone-2.png", "PNG", optimize=True)
    print("✓ phone-2.png (gameplay, 1080x2400)")


if __name__ == "__main__":
    print("Generating Play Store phone screenshots…")
    make_phone_1()
    make_phone_2()
    import os
    for p in sorted(OUT.glob("phone-*.png")):
        print(f"  {p.name:14s}  {os.path.getsize(p) // 1024} KB")
