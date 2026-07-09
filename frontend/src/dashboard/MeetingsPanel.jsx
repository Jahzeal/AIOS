import { Calendar, ExternalLink } from 'lucide-react';
import { T } from './shared.jsx';

export default function MeetingsPanel({ meetings }) {
  return (
    <div style={T.card}>
      <div style={T.sectionTitle}>
        <Calendar size={16} />Upcoming Meetings — {meetings.length}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={T.th}>Title</th>
              <th style={T.th}>Email</th>
              <th style={T.th}>Scheduled</th>
              <th style={T.th}>Salesperson</th>
              <th style={T.th}>Status</th>
              <th style={T.th}>Google Event ID</th>
              <th style={T.th}>Link</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map(m => (
              <tr key={m.id}>
                <td style={T.td}>{m.title}</td>
                <td style={T.td}>{m.email}</td>
                <td style={T.td}>{new Date(m.scheduledAt).toLocaleString()}</td>
                <td style={T.td}>{m.lead?.job?.user?.username || m.lead?.job?.user?.email || 'N/A'}</td>
                <td style={T.td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                    background: m.status === 'confirmed' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    border: `1px solid ${m.status === 'confirmed' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: m.status === 'confirmed' ? '#34d399' : '#f87171',
                  }}>
                    {m.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                  </span>
                </td>
                <td style={T.td}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(248,250,252,0.4)' }}>
                    {m.googleEventId ? `${m.googleEventId.substring(0, 10)}...` : 'Direct'}
                  </span>
                </td>
                <td style={T.td}>
                  {m.meetingLink ? (
                    <a href={m.meetingLink} target="_blank" rel="noreferrer"
                      style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ExternalLink size={13} />Join
                    </a>
                  ) : (
                    <span style={{ color: 'rgba(248,250,252,0.25)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meetings.length === 0 && <div style={T.emptyMsg}>No meetings booked yet.</div>}
    </div>
  );
}
