import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const maxWidthMap = {
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
  xl: 'sm:max-w-6xl',
};

// Basic Modal Component
export const Modal = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  disableEscapeKeyDown = false,
  disableBackdropClick = false,
  loading = false,
  titleIcon,
  subtitle,
  showCloseIcon = true,
  dividers = true,
  noPadding = false,
  sx = {},
  PaperProps = {},
}) => {
  const { t } = useTranslation();

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      if (loading) return;
      if (onClose) onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (disableEscapeKeyDown || loading) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (disableBackdropClick || loading) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (disableBackdropClick || loading) e.preventDefault();
        }}
        hideCloseButton={!showCloseIcon || loading}
        className={cn(
          fullWidth ? 'w-full' : '',
          maxWidthMap[maxWidth] || maxWidthMap.sm,
          fullScreen && 'h-[100dvh] max-h-[100dvh] w-screen max-w-full sm:rounded-none flex flex-col',
          !title && !showCloseIcon && 'pt-6'
        )}
        style={sx}
        {...PaperProps}
      >
        {(title || showCloseIcon) && (
          <>
            <DialogHeader>
              <div className="flex items-center">
                {titleIcon && <span className="me-2 flex items-center">{titleIcon}</span>}
                <div>
                  {title && <DialogTitle>{t(title)}</DialogTitle>}
                  {subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">{t(subtitle)}</p>
                  )}
                </div>
              </div>
            </DialogHeader>
            {dividers && <hr className="border-border -mx-6" />}
          </>
        )}

        {loading && (
          <div className="w-full h-1 overflow-hidden rounded-full bg-primary/20 -mt-2">
            <div className="h-full w-1/3 animate-loading-bar rounded-full bg-primary" />
          </div>
        )}

        <div className={cn(noPadding ? 'p-0' : '', fullScreen && 'flex-1 overflow-y-auto')}>
          {children}
        </div>

        {actions && (
          <>
            {dividers && <hr className="border-border -mx-6" />}
            <DialogFooter>{actions}</DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  actions: PropTypes.node,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', false]),
  fullWidth: PropTypes.bool,
  fullScreen: PropTypes.bool,
  disableEscapeKeyDown: PropTypes.bool,
  disableBackdropClick: PropTypes.bool,
  loading: PropTypes.bool,
  titleIcon: PropTypes.node,
  subtitle: PropTypes.string,
  showCloseIcon: PropTypes.bool,
  dividers: PropTypes.bool,
  noPadding: PropTypes.bool,
  sx: PropTypes.object,
  PaperProps: PropTypes.object,
};

// Confirmation Modal Component
export const ConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  title = 'common.confirm',
  message = 'common.confirmMessage',
  confirmText = 'common.yes',
  cancelText = 'common.no',
  confirmColor = 'primary',
  loading = false,
  confirmIcon,
  cancelIcon,
  icon,
  maxWidth = 'xs',
  ...modalProps
}) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  const confirmVariant = confirmColor === 'error' ? 'destructive' : 'default';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={maxWidth}
      titleIcon={icon}
      loading={loading}
      disableBackdropClick={loading}
      actions={
        <>
          <Button onClick={onClose} variant="ghost" disabled={loading}>
            {cancelIcon}
            {t(cancelText)}
          </Button>
          <Button onClick={handleConfirm} variant={confirmVariant} autoFocus disabled={loading}>
            {confirmIcon}
            {t(confirmText)}
          </Button>
        </>
      }
      {...modalProps}
    >
      <p className="text-sm text-foreground">{t(message)}</p>
    </Modal>
  );
};

ConfirmationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmColor: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info']),
  loading: PropTypes.bool,
  confirmIcon: PropTypes.node,
  cancelIcon: PropTypes.node,
  icon: PropTypes.node,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', false]),
};

// Form Modal Component
export const FormModal = ({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'common.save',
  cancelText = 'common.cancel',
  submitColor = 'primary',
  loading = false,
  disableSubmit = false,
  hideCancel = false,
  ...modalProps
}) => {
  const { t } = useTranslation();

  const submitVariant = submitColor === 'error' ? 'destructive' : 'default';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      loading={loading}
      disableBackdropClick={loading || modalProps.disableBackdropClick}
      disableEscapeKeyDown={loading || modalProps.disableEscapeKeyDown}
      actions={
        <>
          {!hideCancel && (
            <Button onClick={onClose} variant="ghost" disabled={loading}>
              {t(cancelText)}
            </Button>
          )}
          {onSubmit && (
            <Button onClick={onSubmit} variant={submitVariant} disabled={loading || disableSubmit}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t(submitText)}
            </Button>
          )}
        </>
      }
      {...modalProps}
    >
      {children}
    </Modal>
  );
};

FormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  onSubmit: PropTypes.func,
  submitText: PropTypes.string,
  cancelText: PropTypes.string,
  submitColor: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info']),
  loading: PropTypes.bool,
  disableSubmit: PropTypes.bool,
  hideCancel: PropTypes.bool,
};

// Side Drawer Modal Component - useful for forms that need more space
export const SideDrawerModal = ({
  open,
  onClose,
  title,
  children,
  actions,
  width = 400,
  anchor = 'right',
  ...modalProps
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      fullScreen
      PaperProps={{
        className: cn(
          anchor === 'right' ? 'ms-auto' : 'me-auto',
          'h-full max-w-full'
        ),
        style: { width },
      }}
      actions={actions}
      {...modalProps}
    >
      {children}
    </Modal>
  );
};

SideDrawerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  actions: PropTypes.node,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  anchor: PropTypes.oneOf(['left', 'right']),
};

export default {
  Modal,
  ConfirmationModal,
  FormModal,
  SideDrawerModal,
};
