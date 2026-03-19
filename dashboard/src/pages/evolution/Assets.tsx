import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useAdminAssets, useChangeAssetStatus, Asset } from '../../api/hooks';
import { useUser } from '../../context/UserContext';

const ASSET_TYPES = ['gene', 'capsule'];
const STATUSES = ['pending', 'approved', 'promoted', 'quarantined', 'rejected'];
const CATEGORIES = ['reasoning', 'coding', 'data', 'communication', 'research', 'creative', 'other'];

export function Assets() {
  const { t } = useTranslation('evolution');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [assetType, setAssetType] = useState('');
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

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'id',
      label: t('assets.table.assetId'),
      render: (v) => (
        <a
          href={`/evolution/assets/${String(v)}`}
          onClick={(e) => { e.preventDefault(); navigate(`/evolution/assets/${String(v)}`); }}
          className="mono text-sm link"
        >
          {String(v).slice(0, 12)}...
        </a>
      ),
    },
    {
      key: 'assetType',
      label: t('assets.table.type'),
      render: (v) => (
        <StatusBadge
          status={String(v)}
          variant={v === 'gene' ? 'info' : 'default'}
        />
      ),
    },
    {
      key: 'assetId',
      label: t('assets.table.assetRef'),
      render: (v, row) => {
        const a = row as unknown as Asset;
        return (
          <div>
            <a
              href={`/evolution/assets/${a.id}`}
              onClick={(e) => { e.preventDefault(); navigate(`/evolution/assets/${a.id}`); }}
              className="mono text-sm link"
              title={String(v)}
            >
              {String(v).length > 20 ? `${String(v).slice(0, 20)}...` : String(v)}
            </a>
            {a.assetType === 'capsule' && a.geneAssetId && (
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                → {a.geneAssetId}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'category',
      label: t('assets.table.category'),
      render: (v) => v ? <StatusBadge status={String(v)} variant="default" /> : <span className="text-muted">—</span>,
    },
    {
      key: 'status',
      label: t('assets.table.status'),
      render: (v) => <StatusBadge status={String(v)} />,
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
    {
      key: 'safetyScore',
      label: t('assets.table.safety'),
      render: (v) => {
        if (v === null || v === undefined) return <span className="text-muted">—</span>;
        const score = Number(v);
        return (
          <div className="score-bar-wrapper">
            <div className="score-bar">
              <div
                className="score-bar-fill"
                style={{
                  width: `${score * 100}%`,
                  background: score >= 0.8 ? '#06d6a0' : score >= 0.5 ? '#ffbe0b' : '#ff006e',
                }}
              />
            </div>
            <span className="score-label">{(score * 100).toFixed(0)}</span>
          </div>
        );
      },
    },
    {
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
    },
  ];

  async function handleAction() {
    if (!actionModal) return;
    await changeStatus.mutateAsync({ assetId: actionModal.asset.id, status: actionModal.newStatus });
    setActionModal(null);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('assets.title')}</h1>
        <p className="page-subtitle">{t('assets.subtitle')}</p>
      </div>

      {error && <ErrorMessage error={error as Error} />}

      <div className="card">
        <div className="filter-bar">
          <select className="select" value={assetType} onChange={(e) => { setAssetType(e.target.value); setPage(1); }}>
            <option value="">{t('assets.filters.allTypes')}</option>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('assets.filters.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">{t('assets.filters.allCategories')}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <DataTable
          columns={isAdmin ? columns : columns.filter(c => c.label !== t('assets.table.actions'))}
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
