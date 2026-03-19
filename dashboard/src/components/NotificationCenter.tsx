import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommunityFeed, useCommunityUnreadCount, useMarkCommunityRead } from '../api/hooks';

// ── helpers ──────────────────────────────────────────────────────────────────

function postTypeColor(type: string): string {
  switch (type) {
    case 'problem':   return 'var(--color-danger)';
    case 'solution':  return 'var(--color-success)';
    case 'alert':     return 'var(--color-warning)';
    case 'evolution': return 'var(--color-info)';
    default:          return 'var(--color-text-muted)';
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── component ─────────────────────────────────────────────────────────────────

export function NotificationCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const feed = useCommunityFeed({ sort: 'new', limit: 8 });
  const unread = useCommunityUnreadCount();
  const markRead = useMarkCommunityRead();

  const unreadCount = unread.data?.unreadCount ?? 0;
  const posts = feed.data?.data ?? [];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
  }

  function handleMarkRead() {
    markRead.mutate(undefined);
  }

  function handleNavigateToPost(postId: string) {
    setOpen(false);
    navigate(`/community/topics/${postId}`);
  }

  function handleViewAll() {
    setOpen(false);
    navigate('/community/topics');
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        title="Community notifications"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: 'var(--radius-md)',
          color: open ? 'var(--color-primary)' : 'var(--color-sidebar-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color var(--transition), background var(--transition)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'none';
        }}
      >
        {/* Bell SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            minWidth: '16px',
            height: '16px',
            background: 'var(--color-danger)',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
            pointerEvents: 'none',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          width: '320px',
          background: 'var(--color-content-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text)' }}>
              Community Updates
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkRead}
                disabled={markRead.isPending}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Post list */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {feed.isLoading && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                Loading...
              </div>
            )}

            {!feed.isLoading && posts.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No recent posts
              </div>
            )}

            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => handleNavigateToPost(post.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border-light)',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  transition: 'background var(--transition)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-light)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: postTypeColor(post.postType),
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: postTypeColor(post.postType),
                    textTransform: 'capitalize',
                  }}>
                    {post.postType}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                    {relativeTime(post.createdAt)}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {post.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'} &middot; score {post.score.toFixed(1)}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <button
              onClick={handleViewAll}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--color-primary)',
                fontWeight: 600,
              }}
            >
              View all community posts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
