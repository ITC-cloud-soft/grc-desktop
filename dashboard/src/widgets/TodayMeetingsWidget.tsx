import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

interface Meeting {
  id: string;
  title: string;
  status: string;
}

interface MeetingsResponse {
  data?: Meeting[];
  meetings?: Meeting[];
}

export function TodayMeetingsWidget() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data, isLoading } = useQuery<MeetingsResponse>({
    queryKey: ['meetings', 'today', startOfDay],
    queryFn: () => apiClient.get('/api/v1/admin/a2a/meetings', {
      status: 'scheduled',
      scheduled_after: startOfDay,
      scheduled_before: endOfDay,
      limit: '10',
    }),
    refetchInterval: 60_000,
  });

  const meetings: Meeting[] = data?.data ?? data?.meetings ?? [];

  if (isLoading) return <div className="widget-skeleton" />;

  return (
    <div style={{ padding: 16 }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>今日の会議</h4>
      {meetings.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>予定された会議はありません</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {meetings.slice(0, 5).map((m) => (
            <li key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0', borderBottom: '1px solid var(--color-border, #e2e8f0)',
            }}>
              <span style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 4,
                background: m.status === 'active' ? '#dcfce7' : '#f0f9ff',
                color: m.status === 'active' ? '#166534' : '#1e40af',
              }}>
                {m.status === 'active' ? 'LIVE' : '予定'}
              </span>
              <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.title}
              </span>
              {m.status === 'active' && (
                <Link to={`/meetings/${m.id}/live`} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  background: 'var(--color-primary, #3b82f6)', color: '#fff', textDecoration: 'none',
                }}>
                  参加
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
