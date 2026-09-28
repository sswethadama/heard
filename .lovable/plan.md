# Bottom-of-the-ocean background

## What will change
- Replace the existing page background with the requested rose-to-near-black vertical ombre.
- Add a soft drifting surface glow, five gently swaying light rays, and pale-pink floor caustics using CSS and inline SVG filters only.
- Add a dark translucent readability layer behind the app content without changing its layout, wording, or behavior.
- Disable motion and ray displacement when reduced motion is requested.

## Technical details
- Keep the decorative background fixed, non-interactive, and behind the existing interface.
- Use lightweight CSS keyframes for the 9-second glow and 10-second ray cycles.
- Use SVG turbulence/displacement for ray wobble and turbulence/color filtering for caustics, with the caustics constrained to the lower half.
- Verify the result at desktop and mobile sizes, including a reduced-motion check and typing-screen readability.
