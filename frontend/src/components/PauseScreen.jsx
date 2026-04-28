import React from "react";

export default function PauseScreen({ onResume, onQuit }) {
    return (
        <div
            data-ui-overlay="true"
            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
            style={{ background: "rgba(5,5,8,0.85)" }}
        >
            <div
                className="font-display tracking-widest mb-8"
                style={{ fontSize: "3rem", color: "#F4F4F5" }}
            >
                PAUSED
            </div>
            <button
                type="button"
                data-testid="resume-button"
                onClick={onResume}
                className="btn-primary"
            >
                ▶ RESUME
            </button>
            <button
                type="button"
                data-testid="quit-button"
                onClick={onQuit}
                className="btn-secondary mt-4"
            >
                ◀ QUIT TO MENU
            </button>
        </div>
    );
}
