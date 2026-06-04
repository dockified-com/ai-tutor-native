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
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setAudioPlaying(false);
  }, [setAudioPlaying]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    setIsPlaying(false);
    setAudioPlaying(false);
    chunksPlaying.current = 0;
    isStreamDone.current = false;
  }, [setAudioPlaying]);

  const playPcmChunk = (base64Str: string, speed: number) => {
    if (!audioContextRef.current) return;
    
    const binaryStr = window.atob(base64Str);
    const len = binaryStr.length;
    
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 0x7fff;
    }

    const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = speed;
    source.connect(audioContextRef.current.destination);

    source.onended = () => {
        chunksPlaying.current--;
        if (isStreamDone.current && chunksPlaying.current === 0) {
            handleAudioEnded();
        }
    };

    const currentTime = audioContextRef.current.currentTime;
    if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
    }
    
    source.start(nextStartTimeRef.current);
    chunksPlaying.current++;
    
    nextStartTimeRef.current += (audioBuffer.duration / speed);
  };

  const playTTS = useCallback(async (text: string, context?: string) => {
    stop();
    initAudioContext();
    
    abortControllerRef.current = new AbortController();
    setIsPlaying(true);
    setAudioPlaying(true);
    nextStartTimeRef.current = 0;
    chunksPlaying.current = 0;
    isStreamDone.current = false;
    setError(null);

    const currentSpeed = useTutorStore.getState().audio.speed;

    try {
      const response = await fetch('/api/tts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ prompt: text, studentContext: context }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
            isStreamDone.current = true;
            if (chunksPlaying.current === 0) {
                handleAudioEnded();
            }
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
                isStreamDone.current = true;
                if (chunksPlaying.current === 0) {
                    handleAudioEnded();
                }
                break;
            }
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'audio' && parsed.data) {
                  playPcmChunk(parsed.data, currentSpeed);
                }
              } catch (e) {
                console.error("Error parsing chunk", e);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
         setError(err.message);
         setIsPlaying(false);
         setAudioPlaying(false);
      }
    }
  }, [stop, handleAudioEnded, setAudioPlaying]);

  return { isPlaying, error, playTTS, stop };
}
