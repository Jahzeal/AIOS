import { useState, useEffect } from 'react';
import { Search, Clock, Loader, Trash2, X, FolderOpen, Square } from 'lucide-react';
import { API, T, StatusBadge, inputStyle } from './shared.jsx';

export default function Discovery({ token, jobs, onRefresh, onNotify, onViewJobLeads, settings }) {
  const [discMode, setDiscMode] = useState('search');
  const [query,    setQuery]    = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [urls,     setUrls]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState(null);

  useEffect(() => {
    if (settings) {
      setQuery(prev => prev || settings.crawlIndustry || '');
      setLocation(prev => prev || settings.crawlLocation || '');
      setKeywords(prev => prev || settings.crawlKeywords || '');
    }
  }, [settings]);

  const tabStyle = (active) => ({
    padding: '0.5rem 1.1rem', borderRadius: 8,
    border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
    transition: 'all 0.18s',
    background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
    color:      active ? '#a5b4fc'              : 'rgba(248,250,252,0.4)',
  });

  const startJob = async () => {
    if (discMode === 'search' && (!query || !location)) { onNotify('⚠️ Enter query and location'); return; }
    if (discMode === 'urls'   && !urls.trim())           { onNotify('⚠️ Enter at least one URL');  return; }
    setLoading(true);
    try {
      const endpoint = discMode === 'search' ? '/api/jobs/search' : '/api/jobs/urls';
      const body     = discMode === 'search'
        ? { query, location, keywords }
        : { urls: urls.split('\n').filter(Boolean) };
      const res = await API(endpoint, token, { method: 'POST', body: JSON.stringify(body) });
      if (res.ok) {
        onNotify('✅ Job started!');
        setQuery(''); setLocation(''); setKeywords(''); setUrls('');
        onRefresh();
      } else {
        const e = await res.json();
        onNotify(`❌ ${e.message}`);
      }
    } catch { onNotify('❌ Network error'); }
    setLoading(false);
  };

  const deleteJob = async (id) => {
    await API(`/api/jobs/${id}`, token, { method: 'DELETE' });
    onRefresh();
  };

  const stopJob = async (id) => {
    try {
      const res = await API(`/api/jobs/${id}/stop`, token, { method: 'POST' });
      if (res.ok) {
        onNotify('⏹️ Job stopping...');
        onRefresh();
      } else {
        const e = await res.json();
        onNotify(`❌ ${e.message}`);
      }
    } catch {
      onNotify('❌ Network error stopping job');
    }
  };

  return (
    <div style={T.card}>
      <div style={T.sectionTitle}><Search size={16} />Lead Discovery</div>
      <p style={{ fontSize: '0.8rem', color: 'rgba(248, 250, 252, 0.45)', lineHeight: '1.4', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
        Launch automated B2B web scraping jobs. Enter custom keywords/titles to target specific roles manually, or leave it to inherit your default settings configuration.
      </p>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        <button style={tabStyle(discMode === 'search')} onClick={() => setDiscMode('search')}>Search Discovery</button>
        <button style={tabStyle(discMode === 'urls')}   onClick={() => setDiscMode('urls')}>Direct URL List</button>
      </div>

      {discMode === 'search' ? (
        <div style={{ 
          padding: '2.5rem 1.5rem', background: 'rgba(99, 102, 241, 0.02)', 
          border: '1px dashed rgba(99, 102, 241, 0.2)', borderRadius: '12px',
          textAlign: 'center', marginBottom: '1.25rem'
        }}>
          <Search size={32} style={{ color: '#818cf8', marginBottom: '0.75rem', opacity: 0.7 }} />
          <h4 style={{ margin: '0 0 0.4rem 0', color: '#f8fafc', fontSize: '0.9rem', fontWeight: 700 }}>Custom Search Filters Active</h4>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(248, 250, 252, 0.45)', lineHeight: 1.5 }}>
            Configure your target niche, location, role titles, and company filters inside the left sidebar. <br/>
            Click <strong>"Search"</strong> at the bottom of the filters list to trigger the discovery campaign.
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <label style={T.label}>URLs (one per line)</label>
            <textarea
              style={{ ...inputStyle(focused === 'urls'), minHeight: 120, resize: 'vertical' }}
              value={urls}
              onChange={e => setUrls(e.target.value)}
              onFocus={() => setFocused('urls')}
              onBlur={() => setFocused(null)}
              placeholder={'https://example.com\nhttps://another.com'}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              onClick={startJob}
              disabled={loading}
              style={{ ...T.btn, ...T.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? <><Loader size={15} />Starting…</> : <><Search size={15} />Start Scrape</>}
            </button>
          </div>
        </>
      )}

      {/* Jobs table */}
      <div style={{ marginTop: '2rem' }}>
        <div style={T.sectionTitle}><Clock size={16} />Active Scrape Jobs</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={T.th}>Query</th>
                <th style={T.th}>Location</th>
                <th style={T.th}>Status</th>
                <th style={T.th}>Leads</th>
                <th style={T.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td style={T.td}>
                    <button 
                      onClick={() => onViewJobLeads(j.id)}
                      style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 0, font: 'inherit', textAlign: 'left', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      {j.query || 'URL List'}
                    </button>
                  </td>
                  <td style={T.td}>{j.location || '—'}</td>
                  <td style={T.td}><StatusBadge status={j.status} /></td>
                  <td style={T.td}>{j._count?.leads ?? j.leads?.length ?? 0}</td>
                  <td style={T.td} style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => onViewJobLeads(j.id)}
                      title="View Leads"
                      style={{ ...T.btn, ...T.btnPrimary, padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }}
                    >
                      <FolderOpen size={13} />
                    </button>
                    {(j.status === 'PENDING' || j.status === 'PROCESSING') && (
                      <button
                        onClick={() => stopJob(j.id)}
                        title="Stop Job"
                        style={{ ...T.btn, ...T.btnDanger, padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                      >
                        <Square size={13} fill="#f87171" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteJob(j.id)}
                      title="Delete Job"
                      style={{ ...T.btn, ...T.btnDanger, padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jobs.length === 0 && <div style={T.emptyMsg}>No jobs yet. Start a discovery above.</div>}
      </div>
    </div>
  );
}
