import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/PhotoboothDuo-page.css';

export default function PhotoboothDuoPage() {
  const navigate = useNavigate();

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

  const [peerId, setPeerId] = useState(() => generateCustomId());
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [idGeneratedMsg, setIdGeneratedMsg] = useState(false);
  const [notificationText, setNotificationText] = useState('New ID generated successfully.');
  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(7);

  const [filter, setFilter] = useState('filter-normal');
  const [filterName, setFilterName] = useState('NORMAL');
  const [timerDuration, setTimerDuration] = useState(3);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [frameStyle, setFrameStyle] = useState('frame-classic-black');

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [partnerMsg, setPartnerMsg] = useState('');

  const [shots, setShots] = useState([null, null, null, null]);

  const myVideoRef = useRef(null);
  const partnerVideoRef = useRef(null);
  const peerInstance = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallRef = useRef(null);
  const activeConnRef = useRef(null); // Para sa data channel messaging
  const activeIntervalRef = useRef(null);
  const activeTimeoutRef = useRef(null);
  const isConnectedRef = useRef(false);
  const partnerMsgTimeoutRef = useRef(null);

  // BAGO: refs para laging updated ang filter at timer sa loob ng mga callback
  // (para tama rin sa device na tinawagan / tumanggap ng call)
  const filterRef = useRef('filter-normal');
  const timerDurationRef = useRef(3);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    timerDurationRef.current = timerDuration;
  }, [timerDuration]);

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

  // Handle incoming data messages from partner
  const setupDataConnection = (conn) => {
    activeConnRef.current = conn;

    conn.on('data', (data) => {
      if (data.type === 'START_COUNTDOWN') {
        // Kapag pinindot ng partner ang start, mag-countdown din dito locally
        runCountdownSequence(data.shotIndex, false);
      } else if (data.type === 'CANCEL_SESSION') {
        handleCancelBoothLocally();
      }
    });

    conn.on('close', () => {
      activeConnRef.current = null;
    });
  };

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
      console.error('Peer error:', err);
    });

    // Handle incoming data connection
    peer.on('connection', (conn) => {
      setupDataConnection(conn);
    });

    peer.on('call', (call) => {
      setIsConnecting(true);
      activeCallRef.current = call;

      const answerCall = (stream) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          if (partnerVideoRef.current) {
            partnerVideoRef.current.srcObject = remoteStream;
          }
          setIsConnected(true);
          setIsConnecting(false);
        });
        call.on('close', () => handleCleanupOnDisconnect());
      };

      if (localStreamRef.current) {
        answerCall(localStreamRef.current);
      } else {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then((stream) => {
            localStreamRef.current = stream;
            if (myVideoRef.current) myVideoRef.current.srcObject = stream;
            answerCall(stream);
          })
          .catch((err) => {
            setIsConnecting(false);
            console.error('Camera permission error:', err);
          });
      }
    });
  };

  useEffect(() => {
    initializePeer(peerId);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
      });

    return () => {
      if (peerInstance.current) peerInstance.current.destroy();
      if (partnerMsgTimeoutRef.current) clearTimeout(partnerMsgTimeoutRef.current);
    };
  }, []);

  const handleGenerateNewId = () => {
    if (remainingAttempts <= 0) {
      setNotificationText('Daily limit reached (7 attempts). Please try again tomorrow.');
      setIdGeneratedMsg(true);
      setTimeout(() => setIdGeneratedMsg(false), 3500);
      return;
    }
    if (cooldown > 0) return;

    const newId = generateCustomId();
    setPeerId(newId);
    setIsConnected(false);
    setIsConnecting(false);
    initializePeer(newId);

    const newAttempts = remainingAttempts - 1;
    setRemainingAttempts(newAttempts);
    const todayStr = new Date().toDateString();
    localStorage.setItem('snapSync_id_gen', JSON.stringify({ date: todayStr, attempts: newAttempts }));

    setNotificationText(`New ID generated successfully (${newAttempts}/7 attempts remaining).`);
    setIdGeneratedMsg(true);
    setCooldown(5);

    setTimeout(() => {
      setIdGeneratedMsg(false);
    }, 3000);
  };

  const callPartner = (remoteId) => {
    if (!peerInstance.current) return;
    const trimmedId = remoteId.trim();
    if (!trimmedId || trimmedId === peerId) return;

    setIsConnecting(true);

    // Buksan ang Data Connection patungo sa partner
    const conn = peerInstance.current.connect(trimmedId);
    setupDataConnection(conn);

    const executeCall = (stream) => {
      const call = peerInstance.current.call(trimmedId, stream);
      if (call) {
        activeCallRef.current = call;
        call.on('stream', (remoteStream) => {
          if (partnerVideoRef.current) partnerVideoRef.current.srcObject = remoteStream;
          setIsConnected(true);
          setIsConnecting(false);
        });
        call.on('close', () => handleCleanupOnDisconnect());
      } else {
        setIsConnecting(false);
      }
    };

    if (localStreamRef.current) {
      executeCall(localStreamRef.current);
    } else {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (myVideoRef.current) myVideoRef.current.srcObject = stream;
          executeCall(stream);
        })
        .catch(() => setIsConnecting(false));
    }
  };

  const handleDisconnect = () => {
    if (activeCallRef.current) activeCallRef.current.close();
    if (activeConnRef.current) activeConnRef.current.close();
    handleCleanupOnDisconnect();
  };

  const handleCleanupOnDisconnect = () => {
    setIsConnected(false);
    setIsConnecting(false);
    if (partnerVideoRef.current) partnerVideoRef.current.srcObject = null;
    setRemotePeerId('');
  };

  // Maliit na notif na nawawala after 3 seconds
  const showPartnerMsg = (text) => {
    setPartnerMsg(text);
    if (partnerMsgTimeoutRef.current) clearTimeout(partnerMsgTimeoutRef.current);
    partnerMsgTimeoutRef.current = setTimeout(() => setPartnerMsg(''), 3000);
  };

  const handleStartBooth = () => {
    if (isCapturing) return;
    // BAGO: kailangan may partner na nakakonekta bago makapag-start
    if (!isConnected) {
      showPartnerMsg('You need to connect your partner to start your shots.');
      return;
    }
    setShots([null, null, null, null]);
    setShowResult(false);
    setIsCapturing(true);
    setShowFilterMenu(false);
    setShowTimerMenu(false);

    // I-broadcast sa partner na mag-start na rin sila sa shot index 0
    if (activeConnRef.current && activeConnRef.current.open) {
      activeConnRef.current.send({ type: 'START_COUNTDOWN', shotIndex: 0 });
    }

    runCountdownSequence(0, true);
  };

  const handleCancelBooth = () => {
    if (activeConnRef.current && activeConnRef.current.open) {
      activeConnRef.current.send({ type: 'CANCEL_SESSION' });
    }
    handleCancelBoothLocally();
  };

  const handleCancelBoothLocally = () => {
    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
    setIsCapturing(false);
    setCountdown(null);
    if (shots.every((shot) => shot)) setShowResult(true);
  };

  const runCountdownSequence = (shotIndex, isInitiator = false) => {
    if (shotIndex >= 4) {
      setIsCapturing(false);
      setCountdown(null);
      setShowResult(true);
      return;
    }

    startSingleCountdown(() => {
      captureImage(shotIndex);
      activeTimeoutRef.current = setTimeout(() => {
        const nextIndex = shotIndex + 1;
        if (nextIndex < 4) {
          if (isInitiator && activeConnRef.current && activeConnRef.current.open) {
            activeConnRef.current.send({ type: 'START_COUNTDOWN', shotIndex: nextIndex });
          }
          runCountdownSequence(nextIndex, isInitiator);
        } else {
          setIsCapturing(false);
          setCountdown(null);
          setShowResult(true);
        }
      }, 1000);
    });
  };

  const startSingleCountdown = (onComplete, onAbort) => {
    // BINAGO: gumagamit ng ref para tama ang timer kahit sa device ng partner
    let currentCount = timerDurationRef.current;
    setCountdown(currentCount);

    activeIntervalRef.current = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(activeIntervalRef.current);
        setCountdown(null);

        // BAGO: kung nawala ang partner habang nagko-countdown, huwag mag-capture
        if (!isConnectedRef.current) {
          showPartnerMsg('Partner disconnected. Reconnect to continue.');
          if (onAbort) onAbort();
          else setIsCapturing(false);
          return;
        }

        onComplete();
      }
    }, 1000);
  };

  const handleRetakeSpecificShot = (index) => {
    if (isCapturing) return;
    if (!isConnected) return; // BAGO: kailangan ding nakakonekta para mag-retake
    setShowResult(false);
    setIsCapturing(true);
    setShowFilterMenu(false);
    setShowTimerMenu(false);

    startSingleCountdown(
      () => {
        captureImage(index);
        setIsCapturing(false);
        setShowResult(true);
      },
      () => {
        setIsCapturing(false);
        setShowResult(true); // nawala ang partner, balik sa popup
      }
    );
  };

  // BINAGO: gumagamit ng ref para tama ang filter kahit sa device ng partner
  const getCanvasFilter = () => {
    if (filterRef.current === 'filter-grayscale') return 'grayscale(100%)';
    if (filterRef.current === 'filter-sepia') return 'sepia(100%)';
    return 'none';
  };

  const drawVideoCover = (ctx, video, dx, dy, dw, dh, mirror = false) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return false;

    const targetRatio = dw / dh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (vw / vh > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    if (mirror) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
    } else {
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    ctx.restore();
    return true;
  };

  // BINAGO: bawat shot ay isang "row" na may 2 cells: ikaw sa KALIWA, partner sa KANAN
  // (4 shots = 4 rows, kaya 2 columns x 4 rows ang buong strip)
  const captureImage = (index) => {
    const myVideo = myVideoRef.current;
    const partnerVideo = partnerVideoRef.current;
    if (!myVideo) return;

    // Bawat cell ay 800x600 (4:3), kaya ang isang row ay 1600x600
    const CELL_W = 800;
    const CELL_H = 600;
    const W = CELL_W * 2;
    const H = CELL_H;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0b0b0c';
    ctx.fillRect(0, 0, W, H);
    ctx.filter = getCanvasFilter();

    // KALIWA: ikaw (naka-mirror para natural tignan, kapareho ng nakikita mo sa screen)
    drawVideoCover(ctx, myVideo, 0, 0, CELL_W, CELL_H, true);

    // KANAN: partner mo (kung may live video na)
    const partnerReady =
      partnerVideo && partnerVideo.srcObject && partnerVideo.videoWidth > 0;
    if (partnerReady) {
      drawVideoCover(ctx, partnerVideo, CELL_W, 0, CELL_W, CELL_H, false);
    }

    ctx.filter = 'none';

    const imageUrl = canvas.toDataURL('image/jpeg', 0.95);

    setShots((prev) => {
      const updated = [...prev];
      updated[index] = imageUrl;
      return updated;
    });
  };

  return (
    <div className="photobooth-main-wrapper duo-page">
      <div className="photobooth-top-header">
        <div className="header-left-group">
          <div>
            <h1 className="brand-title">SnapSync Photobooth</h1>
            <p className="brand-subtitle">Duo / LDR Session</p>
          </div>
        </div>
        <div className="header-buttons-group">
          <button className="btn-secondary" onClick={() => navigate('/photobooth')}>Change Mode</button>
          <button className="btn-secondary" onClick={() => navigate('/main')}>Back Home</button>
        </div>
      </div>

      <div className="connection-panel">
        <div className="connection-top-row">
          <div className="peer-id-info-wrapper">
            <p className="peer-id-text">
              Your Code: <strong className="peer-id-highlight">{peerId}</strong>
            </p>
            
            <div className={`connection-status-pill ${isConnected ? 'connected' : 'waiting'}`}>
              <span className="status-dot"></span>
              <span>{isConnected ? 'Connected' : (isConnecting ? 'Connecting...' : 'Waiting...')}</span>
            </div>

            {idGeneratedMsg && (
              <span className="id-notif-pill" role="status">{notificationText}</span>
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
            placeholder="Paste partner's code here..."
            value={remotePeerId}
            onChange={(e) => setRemotePeerId(e.target.value.toUpperCase())}
            className="peer-input-field"
          />
          {isConnected ? (
            <button className="btn-disconnect" onClick={handleDisconnect}>Disconnect</button>
          ) : (
            <button className="btn-connect" onClick={() => callPartner(remotePeerId)}>
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      <div className="photobooth-grid-layout">
        <div className="content-card">
          <div className="duo-video-grid">
            {countdown !== null && (
              <div className="duo-countdown">{countdown}</div>
            )}

            <div className="duo-half">
              <span className="duo-label">YOU</span>
              {partnerMsg && (
                <div className="partner-needed-msg" role="alert">{partnerMsg}</div>
              )}
              <video
                ref={myVideoRef}
                autoPlay
                playsInline
                muted
                className={`camera-video ${filter}`}
              />
            </div>

            <div className="duo-half">
              <span className={`duo-label ${isConnected ? 'live' : ''}`}>
                {isConnected ? 'PARTNER · LIVE' : 'PARTNER'}
              </span>
              <video
                ref={partnerVideoRef}
                autoPlay
                playsInline
                className="camera-video"
              />
              {!isConnected && (
                <div className="duo-waiting-overlay">
                  <span className="duo-waiting-text">
                    {isConnecting ? 'Connecting' : 'Waiting for partner'}
                    <span className="loading-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isCapturing && (
            <div className="filters-control-bar">
              <div className="dropdown-wrapper">
                <button
                  className="control-menu-btn"
                  onClick={() => { setShowFilterMenu(!showFilterMenu); setShowTimerMenu(false); }}
                >
                  Filter: <span className="highlight-text">{filterName}</span>
                </button>
                {showFilterMenu && (
                  <div className="dropdown-menu-box">
                    <button className={`dropdown-item-btn ${filterName === 'NORMAL' ? 'active' : ''}`} onClick={() => { setFilter('filter-normal'); setFilterName('NORMAL'); setShowFilterMenu(false); }}>
                      Normal <span className="dropdown-subtext">Clean look</span>
                    </button>
                    <button className={`dropdown-item-btn ${filterName === 'GRAYSCALE' ? 'active' : ''}`} onClick={() => { setFilter('filter-grayscale'); setFilterName('GRAYSCALE'); setShowFilterMenu(false); }}>
                      Grayscale <span className="dropdown-subtext">Classic monochrome</span>
                    </button>
                    <button className={`dropdown-item-btn ${filterName === 'SEPIA' ? 'active' : ''}`} onClick={() => { setFilter('filter-sepia'); setFilterName('SEPIA'); setShowFilterMenu(false); }}>
                      Sepia <span className="dropdown-subtext">Vintage warm</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="dropdown-wrapper">
                <button
                  className="control-menu-btn"
                  onClick={() => { setShowTimerMenu(!showTimerMenu); setShowFilterMenu(false); }}
                >
                  Timer: <span className="highlight-text">{timerDuration}S</span>
                </button>
                {showTimerMenu && (
                  <div className="dropdown-menu-box">
                    <button className={`dropdown-item-btn ${timerDuration === 3 ? 'active' : ''}`} onClick={() => { setTimerDuration(3); setShowTimerMenu(false); }}>
                      3 Seconds <span className="dropdown-subtext">Quick snap</span>
                    </button>
                    <button className={`dropdown-item-btn ${timerDuration === 5 ? 'active' : ''}`} onClick={() => { setTimerDuration(5); setShowTimerMenu(false); }}>
                      5 Seconds <span className="dropdown-subtext">Standard pause</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="action-button-container">
            {isCapturing ? (
              <button
                className="btn-primary-action btn-cancel-session"
                onClick={handleCancelBooth}
              >
                Cancel Session
              </button>
            ) : (
              <button
                className={`btn-primary-action ${!isConnected ? 'needs-partner' : ''}`}
                onClick={handleStartBooth}
              >
                Start Duo Photobooth
              </button>
            )}
          </div>
        </div>
      </div>

      {showResult && (
        <div className="result-modal-backdrop" onClick={() => setShowResult(false)}>
          <div className="result-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="result-modal-title">Your Photo Strip</h3>

            <div className="retake-instruction-banner">
              <p>Click any shot to retake</p>
            </div>

            <div className="strip-display-box">
              <div className={`photostrip-box ${frameStyle}`}>
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="strip-slot-box"
                    onClick={() => handleRetakeSpecificShot(idx)}
                  >
                    {shots[idx] ? (
                      <>
                        <img src={shots[idx]} alt={`Shot ${idx + 1}`} className="strip-captured-img" />
                        <span className="retake-overlay-hint">Retake</span>
                      </>
                    ) : (
                      <span className="strip-placeholder-text">Shot {idx + 1}</span>
                    )}
                  </div>
                ))}
                <span className="strip-branding-label">SNAPSYNC DUO</span>
              </div>
            </div>

            <div className="result-frame-row">
              <button
                className={`result-frame-btn ${frameStyle === 'frame-classic-black' ? 'active' : ''}`}
                onClick={() => setFrameStyle('frame-classic-black')}
              >
                Classic Black
              </button>
              <button
                className={`result-frame-btn ${frameStyle === 'frame-white' ? 'active' : ''}`}
                onClick={() => setFrameStyle('frame-white')}
              >
                Clean White
              </button>
            </div>

            {!isConnected && (
              <p className="result-disconnected-note">
                Partner is disconnected. Reconnect to retake or take again.
              </p>
            )}

            <div className="result-actions-row">
              <button className="result-btn-secondary" onClick={() => setShowResult(false)}>
                Close
              </button>
              <button
                className="result-btn-primary"
                onClick={handleStartBooth}
                disabled={!isConnected}
                style={!isConnected ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                Take Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}