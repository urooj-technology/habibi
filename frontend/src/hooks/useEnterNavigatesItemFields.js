import { useCallback, useEffect, useRef } from "react";

/**
 * Keyboard navigation for dense line-item forms (purchase/sale rows).
 * - Enter: move focus to the next input/select/textarea inside the container.
 * - On the last field in the items section: Enter runs `onEnterOnLastField` (e.g. add row),
 *   then focuses the first field of the new line (`[data-item-line]`).
 * - Shift+Enter: move to the previous field.
 * - When an MUI Autocomplete dropdown is open, Enter is left to the component
 *   so the user can pick an option.
 */
export function useEnterNavigatesItemFields(options = {}) {
  const { onEnterOnLastField } = options;
  const onLastRef = useRef(onEnterOnLastField);
  useEffect(() => {
    onLastRef.current = onEnterOnLastField;
  }, [onEnterOnLastField]);

  const containerRef = useRef(null);

  const onContainerKeyDownCapture = useCallback((event) => {
    if (event.key !== "Enter") return;

    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLTextAreaElement) &&
      !(target instanceof HTMLSelectElement)
    ) {
      return;
    }

    const root = containerRef.current;
    if (!root || !root.contains(target)) return;

    const openAutocompleteList = root.querySelector(
      ".MuiAutocomplete-popper .MuiAutocomplete-listbox"
    );
    if (openAutocompleteList) return;

    const focusables = getFocusableFieldsInOrder(root);
    const index = focusables.indexOf(target);
    if (index === -1) return;

    event.preventDefault();

    if (event.shiftKey) {
      if (index > 0) focusables[index - 1].focus();
      return;
    }

    if (index < focusables.length - 1) {
      focusables[index + 1].focus();
      return;
    }

    const cb = onLastRef.current;
    if (typeof cb === "function") {
      cb();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          focusFirstInputInLastItemLine(root);
        });
      });
    }
  }, []);

  return { containerRef, onContainerKeyDownCapture };
}

/**
 * Focus the first input/textarea/select inside the last `[data-item-line]` row.
 */
export function focusFirstInputInLastItemLine(container) {
  if (!container) return;
  const rows = container.querySelectorAll("[data-item-line]");
  const lastRow = rows[rows.length - 1];
  if (!lastRow) return;
  const input = lastRow.querySelector(
    "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled])"
  );
  if (
    input &&
    (input.type === "button" ||
      input.type === "submit" ||
      input.type === "reset")
  ) {
    return;
  }
  input?.focus();
}

function getFocusableFieldsInOrder(container) {
  const nodes = container.querySelectorAll(
    "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled])"
  );

  return Array.from(nodes).filter((node) => {
    if (node.type === "button" || node.type === "submit" || node.type === "reset") {
      return false;
    }
    if (node.closest("[data-skip-enter-nav]")) return false;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  });
}
