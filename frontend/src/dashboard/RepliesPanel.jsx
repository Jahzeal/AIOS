import { MessageSquare } from 'lucide-react';
import { T, StatusBadge } from './shared.jsx';

export default function RepliesPanel({ replies, onViewReplyLead }) {
  return (
    <div style={T.card}>
      <div style={T.sectionTitle}>
        <MessageSquare size={16} />Received Replies — {replies.length}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="replies-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={T.th}>From</th>
              <th style={T.th}>Subject</th>
              <th style={T.th}>Date</th>
              <th style={T.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {replies.map(r => (
              <tr 
                key={r.id}
                onClick={() => r.leadId && onViewReplyLead(r.leadId)}
                style={{
                  cursor: r.leadId ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease'
                }}
                title={r.leadId ? 'Click to view email thread conversation' : ''}
              >
                <td style={T.td} data-label="From">{r.from}</td>
                <td style={T.td} data-label="Subject">{r.subject}</td>
                <td style={T.td} data-label="Date">{new Date(r.receivedAt).toLocaleDateString()}</td>
                <td style={T.td} data-label="Status"><StatusBadge status={r.draftedReplyStatus || 'DRAFTED'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {replies.length === 0 && <div style={T.emptyMsg}>No replies received yet.</div>}
    </div>
  );
}
