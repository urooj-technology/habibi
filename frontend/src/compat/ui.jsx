// Legacy page UI primitives (Tailwind). Same prop surface as older pages
// that still use Box/Stack/TextField-style APIs. Prefer @/components/ui/* for new code.
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, ChevronDown, X as CloseIcon, Search as SearchIcon, Check as CheckIcon } from 'lucide-react';

/* --------------------------------- Utils ---------------------------------- */
const spacingKey = new Set(['m','mt','mr','mb','ml','mx','my','p','pt','pr','pb','pl','px','py','gap','rowGap','columnGap']);
const spacingProp = {
  m: 'margin', mt: 'marginTop', mr: 'marginRight', mb: 'marginBottom', ml: 'marginLeft',
  mx: ['marginLeft','marginRight'], my: ['marginTop','marginBottom'],
  p: 'padding', pt: 'paddingTop', pr: 'paddingRight', pb: 'paddingBottom', pl: 'paddingLeft',
  px: ['paddingLeft','paddingRight'], py: ['paddingTop','paddingBottom'],
  gap: 'gap', rowGap: 'rowGap', columnGap: 'columnGap',
};
export const sxToStyle = (sx) => {
  if (!sx || typeof sx !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(sx)) {
    if (v == null) continue;
    if (spacingKey.has(k)) {
      const val = typeof v === 'number' ? `${v * 8}px` : v;
      const target = spacingProp[k];
      if (Array.isArray(target)) target.forEach((p) => { out[p] = val; });
      else out[target] = val;
    } else if (k === 'width' || k === 'height' || k === 'minWidth' || k === 'maxWidth' || k === 'minHeight' || k === 'maxHeight') {
      out[k] = typeof v === 'number' ? `${v}px` : v;
    } else if (typeof v === 'string' || typeof v === 'number') {
      out[k] = v;
    }
  }
  return out;
};

/* ---------------------------------- Box ----------------------------------- */
export const Box = React.forwardRef(({ component: C = 'div', sx, style, className, children, ...rest }, ref) => (
  <C ref={ref} className={className} style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }} {...rest}>{children}</C>
));

/* --------------------------------- Stack ---------------------------------- */
export const Stack = React.forwardRef(({ direction = 'column', spacing = 0, alignItems, justifyContent, flexWrap, sx, style, className, children, ...rest }, ref) => {
  const dirClass = direction === 'row' ? 'flex-row' : direction === 'row-reverse' ? 'flex-row-reverse' : direction === 'column-reverse' ? 'flex-col-reverse' : 'flex-col';
  const gap = typeof spacing === 'number' ? `${spacing * 8}px` : spacing;
  return (
    <div
      ref={ref}
      className={cn('flex', dirClass, className)}
      style={{ gap, alignItems, justifyContent, flexWrap, ...(sxToStyle(sx) || {}), ...(style || {}) }}
      {...rest}
    >{children}</div>
  );
});

/* --------------------------------- Grid ----------------------------------- */
// 12-column CSS grid (gap-safe). Percent flex basis + gap was overlapping fields.
const bpPrefix = { xs: "", sm: "sm:", md: "md:", lg: "lg:", xl: "xl:" };
const COL_SPAN = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};
const spanClassFor = (bp, cols) => {
  const p = bpPrefix[bp];
  if (cols === true || cols === "auto") return `${p}col-auto`;
  if (typeof cols !== "number" || Number.isNaN(cols)) return "";
  const span = Math.max(1, Math.min(12, Math.round(cols)));
  const base = COL_SPAN[span];
  return p ? `${p}${base}` : base;
};

export const Grid = React.forwardRef(
  (
    {
      container,
      item,
      spacing = 0,
      xs,
      sm,
      md,
      lg,
      xl,
      sx,
      style,
      className,
      children,
      ...rest
    },
    ref
  ) => {
    const style2 = { ...(sxToStyle(sx) || {}), ...(style || {}) };
    if (container) {
      const gap =
        typeof spacing === "number" ? `${Math.max(0, spacing) * 8}px` : spacing;
      return (
        <div
          ref={ref}
          className={cn(
            "grid w-full min-w-0 grid-cols-12",
            className
          )}
          style={{ gap, columnGap: gap, rowGap: gap, ...style2 }}
          {...rest}
        >
          {children}
        </div>
      );
    }

    const spans = [
      spanClassFor("xs", xs),
      spanClassFor("sm", sm),
      spanClassFor("md", md),
      spanClassFor("lg", lg),
      spanClassFor("xl", xl),
    ].filter(Boolean);

    // Default to full width when no breakpoint props (common in forms).
    const cls = spans.length ? spans.join(" ") : "col-span-12";

    return (
      <div
        ref={ref}
        className={cn("min-w-0 max-w-full", cls, className)}
        style={style2}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
Grid.displayName = "Grid";

/* -------------------------------- Container ------------------------------- */
export const Container = React.forwardRef(({ maxWidth = 'lg', disableGutters, sx, style, className, children, ...rest }, ref) => {
  const mw = { xs: 'max-w-screen-sm', sm: 'max-w-screen-sm', md: 'max-w-screen-md', lg: 'max-w-screen-lg', xl: 'max-w-screen-xl', false: 'max-w-none' }[maxWidth] || 'max-w-screen-lg';
  return <div ref={ref} className={cn('mx-auto w-full', mw, !disableGutters && 'px-4 sm:px-6', className)} style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }} {...rest}>{children}</div>;
});

/* --------------------------------- Paper ---------------------------------- */
export const Paper = React.forwardRef(({ elevation = 1, variant, square, sx, style, className, children, ...rest }, ref) => (
  <div
    ref={ref}
    className={cn('bg-card text-card-foreground', square ? '' : 'rounded-lg', variant === 'outlined' ? 'border border-border' : elevation === 0 ? '' : 'shadow-soft', className)}
    style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }}
    {...rest}
  >{children}</div>
));

/* --------------------------------- Card ----------------------------------- */
export const Card = React.forwardRef(({ sx, style, className, children, ...rest }, ref) => (
  <div ref={ref} className={cn('bg-card text-card-foreground rounded-lg border border-border shadow-soft', className)} style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }} {...rest}>{children}</div>
));
export const CardHeader = ({ title, subheader, action, avatar, sx, className, ...rest }) => (
  <div className={cn('flex items-start gap-3 p-4', className)} style={sxToStyle(sx)} {...rest}>
    {avatar}
    <div className="flex-1 min-w-0">
      {title && <div className="font-semibold leading-tight">{title}</div>}
      {subheader && <div className="text-sm text-muted-foreground">{subheader}</div>}
    </div>
    {action}
  </div>
);
export const CardContent = ({ sx, className, children, ...rest }) => (
  <div className={cn('p-4 pt-0', className)} style={sxToStyle(sx)} {...rest}>{children}</div>
);
export const CardActions = ({ sx, className, children, ...rest }) => (
  <div className={cn('flex items-center gap-2 p-4 pt-0', className)} style={sxToStyle(sx)} {...rest}>{children}</div>
);

/* --------------------------------- Divider -------------------------------- */
export const Divider = ({ orientation = 'horizontal', flexItem, sx, style, className, children, ...rest }) => {
  if (children) {
    return (
      <div className={cn('flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground', className)} style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }} {...rest}>
        <div className="h-px flex-1 bg-border" />
        <span>{children}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }
  return (
    <div
      role="separator"
      className={cn(orientation === 'vertical' ? 'w-px self-stretch bg-border' : 'h-px w-full bg-border', flexItem && 'self-stretch', className)}
      style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }}
      {...rest}
    />
  );
};

/* -------------------------------- Typography ------------------------------ */
const typoVariant = {
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-bold tracking-tight',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold',
  h5: 'text-lg font-semibold',
  h6: 'text-base font-semibold',
  subtitle1: 'text-base font-medium',
  subtitle2: 'text-sm font-medium',
  body1: 'text-base',
  body2: 'text-sm',
  caption: 'text-xs text-muted-foreground',
  overline: 'text-xs uppercase tracking-wider text-muted-foreground',
  button: 'text-sm font-medium',
};
const typoTag = { h1:'h1',h2:'h2',h3:'h3',h4:'h4',h5:'h5',h6:'h6',subtitle1:'p',subtitle2:'p',body1:'p',body2:'p',caption:'span',overline:'span',button:'span' };
const colorClass = {
  primary: 'text-primary',
  secondary: 'text-secondary-foreground',
  'text.primary': 'text-foreground',
  'text.secondary': 'text-muted-foreground',
  'error.main': 'text-destructive',
  'success.main': 'text-success',
  'warning.main': 'text-warning',
  'info.main': 'text-info',
  error: 'text-destructive',
  inherit: '',
};
export const Typography = React.forwardRef(({ variant = 'body1', component, color, align, gutterBottom, noWrap, fontWeight, sx, style, className, children, ...rest }, ref) => {
  const Tag = component || typoTag[variant] || 'p';
  const alignClass = align ? { left:'text-left', right:'text-right', center:'text-center', justify:'text-justify' }[align] : '';
  const style2 = { ...(sxToStyle(sx) || {}), ...(style || {}) };
  if (fontWeight) style2.fontWeight = fontWeight;
  return (
    <Tag
      ref={ref}
      className={cn(typoVariant[variant], colorClass[color] || '', alignClass, gutterBottom && 'mb-2', noWrap && 'truncate', className)}
      style={style2}
      {...rest}
    >{children}</Tag>
  );
});

/* --------------------------------- Button --------------------------------- */
const buttonBase = 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer whitespace-nowrap';
const buttonVariant = (variant, color) => {
  const c = color || 'primary';
  if (variant === 'contained') {
    if (c === 'error') return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
    if (c === 'success') return 'bg-success text-success-foreground hover:bg-success/90';
    if (c === 'warning') return 'bg-warning text-warning-foreground hover:bg-warning/90';
    if (c === 'info') return 'bg-info text-info-foreground hover:bg-info/90';
    if (c === 'secondary') return 'bg-secondary text-secondary-foreground hover:bg-secondary/90';
    if (c === 'inherit') return 'bg-muted text-foreground hover:bg-muted/80';
    return 'bg-primary text-primary-foreground hover:bg-primary/90';
  }
  if (variant === 'outlined') {
    if (c === 'error') return 'border border-destructive text-destructive hover:bg-destructive/10';
    if (c === 'success') return 'border border-success text-success hover:bg-success/10';
    if (c === 'inherit') return 'border border-border text-foreground hover:bg-muted';
    return 'border border-primary text-primary hover:bg-primary/10';
  }
  // text
  if (c === 'error') return 'text-destructive hover:bg-destructive/10';
  if (c === 'inherit') return 'text-foreground hover:bg-muted';
  return 'text-primary hover:bg-primary/10';
};
const buttonSize = { small: 'h-8 px-3 text-xs', medium: 'h-9 px-4', large: 'h-10 px-6 text-base' };
export const Button = React.forwardRef(({
  variant = 'text', color = 'primary', size = 'medium', startIcon, endIcon, fullWidth, disabled, loading, component: C, href, sx, style, className, children, type = 'button', ...rest
}, ref) => {
  const Comp = C || (href ? 'a' : 'button');
  const cls = cn(buttonBase, buttonVariant(variant, color), buttonSize[size] || buttonSize.medium, fullWidth && 'w-full', className);
  return (
    <Comp
      ref={ref}
      href={href}
      type={Comp === 'button' ? type : undefined}
      disabled={disabled}
      className={cls}
      style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!loading && startIcon}
      {children}
      {endIcon}
    </Comp>
  );
});

/* ------------------------------- IconButton ------------------------------- */
const iconBtnSize = { small: 'h-8 w-8', medium: 'h-9 w-9', large: 'h-10 w-10' };
export const IconButton = React.forwardRef(({ size = 'medium', color, edge, sx, style, className, children, disabled, ...rest }, ref) => (
  <button
    ref={ref}
    type="button"
    disabled={disabled}
    className={cn('inline-flex items-center justify-center rounded-md transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 cursor-pointer', iconBtnSize[size] || iconBtnSize.medium, color === 'error' && 'text-destructive', color === 'primary' && 'text-primary', className)}
    style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }}
    {...rest}
  >{children}</button>
));

/* --------------------------------- Chip ----------------------------------- */
const chipColor = {
  default: 'bg-muted text-foreground border-border',
  primary: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary text-secondary-foreground border-secondary',
  success: 'bg-success/10 text-success border-success/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-warning/10 text-warning border-warning/30',
  info: 'bg-info/10 text-info border-info/20',
};
export const Chip = React.forwardRef(({ label, icon, onDelete, size = 'medium', color = 'default', variant, sx, style, className, ...rest }, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      size === 'small' ? 'h-6 px-2 text-xs' : 'h-7 px-3 text-xs',
      chipColor[color] || chipColor.default,
      variant === 'outlined' && 'bg-transparent',
      className,
    )}
    style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }}
    {...rest}
  >
    {icon}
    {label}
    {onDelete && (
      <button type="button" onClick={onDelete} className="ml-1 rounded-full p-0.5 hover:bg-black/10">
        <CloseIcon className="h-3 w-3" />
      </button>
    )}
  </span>
));

/* --------------------------------- Avatar --------------------------------- */
export const Avatar = React.forwardRef(({ src, alt, children, variant = 'circular', sx, style, className, ...rest }, ref) => (
  <span
    ref={ref}
    className={cn('inline-flex h-9 w-9 items-center justify-center overflow-hidden bg-muted text-sm font-medium text-foreground', variant === 'rounded' ? 'rounded-md' : variant === 'square' ? '' : 'rounded-full', className)}
    style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }}
    {...rest}
  >
    {src ? <img src={src} alt={alt || ''} className="h-full w-full object-cover" /> : children}
  </span>
));

/* --------------------------------- Badge ---------------------------------- */
export const Badge = ({ badgeContent, color = 'primary', variant, invisible, children, sx, className, ...rest }) => (
  <span className={cn('relative inline-flex', className)} style={sxToStyle(sx)} {...rest}>
    {children}
    {!invisible && badgeContent != null && (
      <span className={cn(
        'absolute -top-1 -right-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
        color === 'error' ? 'bg-destructive text-destructive-foreground' :
        color === 'success' ? 'bg-success text-success-foreground' :
        color === 'warning' ? 'bg-warning text-warning-foreground' :
        color === 'info' ? 'bg-info text-info-foreground' :
        'bg-primary text-primary-foreground',
      )}>{badgeContent}</span>
    )}
  </span>
);

/* ----------------------------- CircularProgress --------------------------- */
export const CircularProgress = ({ size = 24, color = 'primary', sx, style, className, ...rest }) => (
  <Loader2
    className={cn('animate-spin', color === 'inherit' ? '' : color === 'error' ? 'text-destructive' : 'text-primary', className)}
    style={{ width: size, height: size, ...(sxToStyle(sx) || {}), ...(style || {}) }}
    {...rest}
  />
);

/* -------------------------------- Skeleton -------------------------------- */
export const Skeleton = ({ variant = 'text', width, height, animation, sx, style, className, ...rest }) => (
  <span
    className={cn('block animate-pulse bg-muted', variant === 'circular' ? 'rounded-full' : variant === 'rectangular' ? 'rounded-md' : 'rounded', className)}
    style={{
      width: typeof width === 'number' ? `${width}px` : width || '100%',
      height: typeof height === 'number' ? `${height}px` : height || (variant === 'text' ? '1em' : '20px'),
      ...(sxToStyle(sx) || {}),
      ...(style || {}),
    }}
    {...rest}
  />
);

/* -------------------------------- Collapse -------------------------------- */
export const Collapse = ({ in: open, timeout, children, sx, className, ...rest }) => (
  <div
    className={cn('overflow-hidden transition-all duration-200', open ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0', className)}
    style={sxToStyle(sx)}
    {...rest}
  >{children}</div>
);

/* -------------------------------- Tooltip --------------------------------- */
// Simple title-attribute based tooltip; keeps the tree unchanged.
export const Tooltip = ({ title, children, placement, arrow, ...rest }) => {
  if (!children) return null;
  return React.cloneElement(children, { title: typeof title === 'string' ? title : children.props?.title, ...rest });
};

/* --------------------------------- Alert ---------------------------------- */
const alertColor = {
  success: 'bg-success/10 text-success border-success/30',
  error: 'bg-destructive/10 text-destructive border-destructive/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  info: 'bg-info/10 text-info border-info/30',
};
export const Alert = ({ severity = 'info', variant, icon, action, onClose, sx, className, children, ...rest }) => (
  <div role="alert" className={cn('flex items-start gap-3 rounded-md border p-3 text-sm', alertColor[severity], className)} style={sxToStyle(sx)} {...rest}>
    {icon !== false && <div className="mt-0.5">{icon}</div>}
    <div className="flex-1">{children}</div>
    {action}
    {onClose && (
      <button type="button" onClick={onClose} className="p-1 rounded hover:bg-black/5">
        <CloseIcon className="h-4 w-4" />
      </button>
    )}
  </div>
);

/* -------------------------------- Dialog ---------------------------------- */
export const Dialog = ({ open, onClose, maxWidth = 'sm', fullWidth, fullScreen, children, sx, className, ...rest }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.(e, 'escapeKeyDown');
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  const mw = { xs: 'max-w-xs', sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[maxWidth] || 'max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={(e) => onClose?.(e, 'backdropClick')} />
      <div
        className={cn('relative w-full rounded-lg bg-background text-foreground shadow-pop border border-border max-h-[92vh] overflow-y-auto', fullScreen ? 'h-full max-w-none rounded-none' : (fullWidth ? mw : mw), className)}
        style={sxToStyle(sx)}
        {...rest}
      >{children}</div>
    </div>
  );
};
export const DialogTitle = ({ sx, className, children, ...rest }) => (
  <div className={cn('px-6 pt-5 pb-2 text-lg font-semibold', className)} style={sxToStyle(sx)} {...rest}>{children}</div>
);
export const DialogContent = ({ dividers, sx, className, children, ...rest }) => (
  <div className={cn('px-6 py-3', dividers && 'border-y border-border', className)} style={sxToStyle(sx)} {...rest}>{children}</div>
);
export const DialogActions = ({ sx, className, children, ...rest }) => (
  <div className={cn('flex items-center justify-end gap-2 px-6 py-4', className)} style={sxToStyle(sx)} {...rest}>{children}</div>
);

/* ---------------------------------- Menu ---------------------------------- */
export const Menu = ({ open, anchorEl, onClose, children, sx, className, ...rest }) => {
  const menuRef = React.useRef(null);
  const [pos, setPos] = React.useState(null);

  const place = React.useCallback(() => {
    if (!anchorEl?.getBoundingClientRect || !menuRef.current) return;
    const gap = 4;
    const edge = 8;
    const a = anchorEl.getBoundingClientRect();
    const m = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rtl = document.documentElement.dir === 'rtl';

    // Prefer aligning with the anchor's start edge; flip when it would overflow.
    let left = rtl ? a.right - m.width : a.left;
    if (left + m.width > vw - edge) left = a.right - m.width;
    if (left < edge) left = a.left;
    left = Math.min(Math.max(edge, left), Math.max(edge, vw - m.width - edge));

    let top = a.bottom + gap;
    if (top + m.height > vh - edge && a.top - gap - m.height >= edge) top = a.top - gap - m.height;
    top = Math.min(Math.max(edge, top), Math.max(edge, vh - m.height - edge));

    setPos({ top, left });
  }, [anchorEl]);

  React.useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined; }
    place();
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, place, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" onClick={() => onClose?.()}>
      <div
        ref={menuRef}
        role="menu"
        className={cn('fixed min-w-[10rem] max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-pop py-1', className)}
        style={{
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          visibility: pos ? 'visible' : 'hidden',
          ...(sxToStyle(sx) || {}),
        }}
        onClick={(e) => e.stopPropagation()}
        {...rest}
      >{children}</div>
    </div>
  );
};
export const MenuItem = React.forwardRef(({ onClick, selected, disabled, dense, value, sx, className, children, ...rest }, ref) => (
  <button
    ref={ref}
    type="button"
    disabled={disabled}
    onClick={onClick}
    data-value={value}
    role="menuitem"
    className={cn('flex w-full items-center gap-2 whitespace-nowrap px-3 text-start text-sm hover:bg-muted disabled:opacity-50 disabled:pointer-events-none cursor-pointer', dense ? 'py-1' : 'py-2', selected && 'bg-primary/10 text-primary', className)}
    style={sxToStyle(sx)}
    {...rest}
  >{children}</button>
));

/* --------------------------------- Tabs ----------------------------------- */
export const Tabs = ({ value, onChange, variant, indicatorColor, textColor, scrollButtons, allowScrollButtonsMobile, sx, className, children, ...rest }) => {
  const items = React.Children.toArray(children);
  return (
    <div className={cn('flex items-center border-b border-border overflow-x-auto', className)} style={sxToStyle(sx)} role="tablist" {...rest}>
      {items.map((child, i) => {
        if (!React.isValidElement(child)) return child;
        const idx = child.props.value !== undefined ? child.props.value : i;
        const active = value === idx;
        return React.cloneElement(child, { key: child.key ?? i, __active: active, __onClick: (e) => onChange?.(e, idx) });
      })}
    </div>
  );
};
export const Tab = ({ label, icon, iconPosition = 'start', value, __active, __onClick, disabled, sx, className, ...rest }) => (
  <button
    type="button"
    role="tab"
    aria-selected={__active}
    disabled={disabled}
    onClick={__onClick}
    className={cn(
      'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
      __active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
      disabled && 'opacity-50 pointer-events-none',
      className,
    )}
    style={sxToStyle(sx)}
    {...rest}
  >
    {iconPosition === 'start' && icon}
    {label}
    {iconPosition === 'end' && icon}
    {iconPosition === 'top' && icon}
  </button>
);

/* --------------------------------- Tables --------------------------------- */
export const TableContainer = React.forwardRef(({ component: C = 'div', sx, className, children, ...rest }, ref) => (
  <C ref={ref} className={cn('w-full overflow-x-auto', className)} style={sxToStyle(sx)} {...rest}>{children}</C>
));
export const Table = React.forwardRef(({ size, stickyHeader, sx, className, children, ...rest }, ref) => (
  <table ref={ref} className={cn('w-full caption-bottom text-sm border-collapse', className)} style={sxToStyle(sx)} data-size={size} {...rest}>{children}</table>
));
export const TableHead = ({ sx, className, children, ...rest }) => (
  <thead className={cn('[&_tr]:border-b border-border bg-muted/40', className)} style={sxToStyle(sx)} {...rest}>{children}</thead>
);
export const TableBody = ({ sx, className, children, ...rest }) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} style={sxToStyle(sx)} {...rest}>{children}</tbody>
);
export const TableRow = React.forwardRef(({ hover, selected, sx, className, children, ...rest }, ref) => (
  <tr ref={ref} className={cn('border-b border-border transition-colors', hover && 'hover:bg-muted/40', selected && 'bg-primary/5', className)} style={sxToStyle(sx)} {...rest}>{children}</tr>
));
export const TableCell = React.forwardRef(({ align, padding, size, component: C, colSpan, rowSpan, sortDirection, sx, style, className, children, ...rest }, ref) => {
  const Comp = C || 'td';
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <Comp
      ref={ref}
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn('px-3 py-2 align-middle', alignClass, padding === 'none' && 'p-0', padding === 'checkbox' && 'w-10 px-2', Comp === 'th' && 'font-medium text-muted-foreground', className)}
      style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }}
      {...rest}
    >{children}</Comp>
  );
});
export const TablePagination = ({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange, rowsPerPageOptions = [10, 25, 50], labelRowsPerPage = 'Rows per page:', component: C = 'div', sx, className, ...rest }) => {
  const from = count === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(count, (page + 1) * rowsPerPage);
  return (
    <C className={cn('flex flex-wrap items-center justify-end gap-4 px-3 py-2 text-sm text-muted-foreground border-t border-border', className)} style={sxToStyle(sx)} {...rest}>
      <label className="flex items-center gap-2">
        <span>{labelRowsPerPage}</span>
        <select className="rounded-md border border-border bg-background px-2 py-1" value={rowsPerPage} onChange={(e) => onRowsPerPageChange?.({ target: { value: e.target.value } })}>
          {rowsPerPageOptions.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <span>{from}-{to} of {count}</span>
      <div className="flex gap-1">
        <button type="button" className="rounded p-1 hover:bg-muted disabled:opacity-40 cursor-pointer" disabled={page === 0} onClick={(e) => onPageChange?.(e, page - 1)}>‹</button>
        <button type="button" className="rounded p-1 hover:bg-muted disabled:opacity-40 cursor-pointer" disabled={to >= count} onClick={(e) => onPageChange?.(e, page + 1)}>›</button>
      </div>
    </C>
  );
};

/* ---------------------------- Forms: TextField ---------------------------- */
const controlSize = { small: 'h-8 text-xs', medium: 'h-9 text-sm', large: 'h-10 text-sm' };
export const TextField = React.forwardRef(({
  label, helperText, error, required, disabled, fullWidth = true, multiline, rows = 3, minRows, maxRows, type = 'text',
  value, defaultValue, onChange, onBlur, name, id, placeholder, size = 'medium', variant, select, children,
  InputProps, inputProps, InputLabelProps, SelectProps, autoFocus, autoComplete, sx, style, className, ...rest
}, ref) => {
  const fieldId = id || name;
  const startAdornment = InputProps?.startAdornment;
  const endAdornment = InputProps?.endAdornment;
  const base = cn(
    'box-border w-full min-w-0 max-w-full rounded-md border bg-card px-2.5 outline-none transition-colors placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring focus:border-ring disabled:opacity-50',
    error ? 'border-destructive' : 'border-input',
    startAdornment && 'ps-8',
    endAdornment && 'pe-8',
  );
  const commonProps = {
    id: fieldId, name, value, defaultValue, onChange, onBlur, placeholder, disabled, required, autoFocus, autoComplete,
    ref, ...inputProps, ...rest,
  };
  const control = select ? (
    <select className={cn(base, controlSize[size])} {...commonProps} {...SelectProps}>{children}</select>
  ) : multiline ? (
    <textarea rows={rows || minRows} className={cn(base, 'min-h-[72px] py-2')} {...commonProps} />
  ) : (
    <input type={type} className={cn(base, controlSize[size])} {...commonProps} />
  );
  return (
    <div className={cn('flex min-w-0 max-w-full flex-col gap-1', fullWidth ? 'w-full' : 'w-auto', className)} style={{ ...(sxToStyle(sx) || {}), ...(style || {}) }}>
      {label && (
        <label htmlFor={fieldId} className={cn('text-xs font-medium', error ? 'text-destructive' : 'text-foreground')} {...InputLabelProps}>
          {label}{required && <span className="text-destructive"> *</span>}
        </label>
      )}
      <div className="relative min-w-0 w-full">
        {startAdornment && <span className="absolute inset-y-0 start-0 flex items-center ps-2.5 text-muted-foreground">{startAdornment}</span>}
        {control}
        {endAdornment && <span className="absolute inset-y-0 end-0 flex items-center pe-2.5 text-muted-foreground">{endAdornment}</span>}
      </div>
      {helperText && <p className={cn('text-[11px]', error ? 'text-destructive' : 'text-muted-foreground')}>{helperText}</p>}
    </div>
  );
});

/* ------------------------------ InputAdornment ---------------------------- */
export const InputAdornment = ({ position, children, sx, className, ...rest }) => (
  <span className={cn('inline-flex items-center', className)} style={sxToStyle(sx)} {...rest}>{children}</span>
);
export const InputLabel = ({ children, htmlFor, required, error, sx, className, ...rest }) => (
  <label htmlFor={htmlFor} className={cn('text-sm font-medium', error ? 'text-destructive' : 'text-foreground', className)} style={sxToStyle(sx)} {...rest}>
    {children}{required && <span className="text-destructive"> *</span>}
  </label>
);

/* ------------------------------ FormControl ------------------------------- */
export const FormControl = ({ fullWidth, error, disabled, size, variant, sx, className, children, ...rest }) => (
  <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', disabled && 'opacity-60', className)} style={sxToStyle(sx)} {...rest}>{children}</div>
);
export const FormControlLabel = ({ control, label, labelPlacement = 'end', disabled, sx, className, ...rest }) => (
  <label className={cn('inline-flex items-center gap-2 text-sm cursor-pointer', labelPlacement === 'start' && 'flex-row-reverse', disabled && 'opacity-60', className)} style={sxToStyle(sx)} {...rest}>
    {control}
    <span>{label}</span>
  </label>
);
export const FormGroup = ({ row, sx, className, children, ...rest }) => (
  <div className={cn('flex gap-3', row ? 'flex-row flex-wrap' : 'flex-col', className)} style={sxToStyle(sx)} {...rest}>{children}</div>
);

/* -------------------------------- Checkbox -------------------------------- */
export const Checkbox = React.forwardRef(({ checked, defaultChecked, onChange, disabled, size = 'medium', color, indeterminate, name, value, sx, className, ...rest }, ref) => {
  const inputRef = React.useRef(null);
  React.useImperativeHandle(ref, () => inputRef.current);
  React.useEffect(() => { if (inputRef.current) inputRef.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      defaultChecked={defaultChecked}
      onChange={onChange}
      disabled={disabled}
      name={name}
      value={value}
      className={cn('h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer', className)}
      style={sxToStyle(sx)}
      {...rest}
    />
  );
});

/* -------------------------------- Switch ---------------------------------- */
export const Switch = React.forwardRef(({ checked, defaultChecked, onChange, disabled, name, value, sx, className, ...rest }, ref) => (
  <label className={cn('relative inline-flex h-5 w-9 items-center cursor-pointer', disabled && 'opacity-50 pointer-events-none', className)} style={sxToStyle(sx)}>
    <input ref={ref} type="checkbox" className="peer sr-only" checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled} name={name} value={value} {...rest} />
    <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
    <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
  </label>
));

/* --------------------------------- Select --------------------------------- */
export const Select = React.forwardRef(({ value, onChange, name, label, labelId, displayEmpty, multiple, size = 'medium', fullWidth = true, disabled, error, children, renderValue, sx, className, ...rest }, ref) => (
  <select
    ref={ref}
    name={name}
    value={value ?? ''}
    onChange={(e) => onChange?.({ ...e, target: { ...e.target, name, value: e.target.value } }, e)}
    disabled={disabled}
    multiple={multiple}
    className={cn('rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring focus:border-ring cursor-pointer', error ? 'border-destructive' : 'border-input', controlSize[size], fullWidth ? 'w-full' : '', className)}
    style={sxToStyle(sx)}
    {...rest}
  >{children}</select>
));

/* ------------------------------ Autocomplete ------------------------------ */
// Minimal single-value autocomplete supporting the props the app uses.
export const Autocomplete = ({
  options = [], value, onChange, onInputChange, inputValue, getOptionLabel = (o) => (typeof o === 'string' ? o : (o?.label ?? '')), isOptionEqualToValue, renderInput, renderOption, disabled, fullWidth = true, freeSolo, multiple, size, disableClearable, loading, noOptionsText = 'No options', filterOptions, sx, className, ...rest
}) => {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(() => (value ? getOptionLabel(value) : ''));
  const rootRef = React.useRef(null);
  React.useEffect(() => { setText(value ? getOptionLabel(value) : ''); }, [value]);
  React.useEffect(() => {
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const list = (() => {
    const filtered = filterOptions ? filterOptions(options, { inputValue: text }) : options.filter((o) => {
      const label = getOptionLabel(o) || '';
      return !text || label.toLowerCase().includes(text.toLowerCase());
    });
    return filtered;
  })();
  const inputProps = {
    value: inputValue ?? text,
    onChange: (e) => {
      const v = e.target.value;
      setText(v);
      onInputChange?.(e, v, 'input');
      setOpen(true);
      if (freeSolo) onChange?.(e, v, 'input');
    },
    onFocus: () => setOpen(true),
    disabled,
    fullWidth,
    InputProps: {
      endAdornment: (
        <>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!disableClearable && text && (
            <button type="button" onClick={(e) => { setText(''); onChange?.(e, null, 'clear'); onInputChange?.(e, '', 'clear'); }} className="p-1 rounded hover:bg-muted cursor-pointer">
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </>
      ),
    },
  };
  return (
    <div ref={rootRef} className={cn('relative min-w-0 max-w-full', fullWidth ? 'w-full' : '', className)} style={sxToStyle(sx)} {...rest}>
      {renderInput ? renderInput({ ...inputProps, size, id: rest.id }) : <TextField {...inputProps} />}
      {open && (
        <div className="absolute z-40 mt-1 w-full min-w-0 rounded-md border border-border bg-popover text-popover-foreground shadow-pop max-h-64 overflow-auto">
          {list.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{loading ? 'Loading…' : noOptionsText}</div>}
          {list.map((opt, i) => {
            const label = getOptionLabel(opt);
            const selected = value && (isOptionEqualToValue ? isOptionEqualToValue(opt, value) : opt === value);
            const optionProps = {
              key: i,
              onClick: (e) => { onChange?.(e, opt, 'selectOption'); setText(label); setOpen(false); },
              className: cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer', selected && 'bg-primary/10 text-primary'),
              role: 'option',
            };
            if (renderOption) return renderOption(optionProps, opt, { selected });
            return <button type="button" {...optionProps}>{label}</button>;
          })}
        </div>
      )}
    </div>
  );
};

/* --------------------------------- Theme ---------------------------------- */
// Some pages call useTheme(); provide a minimal token map compatible with alpha().
export const alpha = (color, opacity) => {
  if (!color) return `rgba(0,0,0,${opacity})`;
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const bigint = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
    const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
    return `rgba(${r},${g},${b},${opacity})`;
  }
  return color;
};
export const useTheme = () => ({
  palette: {
    mode: 'light',
    primary: { main: 'hsl(var(--primary))', light: 'hsl(var(--primary))', dark: 'hsl(var(--primary))', contrastText: '#fff' },
    secondary: { main: 'hsl(var(--secondary))', contrastText: '#fff' },
    error: { main: 'hsl(var(--destructive))', light: 'hsl(var(--destructive))', dark: 'hsl(var(--destructive))' },
    warning: { main: 'hsl(var(--warning))' },
    info: { main: 'hsl(var(--info))' },
    success: { main: 'hsl(var(--success))' },
    grey: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
    text: { primary: 'hsl(var(--foreground))', secondary: 'hsl(var(--muted-foreground))', disabled: 'hsl(var(--muted-foreground))' },
    background: { paper: 'hsl(var(--card))', default: 'hsl(var(--background))' },
    divider: 'hsl(var(--border))',
    action: { hover: 'hsl(var(--muted))', selected: 'hsl(var(--accent))', disabled: 'hsl(var(--muted-foreground))', active: 'hsl(var(--foreground))' },
    common: { black: '#000', white: '#fff' },
  },
  spacing: (n = 1) => `${n * 8}px`,
  shape: { borderRadius: 8 },
  shadows: [
    "none",
    "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)",
    "0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)",
    "0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)",
    "0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)",
    "0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)",
    "0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)",
    "0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)",
    "0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)",
    "0px 5px 6px -3px rgba(0,0,0,0.2),0px 9px 12px 1px rgba(0,0,0,0.14),0px 3px 16px 2px rgba(0,0,0,0.12)",
    "0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)",
    "0px 6px 7px -4px rgba(0,0,0,0.2),0px 11px 15px 1px rgba(0,0,0,0.14),0px 4px 20px 3px rgba(0,0,0,0.12)",
    "0px 7px 8px -4px rgba(0,0,0,0.2),0px 12px 17px 2px rgba(0,0,0,0.14),0px 5px 22px 4px rgba(0,0,0,0.12)",
    "0px 7px 8px -4px rgba(0,0,0,0.2),0px 13px 19px 2px rgba(0,0,0,0.14),0px 5px 24px 4px rgba(0,0,0,0.12)",
    "0px 7px 9px -4px rgba(0,0,0,0.2),0px 14px 21px 2px rgba(0,0,0,0.14),0px 5px 26px 4px rgba(0,0,0,0.12)",
    "0px 8px 9px -5px rgba(0,0,0,0.2),0px 15px 22px 2px rgba(0,0,0,0.14),0px 6px 28px 5px rgba(0,0,0,0.12)",
    "0px 8px 10px -5px rgba(0,0,0,0.2),0px 16px 24px 2px rgba(0,0,0,0.14),0px 6px 30px 5px rgba(0,0,0,0.12)",
    "0px 8px 11px -5px rgba(0,0,0,0.2),0px 17px 26px 2px rgba(0,0,0,0.14),0px 6px 32px 5px rgba(0,0,0,0.12)",
    "0px 9px 11px -5px rgba(0,0,0,0.2),0px 18px 28px 2px rgba(0,0,0,0.14),0px 7px 34px 6px rgba(0,0,0,0.12)",
    "0px 9px 12px -6px rgba(0,0,0,0.2),0px 19px 29px 2px rgba(0,0,0,0.14),0px 7px 36px 6px rgba(0,0,0,0.12)",
    "0px 10px 13px -6px rgba(0,0,0,0.2),0px 20px 31px 3px rgba(0,0,0,0.14),0px 8px 38px 7px rgba(0,0,0,0.12)",
    "0px 10px 13px -6px rgba(0,0,0,0.2),0px 21px 33px 3px rgba(0,0,0,0.14),0px 8px 40px 7px rgba(0,0,0,0.12)",
    "0px 10px 14px -6px rgba(0,0,0,0.2),0px 22px 35px 3px rgba(0,0,0,0.14),0px 8px 42px 7px rgba(0,0,0,0.12)",
    "0px 11px 14px -7px rgba(0,0,0,0.2),0px 23px 36px 3px rgba(0,0,0,0.14),0px 9px 44px 8px rgba(0,0,0,0.12)",
    "0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)",
  ],
  breakpoints: {
    up: () => '@media (min-width:600px)',
    down: () => '@media (max-width:600px)',
  },
  typography: {},
  zIndex: { modal: 1300, tooltip: 1500, appBar: 1100, drawer: 1200 },
});
