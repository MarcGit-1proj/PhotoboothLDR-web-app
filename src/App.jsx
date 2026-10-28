import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { PresenceProvider } from './context/PresenceContext';
import LoginPage from './components/login-page';
import Frontpage from './components/Frontpage';
import MainPage from './components/Main-page';
import LiveCall from './components/Live-call';
import MessagesPage from './components/Messegespage';
import PhotoboothPage from './components/Photobooth-page';
import PhotoboothSoloPage from './components/Photoboothsolo-page';
import PhotoboothDuo from './components/PhotoboothDuo-page';
import UserProfilePage from './components/Users-profilepage';
import NicknameModal from './components/NicknameModal';
import './style/App.css';

function ProtectedRoute({ allowed, children }) {
  return allowed ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  const [guest, setGuest] = useState(
    () => localStorage.getItem('snapsync_guest') === '1'
  );
  const isLoggedIn = !!session || guest;

  const user = session?.user ?? null;
  // Ang "Continue without account" ay gumagawa ng anonymous Supabase user,
  // kaya hindi natin ito ituturing na totoong naka-login
  const isRealUser = !!user && !user.is_anonymous;

  // Nickname popup: lalabas pagkatapos mag-login kung wala pang nickname
  const [nickSkipped, setNickSkipped] = useState(
    () => sessionStorage.getItem('snapsync_nick_skip') === '1'
  );
  const needsNickname = isRealUser && !user.user_metadata?.nickname && !nickSkipped;

  const handleNicknameDone = (updatedUser) => {
    if (updatedUser) {
      setSession((prev) => (prev ? { ...prev, user: updatedUser } : prev));
    }
  };

  const handleNicknameSkip = () => {
    sessionStorage.setItem('snapsync_nick_skip', '1');
    setNickSkipped(true);
  };

  const handleGuest = () => {
    localStorage.setItem('snapsync_guest', '1');
    setGuest(true);
  };

  // Log out (naka-login) o Log in (guest): kapag nawala ang session/guest,
  // ibabalik ng ProtectedRoute sa login page ("/")
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    localStorage.removeItem('snapsync_guest');
    sessionStorage.removeItem('snapsync_nick_skip');
    setNickSkipped(false);
    setGuest(false);
    setSession(null);
  };

  useEffect(() => {

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setChecking(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);


  if (checking) {
    return <div style={{ minHeight: '100vh', background: '#0d0c10' }} />;
  }

  return (
    // PresenceProvider sits above the router so "online" tracking covers
    // the whole site for as long as a real (non-guest) user is logged
    // in — not just while the Messages page happens to be mounted.
    <PresenceProvider userId={isRealUser ? user.id : null}>
      <Router>
        <Routes>

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

          <Route
            path="/welcome"
            element={<ProtectedRoute allowed={isLoggedIn}><Frontpage /></ProtectedRoute>}
          />

          <Route
            path="/main"
            element={
              <ProtectedRoute allowed={isLoggedIn}>
                <MainPage user={isRealUser ? user : null} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-call"
            element={<ProtectedRoute allowed={isLoggedIn}><LiveCall /></ProtectedRoute>}
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute allowed={isLoggedIn}>
                <MessagesPage user={isRealUser ? user : null} />
              </ProtectedRoute>
            }
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

        {needsNickname && (
          <NicknameModal
            user={user}
            onDone={handleNicknameDone}
            onSkip={handleNicknameSkip}
          />
        )}
      </Router>
    </PresenceProvider>
  );
}