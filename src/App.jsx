import React, { useState, useEffect, useRef } from 'react';
import './style/App.css';

export default function App() {
  const [peerId, setPeerId] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [snapshot, setSnapshot] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
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

    // Global peer error listener
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        alert('Error: No ID generated matches this.');
      } else {
        console.error('Peer error:', err);
      }
    });

    peer.on('call', (call) => {
      if (localStreamRef.current) {
        call.answer(localStreamRef.current);
      } else {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          call.answer(stream);
        });
      }

      call.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setIsConnected(true);
      });
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
    const call = peerInstance.current.call(trimmedId, stream);
    
    if (call) {
      call.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setIsConnected(true);
      });

      // Catch errors directly tied to the outgoing call/peer unavailability
      call.on('error', (err) => {
        console.error('Call connection error:', err);
        alert('Error: No ID generated matches this.');
      });
    }

    // Fallback timer incognito check if peer doesn't exist via signaling server response delay
    setTimeout(() => {
      if (!isConnected) {
        // Optional safety check helper message if it hangs too long without connection
        console.log('Connection attempt timed out or target peer does not exist.');
      }
    }, 4000);
  };

  const copyShareableLink = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?connect=${peerId}`;
    navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard.');
  };

  const takeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    setIsCapturing(true);
    setTimeout(() => setIsCapturing(false), 500);

    canvas.width = 600;
    canvas.height = 800;

    if (selectedTemplate === 'romantic') {
      ctx.fillStyle = '#2b0914';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Date Night', canvas.width / 2, 55);

      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillStyle = '#ff758c';
      ctx.fillText('LDR MEMORIES • TOGETHER APART', canvas.width / 2, 82);
    } else if (selectedTemplate === 'neon') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00f5d4';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEON VIBES', canvas.width / 2, 55);

      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillStyle = '#7209b7';
      ctx.fillText('CYBER LOVERS • 2026', canvas.width / 2, 82);
    } else {
      ctx.fillStyle = '#faf9f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Our Snapshot', canvas.width / 2, 55);

      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('CLASSIC STRIP • FOREVER US', canvas.width / 2, 82);
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

    drawFrame(localVideoRef.current, 50, 110, 230, 280, true);
    drawFrame(remoteVideoRef.current, 320, 110, 230, 280, false);
    drawFrame(localVideoRef.current, 50, 410, 230, 280, true);
    drawFrame(remoteVideoRef.current, 320, 410, 230, 280, false);

    ctx.fillStyle = selectedTemplate === 'classic' ? '#6b7280' : '#ff758c';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MADE WITH LOVE • LDR PHOTOHOOTH', canvas.width / 2, 745);

    const imageURL = canvas.toDataURL('image/png');
    setSnapshot(imageURL);
  };

  return (
    <div className="app-container">
      {isCapturing && <div className="flash-overlay" />}

      <div className="max-width-wrapper">
        
        {/* Header */}
        <header className="app-header">
          <div>
            <h2 className="app-title">LDR Photobooth</h2>
            <p className="app-subtitle">Capture memories across the distance</p>
          </div>
          <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isConnected ? 'Connected' : 'Waiting...'}</span>
          </div>
        </header>

        {/* Connection Panel */}
        <div className="panel connection-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <p className="peer-id-text" style={{ margin: 0 }}>
              Your Code: <strong className="peer-id-highlight">{peerId}</strong>
            </p>
            {peerId && (
              <button 
                onClick={copyShareableLink} 
                style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
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
              Connect
            </button>
          </div>
        </div>

        {/* Video Streams Grid */}
        <div className="video-grid">
          <div className="video-card">
            <div className="video-header">
              <h4 className="video-title">You</h4>
              <span className="tag-mirror">Mirror</span>
            </div>
            <video ref={localVideoRef} autoPlay playsInline muted className="mirrored" />
          </div>

          <div className="video-card">
            <div className="video-header">
              <h4 className="video-title">Partner</h4>
              <span className="tag-live">Live</span>
            </div>
            <video ref={remoteVideoRef} autoPlay playsInline />
          </div>
        </div>

        {/* Template & Capture Panel */}
        <div className="panel">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#f3f4f6' }}>Select Theme</h3>
          
          <div className="template-buttons">
            <button 
              onClick={() => setSelectedTemplate('classic')}
              className={`template-btn classic ${selectedTemplate === 'classic' ? 'active' : ''}`}
            >
              Classic White
            </button>
            <button 
              onClick={() => setSelectedTemplate('romantic')}
              className={`template-btn romantic ${selectedTemplate === 'romantic' ? 'active' : ''}`}
            >
              Date Night
            </button>
            <button 
              onClick={() => setSelectedTemplate('neon')}
              className={`template-btn neon ${selectedTemplate === 'neon' ? 'active' : ''}`}
            >
              Neon Glow
            </button>
          </div>

          <button className="btn-capture" onClick={takeSnapshot}>
            Capture Photo Strip
          </button>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Snapshot Result Section */}
        {snapshot && (
          <div className="panel">
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#f3f4f6' }}>Preview</h3>
            <div className="result-image-box">
              <img src={snapshot} alt="Template Preview" className="result-img" />
            </div>
            <div>
              <a href={snapshot} download="ldr-photostrip.png" className="btn-download">
                Download Photo Strip
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}