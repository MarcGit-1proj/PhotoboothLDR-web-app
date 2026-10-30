import "../style/ViewProfileModal.css";

/**
 * View Profile popup, shown when a user picks "View Profile" from
 * ChatCallMenu (or anywhere else in a chat thread).
 *
 * Usage:
 *   <ViewProfileModal
 *     open={showProfile}
 *     onClose={() => setShowProfile(false)}
 *     onDisconnect={() => {...}}
 *     profile={{
 *       name: "Geloskii",
 *       avatarUrl: "...",
 *       codeId: "CFZBP2QR",
 *       isPrivate: false,
 *       bio: "Most handsome guy in the universe. Founder of Dionisio Inc.",
 *       contact: null, // null/empty -> shows "Not set"
 *     }}
 *   />
 *
 * The user stays connected just by viewing this — Disconnect is a
 * separate explicit action.
 */
export default function ViewProfileModal({ open, onClose, onDisconnect, profile }) {
  if (!open || !profile) return null;

  const { name, avatarUrl, codeId, isPrivate, bio, contact } = profile;

  return (
    <div className="vpm-overlay" onClick={onClose}>
      <div className="vpm-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vpm-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>

        <div className="vpm-avatar-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="vpm-avatar" />
          ) : (
            <div className="vpm-avatar vpm-avatar-fallback">
              {name ? name[0].toUpperCase() : "?"}
            </div>
          )}
        </div>

        <h2 className="vpm-name">{name}</h2>

        {isPrivate ? (
          <div className="vpm-private">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3l7 3v5c0 4.6-2.9 8.4-7 10-4.1-1.6-7-5.4-7-10V6l7-3z"
                stroke="#c08fe0"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <p>This user has set their account to private.</p>
          </div>
        ) : (
          <>
            <div className="vpm-row">
              <span className="vpm-label">Code ID</span>
              <span className="vpm-value">{codeId}</span>
            </div>
            <div className="vpm-divider" />

            <div className="vpm-row vpm-row-block">
              <span className="vpm-label">Bio</span>
              <span className="vpm-value vpm-value-wrap">{bio ? bio : "Not set"}</span>
            </div>
            <div className="vpm-divider" />

            <div className="vpm-row">
              <span className="vpm-label">Contact</span>
              <span className="vpm-value">{contact ? contact : "Not set"}</span>
            </div>
          </>
        )}

        <button type="button" className="vpm-disconnect" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    </div>
  );
}