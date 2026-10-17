import { useState } from "react";
import { supabase } from "../supabaseClient";
import "../style/NicknameModal.css";

// Lalabas pagkatapos mag-login kung wala pang nickname ang user.
// Sine-save sa Supabase user metadata (walang kailangang table).
export default function NicknameModal({ user, onDone, onSkip }) {
  const [nickname, setNickname] = useState(user?.user_metadata?.display_name || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const value = nickname.trim();
    if (value.length < 2) {
      setError("Use at least 2 characters.");
      return;
    }
    if (value.length > 20) {
      setError("Use 20 characters or less.");
      return;
    }

    setSaving(true);
    setError("");
    const { data, error: err } = await supabase.auth.updateUser({
      data: { nickname: value },
    });
    setSaving(false);

    if (err) {
      setError(err.message || "Could not save. Try again.");
      return;
    }
    onDone?.(data?.user);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !saving) handleSave();
  };

  return (
    <div className="ss-nick-overlay" role="dialog" aria-modal="true" aria-labelledby="ss-nick-title">
      <div className="ss-nick-card">
        <div className="ss-nick-icon" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>

        <h2 id="ss-nick-title">SET YOUR NICKNAME</h2>
        <p className="ss-nick-text">
          What should your partner call you? You can use a cute name or your real one.
        </p>

        <div className="ss-nick-field" onKeyDown={handleKeyDown}>
          <label htmlFor="ss-nick-input">Nickname</label>
          <input
            id="ss-nick-input"
            type="text"
            maxLength={20}
            autoFocus
            autoComplete="nickname"
            placeholder="e.g. Marc"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            aria-invalid={!!error}
          />
          <span className="ss-nick-count">{nickname.trim().length}/20</span>
          {error && (
            <p className="ss-nick-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="ss-nick-actions">
          <button type="button" className="ss-nick-secondary" onClick={onSkip} disabled={saving}>
            Maybe later
          </button>
          <button type="button" className="ss-nick-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}