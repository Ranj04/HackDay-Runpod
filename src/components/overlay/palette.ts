// The Ghost palette — "motion-capture at night": electric blue ideal, vivid
// orange error, warm white you, on a blue-black stage. Single source for the
// brand colors used across the capture preview, the form-vs-ghost canvas, and
// its chrome — no component hardcodes a hex. Canvas (2D context) can't consume
// CSS classes, so these are real values rather than Tailwind tokens.
//
// Discipline: blue is the dominant brand; orange is the SHARP ACCENT and appears
// ONLY where form deviates. Never both loud in the same view outside the canvas.
export const INK = "#080C14"; // blue-black background / on-blue text
export const SURFACE = "#16202F"; // hairline borders, scrubber track
export const BONE = "#F4F1E8"; // you / primary text on ink (warm white)
export const GHOST = "#2E86FF"; // the ideal reference (electric azure blue)
export const SIGNAL = "#FF6A1A"; // the one deviation / error (vivid orange)
export const MUTED = "#7C879B"; // secondary labels on ink

// RGB triplets for canvas rgba() glows.
export const GHOST_RGB = "46, 134, 255";
export const SIGNAL_RGB = "255, 106, 26";
