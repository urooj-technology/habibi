import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Printer, Trash2, X } from "lucide-react";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/compat/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LABEL_SETTINGS,
  LABEL_PRESETS,
  buildLabelsDocument,
  printBarcodeLabels,
} from "@/utils/printBarcodeLabels";

const STORAGE_KEY = "barcode-label-settings";
const MAX_COPIES = 500;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved ? { ...DEFAULT_LABEL_SETTINGS, ...saved } : DEFAULT_LABEL_SETTINGS;
  } catch {
    return DEFAULT_LABEL_SETTINGS;
  }
}

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 accent-primary"
    />
    {label}
  </label>
);

const BarcodeLabelDialog = ({ open, onClose, products = [] }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(loadSettings);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (open) {
      setRows(
        products
          .filter((p) => p?.barcode)
          .map((product) => ({ product, copies: 1 }))
      );
    }
  }, [open, products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const preset = LABEL_PRESETS.find((p) => p.id === settings.preset) || LABEL_PRESETS[0];
  const totalLabels = rows.reduce((sum, r) => sum + (Number(r.copies) || 0), 0);
  const skipped = products.length - products.filter((p) => p?.barcode).length;

  const previewDoc = useMemo(() => {
    const first = rows[0]?.product;
    if (!first) return "";
    return buildLabelsDocument([{ product: first, copies: 1 }], settings, { preview: true });
  }, [rows, settings]);

  const choosePreset = (id) => {
    const next = LABEL_PRESETS.find((p) => p.id === id);
    setSettings((prev) => ({
      ...prev,
      preset: id,
      ...(id === "custom" ? {} : { width: next.width, height: next.height }),
    }));
  };

  const setCopies = (index, value) => {
    const copies = Math.max(0, Math.min(MAX_COPIES, Number.parseInt(value, 10) || 0));
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, copies } : r)));
  };

  const setAllCopies = (value) => {
    const copies = Math.max(0, Math.min(MAX_COPIES, Number.parseInt(value, 10) || 0));
    setRows((prev) => prev.map((r) => ({ ...r, copies })));
  };

  const handlePrint = () => {
    const items = rows.filter((r) => r.copies > 0);
    if (!items.length) return;
    printBarcodeLabels(items, settings);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          {t("barcodeLabel.title")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </DialogTitle>

      <DialogContent>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("barcodeLabel.labelSize")}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {LABEL_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choosePreset(p.id)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                      settings.preset === p.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {p.id === "custom"
                      ? t("barcodeLabel.custom")
                      : p.roll
                        ? t("barcodeLabel.roll", { width: p.width })
                        : `${p.width}×${p.height} mm`}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  {t("barcodeLabel.width")} (mm)
                  <Input
                    type="number"
                    min="20"
                    max="110"
                    value={settings.width}
                    disabled={settings.preset !== "custom" && !preset.roll}
                    onChange={(e) => setSettings((s) => ({ ...s, width: e.target.value }))}
                    className="mt-1 h-8 min-h-8 max-h-8 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  {t("barcodeLabel.height")} (mm)
                  <Input
                    type="number"
                    min="15"
                    max="100"
                    value={settings.height}
                    disabled={settings.preset !== "custom" && !preset.roll}
                    onChange={(e) => setSettings((s) => ({ ...s, height: e.target.value }))}
                    className="mt-1 h-8 min-h-8 max-h-8 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("barcodeLabel.content")}
              </p>
              <Toggle
                checked={settings.showName}
                onChange={(v) => setSettings((s) => ({ ...s, showName: v }))}
                label={t("barcodeLabel.showName")}
              />
              <Toggle
                checked={settings.showCategory}
                onChange={(v) => setSettings((s) => ({ ...s, showCategory: v }))}
                label={t("barcodeLabel.showCategory")}
              />
              <Toggle
                checked={settings.showCode}
                onChange={(v) => setSettings((s) => ({ ...s, showCode: v }))}
                label={t("barcodeLabel.showCode")}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("barcodeLabel.preview")}
              </p>
              <div className="overflow-hidden rounded-md border border-border bg-muted/40">
                {previewDoc ? (
                  <iframe
                    title="label-preview"
                    srcDoc={previewDoc}
                    className="h-44 w-full border-0"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">
                    {t("barcodeLabel.noProducts")}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t("barcodeLabel.printerHint")}</p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("barcodeLabel.products")} ({rows.length})
              </p>
              {rows.length > 1 ? (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {t("barcodeLabel.copiesForAll")}
                  <Input
                    type="number"
                    min="0"
                    max={MAX_COPIES}
                    defaultValue={1}
                    onChange={(e) => setAllCopies(e.target.value)}
                    className="h-7 min-h-7 max-h-7 w-16 text-center text-xs"
                  />
                </label>
              ) : null}
            </div>
            <div className="max-h-[52vh] overflow-y-auto rounded-md border border-border">
              {rows.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t("barcodeLabel.noProducts")}
                </div>
              ) : (
                rows.map((row, index) => (
                  <div
                    key={row.product.id}
                    className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium" dir="auto">
                        {row.product.name}
                      </div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground" dir="ltr">
                        {row.product.barcode}
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={MAX_COPIES}
                      value={row.copies}
                      onChange={(e) => setCopies(index, e.target.value)}
                      aria-label={t("barcodeLabel.copies")}
                      className="h-8 min-h-8 max-h-8 w-20 text-center text-sm tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {skipped > 0 ? (
              <p className="mt-1.5 text-[11px] text-amber-600">
                {t("barcodeLabel.skipped", { count: skipped })}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>

      <DialogActions className="border-t border-border">
        <span className="me-auto text-sm text-muted-foreground">
          {t("barcodeLabel.total", { count: totalLabels })}
        </span>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={handlePrint} disabled={totalLabels === 0}>
          <Printer className="h-4 w-4" />
          {t("barcodeLabel.print")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

BarcodeLabelDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  products: PropTypes.array,
};

export default BarcodeLabelDialog;
