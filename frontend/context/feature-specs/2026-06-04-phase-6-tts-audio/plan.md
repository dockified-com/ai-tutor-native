# Phase 6 Implementation Plan

## Group A — Backend TTS Generation & Streaming (Prerequisite)
1. Install necessary dependencies: `npm install @google/genai mime` and `npm install -D @types/node`.
2. Create backend generation logic to use the `gemini-3.1-flash-tts-preview` model via the `@google/genai` SDK with `responseModalities: ['audio']`.
3. Configure the AI request with the specified audio profile, director's note, and voice config (`Achernar`), injecting student-specific context dynamically.
4. Establish a socket/SSE endpoint that extracts both text and `inlineData` audio chunks from the generation stream and forwards them to the frontend in real-time.

## Group B — Frontend TTS Streaming & Playback
1. Create `features/tutor/hooks/use-tts-audio.ts` to connect to the backend socket/SSE.
2. Implement a Web Audio API playback queue to decode and seamlessly play the incoming audio PCM chunks as they arrive.
2. Build `features/tutor/components/audio-controls.tsx` with AudioLines and ChevronDown icons in the top header.
3. Implement a speed control popover inside `audio-controls.tsx` with options for playback speed (0.5x, 0.75x, 1x, 1.25x, 1.5x) and a toggle for auto-continue.

## Group C — Auto-Continue
1. Connect the `audio.onended` event in `use-tts-audio.ts`.
2. When audio ends, evaluate if auto-continue is toggled on and `isContinueEnabled()` is true.
3. If both conditions are met, automatically trigger the Continue action (`revealedIndex++`).

## Group D — Progress Sidebar
1. Update `features/tutor/components/course-progress-slideout.tsx`.
2. Fetch and display real enrollment progress percentage.
3. Render the full curriculum tree data, utilizing existing UI components without custom animations.

*(Note: Group D - Feedback from the original roadmap has been deferred to a later phase as per technical decisions.)*
