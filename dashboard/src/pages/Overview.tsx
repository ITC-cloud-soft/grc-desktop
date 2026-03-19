import { useTranslation } from 'react-i18next';
import { WidgetGrid } from '../widgets';

export function Overview() {
  const { t } = useTranslation('overview');

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </div>

      <WidgetGrid />
    </div>
  );
}
