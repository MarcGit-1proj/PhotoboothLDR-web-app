import React from 'react';
import '../style/Header.css';

export default function Header({ onOpenMenu, activeTab, setActiveTab }) {
  return (
    <header className="app-header">
      <div>
        <h2 className="app-title">LDR Photobooth</h2>
        <p className="app-subtitle">Bridge the distance, cherish every heartbeat</p>
      </div>

      {/* Navigation Tabs para lumipat sa Photobooth, Call, Messages, at Profile */}
      <div className="nav-tabs-container" style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setActiveTab('photobooth')}
          style={{ background: activeTab === 'photobooth' ? '#ef4444' : 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Photobooth
        </button>
        <button 
          onClick={() => setActiveTab('call')}
          style={{ background: activeTab === 'call' ? '#ef4444' : 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Live Call
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          style={{ background: activeTab === 'messages' ? '#ef4444' : 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Messages
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button 
          className="hamburger-btn" 
          onClick={onOpenMenu}
          aria-label="Open Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}