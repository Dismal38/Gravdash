"""
Generate one polished, top-tier app icon for GravDash.
Tries Nano Banana with a strong prompt designed for premium mobile game aesthetic.
"""
import asyncio
import base64
import os
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

OUT_DIR = Path("/app/resources/icon_concepts")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Top mobile-game icon design rules built into the prompt:
# - ONE clear hero (the ship) — readable at 48x48
# - Dramatic lighting — premium AAA feel, not flat vector
# - Tight color palette — yellow hero, cyan + magenta accent (matches in-game)
# - Implied depth — radial glow / portal vibe suggests 3D without losing icon clarity
# - Strong silhouette + asymmetric composition
PROMPT = (
    "Premium mobile game app icon, 1024x1024 pixels, perfect square, NO TEXT, "
    "NO letters, NO words, NO logos, NO watermarks anywhere on the image. "
    "Centerpiece: a sleek glossy yellow chevron-shaped spaceship with a single "
    "bright cyan glowing eye, rendered with dramatic volumetric lighting and "
    "subtle 3D dimensionality, banking dynamically to the upper-right. "
    "Behind the ship: a swirling cyan-to-magenta gravity vortex / portal "
    "with radial light rays bursting outward, creating depth and energy. "
    "Tiny bright green orbs float around the ship like collectibles. "
    "Subtle dark grid texture in the deep background space. "
    "Style: AAA mobile arcade game icon aesthetic similar to Geometry Dash, "
    "Alto's Odyssey, or Color Switch — polished, premium, eye-catching at "
    "thumbnail size (48x48 pixels still readable). High contrast, neon glow, "
    "strong silhouette of the ship as the clear focal point. "
    "Color palette strictly limited to: bright yellow (#FFD600) for the ship, "
    "electric cyan (#00F0FF), hot magenta (#FF3366), accent green (#39FF14), "
    "and deep matte black (#050508) background. "
    "Bold, iconic, instantly recognizable. Production-ready Play Store quality. "
    "NO TEXT OF ANY KIND anywhere on the icon."
)


async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY not loaded")

    chat = LlmChat(
        api_key=api_key,
        session_id="gravdash-icon-premium-v1",
        system_message="You are a world-class mobile game art director.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )

    print("Generating premium hero icon… (may take ~30 seconds)")
    msg = UserMessage(text=PROMPT)
    try:
        text, images = await chat.send_message_multimodal_response(msg)
    except Exception as e:
        print(f"FAILED: {e}")
        return

    if not images:
        print("No image returned.")
        print(f"Text response: {text[:200] if text else '(none)'}")
        return

    out_path = OUT_DIR / "icon_concept_premium_v1.png"
    image_bytes = base64.b64decode(images[0]["data"])
    out_path.write_bytes(image_bytes)
    print(f"\n✓ Saved -> {out_path} ({len(image_bytes) // 1024} KB)")


if __name__ == "__main__":
    asyncio.run(main())
