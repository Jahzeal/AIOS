import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Welcome from './routes/Welcome';
import AuthPage from './AuthPage';
// import Login from './login/Login'; // removed unused Login component
import Signup from './signup/Signup';
import Dashboard from './dashboard/Dashboard';
import Settings from './settings/Settings';
import ProtectedRoute from './routes/ProtectedRoute';

export default function AppRouter() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Persist token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.clear(); // Wipe ALL cached data, not just the token
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Routes>
          {/* If no token, show AuthPage (login/register) */}
          {!token && (
            <Route path="/" element={<AuthPage setToken={setToken} />} />
          )}
        {/* Authenticated routes */}
        {token && (
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
        )}
        {/* Public route for signup */}
        <Route path="/signup" element={<Signup setToken={setToken} />} />
        {/* Catch‑all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
