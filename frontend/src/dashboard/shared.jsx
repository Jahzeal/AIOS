/* ─── Shared utilities, styles, and components for all dashboard panels ─── */

export const API = async (path, token, opts = {}) => {
  const res = await fetch(path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    alert("Login expired, please login");
    localStorage.clear();
    window.location.href = '/';
    return new Promise(() => {}); // Halt subsequent .then() or await chains
  }
  return res;
};

export const STATUS_COLORS = {
  PENDING:    { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.4)',  text: '#fbbf24' },
  PROCESSING: { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.4)',  text: '#60a5fa' },
  COMPLETED:  { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.4)',  text: '#34d399' },
  FAILED:     { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)',   text: '#f87171' },
  SENT:       { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.4)',  text: '#34d399' },
  GENERATING: { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.4)',  text: '#a78bfa' },
};

/** Shared style tokens used across panels */
export const T = {
  card: {
    background: 'rgba(17,18,25,0.7)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '1.25rem',
    backdropFilter: 'blur(12px)',
  },
  sectionTitle: {
    fontSize: '1rem', fontWeight: 700, color: '#f8fafc',
    marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  th: {
    textAlign: 'left', padding: '0.6rem 1rem', fontSize: '0.72rem',
    fontWeight: 700, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase',
    letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  td: {
    padding: '0.75rem 1rem', fontSize: '0.85rem',
    color: 'rgba(248,250,252,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  label: {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'rgba(248,250,252,0.5)', marginBottom: '0.4rem',
    textTransform: 'uppercase', letterSpacing: '0.3px',
  },
  btn: {
    padding: '0.65rem 1.25rem', borderRadius: 10, border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.87rem',
    fontWeight: 700, transition: 'all 0.2s',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
    color: '#fff', boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.12)', color: '#f87171',
    border: '1px solid rgba(239,68,68,0.25)',
  },
  btnSuccess: {
    background: 'rgba(16,185,129,0.12)', color: '#34d399',
    border: '1px solid rgba(16,185,129,0.25)',
  },
  emptyMsg: {
    textAlign: 'center', color: 'rgba(248,250,252,0.3)',
    padding: '2rem', fontSize: '0.9rem',
  },
};

/** Returns inline styles for a focused/unfocused input or textarea */
export const inputStyle = (focused) => ({
  width: '100%', padding: '0.65rem 1rem', borderRadius: 10,
  border: focused ? '1.5px solid rgba(99,102,241,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
  background: focused ? 'rgba(99,102,241,0.07)' : 'rgba(0,0,0,0.3)',
  color: '#f8fafc', fontSize: '0.88rem', outline: 'none',
  fontFamily: 'inherit', transition: 'all 0.2s', boxSizing: 'border-box',
  boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
});

/** Coloured pill status badge */
export function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || {
    bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8',
  };
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      textTransform: 'uppercase', letterSpacing: '0.4px',
    }}>
      {status}
    </span>
  );
}
