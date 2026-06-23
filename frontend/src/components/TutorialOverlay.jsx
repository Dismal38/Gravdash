import React, { useState } from "react";

const STEPS = [
    {
        title: "WELCOME TO GRAVDASH",
        body: "A one-tap arcade reflex game with a twist: gravity won't stay still.",
        accent: "#FFD600",
    },
    {
        title: "TAP TO FLAP",
        body: "Tap anywhere on the screen to flap. Each flap pushes you against current gravity. Don't touch the walls or pipes.",
        accent: "#00F0FF",
    },
    {
        title: "WATCH FOR THE RED PIPES",
        body: "Cyan pipes are normal. RED pipes flip your gravity the moment you pass through them. React fast — the world is now upside-down.",
        accent: "#FF3366",
    },
    {
        title: "SURVIVE & BEAT YOUR BEST",
        body: "Each pipe you pass = 1 point. Speed ramps up gradually. Beat your high score, then try the Daily Challenge for a new level every day.",
        accent: "#39FF14",
    },
];

export default function TutorialOverlay({ onClose }) {
    const [step, setStep] = useState(0);
    const isLast = step === STEPS.length - 1;
    const current = STEPS[step];

    return (
        <div
            data-ui-overlay="true"
            data-testid="tutorial-overlay"
            className="absolute inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(5,5,8,0.92)" }}
        >
            <div
                className="panel w-full max-w-md p-7 text-center"
                style={{ borderColor: current.accent + "66" }}
            >
                {/* Step indicator dots */}
                <div className="flex gap-2 justify-center mb-5">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                background:
                                    i === step
                                        ? current.accent
                                        : "rgba(244,244,245,0.18)",
                                boxShadow:
                                    i === step
                                        ? `0 0 10px ${current.accent}`
                                        : "none",
                                transition: "all 0.25s",
                            }}
                        />
                    ))}
                </div>

                <div
                    className="font-display"
                    style={{
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        letterSpacing: "0.04em",
                        color: current.accent,
                        textShadow: `0 0 12px ${current.accent}88`,
                        lineHeight: 1.1,
                    }}
                    data-testid="tutorial-title"
                >
                    {current.title}
                </div>

                <p
                    className="mt-5 font-mono text-sm leading-relaxed"
                    style={{ color: "rgba(244,244,245,0.85)" }}
                    data-testid="tutorial-body"
                >
                    {current.body}
                </p>

                <div className="mt-7 flex flex-col gap-3">
                    <button
                        type="button"
                        data-testid="tutorial-next-button"
                        onClick={() => (isLast ? onClose() : setStep(step + 1))}
                        className="btn-primary"
                        style={{ fontSize: "0.95rem" }}
                    >
                        {isLast ? "▶ START PLAYING" : "NEXT"}
                    </button>
                    {!isLast && (
                        <button
                            type="button"
                            data-testid="tutorial-skip-button"
                            onClick={onClose}
                            className="btn-ghost"
                            style={{ fontSize: "0.75rem" }}
                        >
                            SKIP TUTORIAL
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
