import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Task, PaginatedResponse } from '../api/hooks';

/**
 * Compute how long ago a date was in a human-readable form.
 */
function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STALE_HOURS = 72;

export function ReviewTasksWidget() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<PaginatedResponse<Task>>({
    queryKey: ['admin', 'tasks', { status: 'review', page_size: 10 }],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Task>>('/api/v1/admin/tasks', {
        status: 'review',
        page_size: 10,
      } as Record<string, string | number | boolean | undefined>),
    staleTime: 60_000,
  });

  const title = 'Review Tasks';

  if (isLoading) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="chart-title">{title}</div>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 4 }} />
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="chart-title">{title}</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          No review task data available.
        </p>
      </div>
    );
  }

  const tasks = data.data;

  return (
    <div className="card" style={{ height: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div className="chart-title" style={{ marginBottom: 0 }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: tasks.length > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
          }}
        >
          {tasks.length} pending
        </div>
      </div>

      {tasks.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
          No tasks currently in review.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((task) => {
            const diffMs = Date.now() - new Date(task.updatedAt).getTime();
            const hoursInReview = diffMs / (1000 * 60 * 60);
            const isStale = hoursInReview >= STALE_HOURS;

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-light)',
                  cursor: 'pointer',
                  transition: 'background var(--transition)',
                  background: isStale
                    ? 'rgba(251, 86, 7, 0.06)'
                    : 'transparent',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = 'var(--color-bg)')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = isStale
                    ? 'rgba(251, 86, 7, 0.06)'
                    : 'transparent')
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  {isStale && (
                    <span title="In review for over 72 hours" style={{ fontSize: 14 }}>
                      {'\u26A0\uFE0F'}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {task.taskCode}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {task.title}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span>{task.assignedRoleId || 'unassigned'}</span>
                  <span>{timeAgo(task.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
