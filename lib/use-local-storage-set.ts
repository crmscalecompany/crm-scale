"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Small shared store so writes in one component instance notify others
// subscribed to the same key in the same tab — the native "storage" event
// only fires for *other* tabs, not the one that wrote the value.
const listeners = new Map<string, Set<() => void>>();

function getListeners(key: string) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable/full — change stays in-memory for this tab only
  }
  getListeners(key).forEach((cb) => cb());
}

// useSyncExternalStore (not useState+useEffect) is the React-idiomatic way
// to read a value from outside React (localStorage here) — it has a
// built-in server/client snapshot split, so there's no hydration-mismatch
// risk and no "setState inside an effect" anti-pattern to work around.
export function useLocalStorageSet(key: string, defaultValue: string[]): [Set<string>, (next: Set<string>) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      const set = getListeners(key);
      set.add(callback);
      return () => set.delete(callback);
    },
    [key]
  );

  const getSnapshot = useCallback(() => readRaw(key), [key]);
  const getServerSnapshot = useCallback(() => null, []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo(() => {
    if (!raw) return new Set(defaultValue);
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed as string[]);
    } catch {
      // malformed storage — fall through to default
    }
    return new Set(defaultValue);
    // Callers pass a stable module-level constant for defaultValue (e.g.
    // DEFAULT_VISIBLE_COLUMNS), so identity comparison is fine here.
  }, [raw, defaultValue]);

  const setValue = useCallback(
    (next: Set<string>) => {
      writeRaw(key, JSON.stringify([...next]));
    },
    [key]
  );

  return [value, setValue];
}
