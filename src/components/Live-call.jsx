import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/Live-call.css';

// BAGO: 8-character ID (letters + numbers, walang I, O, 0, 1) para hindi mag-banggaan sa PeerJS server.
// Ang 4-digit ID ay 9,000 lang ang posibleng bilang at ginagamit ito ng ibang tao sa libreng server,
// kaya madalas "taken" na ang ID at hindi na nagbubukas ang connection.
const generateCustomId = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set) => set.charAt(Math.floor(Math.random() * set.length));

  const chars = [];
  for (let i = 0; i < 3; i++) chars.push(pick(letters));
  for (let i = 0; i < 3; i++) chars.push(pick(digits));
  for (let i = 0; i < 2; i++) chars.push(pick(all));

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

// BAGO: STUN + (optional) TURN. Kailangan ang TURN para makapag-connect ang magkaibang network
// (halimbawa: WiFi sa isa, mobile data sa kabila). Ilagay ang credentials sa .env / Vercel:
//   VITE_TURN_USERNAME=...
//   VITE_TURN_CREDENTIAL=...
const buildIceServers = () => {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];

  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUser && turnCredential) {
    servers.push(
      { urls: 'turn:global.relay.metered.ca:80', username: turnUser, credential: turnCredential },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: turnUser, credential: turnCredential },
      { urls: 'turn:global.relay.metered.ca:443', username: turnUser, credential: turnCredential },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: turnUser, credential: turnCredential }
    );
  }

  return servers;
};

export default function LiveCall() {
  const navigate = useNavigate();
  const [peerId, setPeerId] = useState(() => generateCustomId());
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [idGeneratedMsg, setIdGeneratedMsg] = useState(false);
  const [notificationText, setNotificationText] = useState('New ID generated successfully.');
  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(7);

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const peerInstance = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallRef = useRef(null);
  const activeConnRef = useRef(null);
  const chatMessagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // BAGO: mga ref para laging updated ang status sa loob ng mga callback at timer
  const isConnectedRef = useRef(false);
  const peerReadyRef = useRef(false);
  const idRetryRef = useRef(0);
  const noticeTimeoutRef = useRef(null);
  const connectTimeoutRef = useRef(null);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    const storedData = JSON.parse(localStorage.getItem('snapSync_id_gen'));

    if (storedData && storedData.date === todayStr) {
      setRemainingAttempts(storedData.attempts);
    } else {
      localStorage.setItem('snapSync_id_gen', JSON.stringify({ date: todayStr, attempts: 7 }));
      setRemainingAttempts(7);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // BAGO: iisang helper para sa lahat ng notification (para hindi nag-uumpugan ang mga timeout)
  const showNotice = (text, duration = 3500) => {
    setNotificationText(text);
    setIdGeneratedMsg(true);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setIdGeneratedMsg(false), duration);
  };

  const clearConnectTimeout = () => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  };

  const setupConnectionListeners = (conn) => {
    activeConnRef.current = conn;
    conn.on('data', (data) => {
      if (data && data.type === 'chat') {
        setMessages((prev) => [...prev, { sender: 'partner', text: data.text, time: data.time }]);
        if (!showChat) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    });
    conn.on('error', (err) => {
      console.error('Data connection error:', err);
    });
  };

  // BAGO: may malinaw nang mensahe sa bawat klase ng error (dati tahimik lang ito)
  const handlePeerError = (err) => {
    console.error('Peer error:', err);
    setIsConnecting(false);
    clearConnectTimeout();

    switch (err.type) {
      case 'unavailable-id': {
        // May ibang gumagamit na ng ID na ito sa server, gumawa ng bago at subukan ulit
        if (idRetryRef.current < 5) {
          idRetryRef.current += 1;
          const newId = generateCustomId();
          setPeerId(newId);
          initializePeer(newId);
        } else {
          showNotice('Could not get a free code. Please refresh the page.');
        }
        break;
      }
      case 'peer-unavailable':
        showNotice("Partner's code was not found. Check the code and make sure they opened Live Call.");
        break;
      case 'network':
      case 'server-error':
      case 'socket-error':
      case 'socket-closed':
        showNotice('Cannot reach the connection server. Check your internet and try again.');
        break;
      case 'webrtc':
        showNotice('Connection failed. Try again or switch network.');
        break;
      default:
        showNotice('Something went wrong. Please try again.');
    }
  };

  const initializePeer = (idToUse) => {
    if (peerInstance.current) {
      peerInstance.current.destroy();
    }
    peerReadyRef.current = false;

    const peer = new window.Peer(idToUse, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      config: {
        iceServers: buildIceServers()
      }
    });

    // BINAGO: itinatakda agad ang peerInstance (dati sa 'open' pa, kaya walang nangyayari
    // kapag pinindot ang Connect bago mag-open)
    peerInstance.current = peer;

    peer.on('open', (id) => {
      console.log('Peer connected with ID:', id);
      peerReadyRef.current = true;
      idRetryRef.current = 0;
    });

    // BAGO: kapag nawala ang koneksyon sa PeerJS server (halimbawa nag-sleep ang phone), mag-reconnect
    peer.on('disconnected', () => {
      peerReadyRef.current = false;
      if (!peer.destroyed) {
        peer.reconnect();
      }
    });

    peer.on('error', handlePeerError);

    peer.on('connection', (conn) => {
      setupConnectionListeners(conn);
    });

    peer.on('call', (call) => {
      setIsConnecting(true);
      activeCallRef.current = call;
      
      const processIncomingCall = (stream) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          clearConnectTimeout();
          setIsConnected(true);
          setIsConnecting(false);
        });
        call.on('close', () => handleCleanupOnDisconnect());
        call.on('error', (err) => {
          console.error('Call error:', err);
          setIsConnecting(false);
        });
      };

      if (localStreamRef.current) {
        processIncomingCall(localStreamRef.current);
      } else {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then((stream) => {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            processIncomingCall(stream);
          })
          .catch((err) => {
            setIsConnecting(false);
            console.error('Camera permission error:', err);
            showNotice('Camera/mic permission is needed to join the call.');
          });
      }
    });
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        initializePeer(peerId);
      })
      .catch((err) => {
        console.error('Camera error:', err);
        initializePeer(peerId);
      });

    return () => {
      clearConnectTimeout();
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
      if (peerInstance.current) peerInstance.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (showChat) {
      setUnreadCount(0);
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  const handleGenerateNewId = () => {
    if (remainingAttempts <= 0) {
      showNotice('Daily limit reached (7 attempts). Please try again tomorrow.');
      return;
    }
    if (cooldown > 0) return;

    const newId = generateCustomId();
    setPeerId(newId);
    setIsConnected(false);
    setIsConnecting(false);
    setMessages([]);
    idRetryRef.current = 0;
    initializePeer(newId);

    const newAttempts = remainingAttempts - 1;
    setRemainingAttempts(newAttempts);
    const todayStr = new Date().toDateString();
    localStorage.setItem('snapSync_id_gen', JSON.stringify({ date: todayStr, attempts: newAttempts }));

    showNotice(`New ID generated successfully (${newAttempts}/7 attempts remaining).`, 3000);
    setCooldown(5);
  };

  const callPartner = (remoteId) => {
    const trimmedId = remoteId.trim().toUpperCase();
    if (!trimmedId) {
      showNotice("Please enter your partner's code first.");
      return;
    }
    if (trimmedId === peerId) {
      showNotice("That's your own code. Enter your partner's code.");
      return;
    }
    // BAGO: may mensahe na kapag hindi pa handa ang connection sa server
    if (!peerInstance.current || !peerReadyRef.current) {
      showNotice('Still connecting to the server. Please wait a moment and try again.');
      return;
    }

    setIsConnecting(true);

    // BAGO: kung walang sagot sa loob ng 20 segundo, itigil at magpakita ng mensahe
    clearConnectTimeout();
    connectTimeoutRef.current = setTimeout(() => {
      if (!isConnectedRef.current) {
        if (activeCallRef.current) activeCallRef.current.close();
        setIsConnecting(false);
        showNotice('Could not connect. Check the code, and make sure both of you are online. Different networks may need a TURN server.', 6000);
      }
    }, 20000);

    const conn = peerInstance.current.connect(trimmedId);
    setupConnectionListeners(conn);

    const executeCall = (stream) => {
      const call = peerInstance.current.call(trimmedId, stream);
      if (call) {
        activeCallRef.current = call;
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          clearConnectTimeout();
          setIsConnected(true);
          setIsConnecting(false);
        });
        call.on('close', () => handleCleanupOnDisconnect());
        call.on('error', (err) => {
          console.error('Call error:', err);
          clearConnectTimeout();
          setIsConnecting(false);
        });
      } else {
        clearConnectTimeout();
        setIsConnecting(false);
      }
    };

    if (localStreamRef.current) {
      executeCall(localStreamRef.current);
    } else {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          executeCall(stream);
        })
        .catch(() => {
          clearConnectTimeout();
          setIsConnecting(false);
          showNotice('Camera/mic permission is needed to start the call.');
        });
    }
  };

  const handleDisconnect = () => {
    if (activeCallRef.current) activeCallRef.current.close();
    if (activeConnRef.current) activeConnRef.current.close();
    handleCleanupOnDisconnect();
  };

  const handleCleanupOnDisconnect = () => {
    clearConnectTimeout();
    setIsConnected(false);
    setIsConnecting(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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

  const handleToggleChat = () => {
    setShowChat((prev) => {
      const nextState = !prev;
      if (nextState) {
        setUnreadCount(0);
        setTimeout(() => {
          if (isConnected) {
            chatInputRef.current?.focus();
          }
        }, 100);
      }
      return nextState;
    });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!isConnected) return;
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
    <div className="live-call-container">
      <div className="live-call-wrapper">
        
        {/* Header - Quotes Removed */}
        <header className="live-call-header">
          <div onClick={() => navigate('/main')} className="header-brand-clickable">
            <h2>SnapSync Live Call</h2>
            <p>Real-time video and chat with your partner</p>
          </div>
          <button onClick={() => navigate('/main')} className="btn-back-home">Back Home</button>
        </header>

        {/* Connection Panel */}
        <div className="connection-panel">
          
          {idGeneratedMsg && (
            <div className="mobile-notification-banner">
              {notificationText}
            </div>
          )}

          <div className="connection-top-row">
            <div className="peer-id-info-wrapper">
              <p className="peer-id-text">
                Your Code: <strong className="peer-id-highlight">{peerId}</strong>
              </p>

              <div className={`connection-status-badge ${isConnected ? 'connected' : 'waiting'}`}>
                <span className="status-dot"></span>
                <span className="status-label">{isConnected ? 'Connected' : 'Waiting...'}</span>
              </div>
              
              {idGeneratedMsg && (
                <div className="desktop-id-bubble-notification">
                  {notificationText}
                </div>
              )}
            </div>

            <div className="generate-section">
              <button 
                onClick={handleGenerateNewId} 
                disabled={cooldown > 0}
                className="btn-generate-id"
              >
                {cooldown > 0 ? `Wait (${cooldown}s)` : 'Generate New ID'}
              </button>
            </div>
          </div>
          
          <div className="connection-form">
            <input 
              type="text" 
              placeholder="Enter partner's code..." 
              value={remotePeerId} 
              onChange={(e) => setRemotePeerId(e.target.value.toUpperCase())}
              className="peer-input-field"
              style={{ textTransform: 'uppercase' }}
            />
            {isConnected ? (
              <button className="btn-disconnect" onClick={handleDisconnect}>Disconnect</button>
            ) : (
              <button className="btn-connect" onClick={() => callPartner(remotePeerId)}>
                {isConnecting ? 'Connecting' : 'Connect'}
                {isConnecting && <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>}
              </button>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="video-grid-container">
          
          {/* You Box */}
          <div className="video-card-box you-card-relative">
            <div className="video-pill-badge">YOU</div>
            
            <div className="video-wrapper-inner">
              <video ref={localVideoRef} autoPlay playsInline muted className="video-element mirrored-video" />
              {!isCameraOn && (
                <div className="camera-off-overlay">
                  <span>Camera Off</span>
                </div>
              )}

              {/* Mini Chat Popup */}
              {showChat && (
                <div className="mini-chat-popup">
                  <div className="mini-chat-header">
                    <span>Mini Chat</span>
                    <button onClick={handleToggleChat} className="close-chat-btn">&times;</button>
                  </div>
                  <div className="mini-chat-messages-area">
                    {!isConnected ? (
                      <div style={{ textAlign: 'center', color: '#b91c1c', fontSize: '0.85rem', padding: '24px 12px', fontWeight: '500', lineHeight: '1.4' }}>
                        Notice: You must be connected with your partner first before you can send or receive messages.
                      </div>
                    ) : messages.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem', marginTop: '20px' }}>No messages yet. Start the conversation.</p>
                    ) : (
                      messages.map((msg, index) => (
                        <div key={index} className={`chat-bubble ${msg.sender === 'you' ? 'bubble-you' : 'bubble-partner'}`}>
                          <span className="chat-sender-label">{msg.sender === 'you' ? 'You' : 'Partner'}</span>
                          <p style={{ margin: 0 }}>{msg.text}</p>
                          <span style={{ fontSize: '0.6rem', display: 'block', textAlign: 'right', opacity: 0.6, marginTop: '2px' }}>{msg.time}</span>
                        </div>
                      ))
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>
                  
                  {isConnected ? (
                    <form onSubmit={sendMessage} className="mini-chat-form">
                      <input 
                        ref={chatInputRef}
                        type="text" 
                        placeholder="Type a message..." 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)} 
                        className="chat-input-box" 
                      />
                      <button type="submit" className="chat-send-btn">Send</button>
                    </form>
                  ) : (
                    <div className="mini-chat-form" style={{ background: '#f8fafc', padding: '8px 12px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                      Chat locked until connected
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="video-controls-bar">
              <button onClick={toggleCamera} className={`control-btn ${isCameraOn ? 'active' : 'inactive'}`} title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}>
                {isCameraOn ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l4-4L22 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                )}
              </button>

              <button onClick={toggleMic} className={`control-btn ${isMicOn ? 'active' : 'inactive'}`} title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}>
                {isMicOn ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 11v-1m14 0v1a6.91 6.91 0 0 1-.88 3.38"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                )}
              </button>

              <button onClick={handleToggleChat} className={`control-btn ${showChat ? 'chat-active' : 'active'}`} title="Toggle Chat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                {unreadCount > 0 && (
                  <span className="unread-badge">{unreadCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Partner Box */}
          <div className="video-card-box partner-card-relative">
            <div className="video-pill-badge">PARTNER</div>
            
            <div className="video-wrapper-inner partner-video-wrapper">
              <video ref={remoteVideoRef} autoPlay playsInline className={`video-element ${isConnected ? 'display-block' : 'display-none'}`} />

              {!isConnected && (
                <div className="waiting-overlay">
                  {isConnecting ? (
                    <span>Connecting to partner<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></span>
                  ) : (
                    <span>Waiting for partner to connect<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></span>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}