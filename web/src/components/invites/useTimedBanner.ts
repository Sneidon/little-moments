import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimedBanner(durationMs = 5000) {
  const [message, setMessage] = useState<string | null>(null);
  const timeout = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const show = useCallback(
    (text: string) => {
      clear();
      setMessage(text);
      timeout.current = window.setTimeout(() => {
        setMessage(null);
        timeout.current = null;
      }, durationMs);
    },
    [clear, durationMs]
  );

  const dismiss = useCallback(() => {
    clear();
    setMessage(null);
  }, [clear]);

  return { message, show, dismiss };
}
