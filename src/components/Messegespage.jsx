import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/Main-page.css';

export default function MainPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings States
  const [isLightMode, setIsLightMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);

  // 30 Simple Feature Quotes na iikot pabalik sa simula pagkatapos ng huli
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
      setFade(false); // Fade out
      setTimeout(() => {
        setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
        setFade(true); // Fade in
      }, 300); // Transition duration
    }, 6000); // 6 seconds bawat quote

    return () => clearInterval(quoteInterval);
  }, [quotes.length]);

  // Load saved settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('snapsync_theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.body.classList.add('light-mode');
    } else {
      setIsLightMode(false);
      document.body.classList.remove('light-mode');
    }

    const savedSound = localStorage.getItem('snapsync_sound');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }

    const savedReconnect = localStorage.getItem('snapsync_reconnect');
    if (savedReconnect !== null) {
      setAutoReconnect(savedReconnect === 'true');
    }
  }, []);

  const handleThemeToggle = () => {
    const newLightMode = !isLightMode;
    setIsLightMode(newLightMode);
    if (newLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('snapsync_theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('snapsync_theme', 'dark');
    }
  };

  const handleSoundToggle = () => {
    const newSound = !soundEnabled;
    setSoundEnabled(newSound);
    localStorage.setItem('snapsync_sound', newSound);
  };

  const handleReconnectToggle = () => {
    const newReconnect = !autoReconnect;
    setAutoReconnect(newReconnect);
    localStorage.setItem('snapsync_reconnect', newReconnect);
  };

  const handleToggleMenu = () => {
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

  return (
    <div className="main-page-wrapper">
      {/* Top Header */}
      <header className="main-header">
        <div className="header-brand">
          <h1>
            <span className="brand-snap">Snap</span>
            <span className="brand-sync">Sync</span>
          </h1>
          <p>Capture memories across the distance</p>
        </div>

        <div className="header-right">
          <div className="burger-menu-container">
            <button className={`burger-btn ${menuOpen ? 'open' : ''}`} onClick={handleToggleMenu}>
              {menuOpen && !isClosing ? (
                <svg className="animated-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg className="animated-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content / Features Grid */}
      <main className="main-content-area">
        {/* Customized Dynamic Feature Quotes Container */}
        <div className="feature-quote-wrapper">
          <p className={`feature-quote-text ${fade ? 'visible' : 'hidden'}`}>
            {quotes[currentQuoteIndex]}
          </p>
        </div>

        <div className="menu-grid">
          {/* Live Call - ACTIVE */}
          <button className="menu-card" onClick={() => navigate('/live-call')}>
            <div className="card-icon-wrapper">
              <svg className="animated-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </div>
            <div className="card-info">
              <h3>Live Call</h3>
              <p>Have a real-time video call</p>
            </div>
          </button>

          {/* Messages - COMING SOON */}
          <div className="menu-card-wrapper">
            <span className="soon-badge">Soon</span>
            <button className="menu-card coming-soon" disabled>
              <div className="card-icon-wrapper">
                <svg className="animated-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="card-info">
                <h3>Messages</h3>
                <p>Chat and connect with each other</p>
              </div>
            </button>
          </div>

          {/* Photobooth card na may Pulsing 'Most Visited' Badge - ACTIVE */}
          <div className="menu-card-wrapper" style={{ position: 'relative' }}>
            <span className="pulsing-badge">Most Visited</span>
            <button className="menu-card photobooth-highlight" onClick={() => navigate('/photobooth')}>
              <div className="card-icon-wrapper">
                <svg className="animated-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          {/* Mini Games - COMING SOON */}
          <div className="menu-card-wrapper">
            <span className="soon-badge">Soon</span>
            <button className="menu-card coming-soon" disabled>
              <div className="card-icon-wrapper">
                <svg className="animated-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          {/* Premium Plan - COMING SOON */}
          <div className="menu-card-wrapper">
            <span className="soon-badge">Soon</span>
            <button className="menu-card coming-soon" disabled>
              <div className="card-icon-wrapper">
                <svg className="animated-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div className="card-info">
                <h3>Premium Plan</h3>
                <p>Unlock exclusive features</p>
              </div>
            </button>
          </div>

          {/* User Profile - COMING SOON */}
          <div className="menu-card-wrapper">
            <span className="soon-badge">Soon</span>
            <button className="menu-card coming-soon" disabled>
              <div className="card-icon-wrapper">
                <svg className="animated-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        </div>
      </main>

      {/* About Modal */}
      {showAboutModal && (
        <div className="modal-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="modal-content about-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <h2>ABOUT SNAPSYNC</h2>
            
            <div className="about-scrollable-body" style={{ overflowY: 'auto', paddingRight: '4px', textAlign: 'left', marginBottom: '20px', scrollbarWidth: 'thin' }}>
              <p className="modal-text" style={{ marginBottom: '15px' }}>
                <span className="modal-highlight">SnapSync</span> is a web application designed to help long-distance partners connect through shared moments, real-time communication, and interactive memories.
              </p>

              <h3 style={{ fontSize: '1rem', color: '#ff758c', margin: '15px 0 8px 0', borderBottom: '1px solid #2a2a2e', paddingBottom: '4px' }}>Core Features Overview</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Live Call</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b0b0b5' }}>Smooth real-time video connection with auto-reconnect capabilities so you never miss a moment with your partner.</p>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Messages</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b0b0b5' }}>Instant chat and love note sharing accompanied by custom audio cues for an interactive messaging experience.</p>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Photobooth (Most Visited)</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b0b0b5' }}>Capture cute photo strips together, apply aesthetic filters, and save your favorite memories across the distance.</p>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Mini Games</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b0b0b5' }}>Enjoy fun multiplayer web games designed to keep virtual date nights engaging and full of laughter.</p>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Premium Plan</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b0b0b5' }}>Unlock exclusive features such as no limits in generating IDs, access to exclusive premium photo strip frame designs, and priority server connections.</p>
                </div>
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
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
            <h2>DEVELOPER</h2>
            <p className="modal-text">
              <span className="modal-highlight">Marc Longakit</span> is a Computer Science student at ACLC College of Malolos. <span className="modal-highlight">SnapSync</span> is his second major web project, built following his previous productivity app <span className="modal-highlight">Rcheds</span> (which you can visit at <a href="https://rcheds-hub.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: '#ff5c5c', textDecoration: 'underline' }}>rcheds-hub.vercel.app</a>).
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
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <h2>SETTINGS</h2>
            
            <div className="settings-options-list">
              {/* Light Mode Setting */}
              <div className="setting-item">
                <div className="setting-label">
                  <span>Light Mode</span>
                  <p>Switch interface to white theme</p>
                </div>
                <button className={`setting-toggle-btn ${isLightMode ? 'active' : ''}`} onClick={handleThemeToggle}>
                  {isLightMode ? 'On' : 'Off'}
                </button>
              </div>

              {/* Sound Effects Setting */}
              <div className="setting-item">
                <div className="setting-label">
                  <span>App Sounds</span>
                  <p>Play audio cues for chats & actions</p>
                </div>
                <button className={`setting-toggle-btn ${soundEnabled ? 'active' : ''}`} onClick={handleSoundToggle}>
                  {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>

              {/* Auto Reconnect Setting */}
              <div className="setting-item">
                <div className="setting-label">
                  <span>Auto-Reconnect Call</span>
                  <p>Attempt to reconnect peer if dropped</p>
                </div>
                <button className={`setting-toggle-btn ${autoReconnect ? 'active' : ''}`} onClick={handleReconnectToggle}>
                  {autoReconnect ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            {/* Version Display */}
            <div className="settings-version-footer">
              <span>SnapSync Version</span>
              <strong>v2.0.0</strong>
            </div>

            <button className="modal-close-btn" onClick={() => setShowSettingsModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}