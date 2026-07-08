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
              <th style={T.th}>Link</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map(m => (
              <tr key={m.id}>
                <td style={T.td}>{m.title}</td>
                <td style={T.td}>{m.email}</td>
                <td style={T.td}>{new Date(m.scheduledAt).toLocaleString()}</td>
                <td style={T.td}>
                  <a href={m.meetingLink} target="_blank" rel="noreferrer"
                    style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ExternalLink size={13} />Join
                  </a>
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
