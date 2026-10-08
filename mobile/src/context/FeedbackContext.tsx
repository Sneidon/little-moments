import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { FeedbackHost, type DialogState } from '../components/feedback/FeedbackHost';
import type { FeedbackTone } from '../components/feedback/FeedbackDialog';

type NotifyOptions = { tone: FeedbackTone; title: string; message?: string; actionLabel?: string };

type FeedbackValue = {
  withLoader: <T>(work: Promise<T> | (() => Promise<T>), label?: string) => Promise<T>;
  notify: (options: NotifyOptions) => Promise<void>;
};

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [loaderLabel, setLoaderLabel] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveDialog = useRef<(() => void) | null>(null);

  const withLoader = useCallback(async <T,>(work: Promise<T> | (() => Promise<T>), label = 'Saving…') => {
    setLoaderLabel(label);
    try {
      return await (typeof work === 'function' ? work() : work);
    } finally {
      setLoaderLabel(null);
    }
  }, []);

  const notify = useCallback(({ actionLabel = 'OK', ...rest }: NotifyOptions) => {
    resolveDialog.current?.();
    setDialog({ ...rest, actionLabel });
    return new Promise<void>((resolve) => {
      resolveDialog.current = resolve;
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(null);
    resolveDialog.current?.();
    resolveDialog.current = null;
  }, []);

  const value = useMemo(() => ({ withLoader, notify }), [withLoader, notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackHost loaderLabel={loaderLabel} dialog={dialog} onCloseDialog={closeDialog} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
