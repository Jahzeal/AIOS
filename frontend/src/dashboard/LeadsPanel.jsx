import { useState, Fragment } from 'react';
import { FolderOpen, Send, X, ChevronRight, ChevronDown } from 'lucide-react';
import { API, T, StatusBadge } from './shared.jsx';

export default function LeadsPanel({ token, leads, jobs, leadFilterJobId, setLeadFilterJobId, onNotify, onRefresh, isOutreach }) {
  const sendEmail = async (leadId) => {
    const res = await API(`/api/email/send/${leadId}`, token, { method: 'POST' });
    if (res.ok) { onNotify('✅ Email sent successfully'); onRefresh(); }
    else { const e = await res.json(); onNotify(`❌ ${e.message}`); }
  };

  const [selectedSentLead, setSelectedSentLead] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (leadId, e) => {
    e.stopPropagation();
    setExpandedRows(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  const getTargetTitle = (l) => {
    const job = jobs?.find(j => j.id === l.jobId);
    if (job?.keywords && job.keywords.trim()) {
      return job.keywords.split(',')[0].trim();
    }
    return "decision maker";
  };

  const filteredLeads = leadFilterJobId
    ? leads.filter(l => l.jobId === leadFilterJobId)
    : leads;

  const filteredJob = leadFilterJobId && jobs
    ? jobs.find(j => j.id === leadFilterJobId)
    : null;

  return (
    <div style={T.card}>
      <div style={T.sectionTitle}>
        <FolderOpen size={16} />{isOutreach ? 'Outreach Campaigns' : 'Leads Database'} — {filteredLeads.length} leads
      </div>
      <p style={{ fontSize: '0.8rem', color: 'rgba(248, 250, 252, 0.45)', lineHeight: '1.4', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
        {isOutreach 
          ? "Monitor and reply to sent cold email campaigns. Select an outreach prospect on the left to view the interactive message thread."
          : "Browse and review all scraped company contacts. Expand any row to see enriched decision-maker names, roles, and personal email addresses."}
      </p>

      {filteredJob && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.6rem 1rem', background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)', borderRadius: '8px',
          marginBottom: '1rem', fontSize: '0.85rem', color: '#f8fafc'
        }}>
          <span>
            Showing leads for job: <strong>{filteredJob.query || 'URL List'}</strong> 
            {filteredJob.location && <> in <strong>{filteredJob.location}</strong></>}
          </span>
          <button 
            onClick={() => setLeadFilterJobId(null)}
            style={{
              background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            Clear Filter <X size={14} />
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: '40px', paddingRight: 0 }}></th>
              <th style={T.th}>Company</th>
              <th style={T.th}>Number</th>
              <th style={T.th}>Email</th>
              <th style={T.th}>Status</th>
              <th style={T.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.slice(0, 100).map(l => {
              const hasContacts = l.contacts && l.contacts.length > 0;
              const isExpanded = !!expandedRows[l.id];

              return (
                <Fragment key={l.id}>
                  <tr 
                    onClick={() => {
                      if (l.emailStatus === 'SENT') {
                        setSelectedSentLead(l);
                      }
                    }}
                    style={{
                      cursor: l.emailStatus === 'SENT' ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease',
                      borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.04)'
                    }}
                    title={l.emailStatus === 'SENT' ? 'Click to view sent message' : ''}
                  >
                    <td style={{ ...T.td, paddingRight: 0, width: '40px', verticalAlign: 'middle' }}>
                      {hasContacts && (
                        <button
                          onClick={(e) => toggleRow(l.id, e)}
                          style={{
                            background: 'none', border: 'none', color: 'rgba(248, 250, 252, 0.4)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px',
                            transition: 'all 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none',
                            outline: 'none'
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </td>
                    <td style={T.td}>
                      {l.website ? (
                        <a href={l.website} target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 700, borderBottom: '1px dotted rgba(255,255,255,0.2)' }}
                          title="Click to visit website"
                        >
                          {l.companyName || '—'}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 700 }}>{l.companyName || '—'}</span>
                      )}
                    </td>
                    <td style={T.td}>
                      {l.contacts?.[0]?.phone ? (
                        <>
                          <div>{l.contacts[0].phone}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(99, 102, 241, 0.75)', fontWeight: 600, marginTop: '2px' }}>
                            Direct ({l.contacts[0].name.split(' ')[0]})
                          </div>
                        </>
                      ) : l.phone ? (
                        <>
                          <div>{l.phone}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(239, 68, 68, 0.65)', fontWeight: 500, marginTop: '2px' }}>
                            ⚠️ No {getTargetTitle(l)} found (using company phone)
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={T.td}>
                      {l.contacts?.[0]?.email ? (
                        <>
                          <div>{l.contacts[0].email}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(99, 102, 241, 0.75)', fontWeight: 600, marginTop: '2px' }}>
                            Direct ({l.contacts[0].name.split(' ')[0]})
                          </div>
                        </>
                      ) : l.email ? (
                        <>
                          <div>{l.email}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(239, 68, 68, 0.65)', fontWeight: 500, marginTop: '2px' }}>
                            ⚠️ No {getTargetTitle(l)} found (using company email)
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={T.td}><StatusBadge status={l.emailStatus || 'PENDING'} /></td>
                    <td style={T.td}>
                      {l.emailStatus === 'PENDING' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendEmail(l.id);
                          }}
                          style={{ ...T.btn, ...T.btnPrimary, padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Send size={13} />Send
                        </button>
                      ) : (l.emailStatus === 'SENT' || l.emailStatus === 'REPLIED') ? (
                        <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ✓ Sent
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'rgba(248, 250, 252, 0.25)' }}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasContacts && (
                    <tr style={{ background: 'rgba(99, 102, 241, 0.02)' }}>
                      <td colSpan={6} style={{ padding: '0.75rem 1.25rem 1.25rem 2.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.2rem' }}>
                            Targeted Decision Makers ({l.contacts.length})
                          </div>
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {l.contacts.map(c => (
                              <div 
                                key={c.id} 
                                style={{ 
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                  padding: '0.5rem 0.85rem', background: 'rgba(0, 0, 0, 0.15)', 
                                  borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' 
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>{c.name || 'Unknown'}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(248, 250, 252, 0.45)', marginTop: '2px' }}>{c.role || 'Decision Maker'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>{c.email || '—'}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(248, 250, 252, 0.45)', marginTop: '2px' }}>
                                      {c.phone ? `Phone: ${c.phone}` : 'No direct phone'}
                                    </div>
                                    {c.linkedin && (
                                      <a 
                                        href={c.linkedin} target="_blank" rel="noreferrer" 
                                        onClick={e => e.stopPropagation()}
                                        style={{ fontSize: '0.68rem', color: '#818cf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', marginTop: '4px' }}
                                      >
                                        LinkedIn Profile
                                      </a>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  {c.emailStatus === 'PENDING' || !c.emailStatus ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sendEmail(l.id);
                                      }}
                                      style={{ ...T.btn, ...T.btnPrimary, padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                    >
                                      <Send size={11} />Send Pitch
                                    </button>
                                  ) : (c.emailStatus === 'SENT' || c.emailStatus === 'REPLIED') ? (
                                    <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      ✓ Sent
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(248, 250, 252, 0.35)', textTransform: 'uppercase', fontWeight: 600 }}>
                                      {c.emailStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredLeads.length === 0 && <div style={T.emptyMsg}>No leads yet. Run a discovery job first.</div>}
      </div>

      {/* Sent Message Detail Modal */}
      {selectedSentLead && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
          <div style={{
            background: '#0d0f1a', border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px', padding: '1.75rem', maxWidth: '600px', width: '100%',
            color: '#f8fafc', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            animation: 'slideIn 0.2s ease-out'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setSelectedSentLead(null)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'none', border: 'none', color: 'rgba(248, 250, 252, 0.5)',
                cursor: 'pointer', padding: '4px'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#a5b4fc' }}>
              Sent Message to {selectedSentLead.companyName || 'Lead'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'rgba(248,250,252,0.4)', fontWeight: 600 }}>Recipient Email:</span>
                <div style={{ color: '#f8fafc', marginTop: '2px', fontWeight: 500 }}>{selectedSentLead.email}</div>
              </div>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                <span style={{ color: 'rgba(248,250,252,0.4)', fontWeight: 600 }}>Subject:</span>
                <div style={{ color: '#f8fafc', marginTop: '2px', fontWeight: 700 }}>{selectedSentLead.emailSubject || '(No Subject)'}</div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                <span style={{ color: 'rgba(248,250,252,0.4)', fontWeight: 600 }}>Message Body:</span>
                <div style={{ 
                  color: 'rgba(248,250,252,0.85)', marginTop: '6px', 
                  background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.04)', maxHeight: '300px', 
                  overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                  fontFamily: 'inherit'
                }}>
                  {selectedSentLead.emailBody || '(No Body Content)'}
                </div>
              </div>

              {selectedSentLead.sentAt && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)' }}>
                  Sent at: {new Date(selectedSentLead.sentAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
