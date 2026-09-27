# heard

Build a web app called "Heard" — a two-person conflict resolution tool.

FLOW:

1. Landing screen: choose "One device, passed between us" or "Two devices, joined by code"

2. Single-device mode: Person A types their side privately in a textarea, submits. 

   Then a "handoff" screen says "Pass the device to [Person B]" — nothing from 

   Person A's text is visible. Person B taps "I'm ready," types their side, submits.

3. Two-device mode: One person creates a room and gets a 4-letter code. The other 

   joins by entering the code. Both see a private typing screen. Neither's text is 

   revealed until BOTH have submitted.

4. After both submit (either mode), send both texts to an AI to analyze, and show 

   a "reveal" screen with: the real underlying point of friction (the "crux"), a 

   fair reframe of each person's position, and 3 concrete compromise

Do NOT build sign-up/login. This is a single-session tool, no accounts needed.

Design:COLOR PALETTE:

- Background: dark charcoal #171B1F (primary), #20262C (secondary panels/cards)

- Card/surface background: #232A31

- Primary text: off-white #F3F1EC

- Muted/secondary text: #9AA5AC

- Accent (buttons, highlights, key moments): warm rose/blush #E88AA0

- Accent secondary (labels, soft highlights): light blush #F2C9D6

- Borders/dividers: #323B42

- Button text on accent background: deep plum #2A1219 (for contrast, not white)

MOOD: Calm, private, therapeutic — not bright or playful. Dark background signals 

confidentiality; the rose accent adds warmth without feeling like a lifestyle/mood app.

TYPOGRAPHY: Serif (Georgia or similar) for headlines, sans-serif (Arial/system) 

for body text and UI elements.

Use the rose accent sparingly — primary buttons, the "crux" reveal box, and key 

highlights only. Keep most of the UI dark and quiet so the accent feels meaningful 

when it appears, not decorative.

Calm, therapeutic feel — not 

corporate, not playful. Mobile-first, single column.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/293a967e-0668-4d1b-80c2-8a5a7c131826).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
## Full disclosure

The idea, product design, user experience decisions, conflict-analysis 
approach, and overall concept for Heard are original to this team.

AI tools like lovable were used to help write and generate the code based on our design 
and instructions — this is disclosed as per the hackathon's policy on AI/
existing code usage.

## Timeline

- **Before the event:** Concept development, product design, and initial 
  prototype (single-device and two-device modes)
-
