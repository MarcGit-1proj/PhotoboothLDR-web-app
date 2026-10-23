import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../style/Users-profilepage.css';

const COUPLE_STORAGE_KEY = 'snapsync_couple';
const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 256;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BIO_MAX = 160;
const NICK_MAX = 20;
const CONTACT_MAX = 100;
const CONTACT_PLATFORMS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' }
];

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

const PencilIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"></path>
  </svg>
);

const BulbIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 18h6"></path>
    <path d="M10 22h4"></path>
    <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.8 1 .8 1.7v.1a.5.5 0 0 0 .5.5h5.4a.5.5 0 0 0 .5-.5v-.1c0-.7.3-1.3.8-1.7A7 7 0 0 0 12 2z"></path>
  </svg>
);

const HeartIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    className={`icon-svg chevron-icon ${open ? 'open' : ''}`}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <polyline points="6 15 12 9 18 15"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const GearIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const ShieldIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z"></path>
    <polyline points="9 12 11 14 15 10"></polyline>
  </svg>
);

const CodeIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const LogOutIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const TrashIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const MailIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const PeopleIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const SearchIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const LinkIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const BellIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const XIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChatIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
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
  const settingsRef = useRef(null);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const connectionsRef = useRef(null);

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

  // Our details: collapsible (sarado muna by default)
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Account card: editable (Telegram / WhatsApp / Facebook / Instagram)
  const [editingAccount, setEditingAccount] = useState(false);
  const [contactPlatformInput, setContactPlatformInput] = useState('telegram');
  const [contactUsernameInput, setContactUsernameInput] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountNotice, setAccountNotice] = useState('');

  // Settings: dropdown mula sa gear icon sa header
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Header: search by Code ID + Connect
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectNotice, setConnectNotice] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifBusyId, setNotifBusyId] = useState('');

  // My Connections (mga na-add/tinanggap na)
  const [connections, setConnections] = useState([]);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [expandedConnectionId, setExpandedConnectionId] = useState('');

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

  // Isara ang Settings dropdown kapag nag-click sa labas nito
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  // Isara ang Notifications dropdown kapag nag-click sa labas nito
  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  // Isara ang My Connections dropdown kapag nag-click sa labas nito
  useEffect(() => {
    if (!connectionsOpen) return;
    const handleClickOutside = (e) => {
      if (connectionsRef.current && !connectionsRef.current.contains(e.target)) {
        setConnectionsOpen(false);
        setExpandedConnectionId('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [connectionsOpen]);

  // Ang "Continue without account" ay anonymous user, hindi totoong account
  const isAccount = !!user && !user.is_anonymous;
  const meta = user?.user_metadata || {};
  const nickname = meta.nickname || meta.display_name || '';
  const bio = meta.bio || '';
  const contactPlatform = meta.contact_platform || '';
  const contactUsername = meta.contact_username || '';
  const contactPlatformLabel =
    CONTACT_PLATFORMS.find((p) => p.value === contactPlatform)?.label || '';
  const profilePrivate = !!meta.profile_private;
  const hideCode = !!meta.hide_code;
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

  // Kunin ang mga notification ng account
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (notifErr) throw notifErr;
      setNotifications(data || []);
    } catch {
      /* tahimik na mag-fail, hindi kritikal sa page */
    }
  }, [user]);

  useEffect(() => {
    if (isAccount) loadNotifications();
  }, [isAccount, loadNotifications]);

  // Kunin ang listahan ng mga naka-connect na (My Connections)
  const loadConnections = useCallback(async () => {
    if (!user) return;
    setConnectionsLoading(true);
    try {
      const { data, error: connErr } = await supabase.rpc('list_my_connections');
      if (connErr) throw connErr;
      setConnections(data || []);
    } catch {
      /* tahimik na mag-fail, hindi kritikal sa page */
    } finally {
      setConnectionsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAccount) loadConnections();
  }, [isAccount, loadConnections]);

  // Live updates gamit ang Supabase Realtime (kapag may bagong notification)
  useEffect(() => {
    if (!isAccount || !user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => [payload.new, ...prev])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isAccount, user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const timeAgo = (iso) => {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 2500);
  };

  const showAccountNotice = (text) => {
    setAccountNotice(text);
    setTimeout(() => setAccountNotice(''), 2500);
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

  /* ----- Account card: contact platform (Telegram/WhatsApp/Facebook/Instagram) ----- */
  const startEditAccount = () => {
    setContactPlatformInput(contactPlatform || 'telegram');
    setContactUsernameInput(contactUsername);
    setAccountError('');
    setAccountNotice('');
    setEditingAccount(true);
  };

  const cancelEditAccount = () => {
    setEditingAccount(false);
    setAccountError('');
  };

  const saveAccount = async () => {
    setAccountSaving(true);
    setAccountError('');
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          contact_platform: contactUsernameInput.trim() ? contactPlatformInput : '',
          contact_username: contactUsernameInput.trim()
        }
      });
      if (updateError) throw updateError;
      setUser(data.user);
      setEditingAccount(false);
      showAccountNotice('Account updated.');
    } catch (err) {
      setAccountError((err && err.message) || 'Could not save your account details. Please try again.');
    } finally {
      setAccountSaving(false);
    }
  };

  /* ----- Settings: toggles (naka-save sa parehong user_metadata, tulad ng nickname/bio) ----- */
  const handleToggleSetting = async (key, currentValue) => {
    setSettingsError('');
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { [key]: !currentValue }
      });
      if (updateError) throw updateError;
      setUser(data.user);
    } catch (err) {
      setSettingsError((err && err.message) || 'Could not save this setting. Please try again.');
    }
  };

  /* ----- Delete account (kailangan pa ng backend function sa Supabase) ----- */
  const handleDeleteAccount = async () => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      // Hindi pa na-set up ang backend function para rito. Kailangan ng isang
      // Supabase RPC (security definer, halimbawa "delete_own_account") bago
      // gumana ito nang totoo.
      const { error: rpcError } = await supabase.rpc('delete_own_account');
      if (rpcError) throw rpcError;
      await supabase.auth.signOut();
      window.location.assign('/');
    } catch {
      setDeleteError(
        "Account deletion isn't set up yet. This needs an additional step on the backend before it can permanently delete your account."
      );
    } finally {
      setDeleteBusy(false);
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

  /* ----- Search by Code ID + Connect ----- */
  const handleSearch = async (e) => {
    e.preventDefault();
    const code = searchCode.trim();
    if (!code) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    setConnectNotice('');
    try {
      const { data, error: searchErr } = await supabase.rpc('search_user_by_code', { p_code: code });
      if (searchErr) throw searchErr;
      const match = Array.isArray(data) ? data[0] : data;
      if (!match) setSearchError('No account found with that code.');
      else setSearchResult(match);
    } catch (err) {
      setSearchError((err && err.message) || 'Could not search right now.');
    } finally {
      setSearching(false);
    }
  };

  const handleConnect = async () => {
    setSearchError('');
    setConnectNotice('');

    let target = searchResult;

    // Kung hindi pa na-search (hal. na-type lang ang code at direktang pinindot
    // ang Connect nang hindi pinindot ang Enter), hanapin muna dito.
    if (!target) {
      const code = searchCode.trim();
      if (!code) {
        setSearchError('Type a code ID first.');
        return;
      }
      setSearching(true);
      try {
        const { data, error: searchErr } = await supabase.rpc('search_user_by_code', { p_code: code });
        if (searchErr) throw searchErr;
        const match = Array.isArray(data) ? data[0] : data;
        if (!match) {
          setSearchError('No account found with that code.');
          return;
        }
        target = match;
        setSearchResult(match);
      } catch (err) {
        setSearchError((err && err.message) || 'Could not search right now.');
        return;
      } finally {
        setSearching(false);
      }
    }

    setConnectBusy(true);
    try {
      const { error: connectErr } = await supabase.rpc('send_connection_request', {
        p_target_id: target.id
      });
      if (connectErr) throw connectErr;
      setConnectNotice('Connection request sent.');
      setSearchResult(null);
      setSearchCode('');
    } catch (err) {
      setSearchError((err && err.message) || 'Could not send the request.');
    } finally {
      setConnectBusy(false);
    }
  };

  /* ----- Notifications: accept / decline / dismiss ----- */
  const handleNotifRespond = async (notif, accept) => {
    setNotifBusyId(notif.id);
    try {
      // Gamitin ang actor_id (user id ng nag-request) sa halip na ang
      // connection row id lang, dahil mas matibay ito kahit nagbago/
      // na-merge na ang row sa likod.
      const otherUserId = notif.actor_id || notif.data?.connection_id;
      if (otherUserId) {
        const { error: respondErr } = await supabase.rpc('respond_connection_request', {
          p_connection_id: otherUserId,
          p_accept: accept
        });
        if (respondErr) throw respondErr;
      }
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);

      // Ipakita muna ang resulta (Accepted/Declined) bago alisin sa listahan
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, _justResponded: accept ? 'accepted' : 'declined' } : n
        )
      );
      if (accept) loadConnections();

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, 1400);
    } catch (err) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, _justResponded: 'error' } : n))
      );
    } finally {
      setNotifBusyId('');
    }
  };

  const handleNotifDismiss = async (notif) => {
    setNotifBusyId(notif.id);
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      if (notif.type === 'connection_accepted') loadConnections();
    } catch {
      /* tahimik na mag-fail */
    } finally {
      setNotifBusyId('');
    }
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

        {isAccount && (
          <div className="profile-header-right">
            <div className="profile-connections-trigger" ref={connectionsRef}>
              <button
                className="profile-connections-btn"
                onClick={() => setConnectionsOpen((v) => !v)}
                aria-label="My connections"
                aria-expanded={connectionsOpen}
              >
                <PeopleIcon />
                {connections.length > 0 && (
                  <span className="profile-connections-badge">{connections.length}</span>
                )}
              </button>

              {connectionsOpen && (
                <div className="profile-connections-dropdown">
                  <div className="profile-notif-header">
                    <span className="profile-notif-title">
                      <PeopleIcon /> My Connections
                      {connections.length > 0 && (
                        <span className="profile-notif-count">{connections.length}</span>
                      )}
                    </span>
                    <button
                      className="profile-notif-close"
                      onClick={() => {
                        setConnectionsOpen(false);
                        setExpandedConnectionId('');
                      }}
                      aria-label="Close"
                    >
                      <XIcon />
                    </button>
                  </div>

                  {connectionsLoading ? (
                    <p className="profile-hint">Loading...</p>
                  ) : connections.length === 0 ? (
                    <p className="profile-hint">
                      No connections yet. Search a Code ID and press Connect to add someone.
                    </p>
                  ) : (
                    <ul className="profile-connections-list">
                      {connections.map((c) => {
                        const isOpen = expandedConnectionId === c.id;
                        const cInitial = (c.nickname || '?').charAt(0).toUpperCase();
                        return (
                          <li key={c.id} className="profile-connections-item">
                            <button
                              className="profile-connections-row"
                              onClick={() => setExpandedConnectionId(isOpen ? '' : c.id)}
                              aria-expanded={isOpen}
                            >
                              <span className="profile-notif-avatar">
                                {c.avatar_url ? (
                                  <img src={c.avatar_url} alt="" className="profile-connections-avatar-img" />
                                ) : (
                                  cInitial
                                )}
                              </span>
                              <span className="profile-notif-text">
                                <span className="profile-notif-msg">{c.nickname || 'Unnamed user'}</span>
                                <span className="profile-notif-time">
                                  {c.friend_code || 'Code hidden'}
                                </span>
                              </span>
                              <ChevronIcon open={isOpen} />
                            </button>

                            {isOpen && (
                              <div className="profile-connections-expanded">
                                <div className="profile-connections-expanded-row">
                                  <span className="profile-row-label">Code ID</span>
                                  <span className="profile-row-value">
                                    {c.friend_code || 'Hidden by user'}
                                  </span>
                                </div>
                                <div className="profile-connections-expanded-row">
                                  <span className="profile-row-label">Bio</span>
                                  <span className="profile-row-value">
                                    {c.bio || 'No bio yet.'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <form className="profile-search" onSubmit={handleSearch}>
              <SearchIcon />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Search Code ID"
                aria-label="Search by Code ID"
                disabled={searching}
              />
            </form>

            <div className="profile-connect-wrap" ref={searchRef}>
              <button
                className="profile-connect-btn"
                onClick={handleConnect}
                disabled={connectBusy}
              >
                <LinkIcon />
                <span>{connectBusy ? 'Sending...' : 'Connect'}</span>
              </button>

              {(searchResult || searchError || connectNotice) && (
                <div className="profile-search-popover">
                  {searching && <span className="profile-id-status">Searching...</span>}
                  {searchResult && (
                    <span className="profile-search-found">
                      Found <strong>{searchResult.nickname || 'user'}</strong> — click Connect to send a request.
                    </span>
                  )}
                  {searchError && <span className="profile-error">{searchError}</span>}
                  {connectNotice && <span className="profile-notice">{connectNotice}</span>}
                </div>
              )}
            </div>

            <div className="profile-notif-trigger" ref={notifRef}>
              <button
                className="profile-notif-btn"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <BellIcon />
                {unreadCount > 0 && <span className="profile-notif-badge">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="profile-notif-dropdown">
                  <div className="profile-notif-header">
                    <span className="profile-notif-title">
                      <BellIcon /> Notifications
                      {unreadCount > 0 && <span className="profile-notif-count">{unreadCount}</span>}
                    </span>
                    <button className="profile-notif-close" onClick={() => setNotifOpen(false)} aria-label="Close">
                      <XIcon />
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="profile-hint">No notifications yet.</p>
                  ) : (
                    <ul className="profile-notif-list">
                      {notifications.map((n) => (
                        <li key={n.id} className="profile-notif-row">
                          <span className="profile-notif-avatar">
                            {(n.message || '?').charAt(0).toUpperCase()}
                          </span>
                          <span className="profile-notif-text">
                            <span className="profile-notif-msg">{n.message}</span>
                            <span className="profile-notif-time">{timeAgo(n.created_at)}</span>
                          </span>

                          {n.type === 'connection_request' ? (
                            n._justResponded === 'accepted' ? (
                              <span className="profile-notif-result accepted">
                                <CheckIcon /> Accepted
                              </span>
                            ) : n._justResponded === 'declined' ? (
                              <span className="profile-notif-result declined">
                                <XIcon /> Declined
                              </span>
                            ) : n._justResponded === 'error' ? (
                              <span className="profile-notif-result error">Could not update</span>
                            ) : (
                              <span className="profile-notif-actions">
                                <button
                                  className="profile-notif-action accept"
                                  onClick={() => handleNotifRespond(n, true)}
                                  disabled={notifBusyId === n.id}
                                  aria-label="Accept"
                                >
                                  <CheckIcon />
                                </button>
                                <button
                                  className="profile-notif-action decline"
                                  onClick={() => handleNotifRespond(n, false)}
                                  disabled={notifBusyId === n.id}
                                  aria-label="Decline"
                                >
                                  <XIcon />
                                </button>
                              </span>
                            )
                          ) : (
                            <button
                              className="profile-notif-action plain"
                              onClick={() => handleNotifDismiss(n)}
                              disabled={notifBusyId === n.id}
                              aria-label="Dismiss"
                            >
                              {n.type === 'connection_accepted' ? <UserIcon /> : <ChatIcon />}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="profile-settings-trigger" ref={settingsRef}>
              <button
                className="profile-settings-btn"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-label="Settings"
                aria-expanded={settingsOpen}
              >
                <GearIcon />
              </button>

              {settingsOpen && (
                <div className="profile-settings-dropdown">
                  <h3 className="profile-card-title">
                    <span className="profile-card-title-icon"><GearIcon /></span>
                    Settings
                  </h3>

                  {settingsError && <p className="profile-error" role="alert">{settingsError}</p>}

                  <div className="setting-toggle-row">
                    <span className="setting-toggle-icon"><ShieldIcon /></span>
                    <div className="setting-toggle-text">
                      <span className="setting-toggle-title">Make profile private</span>
                      <span className="setting-toggle-desc">Only you can see your profile, details and code ID.</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={profilePrivate}
                        onChange={() => handleToggleSetting('profile_private', profilePrivate)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-toggle-row">
                    <span className="setting-toggle-icon"><CodeIcon /></span>
                    <div className="setting-toggle-text">
                      <span className="setting-toggle-title">Don't public your profile code ID</span>
                      <span className="setting-toggle-desc">Hide your code ID from other users.</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={hideCode}
                        onChange={() => handleToggleSetting('hide_code', hideCode)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <h4 className="settings-subtitle">Account actions</h4>

                  <button className="account-action-row" onClick={handleLeave}>
                    <span className="setting-toggle-icon"><LogOutIcon /></span>
                    <div className="setting-toggle-text">
                      <span className="setting-toggle-title">Log out</span>
                      <span className="setting-toggle-desc">Sign out from your account.</span>
                    </div>
                    <ChevronRightIcon />
                  </button>

                  <button
                    className="account-action-row danger"
                    onClick={() => {
                      setDeleteError('');
                      setShowDeleteConfirm(true);
                      setSettingsOpen(false);
                    }}
                  >
                    <span className="setting-toggle-icon"><TrashIcon /></span>
                    <div className="setting-toggle-text">
                      <span className="setting-toggle-title">Delete account</span>
                      <span className="setting-toggle-desc">Permanently delete your account and data.</span>
                    </div>
                    <ChevronRightIcon />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="profile-main">
        {loading ? (
          <p className="profile-loading">Loading your profile...</p>
        ) : (
          <div className="profile-main-col">
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

                  {isAccount && (
                    <>
                      <button
                        className="profile-avatar-upload"
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
                    </>
                  )}
                </div>

                {/* Badge, Pangalan, ID */}
                <div className="profile-identity">
                  <span className={`profile-badge ${isAccount ? 'account' : 'guest'}`}>
                    <UserIcon />
                    {isAccount ? 'Account' : 'Guest'}
                  </span>

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
                </div>

                {/* Divider */}
                <div className="profile-divider" aria-hidden="true">
                  <span className="profile-divider-line"></span>
                  <span className="profile-divider-line"></span>
                </div>

                {/* Bio */}
                <div className="profile-bio">
                  <div className="profile-bio-label-row">
                    <div className="profile-bio-label">
                      <FeatherIcon />
                      <span>Bio</span>
                    </div>
                    {isAccount && !editing && (
                      <button className="profile-edit-btn small" onClick={startEdit} disabled={busy}>
                        <PencilIcon />
                        Edit
                      </button>
                    )}
                  </div>
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
                    <p className={`profile-bio-text ${bio ? '' : 'empty'}`}>
                      {bio ||
                        (isAccount
                          ? 'No bio yet.'
                          : 'Log in or create an account to add a bio and a profile photo.')}
                    </p>
                  )}
                </div>
              </div>

              {error && <p className="profile-error" role="alert">{error}</p>}
              {notice && <p className="profile-notice" role="status">{notice}</p>}

              {isAccount && (editing || uploading) && (
                <div className="profile-hero-footer">
                  <div className="profile-footer-left">
                    {editing && (
                      <>
                        <button className="profile-btn secondary" onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </button>
                        <button className="profile-btn primary" onClick={saveProfile} disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="profile-footer-right">
                    {uploading && <span className="profile-id-status">Working...</span>}
                    {editing && avatarUrl && !uploading && (
                      <button className="profile-link-btn" onClick={handleRemovePhoto} disabled={busy}>
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isAccount && !editing && (
                <div className="profile-footer-hint">
                  <BulbIcon />
                  <span>Use your unique code to connect with another account</span>
                </div>
              )}
            </section>

            {isAccount ? (
              <section className="profile-card">
                <div className="profile-card-header">
                  <h3 className="profile-card-title">
                    <span className="profile-card-title-icon"><MailIcon /></span>
                    Account
                  </h3>
                  {!editingAccount && (
                    <button className="profile-edit-btn small" onClick={startEditAccount} disabled={accountSaving}>
                      <PencilIcon />
                      Edit
                    </button>
                  )}
                </div>

                <InfoRow label="Email">{email || 'Not available'}</InfoRow>

                {editingAccount ? (
                  <div className="profile-row contact-edit-row">
                    <span className="profile-row-label">Contact</span>
                    <span className="profile-row-value contact-edit-fields">
                      <select
                        className="profile-input profile-inline-input contact-platform-select"
                        value={contactPlatformInput}
                        aria-label="Contact platform"
                        onChange={(e) => setContactPlatformInput(e.target.value)}
                      >
                        {CONTACT_PLATFORMS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <input
                        className="profile-input profile-inline-input"
                        type="text"
                        maxLength={CONTACT_MAX}
                        value={contactUsernameInput}
                        placeholder="Your username"
                        aria-label="Contact username"
                        onChange={(e) => setContactUsernameInput(e.target.value)}
                      />
                    </span>
                  </div>
                ) : (
                  <div className="profile-row">
                    <span className="profile-row-label">Contact</span>
                    <span className="profile-row-value">
                      {contactUsername ? `${contactPlatformLabel}: ${contactUsername}` : 'Not set'}
                    </span>
                  </div>
                )}

                {accountError && <p className="profile-error" role="alert">{accountError}</p>}
                {accountNotice && <p className="profile-notice" role="status">{accountNotice}</p>}

                {editingAccount && (
                  <div className="profile-hero-footer">
                    <div className="profile-footer-left">
                      <button className="profile-btn secondary" onClick={cancelEditAccount} disabled={accountSaving}>
                        Cancel
                      </button>
                      <button className="profile-btn primary" onClick={saveAccount} disabled={accountSaving}>
                        {accountSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
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

            {/* Couple details (collapsible) */}
            <section className="profile-card">
              <button
                className="profile-card-header profile-collapse-toggle"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
              >
                <h3 className="profile-card-title">
                  <span className="profile-card-title-icon"><HeartIcon /></span>
                  Our details
                </h3>
                <ChevronIcon open={detailsOpen} />
              </button>

              {detailsOpen && (
                <>
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
                </>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Delete account confirmation */}
      {showDeleteConfirm && (
        <div className="profile-modal-overlay" onClick={() => !deleteBusy && setShowDeleteConfirm(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-icon">
              <TrashIcon />
            </div>
            <h2>Delete account?</h2>
            <p className="profile-modal-text">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>

            {deleteError && <p className="profile-error" role="alert">{deleteError}</p>}

            <div className="profile-modal-actions">
              <button
                className="profile-btn secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteBusy}
              >
                No
              </button>
              <button
                className="profile-btn danger"
                onClick={handleDeleteAccount}
                disabled={deleteBusy}
              >
                {deleteBusy ? 'Please wait...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}