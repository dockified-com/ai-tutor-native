import { useState, useCallback, useRef } from 'react';
import { useTutorStore } from '../stores/tutor-store';

export function useTTSAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chunksPlaying = useRef<number>(0);
  const isStreamDone = useRef<boolean>(false);
  const setAudioPlaying = useTutorStore((state) => state.setAudioPlaying);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
  };

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setAudioPlaying(false);
  }, [setAudioPlaying]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsPlaying(false);
    setAudioPlaying(false);
    chunksPlaying.current = 0;
    isStreamDone.current = false;
  }, [setAudioPlaying]);

  const playPcmChunk = (bytes: Uint8Array, speed: number) => {
    if (!audioContextRef.current) return;
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x7fff;
    const buf = audioContextRef.current.createBuffer(1, float32.length, 24000);
    buf.getChannelData(0).set(float32);
    const src = audioContextRef.current.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = speed;
    src.connect(audioContextRef.current.destination);
    src.onended = () => {
      chunksPlaying.current--;
      if (isStreamDone.current && chunksPlaying.current === 0) handleAudioEnded();
    };
    const now = audioContextRef.current.currentTime;
    if (nextStartTimeRef.current < now) nextStartTimeRef.current = now;
    src.start(nextStartTimeRef.current);
    chunksPlaying.current++;
    nextStartTimeRef.current += buf.duration / speed;
  };

  const playTTS = useCallback(async (text: string) => {
    stop();
    initAudioContext();
    abortControllerRef.current = new AbortController();
    setIsPlaying(true);
    setAudioPlaying(true);
    nextStartTimeRef.current = 0;
    chunksPlaying.current = 0;
    isStreamDone.current = false;
    setError(null);
    const speed = useTutorStore.getState().audio.speed;

    try {
      // Mint a session token (server-side: Clerk-authed + AI service secret)
      const { ai_url, session_token } = await fetch('/api/tts/session', { method: 'POST' }).then(r => r.json()) as { ai_url: string; session_token: string };

      const response = await fetch(ai_url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session_token}` },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value?.length) playPcmChunk(value, speed);
      }
      isStreamDone.current = true;
      if (chunksPlaying.current === 0) handleAudioEnded();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        setIsPlaying(false);
        setAudioPlaying(false);
      }
    }
  }, [stop, handleAudioEnded, setAudioPlaying]);

  return { isPlaying, error, playTTS, stop };
}
