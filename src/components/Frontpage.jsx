import React from 'react';
import '../style/Frontpage.css';

export default function Frontpage({ onStartClick }) {
  return (
    <div className="frontpage-container">
      <div className="frontpage-glow-circle"></div>

      <div className="frontpage-content-wrapper">
        <div className="frontpage-badge">
          <span className="pulse-dot"></span> LDR Digital Space
        </div>

        <h1 className="frontpage-title">
          Close to My Heart, <br />
          <span className="highlight-text">Even Across the Miles</span>
        </h1>

        <p className="frontpage-description">
          Ang iyong all-in-one virtual tambayan para sa inyong dalawa. Mag-video call para makita ang mga ngiti sa isa't isa, magpadala ng mga mensahe, at sumabay sa tawanan habang kumukuha ng cute na photobooth strips kahit magkalayo.
        </p>

        {/* Feature tags preview */}
        <div className="frontpage-features-preview">
          <span className="feature-pill">📹 Live Video Call</span>
          <span className="feature-pill">💬 Messages</span>
          <span className="feature-pill">📸 Photobooth Strips</span>
        </div>

        <div className="frontpage-action-container">
          <button className="frontpage-start-btn" onClick={onStartClick}>
            <span>Pasok Na, Mahal ko</span>
            <svg className="btn-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

        <div className="frontpage-footer-quote">
          <p>"Distance means so little when someone means so much."</p>
        </div>
      </div>
    </div>
  );
}