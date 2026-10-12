import React from "react";
import { useTranslation } from "react-i18next";
import { HardDrive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDraftTime } from "../hooks/useFormDraft";

/**
 * Banner shown when a local draft was found after reload / power loss.
 */
export default function FormDraftBanner({
  savedAt,
  onRestore,
  onDiscard,
  className = "",
}) {
  const { t } = useTranslation();
  if (!savedAt && !onRestore) return null;

  return (
    <div
      className={`mb-3 flex flex-col gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-800">
          <HardDrive className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950">
            {t("formDraft.title", "Unsaved draft found")}
          </p>
          <p className="mt-0.5 text-xs text-amber-900/80">
            {t(
              "formDraft.hint",
              "Your last entry was saved on this device. Restore it to continue, or discard and start fresh."
            )}
            {savedAt ? (
              <span className="ms-1 font-medium">
                ({formatDraftTime(savedAt)})
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-amber-600/30 bg-background"
          onClick={onDiscard}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("formDraft.discard", "Discard")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-amber-700 text-white hover:bg-amber-800"
          onClick={onRestore}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("formDraft.restore", "Restore draft")}
        </Button>
      </div>
    </div>
  );
}
