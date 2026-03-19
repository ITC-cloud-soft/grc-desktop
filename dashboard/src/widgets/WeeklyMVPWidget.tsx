import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface MVPRanking {
  nodeId?: string;
  employeeName?: string;
  roleId?: string;
  score?: number;
  tasksCompleted?: number;
}

interface WeeklyMVPResponse {
  rankings?: MVPRanking[];
}

export function WeeklyMVPWidget() {
  const { data, isLoading } = useQuery<WeeklyMVPResponse>({
    queryKey: ['admin', 'weekly-mvp'],
    queryFn: () => apiClient.get('/api/v1/admin/evolution/weekly-mvp'),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="widget-skeleton" />;

  const rankings = data?.rankings ?? [];

  return (
    <div style={{ padding: 16 }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>週間MVP</h4>
      {rankings.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>データなし</p>
      ) : (
        <ol style={{ padding: '0 0 0 20px', margin: 0 }}>
          {rankings.slice(0, 5).map((r, i) => (
            <li key={r.nodeId ?? i} style={{ padding: '4px 0', fontSize: 13 }}>
              <span style={{ fontWeight: i === 0 ? 700 : 400 }}>
                {r.employeeName ?? r.roleId ?? 'Unknown'}
              </span>
              <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>
                {r.score ?? r.tasksCompleted ?? 0}pt
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
