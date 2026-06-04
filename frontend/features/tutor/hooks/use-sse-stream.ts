import { useState, useCallback, useRef } from 'react';

export type SSEStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseSSEStreamReturn {
  data: string;
  status: SSEStatus;
  error: string | null;
  execute: (url: string, options?: RequestInit) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

export function useSSEStream(): UseSSEStreamReturn {
  const [data, setData] = useState<string>('');
  const [status, setStatus] = useState<SSEStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setData('');
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
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              setStatus('success');
            } else if (dataStr) {
              try {
                // Try parsing JSON first
                const parsed = JSON.parse(dataStr);
                if (parsed.text !== undefined) {
                  setData((prev) => prev + parsed.text);
                } else if (typeof parsed === 'string') {
                  setData((prev) => prev + parsed);
                }
              } catch (e) {
                // Fallback: raw string append
                setData((prev) => prev + dataStr.replace(/\\n/g, '\n'));
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

  return { data, status, error, execute, reset, abort };
}
