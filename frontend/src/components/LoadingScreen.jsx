import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Simple centered loading spinner for the whole page
export const FullPageLoader = ({
  message = 'common.loading',
  open = true,
  backdropProps = {},
  messageColor = 'text-muted-foreground',
  loaderSize = 60,
  loaderColor = 'text-primary',
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1300] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
      {...backdropProps}
    >
      <Loader2 className={cn('animate-spin', loaderColor)} style={{ width: loaderSize, height: loaderSize }} />
      {message && (
        <p className={cn('mt-4 text-lg font-medium', messageColor)}>{t(message)}</p>
      )}
    </div>
  );
};

FullPageLoader.propTypes = {
  message: PropTypes.string,
  open: PropTypes.bool,
  backdropProps: PropTypes.object,
  messageColor: PropTypes.string,
  loaderSize: PropTypes.number,
  loaderColor: PropTypes.string,
};

// Component loader for sections of a page
export const SectionLoader = ({
  message = 'common.loading',
  height = 200,
  width = '100%',
  messageColor = 'text-muted-foreground',
  loaderSize = 40,
  loaderColor = 'text-primary',
  overlay = false,
  sx = {},
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center top-0 start-0',
        overlay ? 'absolute z-10 bg-background/70' : 'relative'
      )}
      style={{ height, width, ...sx }}
    >
      <Loader2 className={cn('animate-spin', loaderColor)} style={{ width: loaderSize, height: loaderSize }} />
      {message && <p className={cn('mt-4', messageColor)}>{t(message)}</p>}
    </div>
  );
};

SectionLoader.propTypes = {
  message: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  messageColor: PropTypes.string,
  loaderSize: PropTypes.number,
  loaderColor: PropTypes.string,
  overlay: PropTypes.bool,
  sx: PropTypes.object,
};

// Linear progress loader for page headers
export const PageHeaderLoader = ({
  loading = true,
  height = 4,
  sx = {},
  color = 'bg-primary',
}) => {
  if (!loading) return null;

  return (
    <div className="w-full mb-4" style={sx}>
      <div className="w-full overflow-hidden rounded-full bg-primary/20" style={{ height }}>
        <div className={cn('h-full w-1/3 animate-loading-bar rounded-full', color)} />
      </div>
    </div>
  );
};

PageHeaderLoader.propTypes = {
  loading: PropTypes.bool,
  height: PropTypes.number,
  sx: PropTypes.object,
  color: PropTypes.string,
};

// Skeleton loader for cards
export const CardLoader = ({
  loading = true,
  height = 200,
  width = '100%',
  message,
  sx = {},
}) => {
  const { t } = useTranslation();

  if (!loading) return null;

  return (
    <div
      className="rounded-xl border border-border bg-card shadow-soft flex flex-col items-center justify-center p-4"
      style={{ height, width, ...sx }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message ? (
        <p className="mt-4 text-sm text-muted-foreground">{t(message)}</p>
      ) : (
        <div className="w-full mt-4 space-y-2">
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      )}
    </div>
  );
};

CardLoader.propTypes = {
  loading: PropTypes.bool,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  message: PropTypes.string,
  sx: PropTypes.object,
};

// Button loader (for use inside buttons)
export const ButtonLoader = ({
  loading = false,
  size = 24,
  color = 'currentColor',
  sx = {},
}) => {
  if (!loading) return null;

  return (
    <Loader2
      className="animate-spin"
      style={{ width: size, height: size, color, ...sx }}
    />
  );
};

ButtonLoader.propTypes = {
  loading: PropTypes.bool,
  size: PropTypes.number,
  color: PropTypes.string,
  sx: PropTypes.object,
};

// Export all loading components
export default {
  FullPageLoader,
  SectionLoader,
  PageHeaderLoader,
  CardLoader,
  ButtonLoader,
};
