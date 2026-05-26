"""
Generate GRAVDASH brand assets for the Play Store + Android.

Outputs to /app/resources/:
  - icon.png         1024x1024  (launcher icon, masked-friendly)
  - icon-fg.png      1024x1024  (foreground for adaptive icon)
  - splash.png       2732x2732  (Capacitor splash, center-cropped)
  - feature.png      1024x500   (Play Store listing feature graphic)

Run:  python /app/scripts/gen_assets.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
from pathlib import Path

OUT = Path("/app/resources")
OUT.mkdir(parents=True, exist_ok=True)

# Brand palette (matches in-game)
BG = (5, 5, 8)
CYAN = (0, 240, 255)
CORAL = (255, 51, 102)
YELLOW = (255, 214, 0)
GREEN = (57, 255, 20)
WHITE = (244, 244, 245)

# Fonts
FONT_BOLD = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
FONT_REG = "/usr/share/fonts/truetype/freefont/FreeSans.ttf"


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def add_glow(img: Image.Image, radius: int = 18, strength: float = 1.4) -> Image.Image:
    glow = img.filter(ImageFilter.GaussianBlur(radius))
    out = Image.alpha_composite(glow, img)
    return Image.eval(out, lambda v: min(255, int(v * strength)))


def draw_grid(d: ImageDraw.ImageDraw, w: int, h: int, spacing: int, color, alpha: int = 18):
    for x in range(0, w, spacing):
        d.line([(x, 0), (x, h)], fill=color + (alpha,), width=1)
    for y in range(0, h, spacing):
        d.line([(0, y), (w, y)], fill=color + (alpha,), width=1)


def draw_ship(canvas: Image.Image, cx: int, cy: int, size: int, glow_radius: int = 30, simple: bool = False):
    """Glowing yellow ship pointing right — matches the in-game bird.
    `simple=True` omits the eye dot so the icon stays crisp at 48px."""
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = size
    # Triangle/diamond points (right-facing)
    pts = [
        (cx + s, cy),                     # nose
        (cx - s + s // 5, cy - s),        # top-back
        (cx - s + s // 2, cy),            # tail notch
        (cx - s + s // 5, cy + s),        # bottom-back
    ]
    d.polygon(pts, fill=YELLOW + (255,))
    # Tail thrust (cyan)
    tail_pts = [
        (cx - s + s // 2, cy - s // 4),
        (cx - s - s // 3, cy),
        (cx - s + s // 2, cy + s // 4),
    ]
    d.polygon(tail_pts, fill=CYAN + (255,))
    # Eye dot — only on larger ships (omit when icon must scale to 48px)
    if not simple:
        d.ellipse(
            [cx + s // 4 - 4, cy - 4, cx + s // 4 + 4, cy + 4],
            fill=BG + (255,),
        )

    # Glow pass
    glow = layer.filter(ImageFilter.GaussianBlur(glow_radius))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(glow)  # double-pass for stronger neon
    canvas.alpha_composite(layer)


def draw_neon_text(
    canvas: Image.Image, text: str, xy, size: int, color, glow_radius: int = 14, bold: bool = True
):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(size, bold)
    d.text(xy, text, font=f, fill=color + (255,))
    glow = layer.filter(ImageFilter.GaussianBlur(glow_radius))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer)


def text_size(text: str, size: int, bold: bool = True):
    f = font(size, bold)
    bbox = f.getbbox(text)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


# =============================================================
# 1. Launcher icon (1024x1024) — adaptive-icon-safe
# =============================================================
def make_icon():
    W = 1024
    img = Image.new("RGBA", (W, W), BG + (255,))

    # Subtle radial-style gradient using a few overlaid rectangles for depth
    # (Pillow lacks radial gradient natively — keep BG solid for max icon clarity at small sizes)

    # Big, bold ship — no grid, no extras (legible at 48px)
    cx, cy = W // 2 - 30, W // 2
    draw_ship(img, cx, cy, size=300, glow_radius=80, simple=True)

    img.save(OUT / "icon.png")
    print("✓ icon.png (1024x1024) — clean, scales to 48px")

    # Foreground-only variant (transparent BG) for Android adaptive icon
    fg = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    draw_ship(fg, cx, cy, size=300, glow_radius=80, simple=True)
    fg.save(OUT / "icon-fg.png")
    print("✓ icon-fg.png (1024x1024 transparent)")


# =============================================================
# 2. Splash (2732x2732 — Capacitor recommended; safe-area centered)
# =============================================================
def make_splash():
    W = 2732
    img = Image.new("RGBA", (W, W), BG + (255,))
    d = ImageDraw.Draw(img)
    draw_grid(d, W, W, 100, CYAN, alpha=18)

    # Big neon title
    title = "GRAVDASH"
    tw, th = text_size(title, 220)
    title_x = (W - tw) // 2
    title_y = W // 2 - 200
    # Coral chroma split
    draw_neon_text(img, title, (title_x + 6, title_y), 220, CORAL, glow_radius=24)
    draw_neon_text(img, title, (title_x - 6, title_y), 220, CYAN, glow_radius=24)
    draw_neon_text(img, title, (title_x, title_y), 220, WHITE, glow_radius=20)

    # Subtitle
    sub = "ONE TAP / FLIP GRAVITY / SURVIVE"
    sw, sh = text_size(sub, 60, bold=False)
    draw_neon_text(
        img, sub, ((W - sw) // 2, title_y + th + 60), 60, CYAN, glow_radius=8, bold=False
    )

    # Ship below subtitle
    draw_ship(img, W // 2 - 30, title_y + th + 280, size=140, glow_radius=40)

    img.save(OUT / "splash.png")
    print("✓ splash.png (2732x2732)")


# =============================================================
# 3. Feature graphic (1024x500) — Play Store listing
# =============================================================
def make_feature():
    W, H = 1024, 500
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    draw_grid(d, W, H, 50, CYAN, alpha=22)

    # Diagonal neon stripes (right side)
    stripe = Image.new("RGBA", (W * 2, H * 2), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stripe)
    for i in range(10):
        y = 100 + i * 60
        sd.rectangle([0, y, W * 2, y + 8], fill=CORAL + (45,))
    stripe = stripe.rotate(-15, resample=Image.BICUBIC).crop(
        (W // 2, H // 2, W // 2 + W, H // 2 + H)
    )
    img.alpha_composite(stripe)

    # LEFT: stacked title
    title = "GRAV"
    title2 = "DASH"
    draw_neon_text(img, title, (60, 90), 130, WHITE, glow_radius=18)
    draw_neon_text(img, title, (66, 90), 130, CORAL, glow_radius=18)
    draw_neon_text(img, title, (54, 90), 130, CYAN, glow_radius=18)
    draw_neon_text(img, title, (60, 90), 130, WHITE, glow_radius=10)

    draw_neon_text(img, title2, (60, 230), 130, WHITE, glow_radius=18)
    draw_neon_text(img, title2, (66, 230), 130, CORAL, glow_radius=18)
    draw_neon_text(img, title2, (54, 230), 130, CYAN, glow_radius=18)
    draw_neon_text(img, title2, (60, 230), 130, WHITE, glow_radius=10)

    # Tagline
    tag = "ONE TAP // FLIP GRAVITY"
    draw_neon_text(img, tag, (62, 410), 28, CYAN, glow_radius=6, bold=False)

    # RIGHT: Ship + glow
    draw_ship(img, W - 220, H // 2, size=130, glow_radius=50)

    # Score badge top right
    badge = "$0.99"
    draw_neon_text(img, badge, (W - 200, 40), 56, YELLOW, glow_radius=14)

    img.save(OUT / "feature.png")
    print("✓ feature.png (1024x500)")


if __name__ == "__main__":
    print("Generating GRAVDASH brand assets…")
    # NOTE: make_icon() is intentionally skipped — the user picked the
    # Concept 2 (Inverted World) icon. Use /app/scripts/apply_icon_concept_2.py
    # to regenerate the icon if needed.
    make_splash()
    make_feature()
    print(f"\nAll assets written to {OUT}/")
    for p in sorted(OUT.glob("*.png")):
        size = os.path.getsize(p)
        print(f"  {p.name:14s}  {size // 1024} KB")
