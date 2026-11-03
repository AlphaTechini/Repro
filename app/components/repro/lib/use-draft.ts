import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Local draft of one remote value. Remote changes (the agent writing) are
 * adopted instantly unless the user has unsaved typing, in which case the
 * draft is kept and `conflict` holds the remote value until they choose it.
 */
export function useDraft<T>(
  remote: T,
  equals: (a: T, b: T) => boolean = Object.is,
) {
  const [draft, setDraftState] = useState<T>(remote);
  const [conflict, setConflictState] = useState<{ value: T } | null>(null);
  const conflictRef = useRef<{ value: T } | null>(null);
  const setConflict = useCallback((c: { value: T } | null) => {
    conflictRef.current = c;
    setConflictState(c);
  }, []);
  const baseline = useRef<T>(remote);
  const draftRef = useRef<T>(remote);
  const eq = useRef(equals);
  eq.current = equals;

  const setDraft = useCallback((value: T) => {
    draftRef.current = value;
    setDraftState(value);
  }, []);

  useEffect(() => {
    if (eq.current(baseline.current, remote)) return;
    const dirty = !eq.current(draftRef.current, baseline.current);
    if (dirty && !eq.current(draftRef.current, remote)) {
      setConflict({ value: remote });
      baseline.current = remote;
      return;
    }
    baseline.current = remote;
    setConflict(null);
    setDraft(remote);
  }, [remote, setDraft, setConflict]);

  /** Mark the current draft as the saved baseline (call when committing). */
  const commit = useCallback(() => {
    baseline.current = draftRef.current;
    setConflict(null);
  }, [setConflict]);

  const useRemote = useCallback(() => {
    const c = conflictRef.current;
    if (c) {
      baseline.current = c.value;
      setDraft(c.value);
    }
    setConflict(null);
  }, [setDraft, setConflict]);

  const dirty = !eq.current(draft, baseline.current);

  return {
    draft,
    setDraft,
    commit,
    dirty,
    conflict: conflict ? conflict.value : undefined,
    hasConflict: conflict != null,
    useRemote,
  };
}

/**
 * Holds the last flash key while a conflict is showing, so an agent write the
 * user hasn't accepted yet does not play the highlight.
 */
export function useHeldFlashKey(
  key: string | number | null | undefined,
  hold: boolean,
) {
  const held = useRef(key);
  if (!hold) held.current = key;
  return held.current;
}
