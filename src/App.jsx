import React, { useState, useEffect, useRef } from 'react';
import './style/App.css';

export default function App() {
  const [peerId, setPeerId] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [boxCount, setBoxCount] = useState(4);
  const [customText, setCustomText] = useState('You ♥ Me');
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

      call.on('error', (err) => {
        console.error('Call connection error:', err);
        alert('Error: No ID generated matches this.');
      });
    }

    setTimeout(() => {
      if (!isConnected) {
        console.log('Connection attempt timed out or target peer does not exist.');
      }
    }, 4000);
  };

  const copyShareableLink = () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?connect=${peerId}`;
    navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard.');
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

  const takeSnapshot = () => {
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

        {/* Template & Layout Selection Panel */}
        <div className="panel">
          <h3 className="section-heading">Select Layout (Boxes)</h3>
          <div className="template-buttons layout-spacing">
            <button 
              onClick={() => setBoxCount(2)}
              className={`template-btn classic ${boxCount === 2 ? 'active' : ''}`}
            >
              2 Frames
            </button>
            <button 
              onClick={() => setBoxCount(3)}
              className={`template-btn classic ${boxCount === 3 ? 'active' : ''}`}
            >
              3 Frames
            </button>
            <button 
              onClick={() => setBoxCount(4)}
              className={`template-btn classic ${boxCount === 4 ? 'active' : ''}`}
            >
              4 Frames
            </button>
          </div>

          <h3 className="section-heading">Select Theme</h3>
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

          <button className="btn-capture btn-capture-spacing" onClick={takeSnapshot}>
            Capture Photo Strip
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden-canvas" />

        {/* Pop-up Modal Preview with Custom Text Input */}
        {snapshot && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header-row">
                <h3 className="modal-title">Customize & Preview</h3>
                <button onClick={() => setSnapshot(null)} className="btn-modal-close">
                  &times;
                </button>
              </div>

              <div className="modal-input-container">
                <label className="modal-input-label">Custom Bottom Text:</label>
                <input 
                  type="text" 
                  value={customText} 
                  onChange={handleCustomTextChange}
                  placeholder="I-type ang mensahe o pangalan dito..."
                  className="peer-input modal-text-input"
                />
              </div>

              <div className="result-image-box">
                <img src={snapshot} alt="Template Preview" className="result-img" />
              </div>
              
              <div className="modal-actions">
                <a href={snapshot} download="ldr-photostrip.png" className="btn-download">
                  Download Photo Strip
                </a>
                <button onClick={() => setSnapshot(null)} className="btn-modal-close-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}