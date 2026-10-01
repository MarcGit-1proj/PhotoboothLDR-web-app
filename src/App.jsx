import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Frontpage from './components/Frontpage';
import './style/App.css';

// Photobooth Component
function PhotoboothApp() {
  const navigate = useNavigate();
  const [peerId, setPeerId] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [boxCount, setBoxCount] = useState(4);
  const [customText, setCustomText] = useState('You ♥ Me');
  const [snapshot, setSnapshot] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null);
  
  const peerInstance = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    const peer = new window.Peer(peerId, {
      host: '0.peerjs.com',
      port: 443,
      secure: true
    });

    peer.on('open', (id) => {
      console.log('Peer connected with ID:', id);
      peerInstance.current = peer;
    });

    peer.on('error', (err) => {
      setIsConnecting(false);
      if (err.type === 'peer-unavailable') {
        alert('Error: No ID generated matches this.');
      } else {
        console.error('Peer error:', err);
      }
    });

    peer.on('call', (call) => {
      setIsConnecting(true);
      const answerCall = (stream) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsConnected(true);
          setIsConnecting(false);
        });
        call.on('close', () => {
          setIsConnected(false);
          setIsConnecting(false);
        });
      };

      if (localStreamRef.current) {
        answerCall(localStreamRef.current);
      } else {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          answerCall(stream);
        }).catch((err) => {
          setIsConnecting(false);
          console.error('Camera permission error:', err);
        });
      }
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const connectTo = urlParams.get('connect');
        if (connectTo) {
          setRemotePeerId(connectTo);
          setTimeout(() => {
            callPartner(connectTo);
          }, 1500);
        }
      })
      .catch((err) => {
        console.error('Camera permission error:', err);
        alert('Please allow camera and microphone access.');
      });

    return () => {
      if (peerInstance.current) {
        peerInstance.current.destroy();
      }
    };
  }, []);

  const callPartner = (remoteId) => {
    if (!peerInstance.current) return;
    
    const trimmedId = remoteId.trim();
    if (!trimmedId) {
      alert('Please enter a partner code.');
      return;
    }

    if (trimmedId === peerId) {
      alert('You cannot connect to your own code!');
      return;
    }

    const stream = localStreamRef.current;
    if (!stream) {
      alert('Local video stream not ready yet.');
      return;
    }

    console.log(`Calling partner ID: ${trimmedId}`);
    setIsConnecting(true);
    
    const call = peerInstance.current.call(trimmedId, stream);
    
    if (call) {
      call.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setIsConnected(true);
        setIsConnecting(false);
      });

      call.on('close', () => {
        setIsConnected(false);
        setIsConnecting(false);
      });

      call.on('error', (err) => {
        console.error('Call connection error:', err);
        setIsConnecting(false);
        alert('Error: No ID generated matches this or connection failed.');
      });
    } else {
      setIsConnecting(false);
    }
  };

  const copyShareableLink = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?connect=${peerId}`;
    navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard.');
  };

  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const generateCanvasImage = (textInput) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 600;
    canvas.height = boxCount === 2 ? 620 : boxCount === 3 ? 740 : 860;

    if (selectedTemplate === 'romantic') {
      ctx.fillStyle = '#2b0914';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (selectedTemplate === 'neon') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#faf9f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const drawFrame = (videoEl, x, y, w, h, isMirrored = false) => {
      if (!videoEl) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, w, h);
      
      if (isMirrored) {
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, -w, 0, w, h);
      } else {
        ctx.drawImage(videoEl, 0, 0, w, h);
      }
      ctx.restore();
    };

    const startY = 40;
    const boxHeight = boxCount === 2 ? 240 : boxCount === 3 ? 180 : 145;
    const spacing = 15;

    for (let i = 0; i < boxCount; i++) {
      const currentY = startY + i * (boxHeight + spacing);
      drawFrame(localVideoRef.current, 50, currentY, 230, boxHeight, true);
      drawFrame(remoteVideoRef.current, 320, currentY, 230, boxHeight, false);
    }

    if (textInput) {
      ctx.fillStyle = selectedTemplate === 'classic' ? '#1f2937' : '#ff758c';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(textInput, canvas.width / 2, canvas.height - 25);
    }

    return canvas.toDataURL('image/png');
  };

  const startCountdownAndCapture = () => {
    if (countdown !== null) return;
    setCountdown(3);

    let currentCount = 3;
    const timer = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(timer);
        setCountdown(null);
        executeCapture();
      }
    }, 1000);
  };

  const executeCapture = () => {
    playShutterSound();
    setIsCapturing(true);
    setTimeout(() => setIsCapturing(false), 500);

    const imageURL = generateCanvasImage(customText);
    setSnapshot(imageURL);
  };

  const handleCustomTextChange = (e) => {
    const newText = e.target.value;
    setCustomText(newText);
    const updatedURL = generateCanvasImage(newText);
    setSnapshot(updatedURL);
  };

  return (
    <div className="app-container">
      {isCapturing && <div className="flash-overlay" />}

      {countdown !== null && (
        <div className="countdown-overlay">
          <span className="countdown-number">{countdown}</span>
        </div>
      )}

      <div className="max-width-wrapper">
        <header className="app-header">
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <h2 className="app-title">LDR Photobooth</h2>
            <p className="app-subtitle">Capture memories across the distance</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <span>{isConnected ? 'Connected' : 'Waiting...'}</span>
            </div>

            <button 
              className="hamburger-btn" 
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open Menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </header>

        {isMenuOpen && (
          <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}>
            <div className="menu-box" onClick={(e) => e.stopPropagation()}>
              <button className="menu-close-btn" onClick={() => setIsMenuOpen(false)}>
                &times;
              </button>
              <ul className="menu-list">
                <li onClick={() => { setIsMenuOpen(false); navigate('/'); }}>Home / Frontpage</li>
                <li onClick={() => { setIsMenuOpen(false); setActiveSubModal('about'); }}>About</li>
                <li onClick={() => { setIsMenuOpen(false); setActiveSubModal('contact'); }}>Contact</li>
                <li onClick={() => { setIsMenuOpen(false); setActiveSubModal('developer'); }}>Developer</li>
                <li onClick={() => { setIsMenuOpen(false); setActiveSubModal('settings'); }}>Settings</li>
              </ul>
            </div>
          </div>
        )}

        {activeSubModal && (
          <div className="modal-overlay">
            <div className="modal-content style-modal-box">
              <h3 className="modal-main-heading">
                {activeSubModal.toUpperCase()}
              </h3>
              <div className="modal-body-text">
                {activeSubModal === 'about' && (
                  <p><strong>LDR Photobooth</strong> helps long-distance couples connect and capture synchronized photos in real-time.</p>
                )}
                {activeSubModal === 'contact' && (
                  <p><strong>Email:</strong> longakitmark1@gmail.com<br /><strong>Phone:</strong> +63 948 4399 698</p>
                )}
                {activeSubModal === 'developer' && (
                  <p>Developed by <strong>Marc Longakit</strong>, Computer Science student at ACLC College of Malolos.</p>
                )}
                {activeSubModal === 'settings' && (
                  <p style={{ textAlign: 'center', color: '#9ca3af' }}>No available right now.</p>
                )}
              </div>
              <div className="modal-actions-single">
                <button onClick={() => setActiveSubModal(null)} className="btn-modal-close-dark">Close</button>
              </div>
            </div>
          </div>
        )}

        <div className="panel connection-panel">
          <div className="connection-top-row">
            <p className="peer-id-text">
              Your Code: <strong className="peer-id-highlight">{peerId}</strong>
            </p>
            {peerId && (
              <button onClick={copyShareableLink} className="btn-copy-link">
                Copy Invite Link
              </button>
            )}
          </div>
          
          <div className="connection-form">
            <input 
              type="text" 
              className="peer-input"
              placeholder="Paste partner's code here..." 
              value={remotePeerId} 
              onChange={(e) => setRemotePeerId(e.target.value)}
            />
            <button className="btn-primary" onClick={() => callPartner(remotePeerId)}>
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>

        <div className="video-grid">
          <div className="video-card">
            <div className="video-header">
              <h4 className="video-title">You</h4>
              <span className="tag-mirror">Mirror</span>
            </div>
            <video ref={localVideoRef} autoPlay playsInline muted className="mirrored" />
          </div>

          <div className="video-card" style={{ position: 'relative' }}>
            <div className="video-header">
              <h4 className="video-title">Partner</h4>
              <span className={isConnected ? "tag-live" : "tag-mirror"}>
                {isConnected ? 'Live' : (isConnecting ? 'Connecting' : 'Waiting')}
              </span>
            </div>
            
            <video ref={remoteVideoRef} autoPlay playsInline style={{ display: isConnected ? 'block' : 'none' }} />

            {!isConnected && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(17, 17, 17, 0.85)',
                color: '#fff',
                gap: '12px',
                zIndex: 2
              }}>
                {isConnecting ? (
                  <>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid rgba(255,255,255,0.2)',
                      borderTop: '4px solid #ff758c',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#ff758c' }}>Connecting to partner...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  </>
                ) : (
                  <p style={{ fontSize: '14px', color: '#9ca3af' }}>Waiting for partner to connect...</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <h3 className="section-heading">Select Layout (Boxes)</h3>
          <div className="template-buttons layout-spacing">
            <button onClick={() => setBoxCount(2)} className={`template-btn classic ${boxCount === 2 ? 'active' : ''}`}>2 Frames</button>
            <button onClick={() => setBoxCount(3)} className={`template-btn classic ${boxCount === 3 ? 'active' : ''}`}>3 Frames</button>
            <button onClick={() => setBoxCount(4)} className={`template-btn classic ${boxCount === 4 ? 'active' : ''}`}>4 Frames</button>
          </div>

          <h3 className="section-heading">Select Theme</h3>
          <div className="template-buttons">
            <button onClick={() => setSelectedTemplate('classic')} className={`template-btn classic ${selectedTemplate === 'classic' ? 'active' : ''}`}>Classic White</button>
            <button onClick={() => setSelectedTemplate('romantic')} className={`template-btn romantic ${selectedTemplate === 'romantic' ? 'active' : ''}`}>Date Night</button>
            <button onClick={() => setSelectedTemplate('neon')} className={`template-btn neon ${selectedTemplate === 'neon' ? 'active' : ''}`}>Neon Glow</button>
          </div>

          <button className="btn-capture btn-capture-spacing" onClick={startCountdownAndCapture}>
            Capture Photo Strip
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden-canvas" />

        {snapshot && (
          <div className="modal-overlay">
            <div className="modal-content style-modal-box">
              <div className="modal-header-row">
                <h3 className="modal-title">Customize & Preview</h3>
                <button onClick={() => setSnapshot(null)} className="btn-modal-close">&times;</button>
              </div>

              <div className="modal-input-container">
                <label className="modal-input-label">Custom Bottom Text:</label>
                <input 
                  type="text" 
                  value={customText} 
                  onChange={handleCustomTextChange}
                  className="peer-input modal-text-input"
                />
              </div>

              <div className="result-image-box">
                <img src={snapshot} alt="Template Preview" className="result-img" />
              </div>
              
              <div className="modal-actions">
                <a href={snapshot} download="ldr-photostrip.png" className="btn-download">Download Photo Strip</a>
                <button onClick={() => setSnapshot(null)} className="btn-modal-close-secondary">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App Router
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Frontpage />} />
        <Route path="/photobooth" element={<PhotoboothApp />} />
      </Routes>
    </Router>
  );
}