import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PackageSearch,
  ScanBarcode,
  Search,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 50;
const FEEDBACK_MS = 2600;
// Scanners type the whole code within a few ms; wait this long after the last
// keystroke before treating an exact barcode match as a complete scan.
const SCAN_SETTLE_MS = 120;

const isEditableTarget = (node) =>
  node instanceof HTMLElement &&
  (node.isContentEditable ||
    node.tagName === "INPUT" ||
    node.tagName === "TEXTAREA" ||
    node.tagName === "SELECT" ||
    node.closest("[role='combobox'], [role='listbox'], [role='dialog']"));

const normalize = (value) => String(value ?? "").trim().toLowerCase();

const toneStyles = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  info: "border-primary/30 bg-primary/10 text-primary",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

const toneIcons = {
  success: CheckCircle2,
  info: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

/**
 * Two-field item entry for POS documents:
 * - Barcode: scanner friendly (scanners type the code and send Enter); exact match.
 * - Product name: type-ahead search; arrows + Enter or click to add.
 *
 * `onPick(option, { source })` adds the option to the document and may return
 * `{ ok, message, tone }` which is shown as inline feedback.
 * `onBarcodeNotFound(code)` lets the page offer creating a product for an unknown code.
 */
const ItemEntryBar = forwardRef(function ItemEntryBar(
  {
    options = [],
    getKey = (o) => o?.id,
    getName,
    getBarcode,
    renderMeta,
    getDisabledReason,
    isInList,
    onPick,
    onBarcodeNotFound,
    loading = false,
    disabled = false,
    className,
  },
  ref
) {
  const { t } = useTranslation();
  const barcodeRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const feedbackTimer = useRef(null);

  const [barcode, setBarcode] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [feedback, setFeedback] = useState(null);

  useImperativeHandle(ref, () => ({
    focusBarcode: () => barcodeRef.current?.focus(),
    focusSearch: () => searchRef.current?.focus(),
  }));

  const showFeedback = useCallback((message, tone = "info") => {
    if (!message) return;
    window.clearTimeout(feedbackTimer.current);
    setFeedback({ message, tone, key: Date.now() });
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        barcodeRef.current?.focus();
        barcodeRef.current?.select();
      } else if (event.key === "F3") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isEditableTarget(event.target) &&
        !document.querySelector("[role='dialog']") &&
        barcodeRef.current &&
        !barcodeRef.current.disabled
      ) {
        // A scan while nothing is focused still lands in the barcode field.
        event.preventDefault();
        barcodeRef.current.focus();
        setBarcode((prev) => prev + event.key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const barcodeIndex = useMemo(() => {
    const map = new Map();
    options.forEach((option) => {
      const code = normalize(getBarcode(option));
      if (code && !map.has(code)) map.set(code, option);
    });
    return map;
  }, [options, getBarcode]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return options.slice(0, MAX_RESULTS);
    const scored = [];
    options.forEach((option) => {
      const name = normalize(getName(option));
      const code = normalize(getBarcode(option));
      let score = -1;
      if (code && code === q) score = 0;
      else if (name.startsWith(q)) score = 1;
      else if (name.split(/\s+/).some((word) => word.startsWith(q))) score = 2;
      else if (name.includes(q)) score = 3;
      else if (code && code.includes(q)) score = 4;
      if (score >= 0) scored.push({ option, score, name });
    });
    scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
    return scored.slice(0, MAX_RESULTS).map((entry) => entry.option);
  }, [options, query, getName, getBarcode]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector(`[data-index="${highlight}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const pick = useCallback(
    (option, source) => {
      if (!option) return false;
      const reason = getDisabledReason?.(option);
      if (reason) {
        showFeedback(reason, "error");
        return false;
      }
      const result = onPick(option, { source }) || { ok: true };
      if (result.message) {
        showFeedback(result.message, result.tone || (result.ok ? "success" : "error"));
      }
      return result.ok !== false;
    },
    [getDisabledReason, onPick, showFeedback]
  );

  const pickRef = useRef(pick);
  pickRef.current = pick;

  useEffect(() => {
    const code = normalize(barcode);
    if (!code) return undefined;
    const match = barcodeIndex.get(code);
    if (!match) return undefined;
    const timer = window.setTimeout(() => {
      pickRef.current(match, "barcode");
      setBarcode("");
      barcodeRef.current?.focus();
    }, SCAN_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [barcode, barcodeIndex]);

  useEffect(() => {
    if (!disabled) barcodeRef.current?.focus();
  }, [disabled]);

  const submitBarcode = () => {
    const code = barcode.trim();
    if (!code) return;
    const match = barcodeIndex.get(normalize(code));
    if (!match) {
      showFeedback(t("itemEntry.notFound", { code }), "error");
      if (onBarcodeNotFound) {
        setBarcode("");
        onBarcodeNotFound(code);
      } else {
        barcodeRef.current?.select();
      }
      return;
    }
    pick(match, "barcode");
    setBarcode("");
    barcodeRef.current?.focus();
  };

  const submitSearch = (option) => {
    if (!option) return;
    const added = pick(option, "search");
    if (added) {
      setQuery("");
      setOpen(false);
    }
  };

  const onSearchKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && results[highlight]) submitSearch(results[highlight]);
      else setOpen(true);
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const FeedbackIcon = feedback ? toneIcons[feedback.tone] || CheckCircle2 : null;

  return (
    <div
      data-skip-enter-nav
      className={cn("min-w-0 border-b border-border bg-muted/20 px-3 py-2.5", className)}
    >
      <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center justify-between text-[10px] font-medium leading-none text-muted-foreground">
            {t("itemEntry.barcode")}
            <kbd className="rounded border border-border bg-background px-1 font-mono text-[9px]">F2</kbd>
          </span>
          <div className="relative min-w-0">
            <ScanBarcode className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              ref={barcodeRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitBarcode();
                }
              }}
              placeholder={t("itemEntry.barcodePlaceholder")}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              dir="ltr"
              className="h-9 min-h-9 max-h-9 min-w-0 ps-8 font-mono text-sm tracking-wider shadow-none"
            />
          </div>
        </label>

        <Popover open={open && !disabled} onOpenChange={setOpen} modal={false}>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center justify-between text-[10px] font-medium leading-none text-muted-foreground">
              {t("itemEntry.productSearch")}
              <kbd className="rounded border border-border bg-background px-1 font-mono text-[9px]">F3</kbd>
            </span>
            <PopoverAnchor asChild>
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onClick={() => setOpen(true)}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("itemEntry.productSearchPlaceholder")}
                  disabled={disabled}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={open}
                  className="h-9 min-h-9 max-h-9 min-w-0 ps-8 pe-8 text-sm shadow-none"
                />
                {loading ? (
                  <Loader2 className="absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            </PopoverAnchor>
          </label>
          <PopoverContent
            align="start"
            className="w-[--radix-popover-trigger-width] min-w-[18rem] p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (searchRef.current?.contains(e.target)) e.preventDefault();
            }}
          >
            <div ref={listRef} role="listbox" className="max-h-72 overflow-y-auto p-1">
              {results.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-6 text-center text-xs text-muted-foreground">
                  <PackageSearch className="h-5 w-5 opacity-60" />
                  {loading ? t("common.loading", "Loading…") : t("itemEntry.noResults")}
                </div>
              ) : (
                results.map((option, index) => {
                  const reason = getDisabledReason?.(option);
                  const inList = isInList?.(option);
                  const code = getBarcode(option);
                  return (
                    <button
                      type="button"
                      key={getKey(option) ?? index}
                      data-index={index}
                      role="option"
                      aria-selected={index === highlight}
                      aria-disabled={Boolean(reason)}
                      onMouseEnter={() => setHighlight(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => submitSearch(option)}
                      className={cn(
                        "flex w-full min-w-0 items-center gap-3 rounded-md px-2.5 py-1.5 text-start",
                        index === highlight ? "bg-accent" : "hover:bg-accent/60",
                        reason && "opacity-50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {getName(option)}
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground" dir="ltr">
                          {code || "—"}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        {renderMeta ? (
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {renderMeta(option)}
                          </span>
                        ) : null}
                        {inList ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                            {t("itemEntry.inList")}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-1.5 min-h-[1.5rem]" aria-live="polite">
        {feedback ? (
          <div
            key={feedback.key}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs animate-in fade-in-0",
              toneStyles[feedback.tone] || toneStyles.info
            )}
          >
            {FeedbackIcon ? <FeedbackIcon className="h-3.5 w-3.5 shrink-0" /> : null}
            <span className="truncate">{feedback.message}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
});

ItemEntryBar.propTypes = {
  options: PropTypes.array,
  getKey: PropTypes.func,
  getName: PropTypes.func.isRequired,
  getBarcode: PropTypes.func.isRequired,
  renderMeta: PropTypes.func,
  getDisabledReason: PropTypes.func,
  isInList: PropTypes.func,
  onPick: PropTypes.func.isRequired,
  onBarcodeNotFound: PropTypes.func,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ItemEntryBar;

export const flashLineClass = "bg-primary/10 ring-1 ring-inset ring-primary/40";

/**
 * Highlights an item line (`data-line-id`) after it was added/incremented,
 * scrolls it into view and optionally focuses one of its fields (`data-field`).
 */
export function useItemLineReveal(containerRef) {
  const [flashId, setFlashId] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const revealLine = useCallback(
    (lineId, field) => {
      setFlashId(lineId);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlashId(null), 1200);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const root = containerRef.current;
          if (!root) return;
          const line = root.querySelector(`[data-line-id="${CSS.escape(String(lineId))}"]`);
          if (!line) return;
          line.scrollIntoView({ block: "nearest", behavior: "smooth" });
          if (field) {
            const input = line.querySelector(`[data-field="${field}"]`);
            input?.focus();
            input?.select?.();
          }
        });
      });
    },
    [containerRef]
  );

  return { flashId, revealLine };
}

/** Read-only product cell used in item lines (name + barcode). */
export function PosProductCell({ name, barcode, extra }) {
  return (
    <div className="flex h-8 min-w-0 flex-col justify-center">
      <span className="truncate text-xs font-semibold text-foreground" title={name}>
        {name || "—"}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 truncate text-[10px] text-muted-foreground">
        {barcode ? (
          <span className="font-mono" dir="ltr">
            {barcode}
          </span>
        ) : null}
        {extra}
      </span>
    </div>
  );
}

PosProductCell.propTypes = {
  name: PropTypes.string,
  barcode: PropTypes.string,
  extra: PropTypes.node,
};

/** Empty state shown in the items list before anything is added. */
export function PosItemsEmpty() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ScanBarcode className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">{t("itemEntry.emptyTitle")}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{t("itemEntry.emptyHint")}</p>
    </div>
  );
}
