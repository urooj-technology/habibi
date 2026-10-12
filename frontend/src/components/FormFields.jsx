import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { PlusCircle, MinusCircle, ChevronsUpDown, Check } from 'lucide-react';
import dayjs from 'dayjs';

const FieldShell = ({ name, label, required, error, helperText, disabled, className, children }) => {
  const { t } = useTranslation();
  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1.5', disabled && 'opacity-60', className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium text-foreground">
          {t(label)}
          {required && <span className="text-destructive ms-0.5">*</span>}
        </Label>
      )}
      {children}
      {error && helperText && (
        <p className="text-xs text-destructive">{t(helperText)}</p>
      )}
    </div>
  );
};

// Text Field Component
export const FormTextField = ({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  fullWidth = true,
  disabled = false,
  multiline = false,
  rows = 1,
  type = 'text',
  placeholder,
  startAdornment,
  endAdornment,
  size = 'medium',
  variant = 'outlined',
  InputProps = {},
  ...rest
}) => {
  const { t } = useTranslation();

  const start = InputProps?.startAdornment || startAdornment;
  const end = InputProps?.endAdornment || endAdornment;

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      error={Boolean(error)}
      helperText={helperText}
      disabled={disabled}
      className={fullWidth ? 'w-full' : undefined}
    >
      {multiline ? (
        <Textarea
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          rows={rows}
          placeholder={placeholder ? t(placeholder) : ''}
          className={cn(Boolean(error) && 'border-destructive focus-visible:ring-destructive')}
          {...rest}
        />
      ) : (
        <div className="relative">
          {start && (
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {start}
            </span>
          )}
          <Input
            id={name}
            name={name}
            value={value ?? ''}
            onChange={onChange}
            disabled={disabled}
            type={type}
            placeholder={placeholder ? t(placeholder) : ''}
            className={cn(
              start && 'ps-9',
              end && 'pe-9',
              Boolean(error) && 'border-destructive focus-visible:ring-destructive'
            )}
            {...rest}
          />
          {end && (
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {end}
            </span>
          )}
        </div>
      )}
    </FieldShell>
  );
};

FormTextField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  multiline: PropTypes.bool,
  rows: PropTypes.number,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  startAdornment: PropTypes.node,
  endAdornment: PropTypes.node,
  size: PropTypes.string,
  variant: PropTypes.string,
  InputProps: PropTypes.object,
};

// Select Field Component
export const FormSelectField = ({
  name,
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  required = false,
  fullWidth = true,
  disabled = false,
  multiple = false,
  size = 'medium',
  placeholder,
  ...rest
}) => {
  const { t } = useTranslation();

  const handleChange = (newValue) => {
    onChange({ target: { name, value: newValue } });
  };

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      error={Boolean(error)}
      helperText={helperText}
      disabled={disabled}
      className={fullWidth ? 'w-full' : undefined}
    >
      <Select
        name={name}
        value={value !== undefined && value !== null ? String(value) : undefined}
        onValueChange={handleChange}
        disabled={disabled}
        {...rest}
      >
        <SelectTrigger
          id={name}
          className={cn(Boolean(error) && 'border-destructive focus:ring-destructive')}
        >
          <SelectValue placeholder={placeholder ? t(placeholder) : undefined} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.customLabel || t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
};

FormSelectField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.any.isRequired,
      label: PropTypes.string.isRequired,
      customLabel: PropTypes.node,
    })
  ).isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  multiple: PropTypes.bool,
  size: PropTypes.string,
  placeholder: PropTypes.string,
};

// Checkbox Field Component
export const FormCheckboxField = ({
  name,
  label,
  checked,
  onChange,
  error,
  helperText,
  disabled = false,
  ...rest
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1" {...rest}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={name}
          name={name}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) =>
            onChange({ target: { name, checked: Boolean(value), type: 'checkbox' } })
          }
        />
        <Label htmlFor={name} className="text-sm font-normal text-foreground">
          {t(label)}
        </Label>
      </div>
      {error && helperText && <p className="text-xs text-destructive">{t(helperText)}</p>}
    </div>
  );
};

FormCheckboxField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
};

// Checkbox Group Component
export const FormCheckboxGroup = ({
  name,
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  row = false,
  ...rest
}) => {
  const { t } = useTranslation();

  const handleChange = (optionValue, checked) => {
    let newValue;
    if (checked) {
      newValue = [...value, optionValue];
    } else {
      newValue = value.filter((item) => item !== optionValue);
    }
    onChange({ target: { name, value: newValue } });
  };

  return (
    <div className="flex flex-col gap-2" {...rest}>
      {label && <span className="text-sm font-medium text-foreground">{t(label)}</span>}
      <div className={cn('flex gap-4', row ? 'flex-row flex-wrap' : 'flex-col')}>
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={`${name}-${option.value}`}
              checked={value.includes(option.value)}
              disabled={disabled}
              onCheckedChange={(checked) => handleChange(option.value, Boolean(checked))}
            />
            <Label htmlFor={`${name}-${option.value}`} className="text-sm font-normal text-foreground">
              {option.customLabel || t(option.label)}
            </Label>
          </div>
        ))}
      </div>
      {error && helperText && <p className="text-xs text-destructive">{t(helperText)}</p>}
    </div>
  );
};

FormCheckboxGroup.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      customLabel: PropTypes.node,
    })
  ).isRequired,
  value: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  row: PropTypes.bool,
};

// Radio Group Component
export const FormRadioGroup = ({
  name,
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  row = false,
  ...rest
}) => {
  const { t } = useTranslation();

  const handleChange = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
  };

  return (
    <div className="flex flex-col gap-2" {...rest}>
      {label && (
        <span className="text-sm font-medium text-foreground">
          {t(label)}
          {required && <span className="text-destructive ms-0.5">*</span>}
        </span>
      )}
      <div className={cn('flex gap-4', row ? 'flex-row flex-wrap' : 'flex-col')}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-center gap-2 text-sm font-normal text-foreground',
              disabled && 'opacity-60'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => handleChange(option.value)}
              className="h-4 w-4 accent-primary"
            />
            {option.customLabel || t(option.label)}
          </label>
        ))}
      </div>
      {error && helperText && <p className="text-xs text-destructive">{t(helperText)}</p>}
    </div>
  );
};

FormRadioGroup.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.any.isRequired,
      label: PropTypes.string.isRequired,
      customLabel: PropTypes.node,
    })
  ).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  row: PropTypes.bool,
};

// Date Picker Component
export const FormDatePicker = ({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  fullWidth = true,
  disabled = false,
  minDate,
  maxDate,
  format = 'YYYY-MM-DD',
  ...rest
}) => {
  const handleChange = (e) => {
    const raw = e.target.value;
    const date = raw ? dayjs(raw) : null;
    onChange({ target: { name, value: date ? date.format('YYYY-MM-DD') : null } });
  };

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      error={Boolean(error)}
      helperText={helperText}
      disabled={disabled}
      className={fullWidth ? 'w-full' : undefined}
    >
      <Input
        id={name}
        name={name}
        type="date"
        value={value ? dayjs(value).format('YYYY-MM-DD') : ''}
        onChange={handleChange}
        disabled={disabled}
        min={minDate ? dayjs(minDate).format('YYYY-MM-DD') : undefined}
        max={maxDate ? dayjs(maxDate).format('YYYY-MM-DD') : undefined}
        className={cn(Boolean(error) && 'border-destructive focus-visible:ring-destructive')}
        {...rest}
      />
    </FieldShell>
  );
};

FormDatePicker.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  minDate: PropTypes.any,
  maxDate: PropTypes.any,
  format: PropTypes.string,
};

// Time Picker Component
export const FormTimePicker = ({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  fullWidth = true,
  disabled = false,
  format = 'HH:mm',
  ...rest
}) => {
  const handleChange = (e) => {
    const raw = e.target.value;
    onChange({ target: { name, value: raw || null } });
  };

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      error={Boolean(error)}
      helperText={helperText}
      disabled={disabled}
      className={fullWidth ? 'w-full' : undefined}
    >
      <Input
        id={name}
        name={name}
        type="time"
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        className={cn(Boolean(error) && 'border-destructive focus-visible:ring-destructive')}
        {...rest}
      />
    </FieldShell>
  );
};

FormTimePicker.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  format: PropTypes.string,
};

// DateTime Picker Component
export const FormDateTimePicker = ({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  fullWidth = true,
  disabled = false,
  minDateTime,
  maxDateTime,
  format = 'YYYY-MM-DD HH:mm',
  ...rest
}) => {
  const handleChange = (e) => {
    const raw = e.target.value;
    const dateTime = raw ? dayjs(raw) : null;
    onChange({ target: { name, value: dateTime ? dateTime.format('YYYY-MM-DD HH:mm') : null } });
  };

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      error={Boolean(error)}
      helperText={helperText}
      disabled={disabled}
      className={fullWidth ? 'w-full' : undefined}
    >
      <Input
        id={name}
        name={name}
        type="datetime-local"
        value={value ? dayjs(value).format('YYYY-MM-DDTHH:mm') : ''}
        onChange={handleChange}
        disabled={disabled}
        min={minDateTime ? dayjs(minDateTime).format('YYYY-MM-DDTHH:mm') : undefined}
        max={maxDateTime ? dayjs(maxDateTime).format('YYYY-MM-DDTHH:mm') : undefined}
        className={cn(Boolean(error) && 'border-destructive focus-visible:ring-destructive')}
        {...rest}
      />
    </FieldShell>
  );
};

FormDateTimePicker.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  minDateTime: PropTypes.any,
  maxDateTime: PropTypes.any,
  format: PropTypes.string,
};

// Autocomplete Component (Popover + searchable list, no external cmd component available)
export const FormAutocomplete = ({
  name,
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  required = false,
  fullWidth = true,
  disabled = false,
  multiple = false,
  freeSolo = false,
  getOptionLabel = (option) => (option && option.label ? option.label : ''),
  isOptionEqualToValue = (option, val) => {
    if (!option || !val) return false;
    if (typeof option.value !== 'undefined' && typeof val.value !== 'undefined') {
      return option.value === val.value;
    }
    if (typeof option.id !== 'undefined' && typeof val.id !== 'undefined') {
      return option.id === val.id;
    }
    return false;
  },
  renderOption,
  placeholder,
  ...rest
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const safeGetOptionLabel = (option) => {
    if (!option) return '';
    if (typeof option === 'string') return option;
    if (option.customLabel) return option.customLabel;
    try {
      const lbl = getOptionLabel(option);
      if (lbl) return typeof lbl === 'string' ? lbl : '';
    } catch (e) {
      console.warn('Error getting option label:', e);
    }
    return option.label
      ? t(option.label)
      : option.name
      ? option.name
      : option.title
      ? option.title
      : option.id
      ? `ID: ${option.id}`
      : '';
  };

  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : [];

  const filteredOptions = useMemo(() => {
    const list = options || [];
    if (!query) return list;
    return list.filter((opt) => safeGetOptionLabel(opt).toLowerCase().includes(query.toLowerCase()));
  }, [options, query]);

  const handleSelect = (option) => {
    if (multiple) {
      const exists = selectedValues.some((v) => isOptionEqualToValue(v, option));
      const newValue = exists
        ? selectedValues.filter((v) => !isOptionEqualToValue(v, option))
        : [...selectedValues, option];
      onChange({ target: { name, value: newValue } });
    } else {
      onChange({ target: { name, value: option } });
      setOpen(false);
    }
    setQuery('');
  };

  const displayLabel = multiple
    ? selectedValues.map((v) => safeGetOptionLabel(v)).join(', ')
    : safeGetOptionLabel(value);

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      error={Boolean(error)}
      helperText={helperText}
      disabled={disabled}
      className={fullWidth ? 'w-full' : undefined}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={name}
            disabled={disabled}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50',
              Boolean(error) && 'border-destructive'
            )}
          >
            <span className={cn('truncate text-start', !displayLabel && 'text-muted-foreground')}>
              {displayLabel || (placeholder ? t(placeholder) : '')}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('common.search', 'Search')}
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {t('common.noOptions', 'No options')}
              </p>
            )}
            {filteredOptions.map((option, idx) => {
              const isSelected = selectedValues.some((v) => isOptionEqualToValue(v, option));
              return (
                <button
                  type="button"
                  key={option.value ?? option.id ?? idx}
                  onClick={() => handleSelect(option)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Check className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                  {renderOption ? renderOption(null, option) : safeGetOptionLabel(option)}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
};

FormAutocomplete.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  multiple: PropTypes.bool,
  freeSolo: PropTypes.bool,
  getOptionLabel: PropTypes.func,
  isOptionEqualToValue: PropTypes.func,
  renderOption: PropTypes.func,
  placeholder: PropTypes.string,
};

// Switch Component
export const FormSwitch = ({
  name,
  label,
  checked,
  onChange,
  error,
  helperText,
  disabled = false,
  ...rest
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1" {...rest}>
      <div className="flex items-center gap-2">
        <Switch
          id={name}
          name={name}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) =>
            onChange({ target: { name, checked: Boolean(value), type: 'checkbox' } })
          }
        />
        <Label htmlFor={name} className="text-sm font-normal text-foreground">
          {t(label)}
        </Label>
      </div>
      {error && helperText && <p className="text-xs text-destructive">{t(helperText)}</p>}
    </div>
  );
};

FormSwitch.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
};

// Currency Input Field
export const FormCurrencyField = ({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  fullWidth = true,
  disabled = false,
  currencySymbol = '$',
  size = 'medium',
  variant = 'outlined',
  ...rest
}) => {
  const { t } = useTranslation();

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
      onChange({ target: { name, value: val } });
    }
  };

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      error={Boolean(error)}
      helperText={helperText}
      disabled={disabled}
      className={fullWidth ? 'w-full' : undefined}
    >
      <div className="relative">
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {currencySymbol}
        </span>
        <Input
          id={name}
          name={name}
          value={value ?? ''}
          onChange={handleChange}
          disabled={disabled}
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]*"
          className={cn('ps-7', Boolean(error) && 'border-destructive focus-visible:ring-destructive')}
          {...rest}
        />
      </div>
    </FieldShell>
  );
};

FormCurrencyField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  currencySymbol: PropTypes.string,
  size: PropTypes.string,
  variant: PropTypes.string,
};

// Number Field
export const FormNumberField = ({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  fullWidth = true,
  disabled = false,
  min,
  max,
  step = 1,
  size = 'medium',
  variant = 'outlined',
  ...rest
}) => {
  const handleChange = (e) => {
    const newValue = e.target.value;
    if (
      (min === undefined || parseFloat(newValue) >= min) &&
      (max === undefined || parseFloat(newValue) <= max)
    ) {
      onChange({ target: { name, value: newValue } });
    }
  };

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      error={Boolean(error)}
      helperText={helperText}
      disabled={disabled}
      className={fullWidth ? 'w-full' : undefined}
    >
      <Input
        id={name}
        name={name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        type="number"
        min={min}
        max={max}
        step={step}
        className={cn(Boolean(error) && 'border-destructive focus-visible:ring-destructive')}
        {...rest}
      />
    </FieldShell>
  );
};

FormNumberField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  size: PropTypes.string,
  variant: PropTypes.string,
};

// Dynamic Fields - Array of Fields
export const FormDynamicFields = ({
  name,
  label,
  value,
  onChange,
  renderField,
  error,
  helperText,
  addLabel = 'common.addMore',
  removeLabel = 'common.remove',
  minItems = 1,
  maxItems = 10,
  ...rest
}) => {
  const { t } = useTranslation();

  const handleAdd = () => {
    if (value.length < maxItems) {
      const newValue = [...value, {}];
      onChange({ target: { name, value: newValue } });
    }
  };

  const handleRemove = (index) => {
    if (value.length > minItems) {
      const newValue = [...value];
      newValue.splice(index, 1);
      onChange({ target: { name, value: newValue } });
    }
  };

  const handleItemChange = (index, fieldName, fieldValue) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], [fieldName]: fieldValue };
    onChange({ target: { name, value: newValue } });
  };

  return (
    <div {...rest}>
      {label && <p className="mb-1.5 text-sm font-medium text-foreground">{t(label)}</p>}

      {value.map((item, index) => (
        <div key={index} className="mb-2 flex flex-col items-start gap-1 sm:flex-row">
          <div className="w-full flex-grow">
            {renderField(item, index, (fieldName, fieldValue) =>
              handleItemChange(index, fieldName, fieldValue)
            )}
          </div>

          {value.length > minItems && (
            <button
              type="button"
              onClick={() => handleRemove(index)}
              aria-label={t(removeLabel)}
              title={t(removeLabel)}
              className="mt-1 flex h-9 w-9 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 sm:mt-2 sm:ms-1"
            >
              <MinusCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      ))}

      {value.length < maxItems && (
        <Button type="button" variant="ghost" size="sm" onClick={handleAdd} className="mt-1 gap-1.5 text-primary">
          <PlusCircle className="h-4 w-4" />
          {t(addLabel)}
        </Button>
      )}

      {error && helperText && <p className="mt-1 text-xs text-destructive">{t(helperText)}</p>}
    </div>
  );
};

FormDynamicFields.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  renderField: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  addLabel: PropTypes.string,
  removeLabel: PropTypes.string,
  minItems: PropTypes.number,
  maxItems: PropTypes.number,
};
