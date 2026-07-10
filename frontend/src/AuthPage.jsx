import { useState, useEffect, useRef } from 'react';

const FEATURES = [
  { icon: '🎯', title: 'Smart Lead Discovery', desc: 'AI scrapes and qualifies leads 24/7 across the web.' },
  { icon: '✉️', title: 'Automated Outreach', desc: 'Personalised emails sent on your behalf at scale.' },
  { icon: '📊', title: 'Real-Time Analytics', desc: 'Track opens, replies, and meetings in one dashboard.' },
];

const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ─── PasswordField — defined OUTSIDE AuthPage so it has a stable identity ───
// If defined inside, React recreates it on every render → input loses focus.
function PasswordField({ id, label, value, onChange, show, onToggle, focused, onFocus, onBlur }) {
  const inputStyle = {
    width: '100%', padding: '0.75rem 2.75rem 0.75rem 1rem', borderRadius: 12,
    background: focused ? 'rgba(99,102,241,0.07)' : 'rgba(0,0,0,0.3)',
    border: focused ? '1.5px solid rgba(99,102,241,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
    color: '#f8fafc', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s ease',
    boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(248,250,252,0.55)', marginBottom: '0.45rem', letterSpacing: '0.3px', textTransform: 'uppercase' }} htmlFor={id}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          style={inputStyle}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="••••••••••"
          required
        />
        <button
          type="button"
          style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,250,252,0.35)', display: 'flex', alignItems: 'center', padding: 0 }}
          onClick={onToggle}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(248,250,252,0.8)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(248,250,252,0.35)')}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOpen /> : <EyeClosed />}
        </button>
      </div>
    </div>
  );
}

// 6-box OTP input
function OtpInput({ value, onChange }) {
  const inputs = useRef([]);

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !e.target.value && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = v;
    const next = arr.join('').padEnd(6, '').slice(0, 6);
    onChange(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted.padEnd(6, '').slice(0, 6));
      inputs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', margin: '1.5rem 0' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 48, height: 56, textAlign: 'center',
            fontSize: '1.5rem', fontWeight: 700,
            background: value[i] ? 'rgba(99,102,241,0.12)' : 'rgba(0,0,0,0.3)',
            border: value[i] ? '2px solid rgba(99,102,241,0.7)' : '2px solid rgba(255,255,255,0.1)',
            borderRadius: 12, color: '#f8fafc',
            outline: 'none', transition: 'all 0.2s ease',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );
}

export default function AuthPage({ setToken }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [orbs, setOrbs] = useState([]);
  const [googleClientId, setGoogleClientId] = useState(null);

  // Fetch Google Client ID on mount
  useEffect(() => {
    fetch('/api/auth/google/client-id')
      .then((res) => res.json())
      .then((data) => {
        if (data.clientId) {
          setGoogleClientId(data.clientId);
        }
      })
      .catch((err) => console.error('Failed to fetch Google Client ID:', err));
  }, []);

  // Load Google Identity Services SDK
  useEffect(() => {
    if (!googleClientId) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [googleClientId]);

  // Handle Google Token Response
  const handleGoogleLoginSuccess = async (response) => {
    const credential = response.credential;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        const err = await res.json();
        setError(err.message || 'Google Sign-In failed');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize and Render Google Sign-in button
  useEffect(() => {
    if (!googleClientId || mode === 'verify') return;

    const initGoogle = () => {
      if (typeof window.google === 'undefined') {
        setTimeout(initGoogle, 100);
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleLoginSuccess,
        });

        const container = document.getElementById('google-signin-btn-container');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: 360,
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'center',
          });
        }
      } catch (err) {
        console.error('Error initializing Google Identity Services:', err);
      }
    };

    initGoogle();
  }, [googleClientId, mode]);

  useEffect(() => {
    setOrbs(
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        size: 120 + Math.random() * 200,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: 8 + Math.random() * 12,
        delay: Math.random() * 5,
        color: i % 2 === 0 ? 'rgba(99,102,241,0.18)' : 'rgba(217,70,239,0.14)',
      }))
    );
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // ─── Login ───────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        const err = await res.json();
        setError(err.message || 'Invalid credentials');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 1: Send OTP ─────────────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setMode('verify');
        setOtpCode('');
        setSuccess(`A 6-digit code was sent to ${email}`);
        setResendCountdown(60);
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to send code');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP + Register ────────────────────────────────
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (otpCode.replace(/\s/g, '').length < 6) { setError('Please enter the full 6-digit code.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, code: otpCode }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        const err = await res.json();
        setError(err.message || 'Verification failed');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setOtpCode('');
        setSuccess('A new code was sent!');
        setResendCountdown(60);
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to resend');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m); setError(''); setSuccess('');
    setPassword(''); setConfirmPassword(''); setOtpCode('');
    setShowPassword(false); setShowConfirmPassword(false);
  };

  /* ─── Styles ─── */
  const S = {
    page: {
      display: 'flex', minHeight: '100vh', width: '100%',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      background: '#080a12', overflow: 'hidden',
    },
    left: {
      flex: '1 1 50%', position: 'relative',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '3rem 4rem', overflow: 'hidden',
      background: 'linear-gradient(135deg, #0d0f1f 0%, #12102a 100%)',
    },
    leftOverlay: {
      position: 'absolute', inset: 0,
      background:
        'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(99,102,241,0.18) 0%, transparent 70%),' +
        'radial-gradient(ellipse 60% 50% at 80% 70%, rgba(217,70,239,0.14) 0%, transparent 60%)',
      pointerEvents: 'none',
    },
    orb: (o) => ({
      position: 'absolute', left: `${o.x}%`, top: `${o.y}%`,
      width: o.size, height: o.size, borderRadius: '50%',
      background: o.color, filter: 'blur(60px)',
      animation: `floatOrb${o.id} ${o.duration}s ${o.delay}s ease-in-out infinite alternate`,
      pointerEvents: 'none',
    }),
    logo: { position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' },
    logoIcon: {
      width: 44, height: 44, borderRadius: 12,
      background: 'linear-gradient(135deg, #6366f1, #d946ef)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, boxShadow: '0 0 24px rgba(99,102,241,0.5)',
    },
    logoText: { fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' },
    heroHeading: {
      position: 'relative', zIndex: 2,
      fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.15,
      color: '#f8fafc', marginBottom: '1rem', letterSpacing: '-1px',
    },
    heroGradient: { background: 'linear-gradient(90deg, #6366f1, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    heroSub: { position: 'relative', zIndex: 2, fontSize: '1.05rem', color: 'rgba(248,250,252,0.55)', marginBottom: '3rem', maxWidth: 420, lineHeight: 1.7 },
    featureList: { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    featureItem: {
      display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.25rem',
      borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    },
    featureIconWrap: {
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(217,70,239,0.2))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
    },
    featureTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' },
    featureDesc: { fontSize: '0.8rem', color: 'rgba(248,250,252,0.5)', lineHeight: 1.5 },

    right: {
      flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', background: '#080a12', position: 'relative', overflowY: 'auto',
    },
    rightGlow: {
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
      pointerEvents: 'none',
    },
    card: {
      position: 'relative', zIndex: 1, width: '100%', maxWidth: 440,
      padding: '2.5rem', borderRadius: 24,
      background: 'rgba(16,18,28,0.85)', border: '1px solid rgba(255,255,255,0.09)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
    },
    cardTitle: { fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem', letterSpacing: '-0.5px' },
    cardSub: { fontSize: '0.85rem', color: 'rgba(248,250,252,0.45)', marginBottom: '2rem' },
    modeTabs: {
      display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12,
      padding: 4, marginBottom: '1.75rem', border: '1px solid rgba(255,255,255,0.06)',
    },
    modeTab: (active) => ({
      flex: 1, padding: '0.55rem 1rem', borderRadius: 9, border: 'none',
      fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s ease',
      background: active ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : 'transparent',
      color: active ? '#fff' : 'rgba(248,250,252,0.4)',
      boxShadow: active ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
      fontFamily: 'inherit',
    }),
    formGroup: { marginBottom: '1.1rem' },
    label: {
      display: 'block', fontSize: '0.78rem', fontWeight: 600,
      color: 'rgba(248,250,252,0.55)', marginBottom: '0.45rem',
      letterSpacing: '0.3px', textTransform: 'uppercase',
    },
    inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
    input: (focused) => ({
      width: '100%', padding: '0.75rem 2.75rem 0.75rem 1rem', borderRadius: 12,
      background: focused ? 'rgba(99,102,241,0.07)' : 'rgba(0,0,0,0.3)',
      border: focused ? '1.5px solid rgba(99,102,241,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
      color: '#f8fafc', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s ease',
      boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
      fontFamily: 'inherit', boxSizing: 'border-box',
    }),
    eyeBtn: {
      position: 'absolute', right: '0.75rem', background: 'none', border: 'none',
      cursor: 'pointer', color: 'rgba(248,250,252,0.35)',
      display: 'flex', alignItems: 'center', padding: 0, transition: 'color 0.2s ease',
    },
    errorBox: {
      padding: '0.7rem 1rem', borderRadius: 10,
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
      color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1rem',
    },
    successBox: {
      padding: '0.7rem 1rem', borderRadius: 10,
      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
      color: '#6ee7b7', fontSize: '0.82rem', marginBottom: '1rem',
    },
    submitBtn: (isLoading) => ({
      width: '100%', padding: '0.9rem', borderRadius: 12, border: 'none',
      background: isLoading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
      color: '#fff', fontSize: '0.95rem', fontWeight: 700,
      cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.25s ease',
      boxShadow: '0 8px 24px rgba(99,102,241,0.35)', letterSpacing: '0.2px',
      fontFamily: 'inherit', marginTop: '0.25rem',
    }),
    forgotLink: {
      display: 'block', textAlign: 'right', background: 'none', border: 'none',
      color: 'rgba(129,140,248,0.7)', fontSize: '0.78rem', cursor: 'pointer',
      fontFamily: 'inherit', marginBottom: '1.25rem', padding: 0,
    },
    footer: { textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'rgba(248,250,252,0.35)' },
    footerLink: {
      background: 'none', border: 'none', color: '#818cf8',
      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0,
    },
  };

  // PasswordField is defined outside this component (above) to avoid focus-loss bug

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes floatOrb0 { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,-40px) scale(1.1); } }
        @keyframes floatOrb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(-25px,35px) scale(0.95); } }
        @keyframes floatOrb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px,20px) scale(1.05); } }
        @keyframes floatOrb3 { from { transform: translate(0,0) scale(1); } to { transform: translate(-30px,-30px) scale(1.08); } }
        @keyframes floatOrb4 { from { transform: translate(0,0) scale(1); } to { transform: translate(20px,40px) scale(0.9); } }
        @keyframes floatOrb5 { from { transform: translate(0,0) scale(1); } to { transform: translate(-20px,25px) scale(1.12); } }
        input::placeholder { color: rgba(248,250,252,0.2); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px rgba(0,0,0,0.4) inset !important;
          -webkit-text-fill-color: #f8fafc !important;
        }
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-right { flex: 1 !important; }
        }
        @keyframes buttonPulse {
          0% { opacity: 0.6; }
          100% { opacity: 0.95; }
        }
      `}</style>

      <div style={S.page}>
        {/* ── LEFT PANEL ── */}
        <div style={S.left} className="auth-left">
          <div style={S.leftOverlay} />
          {orbs.map((o) => <div key={o.id} style={S.orb(o)} />)}
          <div style={S.logo}>
            <div style={S.logoIcon}>🎯</div>
            <span style={S.logoText}>LeadSphere AI</span>
          </div>
          <h1 style={S.heroHeading}>
            Close deals<br />
            <span style={S.heroGradient}>10× faster</span><br />
            with AI.
          </h1>
          <p style={S.heroSub}>
            Discover qualified leads, send personalised outreach, and book meetings — fully automated.
          </p>
          <div style={S.featureList}>
            {FEATURES.map((f) => (
              <div key={f.title} style={S.featureItem}>
                <div style={S.featureIconWrap}>{f.icon}</div>
                <div>
                  <div style={S.featureTitle}>{f.title}</div>
                  <div style={S.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={S.right} className="auth-right">
          <div style={S.rightGlow} />
          <div style={S.card}>

            {/* ── VERIFY EMAIL STEP ── */}
            {mode === 'verify' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: 48, marginBottom: '0.5rem' }}>📬</div>
                  <h2 style={S.cardTitle}>Check your email</h2>
                  <p style={{ ...S.cardSub, marginBottom: '0.25rem' }}>
                    We sent a 6-digit code to
                  </p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#818cf8', marginBottom: '1.5rem' }}>
                    {email}
                  </p>
                </div>

                {success && <div style={S.successBox}>✅ {success}</div>}
                {error && <div style={S.errorBox}>⚠️ {error}</div>}

                <form onSubmit={handleVerifyAndRegister}>
                  <OtpInput value={otpCode} onChange={setOtpCode} />

                  <button
                    type="submit" disabled={loading || otpCode.replace(/\D/g,'').length < 6}
                    style={S.submitBtn(loading || otpCode.replace(/\D/g,'').length < 6)}
                  >
                    {loading ? 'Verifying…' : '→  Verify & Create Account'}
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'rgba(248,250,252,0.4)' }}>
                  Didn't receive it?{' '}
                  <button
                    onClick={handleResend} disabled={resendCountdown > 0}
                    style={{
                      background: 'none', border: 'none', padding: 0, fontFamily: 'inherit',
                      fontSize: 'inherit', cursor: resendCountdown > 0 ? 'default' : 'pointer',
                      color: resendCountdown > 0 ? 'rgba(129,140,248,0.4)' : '#818cf8',
                      fontWeight: 600,
                    }}
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                  </button>
                </div>
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <button onClick={() => switchMode('register')} style={{ ...S.footerLink, fontSize: '0.8rem', color: 'rgba(248,250,252,0.35)' }}>
                    ← Go back
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={S.cardTitle}>
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                <p style={S.cardSub}>
                  {mode === 'login'
                    ? 'Sign in to your LeadSphere AI dashboard.'
                    : 'Start closing more deals today. Free to try.'}
                </p>

                {/* Mode tabs */}
                <div style={S.modeTabs}>
                  <button style={S.modeTab(mode === 'login')} onClick={() => switchMode('login')}>Login</button>
                  <button style={S.modeTab(mode === 'register')} onClick={() => switchMode('register')}>Sign Up</button>
                </div>

                {error && <div style={S.errorBox}>⚠️ {error}</div>}

                {/* LOGIN FORM */}
                {mode === 'login' && (
                  <form onSubmit={handleLogin}>
                    <div style={S.formGroup}>
                      <label style={S.label} htmlFor="email">Email address</label>
                      <div style={S.inputWrap}>
                        <input
                          id="email" type="email"
                          style={S.input(focusedField === 'email')}
                          value={email} onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="you@company.com" required
                        />
                      </div>
                    </div>
                    <PasswordField
                      id="password" label="Password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      show={showPassword} onToggle={() => setShowPassword((p) => !p)}
                      focused={focusedField === 'password'}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <button type="button" style={S.forgotLink} onClick={(e) => e.preventDefault()}>
                      Forgot password?
                    </button>
                    <button
                      type="submit" disabled={loading} style={S.submitBtn(loading)}
                      onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)'; } }}
                      onMouseLeave={(e) => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.35)'; }}
                    >
                      {loading ? 'Signing in…' : '→  Sign In'}
                    </button>
                  </form>
                )}

                {/* REGISTER FORM (Step 1) */}
                {mode === 'register' && (
                  <form onSubmit={handleSendCode}>
                    <div style={S.formGroup}>
                      <label style={S.label} htmlFor="reg-username">Username</label>
                      <div style={S.inputWrap}>
                        <input
                          id="reg-username" type="text"
                          style={S.input(focusedField === 'reg-username')}
                          value={username} onChange={(e) => setUsername(e.target.value)}
                          onFocus={() => setFocusedField('reg-username')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="yourname" required
                        />
                      </div>
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label} htmlFor="reg-email">Email address</label>
                      <div style={S.inputWrap}>
                        <input
                          id="reg-email" type="email"
                          style={S.input(focusedField === 'reg-email')}
                          value={email} onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('reg-email')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="you@company.com" required
                        />
                      </div>
                    </div>
                    <PasswordField
                      id="reg-password" label="Password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      show={showPassword} onToggle={() => setShowPassword((p) => !p)}
                      focused={focusedField === 'reg-password'}
                      onFocus={() => setFocusedField('reg-password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <PasswordField
                      id="reg-confirm" label="Confirm Password"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      show={showConfirmPassword} onToggle={() => setShowConfirmPassword((p) => !p)}
                      focused={focusedField === 'reg-confirm'}
                      onFocus={() => setFocusedField('reg-confirm')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <button
                      type="submit" disabled={loading} style={S.submitBtn(loading)}
                      onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)'; } }}
                      onMouseLeave={(e) => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.35)'; }}
                    >
                      {loading ? 'Sending code…' : '→  Send Verification Code'}
                    </button>
                  </form>
                )}

                {/* Google Sign In Divider and Button */}
                {googleClientId && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'rgba(248,250,252,0.35)', fontSize: '0.8rem' }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                      <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                    <div id="google-signin-btn-container" style={{ display: 'flex', justifyContent: 'center', minHeight: '40px', width: '100%' }}>
                      <div style={{
                        width: 360, height: 40, borderRadius: 20,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.82rem', color: 'rgba(248,250,252,0.35)',
                        animation: 'buttonPulse 1.2s infinite alternate',
                        pointerEvents: 'none',
                        fontFamily: 'inherit',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 10, fill: 'currentColor' }}>
                          <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.44 0-6.228-2.788-6.228-6.228 0-3.44 2.788-6.228 6.228-6.228 1.492 0 2.855.526 3.93 1.402l3.125-3.125C18.995 2.127 15.827 1 12.24 1 6.033 1 12.24 12.24s5.033 11.24 11.24 11.24c6.478 0 11.24-4.55 11.24-11.24 0-.768-.068-1.514-.2-2.222H12.24z"/>
                        </svg>
                        Loading Google Account details…
                      </div>
                    </div>
                  </>
                )}

                <div style={S.footer}>
                  {mode === 'login' ? (
                    <>Don't have an account?{' '}
                      <button style={S.footerLink} onClick={() => switchMode('register')}>Sign up free</button>
                    </>
                  ) : (
                    <>Already have an account?{' '}
                      <button style={S.footerLink} onClick={() => switchMode('login')}>Sign in</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
