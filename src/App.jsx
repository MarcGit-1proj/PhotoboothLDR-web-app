import React, { useState } from 'react';
import './App.css';

export default function App() {
  const [capturedImage, setCapturedImage] = useState(null);

  return (
    <div className="photobooth-container" style={{ textAlign: 'center', padding: '20px' }}>
      <h1>LDR Photobooth App</h1>
      <p>Kuha na ng litrato kasama ang mga mahal sa buhay!</p>

      {/* Camera / Preview Box Area */}
      <div 
        className="camera-box" 
        style={{ 
          width: '400px', 
          height: '300px', 
          background: '#222', 
          margin: '20px auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: '10px',
          color: '#fff'
        }}
      >
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', borderRadius: '10px' }} />
        ) : (
          <span>Camera Preview / Video Feed</span>
        )}
      </div>

      {/* Control Buttons */}
      <div className="controls">
        <button 
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginRight: '10px' }}
          onClick={() => alert('Dito natin ilalagay ang camera capture function!')}
        >
          Capture Photo
        </button>
      </div>
    </div>
  );
}