import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, ToggleLeft, ToggleRight, HelpCircle, Calendar } from 'lucide-react';
import { API, T, inputStyle } from './shared.jsx';

const FIELDS = [
  ['corporateName', 'Company Name',     'text',   'Your legal or brand name used to sign emails and customize sales pitches.'],
  ['email',         'Sender Email',     'email',  'The email address cold pitches will be sent from (must be validated in your Resend account).'],
  ['phoneNumber',   'Phone Number',     'text',   'Your business contact number included in the signature of outreach email templates.'],
  ['leadsPerDay',   'Daily Email Cap',  'number', 'The maximum number of automated cold emails the system can send per 24 hours.'],
  ['crawlLocation', 'Default Location', 'text',   'The fallback location/city used during automated background lead searches.'],
  ['crawlIndustry', 'Default Industry', 'text',   'The fallback search category or business niche used during automated background scrapes.'],
  ['crawlKeywords', 'Default Keywords / Titles', 'text', 'Comma-separated decision-maker roles (e.g. CTO, VP, Tech Lead) targeted in Apollo contact enrichment.'],
];

export default function SettingsPanel({ token, settings, setSettings, googleConnection, onRefreshConnection, onNotify }) {
  const [focused, setFocused] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Fetch calendars list if Google Calendar is connected
  useEffect(() => {
    if (googleConnection?.connected) {
      setLoadingCalendars(true);
      API('/api/meetings/google/calendars', token)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCalendars(data);
          }
        })
        .catch(err => console.error('Failed to load calendars:', err))
        .finally(() => setLoadingCalendars(false));
    } else {
      setCalendars([]);
    }
  }, [googleConnection, token]);

  const handleConnectCalendar = async () => {
    try {
      const res = await API('/api/meetings/google/auth-url', token);
      if (res.ok) {
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      } else {
        onNotify('❌ Failed to fetch connection URL');
      }
    } catch {
      onNotify('❌ Connection error');
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;
    try {
      const res = await API('/api/meetings/google/disconnect', token, { method: 'POST' });
      if (res.ok) {
        onNotify('✅ Google Calendar disconnected');
        onRefreshConnection();
      } else {
        onNotify('❌ Failed to disconnect');
      }
    } catch {
      onNotify('❌ Connection error');
    }
  };

  const handleSelectCalendar = async (calendarId) => {
    try {
      const res = await API('/api/meetings/google/select-calendar', token, {
        method: 'POST',
        body: JSON.stringify({ calendarId }),
      });
      if (res.ok) {
        onNotify('✅ Sync calendar updated');
        onRefreshConnection();
      } else {
        onNotify('❌ Failed to update calendar');
      }
    } catch {
      onNotify('❌ Connection error');
    }
  };

  if (!settings) {
    return (
      <div style={{ color: 'rgba(248,250,252,0.4)', textAlign: 'center', padding: '2rem' }}>
        Loading settings…
      </div>
    );
  }

  const saveSettings = async () => {
    const res = await API('/api/email/settings', token, { method: 'POST', body: JSON.stringify(settings) });
    if (res.ok) onNotify('✅ Settings saved');
    else onNotify('❌ Failed to save');
  };

  return (
    <div style={T.card}>
      <div style={T.sectionTitle}><SettingsIcon size={16} />Settings</div>
      <p style={{ fontSize: '0.8rem', color: 'rgba(248, 250, 252, 0.45)', lineHeight: '1.4', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
        Configure your cold outreach parameters, autopilot email caps, default search industry niches, and targeted decision-maker titles.
      </p>

      {/* Field grid */}
      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        {FIELDS.map(([key, label, type, desc]) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem' }}>
              <label style={{ ...T.label, margin: 0 }} htmlFor={`setting-${key}`}>{label}</label>
              <div className="tooltip-container">
                <HelpCircle size={12} style={{ color: 'rgba(248,250,252,0.3)', cursor: 'help' }} />
                <span className="tooltip-text">{desc}</span>
              </div>
            </div>
            <input
              id={`setting-${key}`}
              type={type}
              style={{
                ...inputStyle(focused === key),
                ...(key === 'email' ? { cursor: 'not-allowed', opacity: 0.6, background: 'rgba(255,255,255,0.02)' } : {})
              }}
              value={settings[key] ?? ''}
              onChange={e => {
                if (key !== 'email') {
                  setSettings(s => ({ ...s, [key]: e.target.value }));
                }
              }}
              onFocus={() => {
                if (key !== 'email') setFocused(key);
              }}
              onBlur={() => setFocused(null)}
              readOnly={key === 'email'}
            />
          </div>
        ))}
      </div>

      {/* Auto-respond toggle */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <label style={{ ...T.label, margin: 0 }}>Auto-Respond</label>
          <button
            onClick={() => setSettings(s => ({ ...s, autoRespond: !s.autoRespond }))}
            style={{
              padding: '4px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700,
              background: settings.autoRespond ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)',
              color:      settings.autoRespond ? '#34d399'              : '#94a3b8',
              outline: `1px solid ${settings.autoRespond ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.2)'}`,
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            {settings.autoRespond
              ? <><ToggleRight size={16} />ON</>
              : <><ToggleLeft  size={16} />OFF</>}
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'rgba(248, 250, 252, 0.45)', lineHeight: '1.4', margin: 0 }}>
          {settings.autoRespond 
            ? "Autopilot is active: discovered leads will be emailed immediately after scraping." 
            : "Autopilot is inactive: leads will be saved as 'PENDING', allowing you to manually trigger emails."}
        </p>
      </div>

      {/* Email template */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={T.label} htmlFor="setting-emailTemplate">Email Template Prompt</label>
        <textarea
          id="setting-emailTemplate"
          style={{ ...inputStyle(focused === 'emailTemplate'), minHeight: 80, resize: 'vertical' }}
          value={settings.emailTemplate ?? ''}
          onChange={e => setSettings(s => ({ ...s, emailTemplate: e.target.value }))}
          onFocus={() => setFocused('emailTemplate')}
          onBlur={() => setFocused(null)}
        />
      </div>

      <button
        onClick={saveSettings}
        style={{ ...T.btn, ...T.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Save size={15} />Save Settings
      </button>

      {/* Google Calendar Connection Card */}
      <div style={{ ...T.card, marginTop: '1.5rem' }}>
        <div style={T.sectionTitle}>
          <Calendar size={16} /> Google Calendar Connection
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgba(248, 250, 252, 0.45)', lineHeight: '1.4', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
          Connect your Google calendar to enable automatic meeting synchronization directly onto the dashboard.
        </p>

        {!googleConnection?.connected ? (
          <div>
            <button
              onClick={handleConnectCalendar}
              style={{
                ...T.btn,
                background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                color: '#fff',
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              📅 Connect Google Calendar
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'rgba(248,250,252,0.45)' }}>Connected as:</span>
                <span style={{ fontSize: '0.87rem', fontWeight: 600, color: '#f8fafc' }}>{googleConnection.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'rgba(248,250,252,0.45)' }}>Status:</span>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 700, color: '#34d399',
                  display: 'inline-flex', alignItems: 'center', gap: '5px'
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                  Connected & Syncing
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                <label style={{ ...T.label, fontSize: '0.82rem', color: 'rgba(248,250,252,0.45)', margin: 0 }} htmlFor="calendar-select">
                  Select Sync Calendar:
                </label>
                {loadingCalendars ? (
                  <span style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)' }}>Loading calendars…</span>
                ) : (
                  <select
                    id="calendar-select"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 10,
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f8fafc',
                      fontSize: '0.87rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    value={googleConnection.calendarId}
                    onChange={e => handleSelectCalendar(e.target.value)}
                  >
                    {calendars.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#0f111a', color: '#f8fafc' }}>
                        {c.summary} {c.primary ? '(Primary)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ ...T.label, fontSize: '0.82rem', color: 'rgba(248,250,252,0.45)', margin: 0 }} htmlFor="setting-bookingLink">
                    Google Appointment Schedule / Booking Link:
                  </label>
                  <div className="tooltip-container">
                    <HelpCircle size={12} style={{ color: 'rgba(248,250,252,0.3)', cursor: 'help' }} />
                    <span className="tooltip-text">
                      Your Google Appointment Schedule booking page URL embedded in cold email outreach pitches.
                    </span>
                  </div>
                </div>
                <input
                  id="setting-bookingLink"
                  type="url"
                  style={inputStyle(focused === 'bookingLink')}
                  value={settings.bookingLink ?? ''}
                  onChange={e => setSettings(s => ({ ...s, bookingLink: e.target.value }))}
                  onFocus={() => setFocused('bookingLink')}
                  onBlur={() => setFocused(null)}
                  placeholder="https://calendar.app.google/..."
                />
              </div>
            </div>

            <button
              onClick={handleDisconnectCalendar}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: 10,
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: '#fca5a5',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
            >
              Disconnect Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
