import { useState, useCallback, useRef } from 'react';

export type SSEStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseSSEStreamReturn {
  data: string;
  result: string | null;
  status: SSEStatus;
  error: string | null;
  execute: (url: string, options?: RequestInit) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

export function useSSEStream(): UseSSEStreamReturn {
  const [data, setData] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<SSEStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setData('');
    setResult(null);
    setStatus('idle');
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
  }, []);

  const execute = useCallback(async (url: string, options?: RequestInit) => {
    reset();
    setStatus('loading');
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Accept': 'text/event-stream',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          setStatus((prev) => prev !== 'error' ? 'success' : 'error');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();

            // Route by event name
            if (currentEvent === 'token') {
              if (dataStr === '[DONE]') {
                setStatus('success');
              } else if (dataStr) {
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.text !== undefined) {
                    setData((prev) => prev + parsed.text);
                  }
                } catch (e) {
                  // ignore parse errors
                }
              }
            } else if (currentEvent === 'result') {
              if (dataStr && dataStr !== '[DONE]') {
                setResult(dataStr);
              }
            } else if (currentEvent === 'done') {
              setStatus('success');
            } else if (currentEvent === 'error') {
              try {
                const parsed = JSON.parse(dataStr);
                setError(parsed.message || 'Stream error');
                setStatus('error');
              } catch (e) {
                setError(dataStr || 'Stream error');
                setStatus('error');
              }
            } else {
              // Backward compat: bare data: line
              if (dataStr === '[DONE]') {
                setStatus('success');
              } else if (dataStr) {
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.text !== undefined) {
                    setData((prev) => prev + parsed.text);
                  } else if (typeof parsed === 'string') {
                    setData((prev) => prev + parsed);
                  }
                } catch (e) {
                  setData((prev) => prev + dataStr.replace(/\\n/g, '\n'));
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Aborted intentionally
      } else {
        setError(err.message || 'An error occurred during streaming');
        setStatus('error');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [reset]);

  return { data, result, status, error, execute, reset, abort };
}
