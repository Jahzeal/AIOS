import { useState } from 'react';
import { Settings as SettingsIcon, Save, ToggleLeft, ToggleRight, HelpCircle } from 'lucide-react';
import { API, T, inputStyle } from './shared.jsx';

const FIELDS = [
  ['corporateName', 'Company Name',     'text',   'Your legal or brand name used to sign emails and customize sales pitches.'],
  ['email',         'Sender Email',     'email',  'The email address cold pitches will be sent from (must be validated in your Resend account).'],
  ['phoneNumber',   'Phone Number',     'text',   'Your business contact number included in the signature of outreach email templates.'],
  ['leadsPerDay',   'Daily Email Cap',  'number', 'The maximum number of automated cold emails the system can send per 24 hours.'],
  ['crawlLocation', 'Default Location', 'text',   'The fallback location/city used during automated background lead searches.'],
  ['crawlIndustry', 'Default Industry', 'text',   'The fallback search category or business niche used during automated background scrapes.'],
  ['crawlKeywords', 'Default Keywords / Titles', 'text', 'Comma-separated decision-maker roles (e.g. CTO, VP, Tech Lead) targeted in Apollo contact enrichment.'],
  ['bookingLink',   'Booking Link',     'url',    'Your personal calendar scheduling link (Google Calendar/Calendly) embedded in outreach pitches.'],
];

export default function SettingsPanel({ token, settings, setSettings, onNotify }) {
  const [focused, setFocused] = useState(null);

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
              style={inputStyle(focused === key)}
              value={settings[key] ?? ''}
              onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
              onFocus={() => setFocused(key)}
              onBlur={() => setFocused(null)}
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
    </div>
  );
}
