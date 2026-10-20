import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../style/Main-page.css';

const COUPLE_STORAGE_KEY = 'snapsync_couple';
const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 256;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BIO_MAX = 160;
const NICK_MAX = 20;

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

// Crop sa gitna (square) at paliitin para magaan ang upload
const resizeToSquare = (file, size) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error('Could not process that image.'));
          },
          'image/jpeg',
          0.85
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a supported image.'));
    };
    img.src = url;
  });

/* ---------- Icons ---------- */
const BackIcon = () => (
  <svg className="icon-svg icon-bold" viewBox="0 0 24 24" aria-hidden="true">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const UserIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const FeatherIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
    <line x1="16" y1="8" x2="2" y2="22"></line>
    <line x1="17.5" y1="15" x2="9" y2="15"></line>
  </svg>
);

const UploadIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
    <polyline points="16 6 12 2 8 6"></polyline>
    <line x1="12" y1="2" x2="12" y2="15"></line>
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

const SparkleIcon = () => (
  <svg className="sparkle-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 1.5l2.6 8 8 2.5-8 2.5-2.6 8-2.6-8-8-2.5 8-2.5z"></path>
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
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [editing, setEditing] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [brokenAvatar, setBrokenAvatar] = useState('');

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
  const bio = meta.bio || '';
  const avatarUrl = meta.avatar_url || '';
  const showAvatarImage = !!avatarUrl && avatarUrl !== brokenAvatar;
  const email = user?.email || '';

  const displayName = isAccount
    ? nickname || (email ? email.split('@')[0] : 'You')
    : 'Guest';
  const initial = displayName.charAt(0).toUpperCase();

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

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 2500);
  };

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

  /* ----- Edit nickname + bio ----- */
  const startEdit = () => {
    setNickInput(nickname);
    setBioInput(bio);
    setError('');
    setNotice('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const saveProfile = async () => {
    const nick = nickInput.trim();
    if (!nick) {
      setError('Enter a nickname.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { nickname: nick, bio: bioInput.trim() }
      });
      if (updateError) throw updateError;
      setUser(data.user);
      setEditing(false);
      showNotice('Profile updated.');
    } catch (err) {
      setError((err && err.message) || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ----- Profile photo ----- */
  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !user) return;

    setError('');
    setNotice('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That image is too large. Please choose one under 8 MB.');
      return;
    }

    setUploading(true);
    let uploadedPath = '';
    try {
      const blob = await resizeToSquare(file, AVATAR_SIZE);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = path;

      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: pub.publicUrl, avatar_path: path }
      });
      if (updateError) throw updateError;

      const oldPath = meta.avatar_path;
      setUser(data.user);
      if (oldPath && oldPath !== path) {
        // Burahin ang lumang litrato (hindi mahalaga kung mag-fail)
        supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {});
      }
      showNotice('Profile photo updated.');
    } catch (err) {
      if (uploadedPath) {
        supabase.storage.from(AVATAR_BUCKET).remove([uploadedPath]).catch(() => {});
      }
      setError((err && err.message) || 'Could not upload your photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setError('');
    setNotice('');
    setUploading(true);
    try {
      const oldPath = meta.avatar_path;
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null, avatar_path: null }
      });
      if (updateError) throw updateError;
      setUser(data.user);
      if (oldPath) {
        supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {});
      }
      showNotice('Profile photo removed.');
    } catch (err) {
      setError((err && err.message) || 'Could not remove your photo. Please try again.');
    } finally {
      setUploading(false);
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

  const couple = isAccount ? meta.couple || {} : readLocalCouple();

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const anniversaryDate = parseDateInput(couple.anniversary);
  const daysTogether = anniversaryDate
    ? Math.max(0, daysBetween(todayStart, anniversaryDate))
    : null;

  const busy = saving || uploading;

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
              <div className="profile-hero-inner">
                {/* Avatar */}
                <div className="profile-avatar-ring">
                  <div className="profile-avatar">
                    {showAvatarImage ? (
                      <img
                        className="profile-avatar-img"
                        src={avatarUrl}
                        alt={`${displayName}'s profile`}
                        onError={() => setBrokenAvatar(avatarUrl)}
                      />
                    ) : (
                      <span aria-hidden="true">{initial}</span>
                    )}
                  </div>
                </div>

                {/* Pangalan, ID, badge */}
                <div className="profile-identity">
                  {editing ? (
                    <input
                      className="profile-input profile-name-input"
                      type="text"
                      maxLength={NICK_MAX}
                      value={nickInput}
                      placeholder="Nickname"
                      aria-label="Nickname"
                      onChange={(e) => setNickInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveProfile();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                  ) : (
                    <h2 className="profile-name">{displayName}</h2>
                  )}

                  {isAccount && (
                    <div className="profile-id-row">
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

                  <span className={`profile-badge ${isAccount ? 'account' : 'guest'}`}>
                    <UserIcon />
                    {isAccount ? 'Account' : 'Guest'}
                  </span>
                </div>

                {/* Divider */}
                <div className="profile-divider" aria-hidden="true">
                  <span className="profile-divider-line"></span>
                  <SparkleIcon />
                  <span className="profile-divider-line"></span>
                </div>

                {/* Bio */}
                <div className="profile-bio">
                  <div className="profile-bio-label">
                    <FeatherIcon />
                    <span>Bio</span>
                  </div>
                  <div className="profile-bio-box">
                    {editing ? (
                      <>
                        <textarea
                          className="profile-input profile-textarea"
                          maxLength={BIO_MAX}
                          rows={4}
                          value={bioInput}
                          placeholder="Tell something about yourself..."
                          aria-label="Bio"
                          onChange={(e) => setBioInput(e.target.value)}
                        />
                        <span className="profile-count">{bioInput.length}/{BIO_MAX}</span>
                      </>
                    ) : (
                      <>
                        <p className={`profile-bio-text ${bio ? '' : 'empty'}`}>
                          {bio ||
                            (isAccount
                              ? 'No bio yet. Tap Edit to add one.'
                              : 'Log in or create an account to add a bio and a profile photo.')}
                        </p>
                        <div className="profile-bio-ornament" aria-hidden="true">
                          <span className="profile-ornament-line"></span>
                          <SparkleIcon />
                          <span className="profile-ornament-line"></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {error && <p className="profile-error" role="alert">{error}</p>}
              {notice && <p className="profile-notice" role="status">{notice}</p>}

              {isAccount && (
                <div className="profile-hero-footer">
                  <div className="profile-footer-left">
                    {editing ? (
                      <>
                        <button className="profile-btn secondary" onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </button>
                        <button className="profile-btn primary" onClick={saveProfile} disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    ) : (
                      <button className="profile-edit-btn" onClick={startEdit} disabled={busy}>
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="profile-footer-right">
                    {uploading && <span className="profile-id-status">Working...</span>}
                    {avatarUrl && !uploading && (
                      <button className="profile-link-btn" onClick={handleRemovePhoto} disabled={busy}>
                        Remove photo
                      </button>
                    )}
                    <button
                      className="profile-icon-btn"
                      onClick={openFilePicker}
                      disabled={busy}
                      aria-label="Upload profile photo"
                      title="Upload profile photo"
                    >
                      <UploadIcon />
                    </button>
                    <input
                      ref={fileInputRef}
                      className="profile-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handlePhotoSelected}
                    />
                  </div>
                </div>
              )}
            </section>

            {isAccount ? (
              <section className="profile-card">
                <h3 className="profile-card-title">Account</h3>
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