import React from 'react';
import PropTypes from 'prop-types';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PageHeaderLoader } from './LoadingScreen';

const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  backButton,
  backButtonLabel = 'common.back',
  actions = [],
  loading = false,
  tags = [],
  startContent,
  endContent,
  divider = true,
  elevation = 0,
  variant = 'standard', // 'standard', 'compact', 'boxed'
  sx = {},
}) => {
  const { t } = useTranslation();

  const stackActions = actions.length > 2;

  const renderBackButton = () => {
    if (!backButton) return null;

    return typeof backButton === 'string' ? (
      <Button
        asChild
        variant="ghost"
        className="mb-2 sm:mb-0 sm:me-2"
      >
        <RouterLink to={backButton}>
          <ArrowLeft className="h-4 w-4" />
          {t(backButtonLabel)}
        </RouterLink>
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        onClick={backButton}
        className="mb-2 sm:mb-0 sm:me-1"
        aria-label={t(backButtonLabel)}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    );
  };

  const renderBreadcrumbs = () => {
    if (!breadcrumbs.length) return null;

    return (
      <nav aria-label={t("common.accessibility.breadcrumb")} className="mb-1 flex items-center flex-wrap gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              {isLast ? (
                <span className="text-foreground">{t(crumb.label)}</span>
              ) : (
                <RouterLink to={crumb.link} className="text-muted-foreground hover:underline hover:text-foreground">
                  {t(crumb.label)}
                </RouterLink>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  };

  const renderTags = () => {
    if (!tags.length) return null;

    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {tags.map((tag, index) => (
          <Badge key={index} variant={tag.variant === 'filled' ? (tag.color || 'default') : 'outline'}>
            {tag.icon && <span className="me-1">{tag.icon}</span>}
            {t(tag.label)}
          </Badge>
        ))}
      </div>
    );
  };

  const headerContent = (
    <>
      {loading && <PageHeaderLoader />}

      <div
        className={cn(
          'flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3',
          variant === 'compact' ? 'mb-2' : 'mb-3'
        )}
      >
        <div className="flex items-start sm:items-center flex-col sm:flex-row min-w-0">
          {renderBackButton()}
          <div className="min-w-0">
            {renderBreadcrumbs()}
            <h1
              className={cn(
                'font-display font-bold flex items-center gap-2.5 text-foreground tracking-tight',
                variant === 'compact' ? 'text-xl' : 'text-2xl'
              )}
            >
              {startContent && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-emerald">
                  {startContent}
                </span>
              )}
              <span className="truncate">{t(title)}</span>
              {endContent && <span className="ms-1">{endContent}</span>}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{t(subtitle)}</p>
            )}
            {renderTags()}
          </div>
        </div>

        {actions.length > 0 && (
          <div
            className={cn(
              'flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto',
              stackActions ? 'flex-col items-stretch' : 'flex-row flex-wrap items-center justify-end'
            )}
          >
            {actions.map((action, index) =>
              React.isValidElement(action)
                ? React.cloneElement(action, {
                    key: action.key ?? index,
                    className: cn(
                      stackActions && 'w-full',
                      action.props?.className
                    ),
                  })
                : action
            )}
          </div>
        )}
      </div>

      {divider && (
        <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      )}
    </>
  );

  if (variant === 'boxed') {
    return (
      <div className={cn('p-4 mb-6 rounded-xl border border-border bg-card', elevation > 0 && 'shadow-soft')} style={sx}>
        {headerContent}
      </div>
    );
  }

  return (
    <div className="mb-6" style={sx}>
      {headerContent}
    </div>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      link: PropTypes.string.isRequired,
    })
  ),
  backButton: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  backButtonLabel: PropTypes.string,
  actions: PropTypes.arrayOf(PropTypes.node),
  loading: PropTypes.bool,
  tags: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      color: PropTypes.string,
      variant: PropTypes.string,
      icon: PropTypes.node,
    })
  ),
  startContent: PropTypes.node,
  endContent: PropTypes.node,
  divider: PropTypes.bool,
  elevation: PropTypes.number,
  variant: PropTypes.oneOf(['standard', 'compact', 'boxed']),
  sx: PropTypes.object,
};

export default PageHeader;
