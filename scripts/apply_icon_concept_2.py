"""
Apply Concept 2 (Inverted World) as the GravShift Android app icon.
Resizes the source 1024x1024 to every required Android density bucket
and writes both legacy (ic_launcher) and adaptive (foreground/background) layers.
"""
from pathlib import Path
from PIL import Image

SRC = Path("/app/resources/icon_concepts/icon_concept_2_inverted_world.png")
ANDROID_RES = Path("/app/frontend/android/app/src/main/res")
RESOURCES = Path("/app/resources")

# Android density bucket -> px size for launcher icons
DENSITIES = {
    "ldpi": 36,
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

# Adaptive-icon layers are 108dp; for the foreground/background drawables we use
# the same density buckets but at the same px sizes (as already on disk).
# The XML applies a 16.7% inset, so we want the source content to fill the canvas.

def main():
    src = Image.open(SRC).convert("RGBA")
    print(f"Source: {SRC} ({src.size})")

    # 1) Legacy launcher icons (ic_launcher.png + ic_launcher_round.png) per density
    for density, size in DENSITIES.items():
        out_dir = ANDROID_RES / f"mipmap-{density}"
        if not out_dir.exists():
            print(f"  skip (missing dir): {out_dir}")
            continue
        resized = src.resize((size, size), Image.LANCZOS)
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            target = out_dir / name
            resized.save(target, "PNG")
            print(f"  wrote {target} ({size}x{size})")

    # 2) Adaptive foreground layer = the same artwork (chevron is centered, will
    #    survive any system mask). 16.7% inset declared in mipmap-anydpi-v26/ic_launcher.xml.
    for density, size in DENSITIES.items():
        out_dir = ANDROID_RES / f"mipmap-{density}"
        target = out_dir / "ic_launcher_foreground.png"
        if not target.parent.exists():
            continue
        # Use a slightly zoomed-in crop so the chevron + horizon line sit centrally
        # after the 16.7% inset is applied by the system.
        resized = src.resize((size, size), Image.LANCZOS)
        resized.save(target, "PNG")
        print(f"  wrote {target} (adaptive fg)")

    # 3) Adaptive background layer = solid black (matches the icon's deep-black look)
    for density, size in DENSITIES.items():
        out_dir = ANDROID_RES / f"mipmap-{density}"
        target = out_dir / "ic_launcher_background.png"
        if not target.parent.exists():
            continue
        bg = Image.new("RGBA", (size, size), (5, 5, 8, 255))
        bg.save(target, "PNG")
        print(f"  wrote {target} (adaptive bg)")

    # 4) Update the master /app/resources/icon.png used by Play Store listing (512x512)
    listing_icon = src.resize((512, 512), Image.LANCZOS)
    listing_icon.save(RESOURCES / "icon.png", "PNG")
    print(f"  wrote {RESOURCES / 'icon.png'} (Play Store listing icon, 512x512)")

    # 5) Update the foreground PNG used in resources for reference
    listing_fg = src.resize((512, 512), Image.LANCZOS)
    listing_fg.save(RESOURCES / "icon-fg.png", "PNG")
    print(f"  wrote {RESOURCES / 'icon-fg.png'}")

    print("\nDone.")


if __name__ == "__main__":
    main()
