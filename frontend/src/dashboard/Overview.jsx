import { Zap, Mail, BarChart3, Users, TrendingUp } from 'lucide-react';
import { T, StatusBadge } from './shared.jsx';

export default function Overview({ jobs, leads, emailStats, googleConnection, onNavigate }) {
  return (
    <>
      {/* Google Calendar Connection Reminder Banner */}
      {(!googleConnection || !googleConnection.connected) && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(217,70,239,0.06) 100%)',
          border: '1px solid rgba(99,102,241,0.22)',
          borderRadius: 16,
          padding: '1.2rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          animation: 'slideIn 0.3s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #d946ef)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>
              📅
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.3px' }}>
                Connect Your Google Calendar
              </h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(248,250,252,0.45)', lineHeight: 1.4 }}>
                Synchronize bookings, track scheduled meetings automatically on your dashboard, and stop relying on Zapier.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            style={{
              padding: '0.55rem 1.1rem', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
              color: '#fff', fontSize: '0.8rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.25s ease',
              boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)'; }}
          >
            Connect Calendar
          </button>
        </div>
      )}
      {/* Stat cards */}
      <div className="overview-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Leads',       val: leads.length,                                                                   Icon: Users,    color: '#6366f1' },
          { label: 'Emails Sent Today', val: emailStats.sentToday,                                                           Icon: Mail,     color: '#10b981' },
          { label: 'Daily Cap',         val: `${emailStats.sentToday}/${emailStats.dailyCap}`,                               Icon: BarChart3, color: '#f59e0b' },
          { label: 'Active Jobs',       val: jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length,  Icon: Zap,      color: '#d946ef' },
        ].map(({ label, val, Icon, color }) => (
          <div key={label} style={{ ...T.card, borderTop: `2px solid ${color}` }}>
            <div style={{ marginBottom: '0.5rem', color }}><Icon size={22} /></div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.45)', marginTop: '0.25rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent jobs + outreach summary */}
      <div className="overview-panels-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={T.card}>
          <div style={T.sectionTitle}><Zap size={16} />Recent Jobs</div>
          {jobs.slice(0, 5).map(j => (
            <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>{j.query || 'URL List'}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)' }}>{j.location || ''}</div>
              </div>
              <StatusBadge status={j.status} />
            </div>
          ))}
          {jobs.length === 0 && <div style={T.emptyMsg}>No jobs yet</div>}
        </div>

        <div style={T.card}>
          <div style={T.sectionTitle}><TrendingUp size={16} />Outreach Summary</div>
          {[
            ['Sent',       leads.filter(l => l.emailStatus === 'SENT').length,       '#34d399'],
            ['Pending',    leads.filter(l => l.emailStatus === 'PENDING').length,    '#fbbf24'],
            ['Generating', leads.filter(l => l.emailStatus === 'GENERATING').length, '#a78bfa'],
            ['Failed',     leads.filter(l => l.emailStatus === 'FAILED').length,     '#f87171'],
          ].map(([label, count, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '0.85rem', color: 'rgba(248,250,252,0.7)' }}>{label}</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
