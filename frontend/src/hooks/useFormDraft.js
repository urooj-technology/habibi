import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "erp-form-draft:";

function storageKey(key) {
  return `${PREFIX}${key}`;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persist form state to localStorage so power/internet loss does not wipe entries.
 *
 * @param {object} options
 * @param {string} options.key — unique draft id (e.g. "sale-add", "purchase-edit-12")
 * @param {any} options.data — serializable snapshot to save
 * @param {(data: any) => boolean} [options.isMeaningful] — skip empty drafts
 * @param {boolean} [options.enabled=true] — false until edit forms hydrate
 * @param {number} [options.debounceMs=600]
 * @param {(draft: any) => void} options.onRestore — apply draft into form state
 */
export default function useFormDraft({
  key,
  data,
  isMeaningful,
  enabled = true,
  debounceMs = 600,
  onRestore,
}) {
  const [prompt, setPrompt] = useState(null); // { savedAt, payload }
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const readyRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const clearDraft = useCallback(() => {
    if (!key) return;
    try {
      localStorage.removeItem(storageKey(key));
    } catch {
      /* ignore quota / private mode */
    }
    setPrompt(null);
    setLastSavedAt(null);
  }, [key]);

  const writeDraft = useCallback(
    (payload) => {
      if (!key || !enabled) return;
      const meaningful = isMeaningful ? isMeaningful(payload) : true;
      if (!meaningful) {
        try {
          localStorage.removeItem(storageKey(key));
        } catch {
          /* ignore */
        }
        setLastSavedAt(null);
        return;
      }
      const savedAt = new Date().toISOString();
      try {
        localStorage.setItem(
          storageKey(key),
          JSON.stringify({ savedAt, version: 1, payload })
        );
        setLastSavedAt(savedAt);
      } catch {
        /* ignore */
      }
    },
    [key, enabled, isMeaningful]
  );

  // On mount / when key or enabled flips on: offer restore if a draft exists.
  useEffect(() => {
    if (!key || !enabled) {
      readyRef.current = false;
      return undefined;
    }

    readyRef.current = false;
    let cancelled = false;

    try {
      const raw = localStorage.getItem(storageKey(key));
      const parsed = raw ? safeParse(raw) : null;
      if (
        !cancelled &&
        parsed?.payload &&
        (!isMeaningful || isMeaningful(parsed.payload))
      ) {
        setPrompt({ savedAt: parsed.savedAt, payload: parsed.payload });
      } else if (!cancelled) {
        setPrompt(null);
      }
    } catch {
      if (!cancelled) setPrompt(null);
    }

    // Allow autosave after a tick so restore can apply first without racing.
    const t = window.setTimeout(() => {
      if (!cancelled) readyRef.current = true;
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [key, enabled, isMeaningful]);

  // Debounced autosave whenever data changes.
  useEffect(() => {
    if (!key || !enabled || !readyRef.current) return undefined;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return undefined;
    }
    if (prompt) return undefined; // wait until user restores or discards

    const timer = window.setTimeout(() => {
      writeDraft(dataRef.current);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [key, enabled, data, debounceMs, writeDraft, prompt]);

  // Warn on tab close / refresh if there is meaningful unsaved content.
  useEffect(() => {
    if (!key || !enabled) return undefined;

    const onBeforeUnload = (e) => {
      const payload = dataRef.current;
      const meaningful = isMeaningful ? isMeaningful(payload) : Boolean(payload);
      if (!meaningful) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [key, enabled, isMeaningful]);

  const restoreDraft = useCallback(() => {
    if (!prompt?.payload) return;
    skipNextSaveRef.current = true;
    onRestore?.(prompt.payload);
    setLastSavedAt(prompt.savedAt || null);
    setPrompt(null);
    readyRef.current = true;
  }, [prompt, onRestore]);

  const discardDraft = useCallback(() => {
    clearDraft();
    readyRef.current = true;
  }, [clearDraft]);

  return {
    draftPrompt: prompt,
    draftSavedAt: lastSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
  };
}

export function formatDraftTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
