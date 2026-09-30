import React from 'react';
import './Header.css'; // O kaya ay gamitin ang Tailwind kung Tailwind CSS ang gamit mo

export default function Header({ isConnected }) {
  return (
    <header className="photobooth-header">
      <div className="header-left">
        <span className="camera-icon">📸</span>
        <h1>Miles Apart, Close at Heart</h1>
      </div>
      
      <div className="header-right">
        <div className={`connection-badge ${isConnected ? 'online' : 'offline'}`}>
          <span className="dot"></span>
          {isConnected ? 'Connected' : 'Waiting for partner...'}
        </div>
      </div>
    </header>
  );
}