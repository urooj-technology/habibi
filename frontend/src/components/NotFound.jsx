import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="flex flex-col items-center justify-center text-center min-h-[80vh]">
        <FileQuestion className="h-16 w-16 text-primary mb-2" />
        <h1 className="text-primary font-bold leading-none" style={{ fontSize: '120px', lineHeight: 1.1 }}>
          404
        </h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {t('errors.pageNotFound')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {t('errors.pageNotFoundDescription')}
        </p>
        <Button asChild size="lg" className="mt-2">
          <RouterLink to="/app/dashboard">{t('common.backToDashboard')}</RouterLink>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
