import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const severityIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

// Standalone Alert component
export const AlertMessage = ({
  severity = 'info',
  message,
  title,
  onClose,
  action,
  variant = 'standard',
  sx = {},
  icon,
  closeText,
  translateMessage = true,
  translateTitle = true,
}) => {
  const { t } = useTranslation();
  const Icon = severityIcons[severity] || Info;

  return (
    <Alert
      variant={severity}
      className={cn('w-full', variant === 'filled' && 'border-transparent')}
      style={sx}
    >
      {icon !== null && (icon || <Icon className="h-4 w-4" />)}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {title && (
            <AlertTitle>{translateTitle ? t(title) : title}</AlertTitle>
          )}
          <AlertDescription>
            {typeof message === 'string'
              ? (translateMessage ? t(message) : message)
              : message}
          </AlertDescription>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {action}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeText ? t(closeText) : t('common.close')}
              className="rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </Alert>
  );
};

AlertMessage.propTypes = {
  severity: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  title: PropTypes.string,
  onClose: PropTypes.func,
  action: PropTypes.node,
  variant: PropTypes.oneOf(['standard', 'filled', 'outlined']),
  sx: PropTypes.object,
  icon: PropTypes.node,
  closeText: PropTypes.string,
  translateMessage: PropTypes.bool,
  translateTitle: PropTypes.bool,
};

// Inline alert with collapsible functionality
export const InlineAlert = ({
  severity = 'info',
  message,
  title,
  action,
  variant = 'outlined',
  sx = {},
  icon,
  closeText,
  open = true,
  onClose,
  translateMessage = true,
  translateTitle = true,
}) => {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className="my-1" style={sx}>
        <AlertMessage
          severity={severity}
          message={message}
          title={title}
          onClose={handleClose}
          action={action}
          variant={variant}
          icon={icon}
          closeText={closeText}
          translateMessage={translateMessage}
          translateTitle={translateTitle}
        />
      </div>
    </div>
  );
};

InlineAlert.propTypes = {
  severity: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  title: PropTypes.string,
  action: PropTypes.node,
  variant: PropTypes.oneOf(['standard', 'filled', 'outlined']),
  sx: PropTypes.object,
  icon: PropTypes.node,
  closeText: PropTypes.string,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  translateMessage: PropTypes.bool,
  translateTitle: PropTypes.bool,
};

// Snackbar Alert for temporary notifications
export const SnackbarAlert = ({
  open,
  onClose,
  message,
  severity = 'success',
  autoHideDuration = 6000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'right' },
  title,
  action,
  variant = 'filled',
  sx = {},
  icon,
  translateMessage = true,
  translateTitle = true,
}) => {
  const handleClose = () => {
    if (onClose) onClose();
  };

  useEffect(() => {
    if (!open || !autoHideDuration) return;
    const timer = setTimeout(handleClose, autoHideDuration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoHideDuration]);

  if (!open) return null;

  const vertical = anchorOrigin.vertical === 'top' ? 'top-4' : 'bottom-4';
  const horizontal =
    anchorOrigin.horizontal === 'left'
      ? 'start-4'
      : anchorOrigin.horizontal === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'end-4';

  return (
    <div className={cn('fixed z-[1400] max-w-sm w-full', vertical, horizontal)}>
      <AlertMessage
        severity={severity}
        message={message}
        title={title}
        onClose={handleClose}
        action={action}
        variant={variant}
        sx={sx}
        icon={icon}
        translateMessage={translateMessage}
        translateTitle={translateTitle}
      />
    </div>
  );
};

SnackbarAlert.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  severity: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
  autoHideDuration: PropTypes.number,
  anchorOrigin: PropTypes.shape({
    vertical: PropTypes.oneOf(['top', 'bottom']),
    horizontal: PropTypes.oneOf(['left', 'center', 'right']),
  }),
  title: PropTypes.string,
  action: PropTypes.node,
  variant: PropTypes.oneOf(['standard', 'filled', 'outlined']),
  sx: PropTypes.object,
  icon: PropTypes.node,
  translateMessage: PropTypes.bool,
  translateTitle: PropTypes.bool,
};

// Alert List component for displaying multiple alerts
export const AlertList = ({
  alerts,
  onClose,
  variant = 'outlined',
  sx = {},
  maxAlerts = null,
}) => {
  const [visibleAlerts, setVisibleAlerts] = useState(alerts);

  useEffect(() => {
    setVisibleAlerts(alerts);
  }, [alerts]);

  const handleCloseAlert = (id) => {
    setVisibleAlerts((prev) => prev.filter((alert) => alert.id !== id));
    if (onClose) onClose(id);
  };

  const displayedAlerts = maxAlerts ? visibleAlerts.slice(0, maxAlerts) : visibleAlerts;
  const hasMoreAlerts = maxAlerts && visibleAlerts.length > maxAlerts;

  return (
    <div className="w-full mb-4" style={sx}>
      {displayedAlerts.map((alert) => (
        <div key={alert.id} className="mb-2">
          <AlertMessage
            severity={alert.severity || 'info'}
            message={alert.message}
            title={alert.title}
            onClose={() => handleCloseAlert(alert.id)}
            variant={variant}
            translateMessage={alert.translateMessage !== false}
            translateTitle={alert.translateTitle !== false}
          />
        </div>
      ))}
      {hasMoreAlerts && (
        <p className="mt-1 text-sm text-muted-foreground">
          +{visibleAlerts.length - maxAlerts} more alerts
        </p>
      )}
    </div>
  );
};

AlertList.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      severity: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
      message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
      title: PropTypes.string,
      translateMessage: PropTypes.bool,
      translateTitle: PropTypes.bool,
    })
  ).isRequired,
  onClose: PropTypes.func,
  variant: PropTypes.oneOf(['standard', 'filled', 'outlined']),
  sx: PropTypes.object,
  maxAlerts: PropTypes.number,
};

export default {
  AlertMessage,
  InlineAlert,
  SnackbarAlert,
  AlertList,
};
