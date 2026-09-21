import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Welcome from './routes/Welcome';
import Dashboard from './dashboard/Dashboard';
import Settings from './settings/Settings';
import ProtectedRoute from './routes/ProtectedRoute';

const FLUCTURE_LOGIN_URL = process.env.REACT_APP_FLUCTURE_URL || 'http://localhost:3000/login';

function RedirectToFlucture() {
  useEffect(() => {
    window.location.href = FLUCTURE_LOGIN_URL;
  }, []);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d14', color: '#fff', fontFamily: 'sans-serif' }}>
      <p>Redirecting to Flucture Single Sign-On...</p>
    </div>
  );
}

export default function AppRouter() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    window.location.href = FLUCTURE_LOGIN_URL;
  };

  return (
    <BrowserRouter>
      <Routes>
        {token ? (
          <>
            <Route path="/welcome" element={<Welcome token={token} setToken={setToken} />} />
            <Route
              path="/dashboard"
              element={<ProtectedRoute token={token}><Dashboard token={token} onLogout={handleLogout} /></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute token={token}><Settings token={token} /></ProtectedRoute>}
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<RedirectToFlucture />} />
            <Route path="/signup" element={<RedirectToFlucture />} />
            <Route path="/login" element={<RedirectToFlucture />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
