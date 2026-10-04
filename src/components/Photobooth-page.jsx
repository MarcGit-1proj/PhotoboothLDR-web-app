import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/Photobooth-page.css';

export default function PhotoboothPage() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  const handleSelectMode = (selectedMode) => {
    if (selectedMode === 'solo') {
      navigate('/photobooth/solo'); // Palitan mo ng tamang route mo kung iba (o gamitin ang Photoboothsolo-page)
    } else {
      navigate('/photobooth/duo'); // O kung saan mo ilalagay ang duo
    }
  };

  return (
    <div className="photobooth-main-wrapper">
      <header className="photobooth-top-header">
        <div className="header-left-group">
          <div>
            <h2 className="brand-title">SnapSync Photobooth</h2>
            <p className="brand-subtitle">Capture memories across the distance</p>
          </div>
        </div>
        <button onClick={() => navigate('/main')} className="btn-secondary">
          Back Home
        </button>
      </header>

      <div className="mode-selection-container">
        <h1 className="selection-heading">Select Photobooth Mode</h1>
        <p className="selection-desc">Choose between an individual session or a shared long-distance experience.</p>
        
        <div className="mode-cards-grid">
          <div 
            onClick={() => handleSelectMode('solo')} 
            onMouseEnter={() => setHoveredCard('solo')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`mode-card solo-mode-card ${hoveredCard === 'solo' ? 'hovered' : ''}`}
          >
            <div className="mode-inner-box">
              <div className="mode-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div>
                <h3>Solo Session</h3>
                <p>Take studio-quality photo strips independently on your device.</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => handleSelectMode('duo')} 
            onMouseEnter={() => setHoveredCard('duo')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`mode-card ${hoveredCard === 'duo' ? 'hovered' : ''}`}
          >
            <div className="mode-inner-box">
              <div className="mode-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <h3>Duo / LDR Session</h3>
                <p>Connect and capture shared memories together across distances.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="photobooth-footer-note">
        SnapSync Platform © 2026
      </div>
    </div>
  );
}