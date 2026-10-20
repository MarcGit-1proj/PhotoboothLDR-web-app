import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../style/Main-page.css';

const COUPLE_STORAGE_KEY = 'snapsync_couple';

/* ---------- Helpers ---------- */
const parseDateInput = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const formatDate = (str) => {
  const date = parseDateInput(str);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const daysBetween = (a, b) => Math.round((a - b) / 86400000);

const readLocalCouple = () => {
  try {
    const raw = localStorage.getItem(COUPLE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const prettyTz = (tz) => (tz ? tz.replace(/_/g, ' ') : '');

/* ---------- Small components ---------- */
const BackIcon = () => (
  <svg className="icon-svg icon-bold" viewBox="0 0 24 24" aria-hidden="true">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const CopyIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg className="icon-svg icon-bold" viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const InfoRow = ({ label, children }) => (
  <div className="profile-row">
    <span className="profile-row-label">{label}</span>
    <span className="profile-row-value">{children}</span>
  </div>
);

export default function UsersProfilePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [editing, setEditing] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Unique ID (friend code)
  const [friendCode, setFriendCode] = useState('');
  const [codeStatus, setCodeStatus] = useState('idle'); // idle | loading | ready | error
  const [copied, setCopied] = useState(false);

  // Ilapat ang saved theme (kung direkta ang bukas sa /profile)
  useEffect(() => {
    const savedTheme = localStorage.getItem('snapsync_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, []);

  // Kunin ang kasalukuyang session
  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Ang "Continue without account" ay anonymous user, hindi totoong account
  const isAccount = !!user && !user.is_anonymous;
  const meta = user?.user_metadata || {};
  const nickname = meta.nickname || meta.display_name || '';
  const email = user?.email || '';

  // Kunin ang unique ID ng account (gagawa ang server kung wala pa)
  const loadFriendCode = useCallback(async () => {
    setCodeStatus('loading');
    try {
      const { data, error: rpcError } = await supabase.rpc('ensure_friend_code');
      if (rpcError) throw rpcError;
      if (!data) throw new Error('No code returned');
      setFriendCode(data);
      setCodeStatus('ready');
    } catch {
      setCodeStatus('error');
    }
  }, []);

  useEffect(() => {
    if (isAccount) loadFriendCode();
  }, [isAccount, loadFriendCode]);

  const handleCopy = async () => {
    if (!friendCode) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(friendCode);
      ok = true;
    } catch {
      // Fallback kung hindi available ang clipboard API
      try {
        const helper = document.createElement('textarea');
        helper.className = 'profile-clipboard-helper';
        helper.value = friendCode;
        document.body.appendChild(helper);
        helper.select();
        ok = document.execCommand('copy');
        document.body.removeChild(helper);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayName = isAccount
    ? nickname || (email ? email.split('@')[0] : 'You')
    : 'Guest';
  const initial = displayName.charAt(0).toUpperCase();

  const couple = isAccount ? meta.couple || {} : readLocalCouple();

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const anniversaryDate = parseDateInput(couple.anniversary);
  const daysTogether = anniversaryDate
    ? Math.max(0, daysBetween(todayStart, anniversaryDate))
    : null;

  const startEdit = () => {
    setNickInput(nickname);
    setError('');
    setNotice('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const saveNickname = async () => {
    const value = nickInput.trim();
    if (!value) {
      setError('Enter a nickname.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { nickname: value }
      });
      if (updateError) throw updateError;
      setUser(data.user);
      setEditing(false);
      setNotice('Nickname updated.');
      setTimeout(() => setNotice(''), 2500);
    } catch (err) {
      setError((err && err.message) || 'Could not save your nickname. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Log out (account) o Log in (guest): linisin ang session at bumalik sa login page
  const handleLeave = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    localStorage.removeItem('snapsync_guest');
    sessionStorage.removeItem('snapsync_nick_skip');
    window.location.assign('/');
  };

  return (
    <div className="main-page-wrapper profile-page">
      <header className="profile-header">
        <button className="profile-back" onClick={() => navigate('/main')} aria-label="Back to home">
          <BackIcon />
        </button>
        <h1 className="profile-title">User Profile</h1>
      </header>

      <main className="profile-main">
        {loading ? (
          <p className="profile-loading">Loading your profile...</p>
        ) : (
          <>
            {/* Hero */}
            <section className="profile-card profile-hero">
              <div className="profile-avatar" aria-hidden="true">{initial}</div>
              <div className="profile-name-row">
                <h2 className="profile-name">{displayName}</h2>
                {isAccount && (
                  <div className="profile-id-wrap">
                    {codeStatus === 'ready' ? (
                      <>
                        <span className="profile-id-code">{friendCode}</span>
                        <button
                          className={`profile-copy-btn ${copied ? 'copied' : ''}`}
                          onClick={handleCopy}
                          aria-label="Copy your user ID"
                        >
                          {copied ? <CheckIcon /> : <CopyIcon />}
                          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </>
                    ) : codeStatus === 'error' ? (
                      <>
                        <span className="profile-id-status">Could not load your ID</span>
                        <button className="profile-link-btn" onClick={loadFriendCode}>Retry</button>
                      </>
                    ) : (
                      <span className="profile-id-status">Generating your ID...</span>
                    )}
                  </div>
                )}
              </div>
              <span className={`profile-badge ${isAccount ? 'account' : 'guest'}`}>
                {isAccount ? 'Account' : 'Guest'}
              </span>
            </section>

            {isAccount ? (
              <section className="profile-card">
                <h3 className="profile-card-title">Account</h3>

                <InfoRow label="Nickname">
                  {editing ? (
                    <span className="profile-nick-form">
                      <input
                        className="profile-input"
                        type="text"
                        maxLength={20}
                        value={nickInput}
                        placeholder="What should your partner call you?"
                        onChange={(e) => setNickInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveNickname();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <span className="profile-nick-actions">
                        <button className="profile-btn secondary" onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </button>
                        <button className="profile-btn primary" onClick={saveNickname} disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </span>
                    </span>
                  ) : (
                    <span className="profile-value-edit">
                      <span>{nickname || 'Not set'}</span>
                      <button className="profile-link-btn" onClick={startEdit}>Edit</button>
                    </span>
                  )}
                </InfoRow>

                {error && <p className="profile-error" role="alert">{error}</p>}
                {notice && <p className="profile-notice" role="status">{notice}</p>}

                <InfoRow label="Email">{email || 'Not available'}</InfoRow>
              </section>
            ) : (
              <section className="profile-card">
                <h3 className="profile-card-title">You're using a guest session</h3>
                <p className="profile-hint">
                  Log in or create an account to keep your dates and settings safe across devices.
                </p>
                <button className="profile-btn primary full" onClick={handleLeave}>
                  Log in or create account
                </button>
              </section>
            )}

            {/* Couple details */}
            <section className="profile-card">
              <h3 className="profile-card-title">Our details</h3>

              <InfoRow label="Anniversary">
                {anniversaryDate
                  ? `${formatDate(couple.anniversary)} (${daysTogether} ${daysTogether === 1 ? 'day' : 'days'} together)`
                  : 'Not set'}
              </InfoRow>
              <InfoRow label="Next meet-up">
                {couple.meetDate ? formatDate(couple.meetDate) : 'Not set'}
              </InfoRow>
              <InfoRow label="Your time zone">
                {couple.myTz ? prettyTz(couple.myTz) : 'Auto-detected'}
              </InfoRow>
              <InfoRow label="Partner's time zone">
                {couple.partnerTz
                  ? `${prettyTz(couple.partnerTz)}${couple.partnerCity ? ` (${couple.partnerCity})` : ''}`
                  : 'Not set'}
              </InfoRow>

              <p className="profile-hint">You can edit these from the chips at the top of the home page.</p>
            </section>

            {isAccount && (
              <button className="profile-btn danger full" onClick={handleLeave}>
                Log out
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}