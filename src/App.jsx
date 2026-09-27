import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState('heart'); // Default frame
  const [snapshot, setSnapshot] = useState(null);
  
  const peerInstance = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const peer = new window.Peer();

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('call', (call) => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          call.answer(stream);
          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsConnected(true);
          });
        })
        .catch((err) => console.error('Failed to get local stream', err));
    });

    peerInstance.current = peer;
  }, []);

  const callPartner = (remoteId) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const call = peerInstance.current.call(remoteId, stream);
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsConnected(true);
        });
      })
      .catch((err) => console.error('Failed to get local stream', err));
  };

  // Function to take a photo snapshot
  const takeSnapshot = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = 640;
    canvas.height = 480;

    // Draw local video (left side)
    if (localVideoRef.current) {
      context.save();
      context.scale(-1, 1);
      context.drawImage(localVideoRef.current, -320, 0, 320, 480);
      context.restore();
    }

    // Draw remote video (right side)
    if (remoteVideoRef.current) {
      context.drawImage(remoteVideoRef.current, 320, 0, 320, 480);
    }

    // Draw custom frame overlay based on selection
    context.lineWidth = 15;
    if (selectedFrame === 'heart') {
      context.strokeStyle = '#ff4d6d';
    } else if (selectedFrame === 'vintage') {
      context.strokeStyle = '#d4a373';
    } else if (selectedFrame === 'neon') {
      context.strokeStyle = '#00f5d4';
    }
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // Save image URL
    const imageURL = canvas.toDataURL('image/png');
    setSnapshot(imageURL);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', background: '#fdf2f4', minHeight: '100vh', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, color: '#333' }}>📸 LDR Photobooth</h2>
        <span style={{ padding: '6px 14px', borderRadius: '20px', background: isConnected ? '#e6f4ea' : '#fce8e6', color: isConnected ? '#137333' : '#c5221f', fontWeight: 'bold', fontSize: '0.9rem' }}>
          {isConnected ? '🟢 Connected' : '🔴 Not Connected'}
        </span>
      </header>

      {/* Connection Panel */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <p style={{ margin: '0 0 10px 0' }}><strong>Your Peer ID:</strong> <span style={{ color: '#0077b6' }}>{peerId || 'Loading...'}</span></p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Enter partner's Peer ID here" 
            value={remotePeerId} 
            onChange={(e) => setRemotePeerId(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', flex: 1, outline: 'none' }}
          />
          <button 
            onClick={() => callPartner(remotePeerId)}
            style={{ padding: '10px 20px', background: '#ff758c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Connect / Call
          </button>
        </div>
      </div>

      {/* Video Streams Display */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>You</h4>
          <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '300px', height: '225px', background: '#000', borderRadius: '8px', transform: 'scaleX(-1)', objectFit: 'cover' }} />
        </div>
        <div style={{ textAlign: 'center', background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Partner</h4>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px', height: '225px', background: '#000', borderRadius: '8px', objectFit: 'cover' }} />
        </div>
      </div>

      {/* Frame Customization & Capture Panel */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Choose Custom Frame</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
          <button 
            onClick={() => setSelectedFrame('heart')}
            style={{ padding: '8px 16px', borderRadius: '20px', border: selectedFrame === 'heart' ? '2px solid #ff4d6d' : '1px solid #ccc', background: selectedFrame === 'heart' ? '#ffe5ec' : 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            💖 Sweet Heart
          </button>
          <button 
            onClick={() => setSelectedFrame('vintage')}
            style={{ padding: '8px 16px', borderRadius: '20px', border: selectedFrame === 'vintage' ? '2px solid #d4a373' : '1px solid #ccc', background: selectedFrame === 'vintage' ? '#fefae0' : 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📜 Vintage Warm
          </button>
          <button 
            onClick={() => setSelectedFrame('neon')}
            style={{ padding: '8px 16px', borderRadius: '20px', border: selectedFrame === 'neon' ? '2px solid #00f5d4' : '1px solid #ccc', background: selectedFrame === 'neon' ? '#e0fbfc' : 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✨ Neon Glow
          </button>
        </div>

        <button 
          onClick={takeSnapshot}
          style={{ padding: '12px 30px', background: '#ff758c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(255, 117, 140, 0.3)' }}
        >
          📷 Take Snapshot
        </button>
      </div>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Snapshot Preview Result */}
      {snapshot && (
        <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Your Captured Moment</h3>
          <img src={snapshot} alt="Snapshot Preview" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px' }} />
          <div>
            <a 
              href={snapshot} 
              download="ldr-photobooth.png"
              style={{ display: 'inline-block', padding: '10px 20px', background: '#2b9348', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}
            >
              Download Photo
            </a>
          </div>
        </div>
      )}
    </div>
  );
}