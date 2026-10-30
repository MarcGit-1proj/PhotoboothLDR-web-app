import { useEffect, useRef, useState } from "react";
import "../style/ChatCallMenu.css";

/**
 * Drop-in header menu for ChatThread.jsx
 *
 * Usage inside ChatThread.jsx header:
 *
 *   import ChatCallMenu from "./ChatCallMenu";
 *   ...
 *   <ChatCallMenu
 *     onViewProfile={() => {...}}
 *     onMute={() => {...}}
 *     onBlock={() => {...}}
 *     onClearChat={() => {...}}
 *     onDeleteChat={() => {...}}
 *   />
 *
 * Only "Live Call" is wired by default (shows the download-app toast).
 * The other items call the handlers you pass in; if you don't pass one,
 * that menu item just does nothing yet.
 */
export default function ChatCallMenu({
  onViewProfile,
  onMute,
  onBlock,
  onClearChat,
  onDeleteChat,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const wrapRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => clearTimeout(toastTimer.current);
  }, []);

  function showToast() {
    // Dropdown stays open on purpose — the toast just appears beside it.
    setToastOpen(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOpen(false), 4000);
  }

  function runThenClose(fn) {
    setMenuOpen(false);
    if (fn) fn();
  }

  return (
    <div className="ccm-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ccm-icon-btn"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        aria-label="More options"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="19" r="1.8" fill="currentColor" />
        </svg>
      </button>

      {menuOpen && (
        <div className="ccm-dropdown" role="menu">
          <button className="ccm-item" role="menuitem" onClick={showToast}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1v3.4c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4.3c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.2 1.1L6.6 10.8z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            Live Call
          </button>

          <button className="ccm-item" role="menuitem" onClick={() => runThenClose(onViewProfile)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.6-3.5 4.6-5 8-5s6.4 1.5 8 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            View Profile
          </button>

          <button className="ccm-item" role="menuitem" onClick={() => runThenClose(onMute)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 01-3.4 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Mute Notifications
          </button>

          <button className="ccm-item" role="menuitem" onClick={() => runThenClose(onBlock)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <line x1="5.5" y1="18.5" x2="18.5" y2="5.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Block
          </button>

          <div className="ccm-divider" />

          <button className="ccm-item" role="menuitem" onClick={() => runThenClose(onClearChat)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-9 0l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Clear Chat
          </button>

          <button className="ccm-item ccm-danger" role="menuitem" onClick={() => runThenClose(onDeleteChat)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-9 0l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delete Chat
          </button>
        </div>
      )}

      {toastOpen && (
        <div className="ccm-toast-wrap">
          <div className="ccm-toast">
            <div className="ccm-toast-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                  stroke="#e85fae"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="ccm-toast-text">
              To make a call, you'll need to <strong>download the app</strong> first.
            </div>
            <button
              type="button"
              className="ccm-toast-close"
              aria-label="Close"
              onClick={() => setToastOpen(false)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}