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
  const [idGeneratedMsg, setIdGeneratedMsg] = useState(false);

  // States para sa Media Controls (Camera, Mic)
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  
  // States para sa Mini Chat / Messaging via DataConnection
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null);
  
  const peerInstance = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallRef = useRef(null);
  const activeConnRef = useRef(null); // Reference para sa DataConnection (chat)
  const chatMessagesEndRef = useRef(null);

  const initializePeer = (idToUse) => {
    if (peerInstance.current) {
      peerInstance.current.destroy();
    }

    const peer = new window.Peer(idToUse, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
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

    // Pagtanggap ng incoming chat connection mula sa partner
    peer.on('connection', (conn) => {
      activeConnRef.current = conn;
      setupConnectionListeners(conn);
    });

    peer.on('call', (call) => {
      setIsConnecting(true);
      activeCallRef.current = call;
      
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
          handleCleanupOnDisconnect();
        });
      };

      if (localStreamRef.current) {
        answerCall(localStreamRef.current);
      } else {
        navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, 
          audio: true 
        }).then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          answerCall(stream);
        }).catch((err) => {
          setIsConnecting(false);
          console.error('Camera permission error:', err);
        });
      }
    });
  };

  const setupConnectionListeners = (conn) => {
    conn.on('data', (data) => {
      if (data && data.type === 'chat') {
        setMessages((prev) => [...prev, { sender: 'partner', text: data.text, time: data.time }]);
        if (!showChat) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    });

    conn.on('close', () => {
      console.log('Chat connection closed');
    });
  };

  useEffect(() => {
    initializePeer(peerId);

    navigator.mediaDevices.getUserMedia({ 
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, 
      audio: true 
    })
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

  useEffect(() => {
    if (showChat) {
      setUnreadCount(0);
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  const handleGenerateNewId = () => {
    const newId = Math.floor(1000 + Math.random() * 9000).toString();
    setPeerId(newId);
    setIsConnected(false);
    setIsConnecting(false);
    setMessages([]);
    initializePeer(newId);

    setIdGeneratedMsg(true);
    setTimeout(() => {
      setIdGeneratedMsg(false);
    }, 3000);
  };

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

    console.log(`Calling partner ID: ${trimmedId}`);
    setIsConnecting(true);

    const conn = peerInstance.current.connect(trimmedId);
    activeConnRef.current = conn;
    conn.on('open', () => {
      setupConnectionListeners(conn);
    });

    const executeCall = (stream) => {
      const call = peerInstance.current.call(trimmedId, stream);
      
      if (call) {
        activeCallRef.current = call;

        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsConnected(true);
          setIsConnecting(false);
        });

        call.on('close', () => {
          handleCleanupOnDisconnect();
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

    if (localStreamRef.current) {
      executeCall(localStreamRef.current);
    } else {
      navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, 
        audio: true 
      })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          executeCall(stream);
        })
        .catch((err) => {
          setIsConnecting(false);
          console.error('Camera permission error:', err);
          alert('Please allow camera and microphone access to connect.');
        });
    }
  };

  const handleDisconnect = () => {
    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }
    if (activeConnRef.current) {
      activeConnRef.current.close();
      activeConnRef.current = null;
    }
    handleCleanupOnDisconnect();
  };

  const handleCleanupOnDisconnect = () => {
    setIsConnected(false);
    setIsConnecting(false);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemotePeerId('');
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageData = { type: 'chat', text: chatInput.trim(), time: timeStr };

    if (activeConnRef.current && activeConnRef.current.open) {
      activeConnRef.current.send(messageData);
    }

    setMessages((prev) => [...prev, { sender: 'you', text: chatInput.trim(), time: timeStr }]);
    setChatInput('');
  };

  return (
    <div className="app-container">
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
          <div className="connection-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <p className="peer-id-text" style={{ margin: 0 }}>
                Your Code: <strong className="peer-id-highlight">{peerId}</strong>
              </p>
              {idGeneratedMsg && (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#10b981', 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  fontWeight: '500',
                  animation: 'fadeIn 0.2s ease-in-out'
                }}>
                  ✓ New ID generated
                </span>
              )}
            </div>

            {peerId && (
              <button onClick={handleGenerateNewId} className="btn-copy-link">
                Generate New ID
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
            {isConnected ? (
              <button className="btn-primary" style={{ backgroundColor: '#ef4444' }} onClick={handleDisconnect}>
                Disconnect
              </button>
            ) : (
              <button className="btn-primary" onClick={() => callPartner(remotePeerId)}>
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        <div className="video-grid">
          <div className="video-card">
            <div className="video-header">
              <h4 className="video-title">You</h4>
              <span className="tag-mirror">Mirror</span>
            </div>
            <video ref={localVideoRef} autoPlay playsInline muted className="mirrored" />
            
            {/* Control Buttons (Camera, Mic, and Chat Toggle) */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              padding: '10px',
              backgroundColor: 'rgba(0,0,0,0.3)'
            }}>
              {/* Camera Icon Toggle */}
              <button 
                onClick={toggleCamera} 
                title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: isCameraOn ? '#374151' : '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                {isCameraOn ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l4.58-4.58A2 2 0 0 1 24 7v10a2 2 0 0 1-.34 1.12L20.34 14.5"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </button>

              {/* Microphone Icon Toggle */}
              <button 
                onClick={toggleMic} 
                title={isMicOn ? "Mute microphone" : "Unmute microphone"}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: isMicOn ? '#374151' : '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                {isMicOn ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                    <path d="M17 16.95A7 7 0 0 1 5 11v-1m14 0v1a6.91 6.91 0 0 1-.72 3.12"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                )}
              </button>

              {/* Chat Toggle Button with Notification Badge */}
              <button 
                onClick={() => setShowChat(!showChat)} 
                title="Toggle Mini Chat"
                style={{
                  position: 'relative',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: showChat ? '#ff758c' : '#374151',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #111'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="video-card" style={{ position: 'relative' }}>
            <div className="video-header">
              <h4 className="video-title">Partner</h4>
              <span className={isConnected ? "tag-live" : "tag-mirror"}>
                {isConnected ? 'Live' : (isConnecting ? 'Connecting' : 'Waiting')}
              </span>
            </div>
            
            <video ref={remoteVideoRef} autoPlay playsInline style={{ display: isConnected ? 'block' : 'none' }} />

            {/* Mini Chat Pop-out Box over Partner Video container */}
            {showChat && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                left: '10px',
                height: '240px',
                backgroundColor: 'rgba(20, 20, 24, 0.95)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 5,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>Mini Chat</span>
                  <button 
                    onClick={() => setShowChat(false)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}
                  >
                    &times;
                  </button>
                </div>

                <div style={{
                  flex: 1,
                  padding: '10px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', margin: 'auto' }}>
                      No messages yet. Say hi to your partner! 👋
                    </p>
                  ) : (
                    messages.map((msg, index) => (
                      <div 
                        key={index} 
                        style={{
                          alignSelf: msg.sender === 'you' ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          backgroundColor: msg.sender === 'you' ? '#ff758c' : '#374151',
                          color: '#fff',
                          padding: '6px 10px',
                          borderRadius: '10px',
                          fontSize: '12px'
                        }}
                      >
                        <p style={{ margin: 0, wordBreak: 'break-word' }}>{msg.text}</p>
                        <span style={{ fontSize: '9px', opacity: 0.7, float: 'right', marginTop: '2px', marginLeft: '6px' }}>
                          {msg.time}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>

                <form onSubmit={sendMessage} style={{
                  display: 'flex',
                  padding: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  gap: '6px'
                }}>
                  <input 
                    type="text" 
                    placeholder={isConnected ? "Type a message..." : "Connect first to chat"} 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={!isConnected}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={!isConnected}
                    style={{
                      backgroundColor: '#ff758c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: isConnected ? 'pointer' : 'not-allowed',
                      opacity: isConnected ? 1 : 0.5
                    }}
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

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
                  onChange={(e) => setCustomText(e.target.value)}
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