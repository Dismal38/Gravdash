"""
Generate 3 distinct Android app icon concepts for GravShift using Gemini Nano Banana.

This is a one-shot generation script — not part of the app.
Run with:  python /app/scripts/generate_icon_concepts.py
Outputs:  /app/resources/icon_concepts/icon_concept_{1,2,3}.png
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

CONCEPTS = [
    {
        "name": "concept_1_minimalist_cyclops",
        "prompt": (
            "Square Android app icon, 1024x1024 pixels, no text, no letters, no words. "
            "A single small expressive triangular spaceship character with one large glowing "
            "cyan eye in the center, facing right, floating against a deep matte black "
            "background. The ship body is solid bright yellow (#FFD600) with a subtle yellow glow halo. "
            "Two thin neon cyan vertical lines suggest gravity pillars on the left and right edges. "
            "A tiny green orb floats in the upper right with a soft green bloom. "
            "Style: clean flat vector with neon glow, premium indie arcade game aesthetic, "
            "bold silhouette readable at 48x48 pixels, NO TEXT ANYWHERE on the icon, "
            "NO letters, NO numbers, NO logos, NO watermarks, just pure illustration."
        ),
    },
    {
        "name": "concept_2_inverted_world",
        "prompt": (
            "Square Android app icon, 1024x1024 pixels, no text, no letters, no words. "
            "Visual concept: split horizon — top half is hot pink/magenta neon glow, "
            "bottom half is electric cyan neon glow, divided by a single bright white "
            "horizontal line through the middle. A small bright yellow chevron-shaped "
            "ship sits exactly on the dividing line, mirrored above and below as a "
            "soft reflection — symbolizing gravity flip. Subtle CRT scanlines overlay. "
            "Deep black background outside the central glow. "
            "Style: cyberpunk arcade, bold silhouette, premium feel, "
            "NO TEXT ANYWHERE, NO letters, NO numbers, NO logos, just pure illustration."
        ),
    },
    {
        "name": "concept_3_orb_collector",
        "prompt": (
            "Square Android app icon, 1024x1024 pixels, no text, no letters, no words. "
            "A cute geometric yellow ship character with one big friendly cyan eye, "
            "tiny rocket flame trailing behind it, captured mid-flight as it dives "
            "toward a bright glowing green orb in the lower right corner. The orb "
            "emits radial green light rays. Background is deep matte black with "
            "very subtle dark cyan grid lines (faint, like graph paper). The whole "
            "composition uses a 3/4 perspective so the ship has personality and motion. "
            "Style: modern indie arcade, neon glow, high contrast, memorable mascot, "
            "readable at 48x48 pixels, NO TEXT ANYWHERE, NO letters, NO numbers, NO logos."
        ),
    },
]


async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY not loaded from /app/backend/.env")

    for i, concept in enumerate(CONCEPTS, start=1):
        print(f"\n[{i}/3] Generating: {concept['name']}")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"gravshift-icon-{i}",
            system_message="You are a world-class mobile app icon designer.",
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
            modalities=["image", "text"]
        )

        msg = UserMessage(text=concept["prompt"])
        try:
            text, images = await chat.send_message_multimodal_response(msg)
        except Exception as e:
            print(f"  FAILED: {e}")
            continue

        if not images:
            print(f"  No image returned. Text: {text[:120] if text else '(none)'}")
            continue

        out_path = OUT_DIR / f"icon_{concept['name']}.png"
        image_bytes = base64.b64decode(images[0]["data"])
        out_path.write_bytes(image_bytes)
        print(f"  Saved -> {out_path} ({len(image_bytes) // 1024} KB)")

    print("\nDone. Concepts saved to:", OUT_DIR)


if __name__ == "__main__":
    asyncio.run(main())
