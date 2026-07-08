import { useState, useEffect } from 'react';
import { Mail, ExternalLink, X, ArrowLeft } from 'lucide-react';
import { T, API } from './shared.jsx';

export default function OutreachPanel({ leads, selectedLeadId, setSelectedLeadId, token, onLoadAll }) {
  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;
  const setSelectedLead = (lead) => setSelectedLeadId(lead ? lead.id : null);

  // Filter only leads where outreach has been sent
  const contactedLeads = leads.filter(l => l.emailStatus === 'SENT' || l.emailStatus === 'REPLIED');

  if (contactedLeads.length === 0) {
    return (
      <div style={T.card}>
        <div style={{ ...T.emptyMsg, padding: '4rem 2rem' }}>
          <Mail size={40} style={{ color: 'rgba(248, 250, 252, 0.2)', marginBottom: '1rem' }} />
          <div>No outreach campaigns sent yet.</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)', marginTop: '0.25rem' }}>
            Run a discovery job and send emails to start campaigns.
          </div>
        </div>
      </div>
    );
  }

  // Construct message thread for selected lead
  let allMessages = [];
  if (selectedLead) {
    const initialMsg = {
      id: 'initial',
      type: 'sent',
      subject: selectedLead.emailSubject || 'Exclusive Offer from AIOS',
      body: selectedLead.emailBody || '',
      date: new Date(selectedLead.sentAt || selectedLead.createdAt)
    };

    const replies = (selectedLead.receivedEmails || []).map(r => [
      {
        id: r.id,
        type: 'received',
        from: r.from,
        subject: r.subject,
        body: r.bodyText || r.bodyHtml || '',
        date: new Date(r.receivedAt)
      },
      ...(r.draftedReplyBody && r.draftedReplyStatus === 'SENT' ? [{
        id: `${r.id}-reply`,
        type: 'sent',
        subject: r.draftedReplySubject || `Re: ${r.subject}`,
        body: r.draftedReplyBody,
        date: new Date(r.updatedAt || r.receivedAt)
      }] : [])
    ]).flat();

    allMessages = [initialMsg, ...replies].sort((a, b) => a.date - b.date);
  }

  const pendingReply = selectedLead 
    ? (selectedLead.receivedEmails || []).find(r => r.draftedReplyStatus === 'DRAFTED') 
    : null;

  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (pendingReply) {
      setDraftSubject(pendingReply.draftedReplySubject || `Re: ${pendingReply.subject}`);
      setDraftBody(pendingReply.draftedReplyBody || '');
      setIsEditing(false);
      setErrorMsg('');
    } else {
      setDraftSubject('');
      setDraftBody('');
      setIsEditing(false);
      setErrorMsg('');
    }
  }, [pendingReply]);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await API(`/api/email/replies/${pendingReply.id}/draft`, token, {
        method: 'PUT',
        body: JSON.stringify({ subject: draftSubject, body: draftBody })
      });
      if (res.ok) {
        setIsEditing(false);
        if (onLoadAll) await onLoadAll();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to save draft');
      }
    } catch {
      setErrorMsg('Network error saving draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReply = async () => {
    setIsSending(true);
    setErrorMsg('');
    try {
      const res = await API(`/api/email/replies/${pendingReply.id}/send`, token, {
        method: 'POST'
      });
      if (res.ok) {
        if (onLoadAll) await onLoadAll();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to send reply');
      }
    } catch {
      setErrorMsg('Network error sending reply');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`inbox-layout ${selectedLead ? 'chat-open' : ''}`}>
      {/* Left Sidebar - Sent Campaigns List */}
      <div className="inbox-list">
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
          Outreach Sent ({contactedLeads.length})
        </div>
        <div className="reply-cards-container">
          {contactedLeads.map(l => (
            <div 
              key={l.id} 
              onClick={() => setSelectedLead(l)}
              className={`reply-card ${selectedLead?.id === l.id ? 'active' : ''}`}
            >
              <div className="reply-card-header">
                <span className="reply-sender">{l.companyName || 'Unknown Lead'}</span>
                <span className="reply-card-time">
                  {l.sentAt ? new Date(l.sentAt).toLocaleDateString() : ''}
                </span>
              </div>
              <div className="reply-card-subject">{l.emailSubject || '(No Subject)'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Section - Chat Box Conversation Thread */}
      {selectedLead ? (
        <div className="inbox-details">
          <div className="thread-detail-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="thread-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem', marginBottom: '1rem', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="show-on-mobile"
                  style={{
                    display: 'none',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#f8fafc',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0,
                    flexShrink: 0
                  }}
                  title="Back to list"
                >
                  <ArrowLeft size={18} />
                </button>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead.companyName}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Recipient: <a href={`mailto:${selectedLead.email}`} style={{ color: '#818cf8', textDecoration: 'none' }}>{selectedLead.email}</a>
                  </div>
                </div>
              </div>
              <a 
                href={selectedLead.website} 
                target="_blank" 
                rel="noreferrer" 
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: '#a5b4fc',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  flexShrink: 0
                }}
                title="Open Website"
              >
                <ExternalLink size={16} />
              </a>
            </div>

            <div className="thread-messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '4px', minHeight: '350px' }}>
              {allMessages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`thread-message ${msg.type}`}
                  style={{
                    alignSelf: msg.type === 'sent' ? 'flex-end' : 'flex-start',
                    background: msg.type === 'sent' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid ' + (msg.type === 'sent' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.06)'),
                    borderRadius: '12px',
                    padding: '12px 16px',
                    maxWidth: '85%',
                    lineHeight: '1.5',
                    fontSize: '0.85rem',
                    color: '#f8fafc'
                  }}
                >
                  <div className="message-header" style={{ fontSize: '0.7rem', color: 'rgba(248, 250, 252, 0.45)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {msg.type === 'sent' ? 'AI Sales Lead' : 'Lead Reply'} • {msg.date.toLocaleString()}
                  </div>
                  <div className="message-body">
                    <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: msg.type === 'sent' ? '#a5b4fc' : '#f8fafc' }}>Subject: {msg.subject}</div>
                    <div dangerouslySetInnerHTML={{ __html: msg.body }} />
                  </div>
                </div>
              ))}
            </div>

            {pendingReply ? (
              <div className="draft-editor-box" style={{ marginTop: '1.5rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 700 }}>
                    AI Generated Reply Draft (Review Required)
                  </div>
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                    >
                      Edit Draft
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', marginBottom: '4px', fontWeight: 600 }}>Subject</label>
                      <input 
                        type="text" 
                        value={draftSubject}
                        onChange={(e) => setDraftSubject(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(248,250,252,0.4)', marginBottom: '4px', fontWeight: 600 }}>Body (HTML allowed)</label>
                      <textarea 
                        rows={6}
                        value={draftBody}
                        onChange={(e) => setDraftBody(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    {errorMsg && <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>{errorMsg}</div>}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button 
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        style={{ padding: '7px 14px', borderRadius: '6px', background: '#4f46e5', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {isSaving ? 'Saving...' : 'Save Draft'}
                      </button>
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          setDraftSubject(pendingReply.draftedReplySubject || `Re: ${pendingReply.subject}`);
                          setDraftBody(pendingReply.draftedReplyBody || '');
                        }}
                        style={{ padding: '7px 14px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>Subject: {draftSubject}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.85)', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: draftBody }} />
                    </div>
                    {errorMsg && <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>{errorMsg}</div>}
                    <div>
                      <button 
                        onClick={handleSendReply}
                        disabled={isSending}
                        style={{
                          width: '100%', padding: '10px 0', borderRadius: '8px', border: 'none',
                          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                          color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                        }}
                      >
                        {isSending ? 'Sending Reply...' : 'Send AI Draft Response'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="draft-editor-box" style={{ marginTop: '1.5rem', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.5)', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Outreach Status: <span style={{ color: '#34d399', fontWeight: 700 }}>COMPLETED & ACTIVE</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(248,250,252,0.35)', lineHeight: '1.4' }}>
                  Any subsequent email replies from the customer will appear in this thread automatically.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="inbox-details" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '450px' }}>
          <div style={{ color: 'rgba(248,250,252,0.35)', textAlign: 'center' }}>
            <Mail size={40} style={{ color: 'rgba(248, 250, 252, 0.15)', marginBottom: '1rem' }} />
            <div>Select an outreach contact to view conversation</div>
          </div>
        </div>
      )}
    </div>
  );
}
