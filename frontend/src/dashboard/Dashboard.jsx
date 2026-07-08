import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Search, FolderOpen, Mail, MessageSquare, Calendar,
  Settings as SettingsIcon, LogOut, Menu, RefreshCw, Target, CheckCircle, ChevronLeft, ToggleLeft, ToggleRight,
  XCircle, AlertTriangle, ArrowLeft, Folder, Clock, Copy, HelpCircle
} from 'lucide-react';

import { API } from './shared.jsx';
import Overview      from './Overview.jsx';
import Discovery     from './Discovery.jsx';
import LeadsPanel    from './LeadsPanel.jsx';
import OutreachPanel from './OutreachPanel.jsx';
import RepliesPanel  from './RepliesPanel.jsx';
import MeetingsPanel from './MeetingsPanel.jsx';
import SettingsPanel from './SettingsPanel.jsx';

/* ─── Navigation items ─── */
const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',      Icon: Zap },
  { id: 'discovery', label: 'Lead Discovery', Icon: Search },
  { id: 'leads',     label: 'Leads Database', Icon: FolderOpen },
  { id: 'outreach',  label: 'Outreach',       Icon: Mail },
  { id: 'replies',   label: 'Replies',        Icon: MessageSquare },
  { id: 'meetings',  label: 'Meetings',       Icon: Calendar },
  { id: 'settings',  label: 'Settings',       Icon: SettingsIcon },
];

/* ─── Dashboard shell ─── */
export default function Dashboard({ token, onLogout }) {
  const [activeTab,   setActiveTab]   = useState('overview');
  const [jobs,        setJobs]        = useState([]);
  const [leads,       setLeads]       = useState([]);
  const [emailStats,  setEmailStats]  = useState({ sentToday: 0, dailyCap: 15 });
  const [replies,     setReplies]     = useState([]);
  const [meetings,    setMeetings]    = useState([]);
  const [settings,    setSettings]    = useState(null);
  const [msg,         setMsg]         = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [leadFilterJobId, setLeadFilterJobId] = useState(null);
  const [selectedOutreachLeadId, setSelectedOutreachLeadId] = useState(null);

  const [sidebarMode, setSidebarMode] = useState('navigation');

  // Filter States
  const [filterCompany, setFilterCompany] = useState('');
  const [filterTitles, setFilterTitles] = useState('');
  const [filterSeniority, setFilterSeniority] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterKeywords, setFilterKeywords] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterEmployeeSize, setFilterEmployeeSize] = useState('');
  const [filterRevenue, setFilterRevenue] = useState('');

  const [expandedFilters, setExpandedFilters] = useState({
    industry: true,
    location: true,
    titles: true,
  });

  // Pre-populate filter states when settings load
  useEffect(() => {
    if (settings) {
      setFilterIndustry(prev => prev || settings.crawlIndustry || '');
      setFilterLocation(prev => prev || settings.crawlLocation || '');
      setFilterTitles(prev => prev || settings.crawlKeywords || '');
    }
  }, [settings]);

  const notify = useCallback((m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3500);
  }, []);

  const triggerDiscoverySearch = async () => {
    if (!filterIndustry || !filterLocation) {
      notify('⚠️ Enter Industry and Location to search');
      return;
    }
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
    notify('🚀 Starting lead discovery search...');
    try {
      const res = await API('/api/jobs/search', token, {
        method: 'POST',
        body: JSON.stringify({
          query: filterIndustry,
          location: filterLocation,
          keywords: filterTitles,
        })
      });
      if (res.ok) {
        notify('✅ Job started successfully!');
        loadAll();
      } else {
        const e = await res.json();
        notify(`❌ ${e.message}`);
      }
    } catch {
      notify('❌ Network error starting job');
    }
  };

  const loadAll = useCallback(async () => {
    try {
      const [j, l, s, r, m, em] = await Promise.all([
        API('/api/jobs',           token).then(r => r.json()),
        API('/api/leads',          token).then(r => r.json()),
        API('/api/email/settings', token).then(r => r.json()),
        API('/api/email/replies',  token).then(r => r.json()),
        API('/api/meetings',       token).then(r => r.json()),
        API('/api/email/status',   token).then(r => r.json()),
      ]);
      setJobs(Array.isArray(j) ? j : []);
      setLeads(Array.isArray(l) ? l : []);
      setSettings(s);
      setReplies(Array.isArray(r) ? r : []);
      setMeetings(Array.isArray(m) ? m : []);
      setEmailStats(em || { sentToday: 0, dailyCap: 15 });
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    // Clear stale state when token changes (e.g. after logout/login as different user)
    setJobs([]);
    setLeads([]);
    setReplies([]);
    setMeetings([]);
    setSettings(null);
    setEmailStats({ sentToday: 0, dailyCap: 15 });
    if (token) loadAll();
  }, [token]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeLabel = NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Dashboard';

  const handleViewJobLeads = (jobId) => {
    setLeadFilterJobId(jobId);
    setActiveTab('leads');
  };

  const toggleAutopilot = async () => {
    if (!settings) return;
    const updatedValue = !settings.autoRespond;
    setSettings(prev => ({ ...prev, autoRespond: updatedValue }));
    try {
      const res = await API('/api/email/settings', token, {
        method: 'POST',
        body: JSON.stringify({ ...settings, autoRespond: updatedValue }),
      });
      if (!res.ok) {
        setSettings(prev => ({ ...prev, autoRespond: !updatedValue }));
        notify('❌ Failed to update Autopilot');
      } else {
        notify(`✅ Autopilot turned ${updatedValue ? 'ON' : 'OFF'}`);
      }
    } catch {
      setSettings(prev => ({ ...prev, autoRespond: !updatedValue }));
      notify('❌ Connection error');
    }
  };

  /* Map tab id → panel component */
  const panels = {
    overview:  <Overview      jobs={jobs} leads={leads} emailStats={emailStats} />,
    discovery: <Discovery     token={token} jobs={jobs} onRefresh={loadAll} onNotify={notify} onViewJobLeads={handleViewJobLeads} settings={settings} />,
    leads:     <LeadsPanel    token={token} leads={leads} jobs={jobs} leadFilterJobId={leadFilterJobId} setLeadFilterJobId={setLeadFilterJobId} onNotify={notify} onRefresh={loadAll} />,
    outreach:  <OutreachPanel leads={leads} selectedLeadId={selectedOutreachLeadId} setSelectedLeadId={setSelectedOutreachLeadId} token={token} onLoadAll={loadAll} />,
    replies:   <RepliesPanel  replies={replies} onViewReplyLead={(leadId) => {
      setSelectedOutreachLeadId(leadId);
      setActiveTab('outreach');
    }} />,
    meetings:  <MeetingsPanel meetings={meetings} />,
    settings:  <SettingsPanel token={token} settings={settings} setSettings={setSettings} onNotify={notify} />,
  };

  /* ─── Shared inline style helpers ─── */
  const pill = (color) => ({
    padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
    background: color === 'green' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
    border: `1px solid ${color === 'green' ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
    color: color === 'green' ? '#34d399' : '#a5b4fc',
    display: 'inline-flex', alignItems: 'center', gap: '4px',
  });

  const navItemStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.65rem 1rem', margin: '2px 0.5rem', borderRadius: 10,
    cursor: 'pointer', transition: 'all 0.18s',
    background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
    color:      active ? '#a5b4fc'               : 'rgba(248,250,252,0.5)',
    borderLeft: active ? '3px solid #6366f1'     : '3px solid transparent',
    fontSize: '0.87rem', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
  });

  return (
    <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: '#090a0f', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: '#f8fafc' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder, textarea::placeholder { color: rgba(248,250,252,0.2); }
        * { box-sizing: border-box; }

        @media (max-width: 768px) {
          .dashboard-container {
            flex-direction: column !important;
          }
          .dashboard-sidebar {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            height: 100vh !important;
            z-index: 100 !important;
            transform: translateX(-100%) !important;
            width: 240px !important;
            box-shadow: 5px 0 15px rgba(0,0,0,0.5) !important;
          }
          .dashboard-sidebar.open {
            transform: translateX(0) !important;
            width: 240px !important;
          }
          .dashboard-backdrop {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            background: rgba(0,0,0,0.6) !important;
            backdrop-filter: blur(4px) !important;
            z-index: 90 !important;
          }
          .dashboard-topbar {
            padding: 0.85rem 1rem !important;
          }
          .dashboard-topbar-right {
            flex-wrap: nowrap !important;
            gap: 0.4rem !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .show-on-mobile {
            display: inline-block !important;
          }
          .dashboard-panel-content {
            padding: 0.5rem 1rem 1rem !important;
          }
          .overview-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .overview-panels-grid {
            grid-template-columns: 1fr !important;
          }
          .discovery-grid {
            grid-template-columns: 1fr !important;
          }
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
          .discovery-grid {
            grid-template-columns: 1fr !important;
          }
          /* Outreach split-layout overrides on mobile */
          .inbox-layout {
            flex-direction: column !important;
            height: auto !important;
            min-height: auto !important;
          }
          .inbox-list {
            width: 100% !important;
          }
          .inbox-details {
            width: 100% !important;
            min-height: calc(100vh - 120px) !important;
            padding: 1rem !important;
          }
          .inbox-layout.chat-open .inbox-list {
            display: none !important;
          }
          .inbox-layout:not(.chat-open) .inbox-details {
            display: none !important;
          }
          /* Replies table mobile card rendering */
          .replies-table thead {
            display: none !important;
          }
          .replies-table tr {
            display: block !important;
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            border-radius: 8px !important;
            padding: 0.75rem !important;
            margin-bottom: 0.75rem !important;
          }
          .replies-table td {
            display: block !important;
            border: none !important;
            padding: 0.25rem 0 !important;
            text-align: left !important;
            font-size: 0.85rem !important;
          }
          .replies-table td:before {
            content: attr(data-label) ": ";
            font-weight: 700;
            color: rgba(248, 250, 252, 0.4);
            font-size: 0.72rem;
            text-transform: uppercase;
            display: block;
            margin-bottom: 2px;
          }
        }
        /* Tooltip styling inside Settings */
        .tooltip-container {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .tooltip-text {
          visibility: hidden;
          position: absolute;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          background-color: #0d0f1a;
          color: #f8fafc;
          text-align: center;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.72rem;
          line-height: 1.4;
          white-space: normal;
          width: 220px;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.2s ease, visibility 0.2s ease;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          border: 1px solid rgba(99, 102, 241, 0.3);
          pointer-events: none;
        }
        .tooltip-text::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #0d0f1a transparent transparent transparent;
        }
        .tooltip-container:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }
      `}</style>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="dashboard-backdrop" 
          style={{ display: 'none' }} 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* ── Sidebar ── */}
      <div 
        className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: sidebarOpen ? (sidebarMode === 'filters' && activeTab === 'discovery' ? 300 : 220) : 64, flexShrink: 0, transition: 'all 0.25s ease',
          background: 'rgba(13,15,26,0.95)', borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        }}
      >
        {sidebarMode === 'filters' && activeTab === 'discovery' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1.2rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button 
                onClick={() => {
                  setSidebarMode('navigation');
                  setSidebarOpen(window.innerWidth > 768);
                }}
                style={{ background: 'none', border: 'none', color: 'rgba(248, 250, 252, 0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px' }}
                title="Back to Navigation Menu"
              >
                <ArrowLeft size={18} />
              </button>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>Filters</span>
              
              {/* Utility icons */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem', color: 'rgba(248, 250, 252, 0.3)' }}>
                <Folder size={14} style={{ cursor: 'pointer' }} />
                <Clock size={14} style={{ cursor: 'pointer' }} />
                <Copy size={14} style={{ cursor: 'pointer' }} />
              </div>
            </div>

            {/* Scrollable Accordions */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
              {[
                ['company', 'Company', filterCompany, setFilterCompany, 'e.g. Acme Corp', 'Target a specific corporate organization name.'],
                ['titles', 'Titles', filterTitles, setFilterTitles, 'e.g. CTO, Owner, VP', 'Target contacts matching particular decision-maker job roles.'],
                ['seniority', 'Seniority', filterSeniority, setFilterSeniority, 'e.g. Director, VP', 'Filter decision-makers by seniority level.'],
                ['department', 'Department', filterDepartment, setFilterDepartment, 'e.g. Engineering', 'Filter contacts by their corporate department.'],
                ['location', 'Location', filterLocation, setFilterLocation, 'e.g. London, UK', 'Specify the geographical region or city.'],
                ['keywords', 'Keywords', filterKeywords, setFilterKeywords, 'e.g. AWS, Azure', 'Target leads with specific profile keywords.'],
                ['industry', 'Industry', filterIndustry, setFilterIndustry, 'e.g. Cafe, Gym, Tech', 'Specify the company business category or industry.'],
                ['employeeSize', 'Employee Size', filterEmployeeSize, setFilterEmployeeSize, 'e.g. 10-50', 'Filter companies by their staff headcount ranges.'],
                ['revenue', 'Revenue', filterRevenue, setFilterRevenue, 'e.g. $1M-$5M', 'Filter companies by their annual revenue brackets.'],
              ].map(([key, label, value, setter, placeholder, desc]) => {
                const isOpen = !!expandedFilters[key];
                return (
                  <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '0.6rem 0.75rem' }}>
                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0' }}
                    >
                      <div 
                        onClick={() => setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1 }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isOpen ? '#a5b4fc' : 'rgba(248,250,252,0.65)' }}>
                          {label} {value && <span style={{ color: '#34d399', fontSize: '0.75rem', marginLeft: '4px' }}>•</span>}
                        </span>
                        <div className="tooltip-container" onClick={(e) => e.stopPropagation()}>
                          <HelpCircle size={11} style={{ color: 'rgba(248,250,252,0.25)', cursor: 'help' }} />
                          <span className="tooltip-text" style={{ bottom: '135%', left: '0%', transform: 'none', textAlign: 'left', width: '200px' }}>{desc}</span>
                        </div>
                      </div>
                      <span 
                        onClick={() => setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                        style={{ fontSize: '0.82rem', color: 'rgba(248,250,252,0.3)', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {isOpen ? '−' : '+'}
                      </span>
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: '0.5rem', paddingBottom: '0.3rem' }}>
                        <input
                          type="text"
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: '6px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#f8fafc', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none'
                          }}
                          placeholder={placeholder}
                          value={value}
                          onChange={e => setter(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
              <button 
                onClick={triggerDiscoverySearch}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff',
                  fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
                }}
              >
                Search
              </button>
              <button 
                onClick={() => {
                  setFilterCompany('');
                  setFilterTitles('');
                  setFilterSeniority('');
                  setFilterDepartment('');
                  setFilterLocation('');
                  setFilterKeywords('');
                  setFilterIndustry('');
                  setFilterEmployeeSize('');
                  setFilterRevenue('');
                }}
                style={{
                  padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.02)', color: 'rgba(248,250,252,0.6)',
                  fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Target size={18} color="#fff" />
                </div>
                {sidebarOpen && <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap' }}>LeadSphere AI</span>}
              </div>
              {sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'none', border: 'none', color: 'rgba(248, 250, 252, 0.4)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px',
                    borderRadius: '6px', transition: 'all 0.2s'
                  }}
                  title="Close Sidebar"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
              {NAV_ITEMS.map(({ id, label, Icon }) => (
                <div 
                  key={id} 
                  style={navItemStyle(activeTab === id)} 
                  onClick={() => {
                    setActiveTab(id);
                    if (id === 'discovery') {
                      setSidebarMode('filters');
                      setSidebarOpen(true);
                    } else {
                      setSidebarMode('navigation');
                      if (window.innerWidth <= 768) {
                        setSidebarOpen(false);
                      }
                    }
                  }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {sidebarOpen && <span>{label}</span>}
                </div>
              ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={onLogout} style={{
                width: '100%', padding: '0.6rem', borderRadius: 8, border: 'none',
                background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.82rem',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}>
                <LogOut size={15} />{sidebarOpen && 'Logout'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div className="dashboard-topbar" style={{
          padding: '0.85rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(9,10,15,0.9)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '1rem', backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background: 'none', border: 'none', color: 'rgba(248,250,252,0.5)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
              <Menu size={18} />
            </button>
            <span className="hide-on-mobile" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>{activeLabel}</span>
          </div>
          <div className="dashboard-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="hide-on-mobile" style={pill('green')}><CheckCircle size={12} />Live</span>
            {settings && (
              <button
                onClick={toggleAutopilot}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700,
                  background: settings.autoRespond ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                  color:      settings.autoRespond ? '#34d399'              : 'rgba(248,250,252,0.4)',
                  border: `1px solid ${settings.autoRespond ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  transition: 'all 0.2s', outline: 'none'
                }}
                title={settings.autoRespond ? "Autopilot is active. Click to pause." : "Autopilot is paused. Click to activate."}
              >
                {settings.autoRespond ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                <span>Autopilot: <strong>{settings.autoRespond ? 'ON' : 'OFF'}</strong></span>
              </button>
            )}
            <span style={pill('purple')}>{emailStats.sentToday}/{emailStats.dailyCap} <span className="hide-on-mobile">sent today</span></span>
            <button onClick={loadAll} style={{
              padding: '0.4rem 0.9rem', borderRadius: 10, border: '1px solid rgba(99,102,241,0.25)',
              background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: '0.82rem',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <RefreshCw size={14} /><span className="hide-on-mobile">Refresh</span>
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div className="dashboard-panel-content" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          {panels[activeTab]}
        </div>
      </div>

      {/* Toast notification */}
      {msg && (() => {
        let text = msg;
        let icon = null;
        if (msg.startsWith('✅')) {
          text = msg.replace(/^✅\s*/, '');
          icon = <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />;
        } else if (msg.startsWith('❌')) {
          text = msg.replace(/^❌\s*/, '');
          icon = <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />;
        } else if (msg.startsWith('⚠️')) {
          text = msg.replace(/^⚠️\s*/, '');
          icon = <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />;
        }

        return (
          <div style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
            padding: '0.8rem 1.25rem', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600,
            background: 'rgba(17,18,25,0.95)', border: '1px solid rgba(99,102,241,0.4)',
            color: '#f8fafc', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'slideIn 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {icon}
            <span>{text}</span>
          </div>
        );
      })()}
    </div>
  );
}
