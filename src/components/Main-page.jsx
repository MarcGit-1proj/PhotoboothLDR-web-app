import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../style/Main-page.css';

const APP_VERSION = '1.5.0';
const COUPLE_STORAGE_KEY = 'snapsync_couple';
const COUPLE_DEFAULTS = { anniversary: '', myTz: '', partnerTz: '', partnerCity: '', meetDate: '' };

const FALLBACK_TIMEZONES = [
  'Asia/Manila', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Asia/Dubai',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'Australia/Sydney', 'Pacific/Auckland'
];

/* ---------- Helper (online users) ---------- */
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

/* ---------- Helpers (couple widgets) ---------- */
const detectTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';
  } catch {
    return 'Asia/Manila';
  }
};

const getAllTimezones = () => {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('timeZone');
    }
  } catch {
    /* fall through */
  }
  return FALLBACK_TIMEZONES;
};

const cityFromTz = (tz) => (tz ? tz.split('/').pop().replace(/_/g, ' ') : '');

const formatTime = (date, tz) => {
  try {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
  } catch {
    return '--:--';
  }
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const parseDateInput = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toInputDate = (d) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const dayDiff = (a, b) => Math.round((a - b) / 86400000);

// Guest: galing sa localStorage (sa browser lang)
const loadCouple = () => {
  try {
    const raw = localStorage.getItem(COUPLE_STORAGE_KEY);
    return raw ? { ...COUPLE_DEFAULTS, ...JSON.parse(raw) } : { ...COUPLE_DEFAULTS };
  } catch {
    return { ...COUPLE_DEFAULTS };
  }
};

// Naka-login: galing sa Supabase account (user_metadata.couple)
const coupleFromUser = (user) => ({
  ...COUPLE_DEFAULTS,
  ...(user?.user_metadata?.couple || {})
});

/* ---------- Small icon components ---------- */
const CalendarHeartIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <path d="M12 19.2s-2.8-1.8-2.8-3.4a1.5 1.5 0 0 1 2.8-.7 1.5 1.5 0 0 1 2.8.7c0 1.6-2.8 3.4-2.8 3.4z"></path>
  </svg>
);

const ClockIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const HeartIcon = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

export default function MainPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [showLoginTip, setShowLoginTip] = useState(false);

  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [isLightMode, setIsLightMode] = useState(false);
  const [onlineCount, setOnlineCount] = useState(() => randInt(8, 70));

  // Naka-login = account data; guest = localStorage
  const [couple, setCouple] = useState(() => (user ? coupleFromUser(user) : loadCouple()));
  const [now, setNow] = useState(() => new Date());
  const [widgetModal, setWidgetModal] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!user) {
      setShowLoginTip(true);
      const timer = setTimeout(() => {
        setShowLoginTip(false);
      }, 14000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const MIN = 5;
    const MAX = 90;

    const change = (delta) => {
      setOnlineCount((prev) => Math.min(MAX, Math.max(MIN, prev + delta)));
    };

    const dropInterval = setInterval(() => change(-randInt(1, 3)), 30000);
    const riseInterval = setInterval(() => change(randInt(1, 2)), 20000);

    return () => {
      clearInterval(dropInterval);
      clearInterval(riseInterval);
    };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(tick);
  }, []);

  const quotes = [
    "Want to play and have fun? Go to Mini Games",
    "Want to talk or see each other? Jump into a Live Call",
    "Want to chat and share moments? Open your Messages",
    "Want to capture cute memories? Try our Photobooth",
    "Unlock exclusive experiences with our Premium Plan",
    "Check out your account settings in User Profile",
    "Connect with your special someone across any distance",
    "Enjoy fun moments together with interactive mini games",
    "Have smooth real-time video calls anytime you want",
    "Keep your conversations going with our messaging feature",
    "Take wonderful snapshots and save your favorite photo strips",
    "Upgrade your experience with our premium features",
    "Manage your personal profile and preferences easily",
    "Stay close to each other no matter how far apart you are",
    "Jump right into the action with a single click",
    "Explore all available features designed just for couples",
    "Create unforgettable memories and treasure every second",
    "Experience seamless connection and communication",
    "Switch themes, sounds, and settings to your liking",
    "Discover new ways to bond with your partner online",
    "Send sweet messages and love notes instantly",
    "Pose, smile, and capture your best angles together",
    "Challenge each other and have fun playing games",
    "Enjoy a clean, fast, and modern interface built for you",
    "Reconnect automatically if your session drops",
    "Personalize your application experience right from settings",
    "Bring your special someone closer to your screen",
    "Make every virtual date night extra special",
    "Capture the magic of your relationship in real-time",
    "Welcome to your ultimate long-distance space"
  ];

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
        setFade(true);
      }, 300);
    }, 6000);

    return () => clearInterval(quoteInterval);
  }, [quotes.length]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('snapsync_theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.body.classList.add('light-mode');
    } else {
      setIsLightMode(false);
      document.body.classList.remove('light-mode');
    }
  }, []);

  const handleToggleMenu = () => {
    if (showLoginTip) setShowLoginTip(false);

    if (menuOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setMenuOpen(false);
        setIsClosing(false);
      }, 200);
    } else {
      setMenuOpen(true);
    }
  };

  const closeMenuAndOpenModal = (modalSetter) => {
    setIsClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsClosing(false);
      modalSetter(true);
    }, 200);
  };

  const closeMenuThen = (action) => {
    setIsClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsClosing(false);
      action();
    }, 200);
  };

  const handleAuthClick = () => closeMenuThen(() => onLogout && onLogout());

  const handleFeatureNavigate = (path) => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate(path);
    }, 400);
  };

  // User Profile: naka-login = diretso sa profile.
  // Guest = dadalhin muna sa login page (nililinis ang guest session).
  const handleProfileClick = () => {
    if (user) {
      handleFeatureNavigate('/profile');
      return;
    }
    setIsTransitioning(true);
    setTimeout(() => {
      if (onLogout) {
        onLogout();
      } else {
        navigate('/');
      }
    }, 400);
  };

  const myTz = couple.myTz || detectTimezone();
  const today = startOfDay(now);

  const anniversaryDate = parseDateInput(couple.anniversary);
  const daysTogether = anniversaryDate ? Math.max(0, dayDiff(today, anniversaryDate)) : null;

  const meetDate = parseDateInput(couple.meetDate);
  const meetDiff = meetDate ? dayDiff(meetDate, today) : null;

  const myTime = formatTime(now, myTz);
  const myCity = cityFromTz(myTz);
  const partnerTime = couple.partnerTz ? formatTime(now, couple.partnerTz) : null;
  const partnerCity = couple.partnerCity || cityFromTz(couple.partnerTz);

  let meetValue = 'Set date';
  if (meetDiff !== null) {
    if (meetDiff > 1) meetValue = `${meetDiff} days`;
    else if (meetDiff === 1) meetValue = '1 day';
    else if (meetDiff === 0) meetValue = 'Today!';
    else meetValue = 'Pick new date';
  }

  const togetherValue = daysTogether !== null
    ? `${daysTogether} ${daysTogether === 1 ? 'day' : 'days'}`
    : 'Set date';

  const allTimezones = useMemo(() => getAllTimezones(), []);

  const renderTzOptions = (current) => {
    const list = current && !allTimezones.includes(current) ? [current, ...allTimezones] : allTimezones;
    return list.map((tz) => (
      <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
    ));
  };

  const openWidgetModal = (type) => {
    setSaveError('');
    setDraft({
      anniversary: couple.anniversary,
      meetDate: couple.meetDate,
      myTz,
      partnerTz: couple.partnerTz,
      partnerCity: couple.partnerCity
    });
    setWidgetModal(type);
  };

  const closeWidgetModal = () => {
    setSaveError('');
    setWidgetModal(null);
  };
  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  // Naka-login: sine-save sa Supabase account. Guest: sa localStorage.
  // Nag-a-update lang ang screen kapag matagumpay ang pag-save.
  const persistCouple = async (next) => {
    setSaveError('');
    if (user) {
      setSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({ data: { couple: next } });
        if (error) throw error;
      } catch (err) {
        setSaving(false);
        setSaveError(
          (err && err.message) || 'Could not save to your account. Please try again.'
        );
        return false;
      }
      setSaving(false);
    } else {
      try {
        localStorage.setItem(COUPLE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable, ignore */
      }
    }
    setCouple(next);
    return true;
  };

  const handleWidgetSave = async () => {
    if (saving) return;
    let next = couple;
    if (widgetModal === 'anniversary') {
      next = { ...couple, anniversary: draft.anniversary || '' };
    } else if (widgetModal === 'meetup') {
      next = { ...couple, meetDate: draft.meetDate || '' };
    } else if (widgetModal === 'timezone') {
      next = {
        ...couple,
        myTz: draft.myTz || detectTimezone(),
        partnerTz: draft.partnerTz || '',
        partnerCity: (draft.partnerCity || '').trim()
      };
    }
    const ok = await persistCouple(next);
    if (ok) closeWidgetModal();
  };

  const handleWidgetClear = async () => {
    if (saving) return;
    let next = couple;
    if (widgetModal === 'anniversary') {
      next = { ...couple, anniversary: '' };
    } else if (widgetModal === 'meetup') {
      next = { ...couple, meetDate: '' };
    } else if (widgetModal === 'timezone') {
      next = { ...couple, partnerTz: '', partnerCity: '' };
    }
    const ok = await persistCouple(next);
    if (ok) closeWidgetModal();
  };

  return (
    <div className={`main-page-wrapper ${isTransitioning ? 'page-transitioning' : ''}`}>

      {/* Top Header */}
      <header className="main-header">
        <div className="header-brand">
          <div className="brand-row">
            <h1>
              <span className="brand-snap">Snap</span>
              <span className="brand-sync">Sync</span>
            </h1>

            {/* Online Users Indicator */}
            <div className="online-badge" title="Users online now">
              <svg className="online-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="online-icon-side" cx="6" cy="8" r="2.4" />
                <path className="online-icon-side" d="M1 19c0-3 2.2-5 5-5s5 2 5 5z" />
                <circle className="online-icon-side" cx="18" cy="8" r="2.4" />
                <path className="online-icon-side" d="M13 19c0-3 2.2-5 5-5s5 2 5 5z" />
                <circle className="online-icon-front" cx="12" cy="8.5" r="3" />
                <path className="online-icon-front" d="M6 21c0-3.6 2.7-6 6-6s6 2.4 6 6z" />
              </svg>
              <span key={onlineCount} className="online-count">
                {onlineCount}
              </span>
            </div>
          </div>
          <p>Capture memories across the distance</p>
        </div>

        <div className="header-right">
          <div className="header-widgets">
            {/* Days Together */}
            <button className="widget-chip" title="Edit anniversary" onClick={() => openWidgetModal('anniversary')}>
              <span className="widget-chip-icon"><CalendarHeartIcon /></span>
              <span className="widget-chip-body">
                <span className="widget-chip-label">Days Together</span>
                <span className="widget-chip-value">{togetherValue}</span>
              </span>
            </button>

            {/* Our Time */}
            <button className="widget-chip" title="Edit time zones" onClick={() => openWidgetModal('timezone')}>
              <span className="widget-chip-icon"><ClockIcon /></span>
              <span className="widget-chip-body">
                <span className="widget-chip-label">Our Time</span>
                <span className="widget-time-row">
                  <span className="widget-chip-value">{myTime}</span>
                  <span className="widget-city">{myCity}</span>
                </span>
                <span className="widget-time-row">
                  {partnerTime ? (
                    <>
                      <span className="widget-chip-value">{partnerTime}</span>
                      <span className="widget-city">{partnerCity}</span>
                    </>
                  ) : (
                    <span className="widget-city">Set partner's time</span>
                  )}
                </span>
              </span>
            </button>

            {/* Next Meet-up */}
            <button className="widget-chip" title="Edit meet-up date" onClick={() => openWidgetModal('meetup')}>
              <span className="widget-chip-icon"><HeartIcon /></span>
              <span className="widget-chip-body">
                <span className="widget-chip-label">Next Meet-up</span>
                <span className="widget-chip-value">{meetValue}</span>
              </span>
            </button>
          </div>

          <div className="burger-menu-container">
            {/* Glowing Login Notification Tooltip */}
            {showLoginTip && (
              <div className="login-tip-badge" role="status">
                <span className="tip-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <span className="tip-text">
                  <strong>Log in to your account</strong>
                  <small>Save your dates and memories</small>
                </span>
                <div className="tip-arrow"></div>
              </div>
            )}

            <button className={`burger-btn ${menuOpen ? 'open' : ''} ${showLoginTip ? 'glowing-burger' : ''}`} onClick={handleToggleMenu}>
              {menuOpen && !isClosing ? (
                <svg className="animated-svg-icon icon-bold" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg className="animated-svg-icon icon-bold" viewBox="0 0 24 24">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>

            {(menuOpen || isClosing) && (
              <div className={`dropdown-menu ${isClosing ? 'closing' : ''}`}>
                <button onClick={() => closeMenuAndOpenModal(setShowAboutModal)}>About</button>
                <button onClick={() => closeMenuAndOpenModal(setShowContactModal)}>Contact</button>
                <button onClick={() => closeMenuAndOpenModal(setShowDeveloperModal)}>Developer</button>
                <button onClick={() => closeMenuAndOpenModal(setShowSettingsModal)}>Settings</button>

                <div className="dropdown-divider" />

                {user ? (
                  <button className="dropdown-logout" onClick={handleAuthClick}>Log out</button>
                ) : (
                  <button className="dropdown-login" onClick={handleAuthClick}>Log in</button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content / Features Grid */}
      <main className="main-content-area">
        <div className="feature-quote-wrapper">
          <p className={`feature-quote-text ${fade ? 'visible' : 'hidden'}`}>
            {quotes[currentQuoteIndex]}
          </p>
        </div>

        <div className="menu-grid">
          {/* 1. Live Call - ACTIVE */}
          <button className="menu-card" onClick={() => handleFeatureNavigate('/live-call')}>
            <div className="card-icon-wrapper">
              <svg className="animated-svg-icon" viewBox="0 0 24 24">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </div>
            <div className="card-info">
              <h3>Live Call</h3>
              <p>Have a real-time video call</p>
            </div>
          </button>

          {/* 2. Photobooth - ACTIVE */}
          <div className="menu-card-wrapper">
            <span className="pulsing-badge">Most Visited</span>
            <button className="menu-card photobooth-highlight" onClick={() => handleFeatureNavigate('/photobooth')}>
              <div className="card-icon-wrapper">
                <svg className="animated-svg-icon" viewBox="0 0 24 24">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <div className="card-info">
                <h3>Photobooth</h3>
                <p>Create cute photo strips</p>
              </div>
            </button>
          </div>

          {/* 3. Messages - ACTIVE */}
          <button className="menu-card" onClick={() => handleFeatureNavigate('/messages')}>
            <div className="card-icon-wrapper">
              <svg className="animated-svg-icon" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="card-info">
              <h3>Messages</h3>
              <p>Chat and connect with each other</p>
            </div>
          </button>

          {/* 4. Mini Games */}
          <div className="menu-card-wrapper">
            <span className="soon-badge">Soon</span>
            <button className="menu-card coming-soon" disabled>
              <div className="card-icon-wrapper">
                <svg className="animated-svg-icon" viewBox="0 0 24 24">
                  <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                  <path d="M6 12h4"></path>
                  <path d="M8 10v4"></path>
                  <circle cx="15" cy="10" r="1"></circle>
                  <circle cx="18" cy="13" r="1"></circle>
                </svg>
              </div>
              <div className="card-info">
                <h3>Mini Games</h3>
                <p>Enjoy with your partner</p>
              </div>
            </button>
          </div>

          {/* 5. Premium Plan */}
          <div className="menu-card-wrapper">
            <span className="soon-badge">Soon</span>
            <button className="menu-card coming-soon" disabled>
              <div className="card-icon-wrapper">
                <svg className="animated-svg-icon" viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div className="card-info">
                <h3>Premium Plan</h3>
                <p>Unlock exclusive features</p>
              </div>
            </button>
          </div>

          {/* 6. User Profile - ACTIVE */}
          <button className="menu-card" onClick={handleProfileClick}>
            <div className="card-icon-wrapper">
              <svg className="animated-svg-icon" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="card-info">
              <h3>User Profile</h3>
              <p>View your account settings</p>
            </div>
          </button>
        </div>
      </main>

      {/* Couple Widget Popup */}
      {widgetModal && (
        <div className="modal-overlay" onClick={closeWidgetModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon modal-icon-sm">
              {widgetModal === 'anniversary' && <CalendarHeartIcon />}
              {widgetModal === 'timezone' && <ClockIcon />}
              {widgetModal === 'meetup' && <HeartIcon />}
            </div>

            {widgetModal === 'anniversary' && (
              <>
                <h2>ANNIVERSARY</h2>
                <p className="modal-text">When did your story begin? We'll count the days together.</p>
                <div className="modal-form">
                  <label className="modal-field">
                    <span>Anniversary date</span>
                    <input
                      type="date"
                      value={draft.anniversary || ''}
                      max={toInputDate(today)}
                      onChange={(e) => updateDraft({ anniversary: e.target.value })}
                    />
                  </label>
                </div>
              </>
            )}

            {widgetModal === 'timezone' && (
              <>
                <h2>TIME ZONES</h2>
                <p className="modal-text">See each other's local time at a glance.</p>
                <div className="modal-form">
                  <label className="modal-field">
                    <span>Your timezone</span>
                    <select value={draft.myTz || ''} onChange={(e) => updateDraft({ myTz: e.target.value })}>
                      {renderTzOptions(draft.myTz)}
                    </select>
                  </label>
                  <label className="modal-field">
                    <span>Partner's timezone</span>
                    <select value={draft.partnerTz || ''} onChange={(e) => updateDraft({ partnerTz: e.target.value })}>
                      <option value="">Select timezone</option>
                      {renderTzOptions(draft.partnerTz)}
                    </select>
                  </label>
                  <label className="modal-field">
                    <span>Partner's city name (optional)</span>
                    <input
                      type="text"
                      maxLength={30}
                      placeholder="e.g. Tokyo"
                      value={draft.partnerCity || ''}
                      onChange={(e) => updateDraft({ partnerCity: e.target.value })}
                    />
                  </label>
                </div>
              </>
            )}

            {widgetModal === 'meetup' && (
              <>
                <h2>NEXT MEET-UP</h2>
                <p className="modal-text">Pick the day you two finally see each other.</p>
                <div className="modal-form">
                  <label className="modal-field">
                    <span>Meet-up date</span>
                    <input
                      type="date"
                      value={draft.meetDate || ''}
                      min={toInputDate(today)}
                      onChange={(e) => updateDraft({ meetDate: e.target.value })}
                    />
                  </label>
                </div>
              </>
            )}

            {saveError && (
              <p className="modal-error" role="alert">{saveError}</p>
            )}

            <div className="modal-actions">
              <button className="modal-secondary-btn" onClick={handleWidgetClear} disabled={saving}>
                {widgetModal === 'timezone' ? 'Clear partner' : 'Clear'}
              </button>
              <button className="modal-close-btn" onClick={handleWidgetSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
{/* About Modal */}
{showAboutModal && (
  <div className="modal-overlay" onClick={() => setShowAboutModal(false)}>
    <div className="modal-content about-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-icon">
        <svg className="icon-svg icon-bold" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
      <h2>ABOUT</h2>
      <div className="about-scrollable-body">
        <p className="modal-text">
          <span className="modal-highlight">SnapSync</span> is a web application built for people in long-distance relationships — not just couples, but friends and peers too. It offers a range of features to keep you connected across the distance: <span className="modal-highlight">Live Call</span> lets you video call your partner or friends in real time, just like FaceTime; <span className="modal-highlight">Photobooth</span> lets you take pictures together and choose from a variety of frame designs for your photo strips; <span className="modal-highlight">Messages</span> keeps you chatting with your partner anytime; and <span className="modal-highlight">Mini Games</span> lets you play live together, interacting in real time. For an enhanced experience, <span className="modal-highlight">Premium Plan</span> unlocks exclusive perks such as additional photobooth frame designs, unlimited ID generation, faster connectivity, and more.
        </p>

        <div className="about-section-label">
          <span>Application-Exclusive Features</span>
        </div>

        <p className="modal-text">
          Once downloaded as an application, SnapSync also includes core privacy and security features. Messages offers an Incognito Mode that disables screenshots, screen recording, and message forwarding, while any attempt to photograph the screen using another device is marked with a watermark. Email and name verification are required to help prevent impersonation and data leaks, and the same screenshot and screen-recording protections apply during Live Calls — ensuring that every feature keeps your conversations and moments private.
        </p>

        <div className="about-download-wrapper">
          <span className="soon-badge">Coming Soon</span>
          <button className="about-download-btn" disabled>
            <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            Download SnapSync App
          </button>
        </div>
      </div>
      <button className="modal-close-btn" onClick={() => setShowAboutModal(false)}>Close</button>
    </div>
  </div>
)}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg className="icon-svg icon-bold" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <h2>CONTACT</h2>
            <p className="modal-text">Feel free to reach out for questions, suggestions, or project collaboration through the details below:</p>
            <div className="modal-details">
              <p><span className="modal-highlight">Email:</span> longakitmarkleonel1@gmail.com</p>
              <p><span className="modal-highlight">Facebook:</span> Marc Longakit</p>
              <p><span className="modal-highlight">Phone:</span> +63 948 4399 698</p>
            </div>
            <button className="modal-close-btn" onClick={() => setShowContactModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Developer Modal */}
      {showDeveloperModal && (
        <div className="modal-overlay" onClick={() => setShowDeveloperModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg className="icon-svg icon-bold" viewBox="0 0 24 24">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
            <h2>DEVELOPER</h2>
            <p className="modal-text">
              <span className="modal-highlight">Marc Longakit</span> is a Computer Science student at ACLC College of Malolos. <span className="modal-highlight">SnapSync</span> is his second major web project, built following his previous productivity app <span className="modal-highlight">Rcheds</span>.
            </p>
            <button className="modal-close-btn" onClick={() => setShowDeveloperModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content settings-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg className="icon-svg icon-bold" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <h2>SETTINGS</h2>

            <div className="settings-options-list">
              <div className="setting-item">
                <div className="setting-label">
                  <span>Light Mode</span>
                  <p>Switch between dark and light appearance</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isLightMode}
                    onChange={() => {
                      const newLight = !isLightMode;
                      setIsLightMode(newLight);
                      if (newLight) {
                        document.body.classList.add('light-mode');
                        localStorage.setItem('snapsync_theme', 'light');
                      } else {
                        document.body.classList.remove('light-mode');
                        localStorage.setItem('snapsync_theme', 'dark');
                      }
                    }}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <button className="modal-close-btn" onClick={() => setShowSettingsModal(false)}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}