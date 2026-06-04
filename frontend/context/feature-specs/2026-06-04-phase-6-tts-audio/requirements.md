# Phase 6: TTS Audio + Auto-Continue + Progress Polish

## Scope
This phase covers the implementation of the text-to-speech (TTS) audio playback, auto-continue functionality, and progress sidebar polish for the AI Tutor frontend.
Based on technical decisions, we are deferring the negative feedback mechanism (ThumbsDown) to a later phase.

## Technical Decisions
- **Dynamic Streaming TTS Architecture**: Instead of static HTML5 `<audio>` elements with pre-generated URLs, we will stream audio in real-time from the backend. This supports dynamic "Hobby Context Injection" per student without incurring storage overhead for pre-generated WAV files.
- **Backend TTS Generation**: Audio will be generated dynamically using `@google/genai` with the `gemini-3.1-flash-tts-preview` model (using `responseModalities: ['audio']`). The backend will stream both text and PCM audio `inlineData` chunks over a socket/SSE connection directly to the client.
- **Frontend Audio Engine**: The frontend will use the Web Audio API to queue and play the incoming PCM audio chunks seamlessly as the text streams, rather than a static `<audio src="...">` tag.
- **Dependencies**: For backend generation, we require `@google/genai` and `mime` (and `@types/node`).
- **Progress UI**: The progress sidebar will leverage existing design system UI components without introducing complex custom animations, ensuring a consistent and snappy experience.
- **Task Prioritization**: TTS Audio and Auto-Continue will be built first, followed by the Progress Sidebar updates. Feedback functionality has been explicitly deferred.

## Context
See `frontend/context/feature-system.md` for exact interaction sequences, especially:
- **TTS Audio System**: Audio preloads on block activate. Requires prior user gesture for autoplay.
- **Sidebar Drawer System**: Drawer sits between workspace and nav rail.
