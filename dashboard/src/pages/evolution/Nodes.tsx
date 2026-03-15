import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Modal } from '../../components/Modal';
import { useAdminNodes, useDeleteNode, Node } from '../../api/hooks';

const HOURS_24 = 24 * 60 * 60 * 1000;

function isActive(lastHeartbeat: string | null): boolean {
  if (!lastHeartbeat) return false;
  return Date.now() - new Date(lastHeartbeat).getTime() < HOURS_24;
}

function formatHeartbeat(lastHeartbeat: string | null): string {
  if (!lastHeartbeat) return 'Never';
  const diffMs = Date.now() - new Date(lastHeartbeat).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

interface DeleteTarget {
  nodeId: string;
  displayName?: string;
  employeeName?: string;
  roleId?: string;
  platform?: string;
}

export function Nodes() {
  const { t } = useTranslation('evolution');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data, isLoading, error } = useAdminNodes({ page, page_size: 20 });
  const deleteNode = useDeleteNode();

  const openDeleteModal = (row: Record<string, unknown>) => {
    setDeleteTarget({
      nodeId: row.nodeId as string,
      displayName: row.displayName as string | undefined,
      employeeName: row.employeeName as string | undefined,
      roleId: row.roleId as string | undefined,
      platform: row.platform as string | undefined,
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteNode.mutate(deleteTarget.nodeId, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => {
        // keep modal open on error so user can see the issue
      },
    });
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'nodeId',
      label: t('nodes.table.nodeId'),
      render: (v) => <span className="mono text-sm">{String(v).slice(0, 12)}...</span>,
    },
    { key: 'displayName', label: t('nodes.displayName') },
    {
      key: 'employeeId',
      label: t('nodes.employeeId'),
      render: (v) => v ? <span className="mono text-sm">{String(v)}</span> : <span className="text-muted">-</span>,
    },
    {
      key: 'employeeName',
      label: t('nodes.employee'),
      render: (v) => v ? <span>{String(v)}</span> : <span className="text-muted">-</span>,
    },
    {
      key: 'employeeEmail',
      label: t('nodes.email'),
      render: (v) => v ? <span className="text-sm">{String(v)}</span> : <span className="text-muted">-</span>,
    },
    {
      key: 'platform',
      label: t('nodes.table.platform'),
      render: (v) => {
        if (!v) return <span className="text-muted">-</span>;
        const p = String(v);
        const icon = p.includes('win') ? '\uD83E\uDE9F' : p.includes('mac') ? '\uD83C\uDF4E' : '\uD83D\uDC27';
        return <span>{icon} {p}</span>;
      },
    },
    {
      key: 'winclawVersion',
      label: t('nodes.table.version'),
      render: (v) => v ? <span className="mono">{String(v)}</span> : <span className="text-muted">-</span>,
    },
    {
      key: 'geneCount',
      label: t('nodes.genes'),
      render: (v) => <span className="badge-count">{String(v)}</span>,
    },
    {
      key: 'capsuleCount',
      label: t('nodes.capsules'),
      render: (v) => <span className="badge-count">{String(v)}</span>,
    },
    {
      key: 'lastHeartbeat',
      label: t('nodes.table.lastSeen'),
      render: (v) => {
        const active = isActive(v as string | null);
        return (
          <span className={active ? 'text-success' : 'text-muted'}>
            {formatHeartbeat(v as string | null)}
          </span>
        );
      },
    },
    {
      key: 'nodeStatus',
      label: t('nodes.table.status'),
      render: (_, row) => {
        const active = isActive((row as Record<string, unknown>).lastHeartbeat as string | null);
        return <StatusBadge status={active ? 'Active' : 'Inactive'} />;
      },
    },
    {
      key: 'createdAt',
      label: t('nodes.registered'),
      render: (v) => new Date(String(v)).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <button
          className="btn btn-sm btn-danger"
          onClick={(e) => { e.stopPropagation(); openDeleteModal(row as Record<string, unknown>); }}
          title={t('nodes.delete.button')}
        >
          {t('nodes.delete.button')}
        </button>
      ),
    },
  ];

  const activeCount = (data?.data ?? []).filter((n) => {
    const node = n as unknown as Node;
    return isActive(node.lastHeartbeat);
  }).length;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('nodes.title')}</h1>
        <p className="page-subtitle">
          {t('nodes.subtitle')}
          {data && (
            <span className="page-subtitle-extra">
              {' \u2014 '}{t('nodes.activeOf', { active: activeCount, total: data.pagination.total })}
            </span>
          )}
        </p>
      </div>

      {error && <ErrorMessage error={error as Error} />}

      <div className="card">
        <DataTable
          columns={columns}
          data={(data?.data ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          rowKey="id"
          pagination={
            data
              ? { page, totalPages: data.pagination.totalPages, onPageChange: setPage }
              : undefined
          }
          emptyMessage={t('nodes.noNodes')}
        />
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleteNode.isPending && setDeleteTarget(null)}
        title={t('nodes.delete.title')}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteNode.isPending}
            >
              {t('nodes.delete.cancel')}
            </button>
            <button
              className="btn btn-danger"
              onClick={confirmDelete}
              disabled={deleteNode.isPending}
            >
              {deleteNode.isPending ? t('nodes.delete.buttonDeleting') : t('nodes.delete.button')}
            </button>
          </div>
        }
      >
        {deleteTarget && (
          <div>
            <div style={{
              background: 'var(--color-danger-bg, #fef2f2)',
              border: '1px solid var(--color-danger-border, #fecaca)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <span style={{ fontSize: '24px', lineHeight: 1 }}>&#9888;</span>
              <div>
                <strong style={{ color: 'var(--color-danger, #dc2626)' }}>
                  {t('nodes.delete.warningTitle')}
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-secondary, #6b7280)' }}>
                  {t('nodes.delete.warningDescription')}
                </p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 12px 6px 0', color: 'var(--color-text-secondary, #6b7280)', whiteSpace: 'nowrap' }}>{t('nodes.delete.nodeId')}</td>
                  <td style={{ padding: '6px 0' }}>
                    <code style={{ fontSize: '12px', background: 'var(--color-bg-secondary, #f3f4f6)', padding: '2px 6px', borderRadius: '4px' }}>
                      {deleteTarget.nodeId}
                    </code>
                  </td>
                </tr>
                {deleteTarget.displayName && (
                  <tr>
                    <td style={{ padding: '6px 12px 6px 0', color: 'var(--color-text-secondary, #6b7280)' }}>{t('nodes.delete.displayName')}</td>
                    <td style={{ padding: '6px 0' }}>{deleteTarget.displayName}</td>
                  </tr>
                )}
                {deleteTarget.employeeName && (
                  <tr>
                    <td style={{ padding: '6px 12px 6px 0', color: 'var(--color-text-secondary, #6b7280)' }}>{t('nodes.delete.employee')}</td>
                    <td style={{ padding: '6px 0' }}>{deleteTarget.employeeName}</td>
                  </tr>
                )}
                {deleteTarget.roleId && (
                  <tr>
                    <td style={{ padding: '6px 12px 6px 0', color: 'var(--color-text-secondary, #6b7280)' }}>{t('nodes.delete.role')}</td>
                    <td style={{ padding: '6px 0' }}>
                      <StatusBadge status={deleteTarget.roleId} />
                    </td>
                  </tr>
                )}
                {deleteTarget.platform && (
                  <tr>
                    <td style={{ padding: '6px 12px 6px 0', color: 'var(--color-text-secondary, #6b7280)' }}>{t('nodes.delete.platform')}</td>
                    <td style={{ padding: '6px 0' }}>{deleteTarget.platform}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {deleteNode.isError && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '13px',
              }}>
                {t('nodes.delete.failedToDelete', { error: (deleteNode.error as Error)?.message ?? 'Unknown error' })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
