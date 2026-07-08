import { Zap, Mail, BarChart3, Users, TrendingUp } from 'lucide-react';
import { T, StatusBadge } from './shared.jsx';

export default function Overview({ jobs, leads, emailStats }) {
  return (
    <>
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
