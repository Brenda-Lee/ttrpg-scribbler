"use client";

import { useCallback, useEffect, useRef } from "react";

export type AutosaveStatus = "saving" | "saved" | "error";

export interface UseDebouncedAutosaveOptions<T> {
  delayMs?: number;
  onSave: (value: T) => Promise<void> | void;
  onStatus?: (status: AutosaveStatus) => void;
}

export interface UseDebouncedAutosaveReturn<T> {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  cancel: () => void;
}

export function useDebouncedAutosave<T>(
  options: UseDebouncedAutosaveOptions<T>,
): UseDebouncedAutosaveReturn<T> {
  const { delayMs = 800, onSave, onStatus } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ value: T } | null>(null);
  const onSaveRef = useRef(onSave);
  const onStatusRef = useRef(onStatus);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  const runSave = useCallback(async (value: T) => {
    try {
      await onSaveRef.current(value);
      onStatusRef.current?.("saved");
    } catch {
      onStatusRef.current?.("error");
    }
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending === null) return;
    await runSave(pending.value);
  }, [runSave]);

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      if (timerRef.current) clearTimeout(timerRef.current);
      onStatusRef.current?.("saving");
      timerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        timerRef.current = null;
        pendingRef.current = null;
        if (pending === null) return;
        void runSave(pending.value);
      }, delayMs);
    },
    [delayMs, runSave],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = null;
    };
  }, []);

  return { schedule, flush, cancel };
}
