import { useTaskStats } from '../api/hooks';

interface StatusBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function StatusBar({ label, count, total, color }: StatusBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: 'var(--color-text-secondary)' }}>
        <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{label}</span>
        <span>{count} ({pct}%)</span>
      </div>
      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  open: '#4361ee',
  in_progress: '#ffbe0b',
  review: '#3a86ff',
  done: '#06d6a0',
  cancelled: '#94a3b8',
};

interface TaskSummaryWidgetProps {
  title?: string;
}

export function TaskSummaryWidget({ title = 'Task Summary' }: TaskSummaryWidgetProps) {
  const { data, isLoading, error } = useTaskStats();

  if (isLoading) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="chart-title">{title}</div>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div className="skeleton skeleton-text" style={{ width: '50%', marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 6, borderRadius: 3 }} />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="chart-title">{title}</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No task data available.</p>
      </div>
    );
  }

  const total = data.total;
  const statusEntries = Object.entries(data.byStatus);

  return (
    <div className="card" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div className="chart-title" style={{ marginBottom: 0 }}>{title}</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>total tasks</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {statusEntries.map(([status, count]) => (
          <StatusBar
            key={status}
            label={status.replace(/_/g, ' ')}
            count={count}
            total={total}
            color={STATUS_COLORS[status] ?? '#8338ec'}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)' }}>
            {data.completionRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>completion rate</div>
        </div>
        {data.pendingExpenses > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-warning)' }}>
              {data.pendingExpenses}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>pending expenses</div>
          </div>
        )}
        {data.avgCompletionDays > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-info)' }}>
              {data.avgCompletionDays.toFixed(1)}d
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>avg completion</div>
          </div>
        )}
      </div>
    </div>
  );
}
