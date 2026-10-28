import "../style/EmptyChatState.css";

export default function EmptyChatState() {
  return (
    <div className="empty-chat">
      <div className="empty-chat-glow" aria-hidden="true" />

      <svg width="300" height="300" viewBox="0 0 300 300" role="img" aria-label="Wireframe globe">
        <defs>
          <radialGradient id="sphereShade" cx="35%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#4c3f8f" />
            <stop offset="55%" stopColor="#2a2050" />
            <stop offset="100%" stopColor="#150f2b" />
          </radialGradient>
          <linearGradient id="gridStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <clipPath id="sphereClip">
            <circle cx="150" cy="150" r="118" />
          </clipPath>
        </defs>

        <circle cx="150" cy="150" r="130" fill="#7c3aed" opacity="0.18" />
        <circle cx="150" cy="150" r="118" fill="url(#sphereShade)" />

        <g clipPath="url(#sphereClip)" fill="none" stroke="url(#gridStroke)" strokeWidth="1.1" opacity="0.85">
          <ellipse cx="150" cy="150" rx="118" ry="30" />
          <ellipse cx="150" cy="150" rx="118" ry="60" />
          <ellipse cx="150" cy="150" rx="118" ry="90" />
          <line x1="32" y1="150" x2="268" y2="150" />
          <ellipse cx="150" cy="150" rx="30" ry="118" />
          <ellipse cx="150" cy="150" rx="60" ry="118" />
          <ellipse cx="150" cy="150" rx="90" ry="118" />
          <line x1="150" y1="32" x2="150" y2="268" />
        </g>

        <circle cx="150" cy="150" r="118" fill="none" stroke="url(#gridStroke)" strokeWidth="1.6" />

        <g strokeLinejoin="round" stroke="#0b0710" strokeWidth="2" fill="#a78bfa" opacity="0.9">
          <ellipse cx="190" cy="205" rx="44" ry="26" transform="rotate(-18 190 205)" />
          <ellipse cx="110" cy="120" rx="30" ry="18" transform="rotate(10 110 120)" />
          <ellipse cx="195" cy="110" rx="20" ry="14" transform="rotate(-6 195 110)" />
        </g>

        <ellipse cx="112" cy="96" rx="52" ry="34" fill="#ffffff" opacity="0.16" />

        <g fill="#e879c9">
          <circle cx="258" cy="68" r="3" />
          <circle cx="40" cy="60" r="2.4" />
          <circle cx="268" cy="220" r="2.2" />
          <circle cx="26" cy="200" r="3" />
        </g>
      </svg>

      <div className="empty-chat-text">
        <h2>
          Connect with the <span className="gradient-word">world</span>
        </h2>
        <p>Select a conversation and start chatting.</p>
      </div>
    </div>
  );
}