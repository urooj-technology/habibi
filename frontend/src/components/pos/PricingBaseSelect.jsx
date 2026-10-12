import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PosField, posControlClass } from "@/components/pos/PosShell";
import {
  getSelectedUnits,
  UNIT_LABEL_KEYS,
} from "@/utils/measurementConversion";
import { cn } from "@/lib/utils";

/**
 * Compact runtime control: which measurement qty × unit price on dual lines.
 * Hidden when product has fewer than 2 measurement types.
 */
function PricingBaseSelect({ product, value, onChange, className }) {
  const { t } = useTranslation();
  const units = useMemo(() => getSelectedUnits(product || {}), [product]);

  if (units.length < 2) return null;

  return (
    <PosField label={t("common.priceBy", "Price by")}>
      <Select value={value || units[0]} onValueChange={onChange}>
        <SelectTrigger className={cn(posControlClass, "h-8 text-xs", className)}>
          <SelectValue
            placeholder={t("common.priceBy", "Price by")}
          />
        </SelectTrigger>
        <SelectContent>
          {units.map((unit) => (
            <SelectItem key={unit} value={unit} className="text-xs">
              {t(UNIT_LABEL_KEYS[unit], unit)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </PosField>
  );
}

export default memo(PricingBaseSelect);
