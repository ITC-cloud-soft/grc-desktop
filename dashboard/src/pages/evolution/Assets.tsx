import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useAdminAssets, useChangeAssetStatus, Asset } from '../../api/hooks';
import { useUser } from '../../context/UserContext';

const STATUSES = ['pending', 'approved', 'promoted', 'quarantined', 'rejected'];
const CATEGORIES = ['reasoning', 'coding', 'data', 'communication', 'research', 'creative', 'other'];

export function Assets() {
  const { t } = useTranslation('evolution');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'gene' | 'capsule'>('gene');
  const [assetType, setAssetType] = useState('gene');
  const [status, setStatus] = useState('approved');
  const [category, setCategory] = useState('');
  const [actionModal, setActionModal] = useState<{ asset: Asset; action: string; newStatus: string } | null>(null);
  const { isAdmin } = useUser();

  const { data, isLoading, error } = useAdminAssets({
    page,
    page_size: 20,
    asset_type: assetType || undefined,
    status: status || undefined,
    category: category || undefined,
  });
  const changeStatus = useChangeAssetStatus();

  const adminActions: Column<Record<string, unknown>> = {
    key: 'actions',
    label: t('assets.table.actions'),
    render: (_, row) => {
      const asset = row as unknown as Asset;
      const actions = [
        { label: t('assets.actions.promote'), newStatus: 'promoted' },
        { label: t('assets.actions.approve'), newStatus: 'approved' },
        { label: t('assets.actions.quarantine'), newStatus: 'quarantined' },
      ];
      return (
        <div className="action-group">
          {actions.map(({ label, newStatus }) => (
            <button
              key={newStatus}
              className={`btn btn-sm ${newStatus === 'quarantined' ? 'btn-danger' : newStatus === 'promoted' ? 'btn-primary' : 'btn-default'}`}
              onClick={() => setActionModal({ asset, action: label, newStatus })}
              disabled={asset.status === newStatus}
            >
              {label}
            </button>
          ))}
        </div>
      );
    },
  };

  const geneColumns: Column<Record<string, unknown>>[] = [
    {
      key: 'assetId',
      label: t('assets.table.assetRef'),
      render: (v, row) => {
        const a = row as unknown as Asset;
        return (
          <a
            href={`/evolution/assets/${a.id}`}
            onClick={(e) => { e.preventDefault(); navigate(`/evolution/assets/${a.id}`); }}
            className="mono text-sm link"
            title={String(v)}
          >
            {String(v).length > 24 ? `${String(v).slice(0, 24)}…` : String(v)}
          </a>
        );
      },
    },
    {
      key: 'category',
      label: t('assets.table.category'),
      render: (v) => v ? <StatusBadge status={String(v)} variant="default" /> : <span className="text-muted">—</span>,
    },
    {
      key: 'signalsMatch',
      label: t('assets.table.signals'),
      render: (v) => {
        const signals = Array.isArray(v) ? (v as string[]) : [];
        if (signals.length === 0) return <span className="text-muted">—</span>;
        return (
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {signals.slice(0, 3).map((s) => (
              <span key={s} className="badge badge-outline" style={{ fontSize: 10 }}>{s}</span>
            ))}
            {signals.length > 3 && (
              <span className="text-muted text-sm">+{signals.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: t('assets.table.status'),
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: 'capsuleCount',
      label: t('assets.table.capsules'),
      render: () => <span className="text-muted">0</span>,
    },
    {
      key: 'useCount',
      label: t('assets.table.useCount'),
      render: (v) => Number(v).toLocaleString(),
    },
    {
      key: 'successRate',
      label: t('assets.table.successRate'),
      render: (v) => {
        const pct = Number(v) * 100;
        return (
          <span className={pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger'}>
            {pct.toFixed(1)}%
          </span>
        );
      },
    },
    ...(isAdmin ? [adminActions] : []),
  ];

  const capsuleColumns: Column<Record<string, unknown>>[] = [
    {
      key: 'assetId',
      label: t('assets.table.assetRef'),
      render: (v, row) => {
        const a = row as unknown as Asset;
        return (
          <a
            href={`/evolution/assets/${a.id}`}
            onClick={(e) => { e.preventDefault(); navigate(`/evolution/assets/${a.id}`); }}
            className="mono text-sm link"
            title={String(v)}
          >
            {String(v).length > 24 ? `${String(v).slice(0, 24)}…` : String(v)}
          </a>
        );
      },
    },
    {
      key: 'geneAssetId',
      label: t('assets.table.parentGene'),
      render: (v, row) => {
        const a = row as unknown as Asset;
        if (!v) return <span className="text-muted">—</span>;
        const ref = String(v);
        return (
          <span
            className="mono text-sm link"
            style={{ cursor: 'pointer' }}
            onClick={() => a.geneAssetId && navigate(`/evolution/assets?ref=${encodeURIComponent(a.geneAssetId)}`)}
          >
            🧬 {ref.length > 25 ? `${ref.slice(0, 25)}…` : ref}
          </span>
        );
      },
    },
    {
      key: 'nodeId',
      label: t('assets.table.creator'),
      render: (v) => {
        if (!v) return <span className="text-muted">—</span>;
        const id = String(v);
        return <span className="mono text-sm">{id.length > 16 ? `${id.slice(0, 16)}…` : id}</span>;
      },
    },
    {
      key: 'confidence',
      label: t('assets.table.confidence'),
      render: (v) => {
        if (v === null || v === undefined) return <span className="text-muted">—</span>;
        const pct = Number(v) * 100;
        return <span>{pct.toFixed(1)}%</span>;
      },
    },
    {
      key: 'successStreak',
      label: t('assets.table.successStreak'),
      render: (v) => {
        if (v === null || v === undefined) return <span className="text-muted">—</span>;
        return <span>{Number(v)}</span>;
      },
    },
    {
      key: 'status',
      label: t('assets.table.status'),
      render: (v) => <StatusBadge status={String(v)} />,
    },
    ...(isAdmin ? [adminActions] : []),
  ];

  async function handleAction() {
    if (!actionModal) return;
    await changeStatus.mutateAsync({ assetId: actionModal.asset.id, status: actionModal.newStatus });
    setActionModal(null);
  }

  const activeColumns = activeTab === 'gene' ? geneColumns : capsuleColumns;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('assets.title')}</h1>
        <p className="page-subtitle">{t('assets.subtitle')}</p>
      </div>

      {error && <ErrorMessage error={error as Error} />}

      <div className="card">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`btn ${activeTab === 'gene' ? 'btn-primary' : 'btn-default'}`}
            onClick={() => { setActiveTab('gene'); setAssetType('gene'); setPage(1); }}
          >
            🧬 {t('assets.tabs.gene')}
          </button>
          <button
            className={`btn ${activeTab === 'capsule' ? 'btn-primary' : 'btn-default'}`}
            onClick={() => { setActiveTab('capsule'); setAssetType('capsule'); setPage(1); }}
          >
            💊 {t('assets.tabs.capsule')}
          </button>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('assets.filters.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {activeTab === 'gene' && (
            <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">{t('assets.filters.allCategories')}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        <DataTable
          columns={activeColumns}
          data={(data?.data ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          rowKey="id"
          pagination={
            data
              ? { page, totalPages: data.pagination.totalPages, onPageChange: setPage }
              : undefined
          }
        />
      </div>

      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={t('assets.modal.title', { action: actionModal?.action })}
        footer={
          <div className="modal-footer-actions">
            <button className="btn btn-default" onClick={() => setActionModal(null)}>{t('assets.modal.cancel')}</button>
            <button
              className={`btn ${actionModal?.newStatus === 'quarantined' ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleAction}
              disabled={changeStatus.isPending}
            >
              {changeStatus.isPending ? t('assets.modal.processing') : t('assets.modal.confirm')}
            </button>
          </div>
        }
      >
        {actionModal && (
          <p>
            {t('assets.modal.body', {
              action: actionModal.action,
              assetId: actionModal.asset.assetId,
              newStatus: actionModal.newStatus,
            })}
          </p>
        )}
      </Modal>
    </div>
  );
}
