import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  getOptionLabel = (o) => o?.name || o?.label || "",
  isOptionEqualToValue = (a, b) => a?.id === b?.id,
  label,
  placeholder,
  loading = false,
  error,
  helperText,
  required = false,
  clearable = false,
  disabled = false,
  fullWidth = true,
  name,
  className,
  triggerClassName,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => getOptionLabel(o).toLowerCase().includes(q));
  }, [options, query, getOptionLabel]);

  const selectedLabel = value ? getOptionLabel(value) : "";
  const canClear = clearable && !required && !disabled && !!value;

  return (
    <div className={cn("min-w-0", fullWidth && "w-full", className)}>
      {label && (
        <Label className="mb-1.5 block">
          {t(label)}
          {required && <span className="text-destructive ms-0.5">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-8 w-full min-w-0 justify-between gap-1 px-2.5 text-xs font-normal shadow-none",
              !selectedLabel && "text-muted-foreground",
              error && "border-destructive",
              triggerClassName
            )}
          >
            <span className="truncate">{selectedLabel || (placeholder ? t(placeholder) : "")}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              {canClear && (
                <span
                  role="button"
                  tabIndex={-1}
                  className="rounded-sm p-0.5 opacity-60 hover:bg-muted hover:opacity-100"
                  aria-label={t("common.clear", "Clear")}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(null);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              {loading ? (
                <Loader2 className="h-4 w-4 opacity-50 animate-spin" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b border-border">
            <Input
              autoFocus
              placeholder={t("common.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {clearable && !required && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setQuery("");
                  setOpen(false);
                }}
                className="mb-0.5 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4 shrink-0 opacity-60" />
                <span className="truncate">
                  {placeholder ? t(placeholder) : t("common.clear", "Clear")}
                </span>
              </button>
            )}
            {filtered.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {t("common.noOptions", "No options")}
              </div>
            )}
            {filtered.map((option, idx) => {
              const selected = value && isOptionEqualToValue(option, value);
              return (
                <button
                  type="button"
                  key={option.id ?? idx}
                  onClick={() => {
                    onChange(option);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-start hover:bg-accent",
                    selected && "bg-accent"
                  )}
                >
                  <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{getOptionLabel(option)}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {error && helperText && (
        <p className="mt-1 text-xs text-destructive">{t(helperText)}</p>
      )}
    </div>
  );
};

SearchableSelect.propTypes = {
  options: PropTypes.array,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  getOptionLabel: PropTypes.func,
  isOptionEqualToValue: PropTypes.func,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  clearable: PropTypes.bool,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  name: PropTypes.string,
  className: PropTypes.string,
  triggerClassName: PropTypes.string,
};

export default SearchableSelect;
