import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import LoginPage from './components/login-page';
import Frontpage from './components/Frontpage';
import MainPage from './components/Main-page';
import LiveCall from './components/Live-call';
import MessagesPage from './components/Messegespage';
import PhotoboothPage from './components/Photobooth-page';
import PhotoboothSoloPage from './components/Photoboothsolo-page';
import PhotoboothDuo from './components/PhotoboothDuo-page';
import UserProfilePage from './components/Users-profilepage';
import './style/App.css';

// Kapag hindi naka-login (walang session at hindi guest), ibabalik sa login page.
function ProtectedRoute({ allowed, children }) {
  return allowed ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  // Local guest (pansamantala, naka-save sa browser)
  const [guest, setGuest] = useState(
    () => localStorage.getItem('snapsync_guest') === '1'
  );
  const isLoggedIn = !!session || guest;

  const handleGuest = () => {
    localStorage.setItem('snapsync_guest', '1');
    setGuest(true);
  };

  useEffect(() => {
    // Check kung may naka-save nang login
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setChecking(false));

    // Makikinig sa login / logout / guest
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Habang chine-check pa ang session, dark screen muna (para hindi mag-flash ang login)
  if (checking) {
    return <div style={{ minHeight: '100vh', background: '#0d0c10' }} />;
  }

  return (
    <Router>
      <Routes>
        {/* Login muna. Kapag naka-login na, derecho na sa /welcome */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to="/welcome" replace />
            ) : (
              <LoginPage onContinueAsGuest={handleGuest} />
            )
          }
        />

        {/* Frontpage na may "Start Your Connection" */}
        <Route
          path="/welcome"
          element={<ProtectedRoute allowed={isLoggedIn}><Frontpage /></ProtectedRoute>}
        />

        <Route
          path="/main"
          element={<ProtectedRoute allowed={isLoggedIn}><MainPage /></ProtectedRoute>}
        />
        <Route
          path="/live-call"
          element={<ProtectedRoute allowed={isLoggedIn}><LiveCall /></ProtectedRoute>}
        />
        <Route
          path="/messages"
          element={<ProtectedRoute allowed={isLoggedIn}><MessagesPage /></ProtectedRoute>}
        />
        <Route
          path="/photobooth"
          element={<ProtectedRoute allowed={isLoggedIn}><PhotoboothPage /></ProtectedRoute>}
        />
        <Route
          path="/photobooth/solo"
          element={<ProtectedRoute allowed={isLoggedIn}><PhotoboothSoloPage /></ProtectedRoute>}
        />
        <Route
          path="/photobooth/duo"
          element={<ProtectedRoute allowed={isLoggedIn}><PhotoboothDuo /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute allowed={isLoggedIn}><UserProfilePage /></ProtectedRoute>}
        />
      </Routes>
    </Router>
  );
}