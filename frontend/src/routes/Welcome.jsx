import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Welcome({ setSeenWelcome }) {
  const navigate = useNavigate();

  // Extract email from token for a friendly greeting (simple split, no verification)
  const token = localStorage.getItem('token');
  let email = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      email = payload.email || '';
    } catch {
      // ignore parsing errors
    }
  }

  const handleContinue = () => {
    setSeenWelcome(true);
    navigate('/dashboard');
  };

  useEffect(() => {
    // In case user lands here without a token, redirect to login
    if (!token) navigate('/login');
  }, [token, navigate]);

  return (
    <div className="welcome-page glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome{email ? `, ${email}` : ''}!</h1>
      <p>Thanks for joining AIOS. Click below to continue to your dashboard.</p>
      <button className="submit-btn" onClick={handleContinue}>Continue to Dashboard</button>
    </div>
  );
}
