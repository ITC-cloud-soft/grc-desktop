import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/StatCard';
import { Chart } from '../../components/Chart';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useEvolutionStats, useAdminAssets } from '../../api/hooks';

export function Pipeline() {
  const { t } = useTranslation('evolution');
  const { data: stats, isLoading: statsLoading, error: statsError } = useEvolutionStats();
  const { data: assets, isLoading: assetsLoading } = useAdminAssets({ page: 1, page_size: 10, status: 'pending' });

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'id',
      label: t('pipeline.table.assetId'),
      render: (v) => <span className="mono text-sm">{String(v).slice(0, 12)}…</span>,
    },
    {
      key: 'assetId',
      label: t('pipeline.table.assetRef'),
      render: (v) => <span className="mono text-sm">{String(v).slice(0, 10)}…</span>,
    },
    {
      key: 'assetType',
      label: t('assets.table.type'),
      render: (v) => <StatusBadge status={String(v)} variant="info" />,
    },
    {
      key: 'category',
      label: t('pipeline.table.category'),
      render: (v) => v ? String(v) : <span className="text-muted">—</span>,
    },
    {
      key: 'safetyScore',
      label: t('pipeline.table.safetyScore'),
      render: (v) => {
        if (v === null || v === undefined) return <span className="text-muted">—</span>;
        const score = Number(v) * 100;
        return (
          <span className={score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger'}>
            {score.toFixed(0)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: t('assets.table.status'),
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: 'createdAt',
      label: t('pipeline.table.submitted'),
      render: (v) => new Date(String(v)).toLocaleDateString(),
    },
  ];

  const genesByStatus = stats?.stats.genesByStatus ?? {};
  const pendingCount = (genesByStatus['pending'] ?? 0) + (stats?.stats.capsulesByStatus?.['pending'] ?? 0);
  const approvedCount = (genesByStatus['approved'] ?? 0) + (stats?.stats.capsulesByStatus?.['approved'] ?? 0);
  const promotedCount = (genesByStatus['promoted'] ?? 0) + (stats?.stats.capsulesByStatus?.['promoted'] ?? 0);
  const quarantinedCount = (genesByStatus['quarantined'] ?? 0) + (stats?.stats.capsulesByStatus?.['quarantined'] ?? 0);

  const promotionRate = stats ? stats.stats.promotionRate.toFixed(1) : '0';

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('pipeline.title')}</h1>
        <p className="page-subtitle">{t('pipeline.subtitle')}</p>
      </div>

      {statsError && <ErrorMessage error={statsError as Error} />}

      <div className="stat-grid stat-grid-4">
        <StatCard
          title={t('pipeline.stats.pendingReview')}
          value={pendingCount}
          icon="⏳"
          color="#ffbe0b"
          loading={statsLoading}
        />
        <StatCard
          title={t('pipeline.stats.approved')}
          value={approvedCount}
          icon="✅"
          color="#06d6a0"
          loading={statsLoading}
        />
        <StatCard
          title={t('pipeline.stats.promoted')}
          value={promotedCount}
          icon="🚀"
          color="#4361ee"
          loading={statsLoading}
        />
        <StatCard
          title={t('pipeline.stats.quarantined')}
          value={quarantinedCount}
          icon="🔒"
          color="#ff006e"
          loading={statsLoading}
        />
      </div>

      <div className="chart-grid" style={{ marginTop: 20 }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <Chart
            type="bar"
            data={Object.entries(genesByStatus).map(([name, value]) => ({ name, value }))}
            xKey="name"
            yKey="value"
            title={t('pipeline.chart.genesByStatus')}
            height={240}
          />
        </div>
        <div className="card">
          <div className="chart-title">{t('pipeline.chart.promotionRate')}</div>
          <div className="big-metric">
            <div className="big-metric-value">{promotionRate}%</div>
            <div className="big-metric-label">{t('pipeline.chart.ofGenesPromoted')}</div>
          </div>
          <Chart
            type="pie"
            data={[
              { name: t('pipeline.stats.promoted'), value: promotedCount },
              { name: t('pipeline.stats.approved'), value: approvedCount },
              { name: t('pipeline.stats.quarantined'), value: quarantinedCount },
            ]}
            nameKey="name"
            valueKey="value"
            height={180}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="card-title">{t('pipeline.pendingReview')}</h2>
        <DataTable
          columns={columns}
          data={(assets?.data ?? []) as unknown as Record<string, unknown>[]}
          loading={assetsLoading}
          rowKey="id"
          emptyMessage={t('pipeline.noAssetsPending')}
        />
      </div>
    </div>
  );
}
