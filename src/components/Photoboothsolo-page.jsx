import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/Photoboothsolo-page.css';

export default function PhotoboothSoloPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([null, null, null, null]);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [selectedFrame, setSelectedFrame] = useState('classic-black');
  
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showFrameMenu, setShowFrameMenu] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const [retakeTargetIndex, setRetakeTargetIndex] = useState(null);
  
  const timerRef = useRef(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        console.error("Error accessing camera: ", err);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureSingleShot = async (targetIndex = null) => {
    if (isCapturing) return;
    setIsCapturing(true);
    isCancelledRef.current = false;

    for (let i = countdownSeconds; i > 0; i--) {
      if (isCancelledRef.current) break;
      setCountdown(i);
      await new Promise((resolve) => {
        timerRef.current = setTimeout(resolve, 1000);
      });
    }

    if (isCancelledRef.current) {
      setIsCapturing(false);
      setCountdown(null);
      setRetakeTargetIndex(null);
      return;
    }

    setCountdown(null);

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (selectedFilter === 'grayscale') {
        ctx.filter = 'grayscale(100%)';
      } else if (selectedFilter === 'sepia') {
        ctx.filter = 'sepia(100%)';
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageSrc = canvas.toDataURL('image/png');

      setPhotos(prevPhotos => {
        const updated = [...prevPhotos];
        if (targetIndex !== null) {
          updated[targetIndex] = imageSrc;
        } else {
          const emptyIndex = updated.findIndex(p => p === null);
          if (emptyIndex !== -1) {
            updated[emptyIndex] = imageSrc;
          }
        }
        return updated;
      });
    }

    setIsCapturing(false);
    setRetakeTargetIndex(null);
  };

  const startPhotoBooth = async () => {
    if (isCapturing) return;
    setPhotos([null, null, null, null]);
    isCancelledRef.current = false;
    setIsCapturing(true);
    
    for (let shot = 0; shot < 4; shot++) {
      if (isCancelledRef.current) break;

      for (let i = countdownSeconds; i > 0; i--) {
        if (isCancelledRef.current) break;
        setCountdown(i);
        await new Promise((resolve) => {
          timerRef.current = setTimeout(resolve, 1000);
        });
      }

      if (isCancelledRef.current) break;
      setCountdown(null);

      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        
        if (selectedFilter === 'grayscale') {
          ctx.filter = 'grayscale(100%)';
        } else if (selectedFilter === 'sepia') {
          ctx.filter = 'sepia(100%)';
        } else {
          ctx.filter = 'none';
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/png');
        
        setPhotos(prev => {
          const updated = [...prev];
          updated[shot] = imageSrc;
          return updated;
        });
      }

      if (shot < 3 && !isCancelledRef.current) {
        await new Promise((resolve) => {
          timerRef.current = setTimeout(resolve, 1000);
        });
      }
    }

    setIsCapturing(false);
    setCountdown(null);
  };

  const cancelPhotoBooth = () => {
    isCancelledRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsCapturing(false);
    setCountdown(null);
    setRetakeTargetIndex(null);
  };

  const handleSlotClick = (index) => {
    if (isCapturing) return;
    setRetakeTargetIndex(index);
    captureSingleShot(index);
  };

  const getFilterClass = () => {
    if (selectedFilter === 'grayscale') return 'solo-filter-grayscale';
    if (selectedFilter === 'sepia') return 'solo-filter-sepia';
    return 'solo-filter-normal';
  };

  return (
    <div className="solo-photobooth-main-wrapper">
      <header className="solo-photobooth-top-header">
        <div className="solo-header-left-group">
          <div>
            <div className="solo-header-title-row">
              <h2 className="solo-brand-title">SnapSync Photobooth</h2>
            </div>
            <p className="solo-brand-subtitle">Solo Session</p>
          </div>
        </div>
        <div className="solo-header-buttons-group">
          <button onClick={() => navigate('/photobooth')} className="solo-btn-secondary">
            Change Mode
          </button>
          <button onClick={() => navigate('/main')} className="solo-btn-secondary">
            Back Home
          </button>
        </div>
      </header>

      <div className="solo-photobooth-grid-layout">
        <div className="solo-content-card">
          <div className="solo-video-viewport-wrapper">
            <div className="solo-camera-mode-badge-overlay">
              <span className="solo-mode-badge solo-glowing-badge">Solo Mode</span>
            </div>

            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`solo-camera-video ${getFilterClass()}`} 
            />
            
            {countdown !== null && (
              <div className="solo-countdown-display-overlay">
                <span>{countdown}</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!isCapturing && (
            <div className="solo-filters-control-bar">
              <div className="solo-dropdown-wrapper">
                <button 
                  onClick={() => { setShowFilterMenu(!showFilterMenu); setShowTimerMenu(false); setShowFrameMenu(false); }} 
                  className="solo-control-menu-btn"
                >
                  Filter: <span className="solo-highlight-text">{selectedFilter}</span>
                </button>

                {showFilterMenu && (
                  <div className="solo-dropdown-menu-box">
                    {['normal', 'grayscale', 'sepia'].map((filt) => (
                      <button 
                        key={filt}
                        onClick={() => { setSelectedFilter(filt); setShowFilterMenu(false); }} 
                        className={`solo-dropdown-item-btn ${selectedFilter === filt ? 'active' : ''}`}
                      >
                        <span>{filt === 'grayscale' ? 'Grey Mode' : filt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="solo-dropdown-wrapper">
                <button 
                  onClick={() => { setShowTimerMenu(!showTimerMenu); setShowFilterMenu(false); setShowFrameMenu(false); }} 
                  className="solo-control-menu-btn"
                >
                  Timer: <span className="solo-highlight-text">{countdownSeconds}s</span>
                </button>

                {showTimerMenu && (
                  <div className="solo-dropdown-menu-box">
                    {[3, 5, 10].map((secs) => (
                      <button 
                        key={secs}
                        onClick={() => { setCountdownSeconds(secs); setShowTimerMenu(false); }} 
                        className={`solo-dropdown-item-btn ${countdownSeconds === secs ? 'active' : ''}`}
                      >
                        <span>{secs} Seconds</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="solo-action-button-container">
            {!isCapturing ? (
              <button onClick={startPhotoBooth} className="solo-btn-primary-action">
                Start Photobooth
              </button>
            ) : (
              <button onClick={cancelPhotoBooth} className="solo-btn-danger-action">
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="solo-content-card solo-preview-card-pane">
          <h3>Your Photo Strip</h3>
          
          <div className="solo-retake-instruction-banner">
            <p>Click any box below to retake that specific shot.</p>
          </div>
          
          <div className="solo-strip-display-box">
            <div className={`solo-photostrip-box ${selectedFrame === 'classic-black' ? 'solo-frame-classic-black' : 'solo-frame-white'}`}>
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index} 
                  className="solo-strip-slot-box" 
                  onClick={() => handleSlotClick(index)}
                  title="Click to retake this shot"
                >
                  {photos[index] ? (
                    <>
                      <img src={photos[index]} alt={`shot-${index}`} className="solo-strip-captured-img" />
                      <div className="solo-retake-overlay-hint">RETAKE</div>
                    </>
                  ) : (
                    <span className="solo-strip-placeholder-text">Shot {index + 1}</span>
                  )}
                </div>
              ))}
              <div className="solo-strip-branding-label">SNAPSYNC SOLO</div>
            </div>
          </div>

          <div className="solo-filters-control-bar">
            <div className="solo-dropdown-wrapper">
              <button 
                onClick={() => { setShowFrameMenu(!showFrameMenu); setShowFilterMenu(false); setShowTimerMenu(false); }} 
                className="solo-control-menu-btn"
              >
                Select your frame
              </button>

              {showFrameMenu && (
                <div className="solo-dropdown-menu-box">
                  <button 
                    onClick={() => { setSelectedFrame('classic-black'); setShowFrameMenu(false); }} 
                    className={`solo-dropdown-item-btn ${selectedFrame === 'classic-black' ? 'active' : ''}`}
                  >
                    <span>Black Frame</span>
                    <span className="solo-dropdown-subtext">NORMAL FRAME FREE</span>
                  </button>

                  <button 
                    onClick={() => { setSelectedFrame('white'); setShowFrameMenu(false); }} 
                    className={`solo-dropdown-item-btn ${selectedFrame === 'white' ? 'active' : ''}`}
                  >
                    <span>White Frame</span>
                    <span className="solo-dropdown-subtext">NORMAL FRAME FREE</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {photos.every(p => p !== null) && (
            <button onClick={() => alert('Download feature ready!')} className="solo-btn-primary-action solo-download-btn-fix">
              Download 
            </button>
          )}
        </div>
      </div>
    </div>
  );
}