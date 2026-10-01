import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/Frontpage.css';

const appQuotes = [
  "“Distance means so little when someone means so much.”",
  "“Captured smiles across miles, in real-time.”",
  "“No ocean is too wide when hearts are connected.”",
  "“Syncing your video, syncing your hearts together.”",
  "“Close to each other, even when worlds apart.”",
  "“Create custom photo strips despite the kilometers.”",
  "“Making long-distance love feel like you're right next door.”",
  "“Every snapshot brings you closer to your favorite person.”",
  "“Chat, laugh, and pose together in real-time sync.”",
  "“Miles apart, but never out of heart.”",
  "“Turn digital distance into shared memories instantly.”",
  "“A photobooth built for two hearts across the map.”",
  "“Bridge the gap with live video feeds and sweet captures.”",
  "“Your love story deserves to be captured in real-time.”",
  "“Distance is just a test of how far love can travel.”",
  "“Preserve every silly moment and sweet glance together.”",
  "“Real-time connection, real-time laughter, real memories.”",
  "“Lock in the distance and snap your love into a strip.”",
  "“Where miles melt away with a single click.”",
  "“Together in spirit, crystal clear on screen.”"
];

export default function Frontpage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % appQuotes.length);
        setFade(true);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = () => {
    setShowPermissionModal(true);
  };

  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      stream.getTracks().forEach(track => track.stop());

      setShowPermissionModal(false);
      setIsLeaving(true);
      setTimeout(() => {
        navigate('/photobooth');
      }, 600);

    } catch (error) {
      alert("Camera or Microphone access denied. Please allow it in your browser settings!");
      console.error("Permission denied:", error);
    }
  };

  return (
    <div className={`frontpage-wrapper ${isLeaving ? 'page-leave' : ''}`}>
      <div className="frontpage-content">
        <div className="frontpage-badge"> Long-Distance Connection...</div>
        
        {/* Welcome text casing updated */}
        <p className="welcome-text">Welcome to</p>
        <h1 className="frontpage-title">SnapSync</h1>

        {/* Quotes Box */}
        <div className="frontpage-features quotes-box">
          <p className={`quote-text ${fade ? 'fade-in' : 'fade-out'}`}>
            {appQuotes[currentIndex]}
          </p>
        </div>

        <button className="btn-start-app" onClick={handleOpenModal}>
          Start Your Connection
        </button>
      </div>

      {/* POPUP MODAL */}
      {showPermissionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-notification-badge">⚠️️ Notification</div>
            <h2>Enable Camera & Mic</h2>
            <p>To sync seamlessly with your partner, we need permission to turn on your camera and microphone.</p>
            
            <div className="modal-buttons">
              <button className="btn-allow" onClick={handleRequestPermission}>
                Allow & Continue
              </button>
              <button className="btn-cancel" onClick={() => setShowPermissionModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}