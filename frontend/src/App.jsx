import { useState, useEffect, useCallback, useRef } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(380);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [urlList, setUrlList] = useState('');
  
  const [jobs, setJobs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState('ALL');
  
  const [serverStatus, setServerStatus] = useState({ isMockMode: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New states for AI outreach pipeline
  const [resultsTab, setResultsTab] = useState('leads'); // leads, outbox, ledger, suppressions
  const [emailStats, setEmailStats] = useState({ sentToday: 0, dailyCap: 15, remaining: 15 });
  const [consentLedger, setConsentLedger] = useState([]);
  const [suppressionList, setSuppressionList] = useState([]);
  const [newSuppressionInput, setNewSuppressionInput] = useState('');
  const [newSuppressionReason, setNewSuppressionReason] = useState('');
  const [selectedLeadForPitch, setSelectedLeadForPitch] = useState(null);
  const [isProcessingEmail, setIsProcessingEmail] = useState({});
  const [suppressionSearch, setSuppressionSearch] = useState('');
  const [expandedEmailId, setExpandedEmailId] = useState(null);

  // States for Inbound email replies & meeting scheduler
  const [replies, setReplies] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedReplyId, setSelectedReplyId] = useState(null);
  const selectedReply = replies.find(r => r.id === selectedReplyId);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showBookMeetingModal, setShowBookMeetingModal] = useState(null); // stores Lead object or null
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [autoRespond, setAutoRespond] = useState(true);
  const [globalBookingLink, setGlobalBookingLink] = useState('https://calendly.com/aios-sales');

  // Fetch all jobs
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  }, []);

  // Fetch all leads
  const fetchLeads = useCallback(async () => {
    try {
      const url = leadsSearch 
        ? `/api/leads?search=${encodeURIComponent(leadsSearch)}`
        : '/api/leads';
      const res = await fetch(url);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  }, [leadsSearch]);

  // Fetch server status (mock or live mode)
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setServerStatus(data);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }, []);

  // Fetch email daily limit stats
  const fetchEmailStats = useCallback(async () => {
    try {
      const res = await fetch('/api/email/status');
      const data = await res.json();
      setEmailStats(data);
    } catch (err) {
      console.error('Error fetching email stats:', err);
    }
  }, []);

  // Fetch Consent Ledger entries
  const fetchConsentLedger = useCallback(async () => {
    try {
      const res = await fetch('/api/email/consent-ledger');
      const data = await res.json();
      setConsentLedger(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching consent ledger:', err);
    }
  }, []);

  // Fetch Suppression List
  const fetchSuppressions = useCallback(async () => {
    try {
      const res = await fetch('/api/email/suppressions');
      const data = await res.json();
      setSuppressionList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching suppressions:', err);
    }
  }, []);

  // Fetch received email replies
  const fetchReplies = useCallback(async () => {
    try {
      const res = await fetch('/api/email/replies');
      const data = await res.json();
      setReplies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching replies:', err);
    }
  }, []);

  // Fetch booked meetings
  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  }, []);

  // Fetch settings from server
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/email/settings');
      const data = await res.json();
      setAutoRespond(data.autoRespond);
      setGlobalBookingLink(data.bookingLink);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  // Initial loads and interval poll
  useEffect(() => {
    fetchStatus();
    fetchJobs();
    fetchLeads();
    fetchEmailStats();
    fetchConsentLedger();
    fetchSuppressions();
    fetchReplies();
    fetchMeetings();
    fetchSettings();
    
    const interval = setInterval(() => {
      fetchJobs();
      fetchLeads();
      fetchEmailStats();
      fetchReplies();
      fetchMeetings();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchJobs, fetchLeads, fetchStatus, fetchEmailStats, fetchConsentLedger, fetchSuppressions, fetchReplies, fetchMeetings, fetchSettings]);

  // Handle job submission for search
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery || !searchLocation) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, location: searchLocation }),
      });
      if (res.ok) {
        setSearchQuery('');
        setSearchLocation('');
        fetchJobs();
      }
    } catch (err) {
      console.error('Error starting search job:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle job submission for URLs
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    const urls = urlList
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);
      
    if (urls.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/jobs/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      if (res.ok) {
        setUrlList('');
        fetchJobs();
      }
    } catch (err) {
      console.error('Error starting URL job:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a job
  const handleDeleteJob = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this job and all its leads?')) return;
    
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedJobId === id) {
          setSelectedJobId(null);
        }
        fetchJobs();
        fetchLeads();
      }
    } catch (err) {
      console.error('Error deleting job:', err);
    }
  };

  // Handle manual outreach run / retry for a lead
  const handleTriggerEmail = async (leadId) => {
    setIsProcessingEmail(prev => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch(`/api/email/send/${leadId}`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchLeads();
        fetchEmailStats();
        fetchConsentLedger();
      }
    } catch (err) {
      console.error('Error triggering email outreach:', err);
    } finally {
      setIsProcessingEmail(prev => ({ ...prev, [leadId]: false }));
    }
  };

  // Add a suppressed email or domain
  const handleAddSuppression = async (e) => {
    e.preventDefault();
    if (!newSuppressionInput) return;
    
    try {
      const res = await fetch('/api/email/suppressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrDomain: newSuppressionInput, reason: newSuppressionReason }),
      });
      if (res.ok) {
        setNewSuppressionInput('');
        setNewSuppressionReason('');
        fetchSuppressions();
      }
    } catch (err) {
      console.error('Error adding suppression:', err);
    }
  };

  // Remove a suppression entry
  const handleRemoveSuppression = async (id) => {
    if (!confirm('Are you sure you want to remove this entry from the suppression list?')) return;
    
    try {
      const res = await fetch(`/api/email/suppressions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSuppressions();
      }
    } catch (err) {
      console.error('Error removing suppression:', err);
    }
  };

  // Save manual changes to AI draft
  const handleSaveDraft = async (replyId) => {
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/email/replies/${replyId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: draftSubject, body: draftBody }),
      });
      if (res.ok) {
        fetchReplies();
        alert('AI Draft follow-up saved successfully!');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Send the follow-up draft reply
  const handleSendReply = async (replyId) => {
    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/email/replies/${replyId}/send`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchReplies();
        fetchLeads();
        alert('Reply sent successfully!');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Schedule/Book a meeting
  const handleBookMeeting = async (e) => {
    e.preventDefault();
    if (!showBookMeetingModal) return;

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: showBookMeetingModal.id,
          title: meetingTitle || 'AIOS Automation Demo',
          email: showBookMeetingModal.email,
          meetingLink,
          scheduledAt: meetingDate,
        }),
      });

      if (res.ok) {
        setShowBookMeetingModal(null);
        setMeetingTitle('');
        setMeetingLink('');
        setMeetingDate('');
        fetchMeetings();
        fetchLeads();
        alert('Meeting scheduled successfully!');
      }
    } catch (err) {
      console.error('Error booking meeting:', err);
    }
  };

  // Cancel/Delete a booked meeting
  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMeetings();
        fetchLeads();
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
    }
  };

  // Simulate an inbound reply from a lead
  const handleSimulateWebhook = async (leadId) => {
    if (!simulationText) return;
    setIsSimulating(true);
    try {
      const res = await fetch('/api/email/webhook/simulate-received', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, messageText: simulationText }),
      });
      if (res.ok) {
        setSimulationText('');
        fetchReplies();
        fetchLeads();
        // Automatically switch to inbox tab so they see it
        setResultsTab('inbox');
        alert('Reply simulation triggered! Check the "Received Replies" tab.');
      }
    } catch (err) {
      console.error('Error simulating reply:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Toggle the autopilot settings
  const toggleAutopilot = async () => {
    const nextVal = !autoRespond;
    setAutoRespond(nextVal);
    try {
      const res = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRespond: nextVal, bookingLink: globalBookingLink }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutoRespond(data.autoRespond);
        setGlobalBookingLink(data.bookingLink);
      }
    } catch (err) {
      console.error('Error toggling autopilot:', err);
      setAutoRespond(!nextVal); // revert
    }
  };

  // Export current list to CSV
  const handleExportCSV = () => {
    const activeLeads = selectedJobId
      ? leads.filter(l => l.jobId === selectedJobId)
      : leads;
      
    if (activeLeads.length === 0) return;

    const headers = [
      'Company Name',
      'Website',
      'Email',
      'Phone',
      'Email Status',
      'Email Subject',
      'Address',
      'Description',
      'Scraped Date'
    ];

    const rows = activeLeads.map(l => [
      l.companyName || '',
      l.website || '',
      l.email || '',
      l.phone || '',
      l.emailStatus || 'PENDING',
      l.emailSubject || '',
      l.address || '',
      (l.description || '').replace(/"/g, '""'), // escape quotes
      new Date(l.createdAt).toLocaleDateString()
    ]);

    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_${selectedJobId || 'all'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads
    .filter(l => !selectedJobId || l.jobId === selectedJobId)
    .filter(l => {
      if (leadsStatusFilter === 'ALL') return true;
      if (leadsStatusFilter === 'HAS_MEETING') return meetings.some(m => m.leadId === l.id || m.email === l.email);
      return (l.emailStatus || 'PENDING') === leadsStatusFilter;
    });

  const sentEmailsLeads = leads.filter(l => l.emailStatus === 'SENT');

  const filteredSuppressions = suppressionList.filter(s => 
    s.emailOrDomain.toLowerCase().includes(suppressionSearch.toLowerCase()) ||
    (s.reason && s.reason.toLowerCase().includes(suppressionSearch.toLowerCase()))
  );

  // Helper to get status class for badges
  const getStatusClass = (status) => {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('sent')) return 'completed';
    if (s.includes('fail') || s.includes('reject')) return 'failed';
    if (s.includes('generate')) return 'processing';
    return 'pending';
  };

  // Drag-to-resize handlers
  const handleDragStart = useCallback((e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging.current) return;
    const delta = e.clientX - dragStartX.current;
    const newWidth = Math.min(600, Math.max(220, dragStartWidth.current + delta));
    setSidebarWidth(newWidth);
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header glass-panel">
        <div className="logo-section">
          <h1>LeadSphere AI</h1>
          <p>Scraping and Discovery Agent Core</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="status-bar">
            <span className={`status-dot ${serverStatus.isMockMode ? 'mock' : ''}`}></span>
            <span>{serverStatus.isMockMode ? 'Mock Sandbox Mode' : 'Live Mode'}</span>
          </div>
          <div className="status-bar" style={{ borderColor: 'var(--primary)' }}>
            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Outreach Cap:</span>
            <span>{emailStats.sentToday} / {emailStats.dailyCap} Sent Today</span>
          </div>
          <div 
            className="status-bar" 
            style={{ 
              borderColor: autoRespond ? 'var(--accent)' : 'var(--border-color)', 
              cursor: 'pointer', 
              userSelect: 'none',
              background: autoRespond ? 'rgba(217, 70, 239, 0.05)' : ''
            }} 
            onClick={toggleAutopilot}
            title={autoRespond ? "Click to disable Autopilot" : "Click to enable Autopilot"}
          >
            <span className="status-dot" style={{ backgroundColor: autoRespond ? 'var(--accent)' : 'var(--text-muted)', boxShadow: autoRespond ? '0 0 8px var(--accent)' : 'none' }}></span>
            <span style={{ fontWeight: '500' }}>Autopilot: {autoRespond ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main
        className="dashboard-grid"
        style={{ gridTemplateColumns: sidebarCollapsed ? `52px 1fr` : `${sidebarWidth}px 20px 1fr` }}
      >
        {/* Left Sidebar Controls */}
        <section
          className={`sidebar-panel glass-panel${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
          style={{ width: sidebarCollapsed ? 52 : sidebarWidth, minWidth: sidebarCollapsed ? 52 : 220 }}
        >
          {/* Collapse toggle inside sidebar top */}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
            >
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>

          {!sidebarCollapsed && <h2 className="section-title">Lead Source Configuration</h2>}
          
          {!sidebarCollapsed && (
          <div className="tabs">
            <button 
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Search Discovery
            </button>
            <button 
              className={`tab-btn ${activeTab === 'urls' ? 'active' : ''}`}
              onClick={() => setActiveTab('urls')}
            >
              Direct URL List
            </button>
          </div>
          )}

          {!sidebarCollapsed && (activeTab === 'search' ? (
            <form onSubmit={handleSearchSubmit}>
              <div className="form-group">
                <label htmlFor="industry">Industry / Business Type</label>
                <input 
                  type="text" 
                  id="industry" 
                  className="input-field"
                  placeholder="e.g. Bakery, Cafe, Gym"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input 
                  type="text" 
                  id="location" 
                  className="input-field"
                  placeholder="e.g. London, UK or Austin, TX"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Queueing Job...' : 'Discover & Scrape Leads'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUrlSubmit}>
              <div className="form-group">
                <label htmlFor="urls">Target Websites (one URL per line)</label>
                <textarea 
                  id="urls" 
                  className="input-field textarea-field"
                  placeholder="example.com&#10;google.com"
                  value={urlList}
                  onChange={(e) => setUrlList(e.target.value)}
                  required
                ></textarea>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Queueing Job...' : 'Ingest & Scrape URLs'}
              </button>
            </form>
          ))}

          {!sidebarCollapsed && <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />}

          {!sidebarCollapsed && <h3 className="section-title" style={{ fontSize: '0.95rem' }}>Active Scrape Jobs</h3>}
          {!sidebarCollapsed && <div className="jobs-list">
            {jobs.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No active jobs enqueued yet
              </div>
            ) : (
              jobs.map(job => (
                <div 
                  key={job.id} 
                  className={`job-card ${selectedJobId === job.id ? 'active' : ''}`}
                  onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedJobId === job.id ? 'var(--primary)' : 'var(--border-color)',
                    background: selectedJobId === job.id ? 'rgba(99, 102, 241, 0.05)' : ''
                  }}
                >
                  <div className="job-header">
                    <span className="job-title">
                      {job.type === 'SEARCH' ? `Search: ${job.query}` : 'Direct URL Scrape'}
                    </span>
                    <button 
                      className="delete-job-btn"
                      onClick={(e) => handleDeleteJob(job.id, e)}
                      title="Delete Job"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="job-subtitle">
                      {job.type === 'SEARCH' ? job.location : `${job._count?.leads || 0} Targets`}
                    </span>
                    <span className={`badge ${job.status.toLowerCase()}`}>
                      {job.status}
                    </span>
                  </div>
                  {job.error && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--status-failed)', marginTop: '4px', wordBreak: 'break-all' }}>
                      {job.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>}
        </section>

        {/* Drag handle / resize divider */}
        {!sidebarCollapsed && (
          <div
            className="sidebar-drag-handle"
            onMouseDown={handleDragStart}
            title="Drag to resize"
          >
            <div className="drag-handle-dots" />
          </div>
        )}

        {/* Right Leads Results View */}
        <section className="results-panel glass-panel">
          
          {/* Main Results View Navigation Tabs */}
          <div className="tabs" style={{ width: 'fit-content' }}>
            <button 
              className={`tab-btn ${resultsTab === 'leads' ? 'active' : ''}`}
              onClick={() => setResultsTab('leads')}
            >
              Leads Database
            </button>
            <button 
              className={`tab-btn ${resultsTab === 'outbox' ? 'active' : ''}`}
              onClick={() => setResultsTab('outbox')}
            >
              Sent Outbox
            </button>
            <button 
              className={`tab-btn ${resultsTab === 'inbox' ? 'active' : ''}`}
              onClick={() => {
                setResultsTab('inbox');
                setSelectedReplyId(null);
              }}
            >
              Received Replies ({replies.filter(r => r.draftedReplyStatus === 'DRAFTED').length})
            </button>
            <button 
              className={`tab-btn ${resultsTab === 'meetings' ? 'active' : ''}`}
              onClick={() => setResultsTab('meetings')}
            >
              Upcoming Meetings ({meetings.length})
            </button>
            <button 
              className={`tab-btn ${resultsTab === 'ledger' ? 'active' : ''}`}
              onClick={() => setResultsTab('ledger')}
            >
              Consent Ledger
            </button>
            <button 
              className={`tab-btn ${resultsTab === 'suppressions' ? 'active' : ''}`}
              onClick={() => setResultsTab('suppressions')}
            >
              Suppression List
            </button>
          </div>

          {/* TAB 1: LEADS DATABASE */}
          {resultsTab === 'leads' && (
            <>
              <div className="results-header" style={{ marginTop: '0.5rem' }}>
                <div>
                  <h2 className="section-title" style={{ marginBottom: '2px' }}>
                    {selectedJobId 
                      ? `Scraped Leads for Selected Job` 
                      : `All Discovered Business Leads`}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Showing {filteredLeads.length} leads
                  </p>
                </div>
                
                <div className="action-buttons">
                  <div className="search-bar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input 
                      type="text" 
                      placeholder="Search leads database..." 
                      value={leadsSearch}
                      onChange={(e) => setLeadsSearch(e.target.value)}
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={leadsStatusFilter}
                    onChange={e => setLeadsStatusFilter(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="GENERATING">Generating</option>
                    <option value="SENT">Sent</option>
                    <option value="FAILED">Failed</option>
                    <option value="COMPLIANCE_REJECTED">Compliance Rejected</option>
                    <option value="SKIPPED_SUPPRESSED">Suppressed</option>
                    <option value="SKIPPED_CAP">Daily Cap Skipped</option>
                    <option value="HAS_MEETING">Meeting Booked</option>
                  </select>

                  <button 
                    className="btn-secondary" 
                    onClick={handleExportCSV}
                    disabled={filteredLeads.length === 0}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/></svg>
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="table-container">
                {filteredLeads.length === 0 ? (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17h6M9 13h6M9 9h3"/></svg>
                    <div>
                      <h3>No Leads Found</h3>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        {leadsSearch ? 'No leads match your search query.' : 'Launch a Search Job or import URLs on the left panel to begin.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Company Name</th>
                        <th>Website</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Email Status</th>
                        <th>Socials</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map(lead => (
                        <tr key={lead.id}>
                          <td className="lead-name">
                            <div style={{ fontWeight: '600' }}>{lead.companyName || 'Unknown Company'}</div>
                            {lead.contacts && lead.contacts.length > 0 && (
                              <div style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                                <div style={{ fontWeight: '600', color: 'var(--accent)', marginBottom: '4px' }}>
                                  Targeted Staff ({lead.contacts.length}):
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {lead.contacts.map(c => (
                                    <div 
                                      key={c.id} 
                                      style={{ 
                                        background: 'rgba(255,255,255,0.02)', 
                                        border: '1px solid var(--border-color)',
                                        padding: '4px 8px', 
                                        borderRadius: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                        overflow: 'hidden',
                                        minWidth: 0,
                                        wordBreak: 'break-word'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0, flex: 1 }}>{c.name}</span>
                                        {c.linkedin && (
                                          <a 
                                            href={c.linkedin} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            style={{ color: '#0a66c2', display: 'flex', alignItems: 'center' }}
                                            title="LinkedIn Profile"
                                          >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                                          </a>
                                        )}
                                      </div>
                                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontStyle: 'italic' }}>{c.role}</div>
                                      <div style={{ color: 'var(--primary)', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                                      {c.phone && (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>📞 {c.phone}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td>
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="lead-link">
                              {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                          </td>
                          <td style={{ color: lead.email ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {lead.email || 'N/A'}
                          </td>
                          <td style={{ fontSize: '0.8rem', verticalAlign: 'top', minWidth: '160px' }}>
                            {/* Company phone */}
                            {lead.phone ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.65rem', background: 'var(--border-color)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>Co.</span>
                                <span style={{ color: 'var(--text-primary)' }}>{lead.phone}</span>
                              </div>
                            ) : null}
                            {/* Targeted staff phones */}
                            {lead.contacts && lead.contacts.filter(c => c.phone).map(c => (
                              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                                <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.name}>
                                  {c.name?.split(' ')[0] || 'Staff'}
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>{c.phone}</span>
                              </div>
                            ))}
                            {!lead.phone && (!lead.contacts || lead.contacts.every(c => !c.phone)) && (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {lead.email ? (
                              <span className={`badge ${getStatusClass(lead.emailStatus)}`}>
                                {lead.emailStatus || 'PENDING'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Email</span>
                            )}
                          </td>
                          <td>
                            <div className="social-links">
                              {lead.facebook && (
                                <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="social-icon" title="Facebook">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                                </a>
                              )}
                              {lead.instagram && (
                                <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="social-icon" title="Instagram">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01"/></svg>
                                </a>
                              )}
                              {lead.linkedin && (
                                <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon" title="LinkedIn">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                                </a>
                              )}
                              {lead.twitter && (
                                <a href={lead.twitter} target="_blank" rel="noopener noreferrer" className="social-icon" title="Twitter/X">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                                </a>
                              )}
                              {!lead.facebook && !lead.instagram && !lead.linkedin && !lead.twitter && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                              )}
                            </div>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: lead.description ? 'var(--text-secondary)' : 'var(--text-muted)' }} title={lead.description}>
                            {lead.description || 'N/A'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                              {lead.email && lead.emailStatus && lead.emailStatus !== 'PENDING' && (
                                <button 
                                  className="btn-secondary" 
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                                  onClick={() => setSelectedLeadForPitch(lead)}
                                >
                                  View Pitch
                                </button>
                              )}
                              {lead.email && lead.emailStatus !== 'SENT' && lead.emailStatus !== 'SKIPPED_SUPPRESSED' && !meetings.some(m => m.leadId === lead.id || m.email === lead.email) && (
                                <button
                                  className="submit-btn"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', background: 'var(--primary)' }}
                                  onClick={() => handleTriggerEmail(lead.id)}
                                  disabled={isProcessingEmail[lead.id]}
                                >
                                  {isProcessingEmail[lead.id] ? 'Sending...' : (lead.emailStatus === 'FAILED' || lead.emailStatus === 'COMPLIANCE_REJECTED' ? 'Retry' : 'Send Pitch')}
                                </button>
                              )}
                              {meetings.some(m => m.leadId === lead.id || m.email === lead.email) && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--status-completed, #22c55e)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                  Meeting Booked
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* TAB 2: SENT OUTBOX */}
          {resultsTab === 'outbox' && (
            <>
              <div className="results-header" style={{ marginTop: '0.5rem' }}>
                <div>
                  <h2 className="section-title">Sent Outbox (Outreach History)</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Showing {sentEmailsLeads.length} successfully delivered emails
                  </p>
                </div>
              </div>

              <div className="table-container">
                {sentEmailsLeads.length === 0 ? (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    <div>
                      <h3>No Sent Emails Yet</h3>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        Once the AI Sales Lead generates a pitch and Claude approves it, the sent email text will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                    {sentEmailsLeads.map(lead => (
                      <div key={lead.id} className="job-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' }}>
                          <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{lead.companyName || 'Unknown Company'}</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Sent to: <span style={{ color: 'var(--primary)' }}>{lead.email}</span> • {lead.sentAt ? new Date(lead.sentAt).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => setExpandedEmailId(expandedEmailId === lead.id ? null : lead.id)}
                          >
                            {expandedEmailId === lead.id ? 'Hide Email Text' : 'View Email Text'}
                          </button>
                        </div>
                        
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Subject:</span> {lead.emailSubject}
                          </p>
                        </div>

                        {expandedEmailId === lead.id && (
                          <div 
                            style={{ 
                              marginTop: '12px', 
                              padding: '12px', 
                              background: '#040508', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-color)',
                              fontSize: '0.85rem',
                              lineHeight: '1.5',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              color: 'var(--text-secondary)'
                            }}
                            dangerouslySetInnerHTML={{ __html: lead.emailBody }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB: RECEIVED REPLIES (INBOX) */}
          {resultsTab === 'inbox' && (
            <div className="inbox-layout">
              {/* Left Column: Email list */}
              <div className="inbox-list glass-panel">
                <h3 className="section-title" style={{ padding: '16px 16px 8px 16px', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
                  Prospect Replies
                </h3>
                <div className="reply-cards-container">
                  {replies.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                      <p>No replies received yet.</p>
                    </div>
                  ) : (
                    replies.map(reply => (
                      <div
                        key={reply.id}
                        className={`reply-card ${selectedReplyId === reply.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedReplyId(reply.id);
                          setDraftSubject(reply.draftedReplySubject || `Re: ${reply.subject}`);
                          setDraftBody(reply.draftedReplyBody || '');
                        }}
                      >
                        <div className="reply-card-header">
                          <span className="reply-sender">{reply.lead?.companyName || reply.from}</span>
                          <span className="reply-badge badge pending" style={{ textTransform: 'none', background: reply.draftedReplyStatus === 'SENT' ? 'var(--status-completed-bg)' : 'var(--status-pending-bg)', color: reply.draftedReplyStatus === 'SENT' ? 'var(--status-completed)' : 'var(--status-pending)' }}>
                            {reply.draftedReplyStatus}
                          </span>
                        </div>
                        <div className="reply-card-subject">{reply.subject}</div>
                        <div className="reply-card-time">{new Date(reply.receivedAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Details & Draft replies */}
              <div className="inbox-details glass-panel">
                {selectedReply ? (
                  <div className="thread-detail-container">
                    <div className="thread-header">
                      <div>
                        <h3>{selectedReply.lead?.companyName || 'Unknown Company'}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          Contact: <strong>{selectedReply.from}</strong>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="submit-btn"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--status-running)' }}
                          onClick={() => {
                            setShowBookMeetingModal(selectedReply.lead);
                            setMeetingTitle(`Demo with ${selectedReply.lead?.companyName || 'Prospect'}`);
                            setMeetingLink('https://calendly.com/aios-sales'); // default Calendly
                          }}
                        >
                          Book Meeting
                        </button>
                      </div>
                    </div>

                    <div className="thread-messages">
                      {/* Message 1: Initial Pitch */}
                      <div className="thread-message sent">
                        <div className="message-header">
                          <span>Outreach Sent (Our initial pitch)</span>
                        </div>
                        <div className="message-body">
                          <p><strong>Subject:</strong> {selectedReply.lead?.emailSubject}</p>
                          <div dangerouslySetInnerHTML={{ __html: selectedReply.lead?.emailBody }} />
                        </div>
                      </div>

                      {/* Message 2: Reply */}
                      <div className="thread-message received">
                        <div className="message-header">
                          <span>Reply Received from Client • {new Date(selectedReply.receivedAt).toLocaleString()}</span>
                        </div>
                        <div className="message-body">
                          <p><strong>Subject:</strong> {selectedReply.subject}</p>
                          <div dangerouslySetInnerHTML={{ __html: selectedReply.bodyHtml || `<p>${selectedReply.bodyText}</p>` }} />
                        </div>
                      </div>

                      {/* Message 3: Follow-up Sent (If sent) */}
                      {selectedReply.draftedReplyStatus === 'SENT' && (
                        <div className="thread-message sent">
                          <div className="message-header">
                            <span>Follow-up Sent (Our AI response)</span>
                          </div>
                          <div className="message-body">
                            <p><strong>Subject:</strong> {selectedReply.draftedReplySubject}</p>
                            <div dangerouslySetInnerHTML={{ __html: selectedReply.draftedReplyBody }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Follow-up Draft Editor */}
                    {selectedReply.draftedReplyStatus !== 'SENT' ? (
                      <div className="draft-editor-box">
                        <h4 className="section-title" style={{ fontSize: '0.9rem', color: 'var(--accent)' }}>
                          AI Generated Follow-up Draft
                        </h4>
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '0.75rem' }}>Subject Line</label>
                          <input
                            type="text"
                            className="input-field"
                            value={draftSubject}
                            onChange={(e) => setDraftSubject(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '0.75rem' }}>Email HTML Body</label>
                          <textarea
                            className="input-field textarea-field"
                            style={{ minHeight: '160px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                            value={draftBody}
                            onChange={(e) => setDraftBody(e.target.value)}
                          ></textarea>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="btn-secondary"
                            onClick={() => handleSaveDraft(selectedReply.id)}
                            disabled={isSavingDraft}
                          >
                            {isSavingDraft ? 'Saving...' : 'Save Draft Edits'}
                          </button>
                          <button
                            className="submit-btn"
                            style={{ flex: 1 }}
                            onClick={() => handleSendReply(selectedReply.id)}
                            disabled={isSendingReply}
                          >
                            {isSendingReply ? 'Sending...' : 'Send AI Reply'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel" style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--status-completed)', background: 'rgba(16, 185, 129, 0.05)', textAlign: 'center' }}>
                        <span style={{ color: 'var(--status-completed)', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Follow-up email successfully sent!
                        </span>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          The conversation is active. You can now coordinate a meeting schedule or click "Book Meeting" above.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state" style={{ margin: 'auto' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <div>
                      <h3>Select a Reply</h3>
                      <p style={{ fontSize: '0.85rem' }}>
                        Select a reply from the left pane to view the conversation thread and edit/send the AI's follow-up draft.
                      </p>
                    </div>

                    {/* Dynamic Booking Link Editor */}
                    <div className="glass-panel" style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', textAlign: 'left' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '8px' }}>
                        AI Sales Agent Settings
                      </h4>
                      <div className="form-group" style={{ marginBottom: '0px' }}>
                        <label style={{ fontSize: '0.7rem' }}>Global Meeting Booking Link</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input 
                            type="url" 
                            className="input-field" 
                            style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }}
                            value={globalBookingLink}
                            onChange={(e) => setGlobalBookingLink(e.target.value)}
                          />
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/email/settings', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ autoRespond, bookingLink: globalBookingLink }),
                                });
                                if (res.ok) {
                                  alert('Booking link saved successfully!');
                                  fetchSettings();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: UPCOMING MEETINGS */}
          {resultsTab === 'meetings' && (
            <>
              <div className="results-header" style={{ marginTop: '0.5rem' }}>
                <div>
                  <h2 className="section-title">Upcoming Demo Meetings Booked</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Track sales conversations and upcoming calls
                  </p>
                </div>
              </div>

              <div className="table-container">
                {meetings.length === 0 ? (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <div>
                      <h3>No Booked Meetings Yet</h3>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        Book meetings with leads directly from their email replies or add one manually in the leads table.
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Company / Prospect</th>
                        <th>Contact Email</th>
                        <th>Meeting Title</th>
                        <th>Scheduled Time</th>
                        <th>Meeting Link</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.map(m => (
                        <tr key={m.id}>
                          <td className="lead-name">{m.lead?.companyName || 'Prospect'}</td>
                          <td>{m.email}</td>
                          <td style={{ fontWeight: '500' }}>{m.title}</td>
                          <td style={{ color: 'var(--accent)', fontWeight: '600' }}>
                            {new Date(m.scheduledAt).toLocaleString()}
                          </td>
                          <td>
                            {m.meetingLink ? (
                              <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" className="lead-link">
                                {m.meetingLink.replace(/^https?:\/\/(www\.)?/, '')}
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>No Link</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="delete-job-btn"
                              style={{ padding: '6px' }}
                              onClick={() => handleDeleteMeeting(m.id)}
                              title="Cancel Meeting"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* TAB 3: CONSENT LEDGER */}
          {resultsTab === 'ledger' && (
            <>
              <div className="results-header" style={{ marginTop: '0.5rem' }}>
                <div>
                  <h2 className="section-title">Consent Ledger (Compliance Audit Log)</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Rigorously logging relevance rationale to comply with CAN-SPAM regulations
                  </p>
                </div>
              </div>

              <div className="table-container">
                {consentLedger.length === 0 ? (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    <div>
                      <h3>Consent Ledger is Empty</h3>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        No records logged yet. Records are written immediately when Claude approves outreach relevance.
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Business Name</th>
                        <th>Recipient Email</th>
                        <th>Legitimate Business Relevance Reason (Logged by Claude)</th>
                        <th>Checked Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consentLedger.map(entry => (
                        <tr key={entry.id}>
                          <td className="lead-name">{entry.businessName}</td>
                          <td>{entry.email}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', maxWidth: '450px' }}>
                            {entry.relevanceReason}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(entry.checkedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* TAB 4: SUPPRESSION LIST MANAGER */}
          {resultsTab === 'suppressions' && (
            <>
              <div className="results-header" style={{ marginTop: '0.5rem' }}>
                <div>
                  <h2 className="section-title">Suppression List Manager (Opt-Outs)</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Prevents cold outreach to specific emails or domain-wide businesses that requested no contact.
                  </p>
                </div>
                
                <div className="search-bar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input 
                    type="text" 
                    placeholder="Search suppression list..." 
                    value={suppressionSearch}
                    onChange={(e) => setSuppressionSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Add Suppression Form */}
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Add Email or Domain to Suppression list</h3>
                <form onSubmit={handleAddSuppression} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.75rem' }}>Email Address or Domain (e.g. bakery.co.uk)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. contact@domain.com or competitor.com"
                      value={newSuppressionInput}
                      onChange={(e) => setNewSuppressionInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 1.5, minWidth: '250px' }}>
                    <label style={{ fontSize: '0.75rem' }}>Reason for suppression</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Unsubscribed, Competitor, Requested removal"
                      value={newSuppressionReason}
                      onChange={(e) => setNewSuppressionReason(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="submit-btn" style={{ padding: '10px 20px', height: '40px' }}>
                    Suppress Address
                  </button>
                </form>
              </div>

              <div className="table-container" style={{ marginTop: '1rem' }}>
                {filteredSuppressions.length === 0 ? (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 9H9v6h6V9z"/></svg>
                    <div>
                      <h3>No suppressed entries found</h3>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        {suppressionSearch ? 'No items match your search.' : 'The suppression list is empty. Add emails/domains above to block outreach.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Suppressed Email or Domain</th>
                        <th>Reason / Source</th>
                        <th>Suppressed On</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppressions.map(item => (
                        <tr key={item.id}>
                          <td className="lead-name" style={{ color: 'var(--status-failed)' }}>{item.emailOrDomain}</td>
                          <td>{item.reason || 'No reason provided'}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="delete-job-btn"
                              style={{ padding: '6px' }}
                              onClick={() => handleRemoveSuppression(item.id)}
                              title="Remove Suppression"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {/* VIEW EMAIL PITCH DETAIL DIALOG MODAL */}
      {selectedLeadForPitch && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifycontent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setSelectedLeadForPitch(null)}
        >
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '750px', 
              width: '100%', 
              margin: 'auto',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)', 
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Outreach Pitch Details</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Company: <strong>{selectedLeadForPitch.companyName}</strong> ({selectedLeadForPitch.email})
                </p>
              </div>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px 12px', border: 'none' }}
                onClick={() => setSelectedLeadForPitch(null)}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status: </span>
                <span className={`badge ${getStatusClass(selectedLeadForPitch.emailStatus)}`}>
                  {selectedLeadForPitch.emailStatus || 'PENDING'}
                </span>
              </div>
              {selectedLeadForPitch.sentAt && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Sent On: {new Date(selectedLeadForPitch.sentAt).toLocaleString()}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Subject:</span>
              <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {selectedLeadForPitch.emailSubject || '(Not drafted yet)'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Email Body:</span>
              <div 
                style={{ 
                  padding: '16px', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  fontSize: '0.9rem', 
                  lineHeight: '1.5',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-secondary)'
                }}
                dangerouslySetInnerHTML={{ __html: selectedLeadForPitch.emailBody || '<i>Email body has not been drafted.</i>' }}
              />
            </div>

            {selectedLeadForPitch.complianceReason && (
              <div 
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid',
                  borderColor: selectedLeadForPitch.emailStatus === 'COMPLIANCE_REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  background: selectedLeadForPitch.emailStatus === 'COMPLIANCE_REJECTED' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)',
                  fontSize: '0.85rem' 
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px', color: selectedLeadForPitch.emailStatus === 'COMPLIANCE_REJECTED' ? 'var(--status-failed)' : 'var(--status-completed)' }}>
                  {selectedLeadForPitch.emailStatus === 'COMPLIANCE_REJECTED' ? 'Legal Compliance Issue' : 'Compliance & Consent Reason Logged'}
                </div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {selectedLeadForPitch.complianceReason}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* BOOK MEETING MODAL DIALOG */}
      {showBookMeetingModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setShowBookMeetingModal(null)}
        >
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '500px', 
              width: '100%', 
              margin: 'auto',
              padding: '24px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)', 
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Schedule Demo Call</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  For Lead: <strong>{showBookMeetingModal.companyName}</strong>
                </p>
              </div>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px 12px', border: 'none' }}
                onClick={() => setShowBookMeetingModal(null)}
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleBookMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Meeting Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. AIOS Demo Meeting"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Contact Email</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={showBookMeetingModal.email || ''}
                  disabled
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Meeting Booking Link</label>
                <input 
                  type="url" 
                  className="input-field" 
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="e.g. https://calendly.com/your-demo"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>
                Schedule Meeting & Update CRM
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
