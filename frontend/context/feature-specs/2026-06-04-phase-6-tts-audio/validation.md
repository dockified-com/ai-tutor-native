# Phase 6 Validation Criteria

To confidently merge Phase 6 into the main branch, the following criteria must be met:

## 1. Dynamic TTS Audio Streaming & Playback
- [ ] Verify that when a dynamic block generates, the frontend successfully connects to the backend socket/SSE and receives both text and audio chunk streams.
- [ ] Verify that the Web Audio API queue plays the incoming audio chunks continuously without clicking or gaps.
- [ ] Verify that audio auto-plays upon stream start (assuming the user has previously interacted with the document to bypass autoplay restrictions).
- [ ] Test fallback behavior if the socket drops or audio data is unavailable (should fail silently and allow the text lesson to continue).

## 2. Audio Controls
- [ ] Verify play/pause toggle in `audio-controls.tsx` works correctly.
- [ ] Verify speed changes (0.5x to 1.5x) immediately affect the audio playback rate.

## 3. Auto-Continue
- [ ] Turn ON auto-continue. Verify that when the audio finishes (`onended`), the next block is automatically revealed *only if* the continue button is not gated (e.g., if it's a code block that needs passing, it should not auto-continue).
- [ ] Turn OFF auto-continue. Verify the lesson stops at the end of the audio, requiring manual continuation.

## 4. Progress Sidebar
- [ ] Open the progress slideout and verify it accurately displays the student's overall progress percentage.
- [ ] Verify the curriculum tree accurately reflects the course structure and uses existing design system tokens without breaking the layout.
