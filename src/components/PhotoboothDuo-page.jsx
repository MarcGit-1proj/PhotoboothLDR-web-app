import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/PhotoboothDuo-page.css';

export default function PhotoboothDuoPage() {
  const navigate = useNavigate();

  // =========================================================
  // ID GENERATOR
  // =========================================================

  const generateCustomId = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const all = letters + digits;

    const pick = (set) =>
      set.charAt(Math.floor(Math.random() * set.length));

    const chars = [];

    for (let i = 0; i < 3; i++) {
      chars.push(pick(letters));
    }

    for (let i = 0; i < 3; i++) {
      chars.push(pick(digits));
    }

    for (let i = 0; i < 2; i++) {
      chars.push(pick(all));
    }

    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  };

  // =========================================================
  // CONNECTION STATE
  // =========================================================

  const [peerId, setPeerId] = useState(() => generateCustomId());
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [idGeneratedMsg, setIdGeneratedMsg] = useState(false);
  const [notificationText, setNotificationText] = useState(
    'New ID generated successfully.'
  );

  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(7);

  // =========================================================
  // PHOTOBOOTH STATE
  // =========================================================

  const [filter, setFilter] = useState('filter-normal');
  const [filterName, setFilterName] = useState('NORMAL');

  const [timerDuration, setTimerDuration] = useState(3);
  const [countdown, setCountdown] = useState(null);

  const [isCapturing, setIsCapturing] = useState(false);

  const [frameStyle, setFrameStyle] = useState(
    'frame-classic-black'
  );

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  const [showResult, setShowResult] = useState(false);
  const [partnerMsg, setPartnerMsg] = useState('');

  const [shots, setShots] = useState([
    null,
    null,
    null,
    null,
  ]);

  // =========================================================
  // VIDEO REFS
  // =========================================================

  const myVideoRef = useRef(null);
  const partnerVideoRef = useRef(null);

  // =========================================================
  // PEER REFS
  // =========================================================

  const peerInstance = useRef(null);
  const localStreamRef = useRef(null);

  const activeCallRef = useRef(null);
  const activeConnRef = useRef(null);

  // =========================================================
  // TIMER REFS
  // =========================================================

  const activeIntervalRef = useRef(null);
  const activeTimeoutRef = useRef(null);

  // =========================================================
  // STATE REFS
  // =========================================================

  const isConnectedRef = useRef(false);

  const filterRef = useRef('filter-normal');
  const timerDurationRef = useRef(3);

  const partnerMsgTimeoutRef = useRef(null);

  // =========================================================
  // IMPORTANT:
  // SESSION CONTROL REFS
  //
  // These prevent old timers/messages from affecting
  // the new session.
  // =========================================================

  const sessionIdRef = useRef(null);

  const sessionActiveRef = useRef(false);

  const currentShotRef = useRef(-1);

  const isSessionControllerRef = useRef(false);

  const receivedShotMessagesRef = useRef(new Set());

  // =========================================================
  // STATE REF SYNC
  // =========================================================

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    timerDurationRef.current = timerDuration;
  }, [timerDuration]);

  // =========================================================
  // DAILY ID LIMIT
  // =========================================================

  useEffect(() => {
    const todayStr = new Date().toDateString();

    let storedData = null;

    try {
      storedData = JSON.parse(
        localStorage.getItem('snapSync_id_gen')
      );
    } catch {
      storedData = null;
    }

    if (storedData && storedData.date === todayStr) {
      setRemainingAttempts(
        Number.isInteger(storedData.attempts)
          ? storedData.attempts
          : 7
      );
    } else {
      localStorage.setItem(
        'snapSync_id_gen',
        JSON.stringify({
          date: todayStr,
          attempts: 7,
        })
      );

      setRemainingAttempts(7);
    }
  }, []);

  // =========================================================
  // COOLDOWN
  // =========================================================

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // =========================================================
  // TIMER CLEANUP
  // =========================================================

  const clearPhotoTimers = () => {
    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
      activeIntervalRef.current = null;
    }

    if (activeTimeoutRef.current) {
      clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = null;
    }
  };

  // =========================================================
  // SHOW PARTNER MESSAGE
  // =========================================================

  const showPartnerMsg = (text) => {
    setPartnerMsg(text);

    if (partnerMsgTimeoutRef.current) {
      clearTimeout(partnerMsgTimeoutRef.current);
    }

    partnerMsgTimeoutRef.current = setTimeout(() => {
      setPartnerMsg('');
    }, 3000);
  };

  // =========================================================
  // SEND DATA SAFELY
  // =========================================================

  const sendToPartner = (message) => {
    const conn = activeConnRef.current;

    if (!conn) {
      return false;
    }

    if (!conn.open) {
      return false;
    }

    try {
      conn.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send partner message:', error);
      return false;
    }
  };

  // =========================================================
  // END PHOTO SESSION LOCALLY
  // =========================================================

  const finishPhotoSession = (sessionId) => {
    if (
      sessionId &&
      sessionIdRef.current &&
      sessionId !== sessionIdRef.current
    ) {
      return;
    }

    clearPhotoTimers();

    sessionActiveRef.current = false;

    currentShotRef.current = -1;

    setCountdown(null);
    setIsCapturing(false);
    setShowResult(true);
  };

  // =========================================================
  // CANCEL PHOTO SESSION LOCALLY
  // =========================================================

  const cancelPhotoSessionLocally = (showResult = false) => {
    clearPhotoTimers();

    sessionActiveRef.current = false;

    currentShotRef.current = -1;

    sessionIdRef.current = null;

    receivedShotMessagesRef.current.clear();

    setCountdown(null);
    setIsCapturing(false);

    if (showResult) {
      setShowResult(true);
    }
  };

  // =========================================================
  // HANDLE PARTNER SESSION START
  // =========================================================

  const handlePartnerStartCountdown = (data) => {
    if (!data) return;

    const {
      sessionId,
      shotIndex,
    } = data;

    if (!sessionId) return;

    if (
      !Number.isInteger(shotIndex) ||
      shotIndex < 0 ||
      shotIndex > 3
    ) {
      return;
    }

    // Ignore old sessions.
    if (
      sessionIdRef.current &&
      sessionIdRef.current !== sessionId
    ) {
      return;
    }

    // Prevent duplicate message.
    const messageKey = `${sessionId}-${shotIndex}`;

    if (receivedShotMessagesRef.current.has(messageKey)) {
      return;
    }

    receivedShotMessagesRef.current.add(messageKey);

    // Create session locally if partner started it.
    if (!sessionIdRef.current) {
      sessionIdRef.current = sessionId;
    }

    sessionActiveRef.current = true;
    currentShotRef.current = shotIndex;

    setIsCapturing(true);
    setShowResult(false);

    setShowFilterMenu(false);
    setShowTimerMenu(false);

    runCountdownSequence(
      shotIndex,
      false,
      sessionId
    );
  };

  // =========================================================
  // DATA CONNECTION SETUP
  // =========================================================

  const setupDataConnection = (conn) => {
    if (!conn) return;

    activeConnRef.current = conn;

    conn.on('open', () => {
      console.log('Data connection opened.');
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') {
        return;
      }

      // ---------------------------------------------
      // START COUNTDOWN
      // ---------------------------------------------

      if (data.type === 'START_COUNTDOWN') {
        handlePartnerStartCountdown(data);
        return;
      }

      // ---------------------------------------------
      // CANCEL SESSION
      // ---------------------------------------------

      if (data.type === 'CANCEL_SESSION') {
        cancelPhotoSessionLocally(false);
        return;
      }

      // ---------------------------------------------
      // END SESSION
      // ---------------------------------------------

      if (data.type === 'END_SESSION') {
        const incomingSessionId = data.sessionId;

        if (
          incomingSessionId &&
          sessionIdRef.current &&
          incomingSessionId !== sessionIdRef.current
        ) {
          return;
        }

        finishPhotoSession(incomingSessionId);
        return;
      }

      // ---------------------------------------------
      // RETAKE
      // ---------------------------------------------

      if (data.type === 'RETAKE_SHOT') {
        const incomingSessionId = data.sessionId;
        const shotIndex = data.shotIndex;

        if (
          incomingSessionId &&
          sessionIdRef.current &&
          incomingSessionId !== sessionIdRef.current
        ) {
          return;
        }

        if (
          !Number.isInteger(shotIndex) ||
          shotIndex < 0 ||
          shotIndex > 3
        ) {
          return;
        }

        handlePartnerRetake(
          shotIndex,
          incomingSessionId
        );

        return;
      }
    });

    conn.on('close', () => {
      if (activeConnRef.current === conn) {
        activeConnRef.current = null;
      }
    });

    conn.on('error', (error) => {
      console.error('Data connection error:', error);
    });
  };

  // =========================================================
  // PEER INITIALIZATION
  // =========================================================

  const initializePeer = (idToUse) => {
    if (peerInstance.current) {
      try {
        peerInstance.current.destroy();
      } catch {
        // Ignore
      }

      peerInstance.current = null;
    }

    const peer = new window.Peer(idToUse, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      config: {
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
          {
            urls: 'stun:global.stun.twilio.com:3478',
          },
        ],
      },
    });

    peer.on('open', (id) => {
      console.log('Peer connected with ID:', id);

      peerInstance.current = peer;
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);

      setIsConnecting(false);

      if (err?.type === 'unavailable-id') {
        showPartnerMsg(
          'This code is already in use. Generate a new ID.'
        );
      }
    });

    // =====================================================
    // INCOMING DATA CONNECTION
    // =====================================================

    peer.on('connection', (conn) => {
      setupDataConnection(conn);
    });

    // =====================================================
    // INCOMING VIDEO CALL
    // =====================================================

    peer.on('call', (call) => {
      setIsConnecting(true);

      activeCallRef.current = call;

      const answerCall = (stream) => {
        try {
          call.answer(stream);
        } catch (error) {
          console.error('Unable to answer call:', error);
          setIsConnecting(false);
          return;
        }

        call.on('stream', (remoteStream) => {
          if (partnerVideoRef.current) {
            partnerVideoRef.current.srcObject =
              remoteStream;
          }

          setIsConnected(true);
          isConnectedRef.current = true;

          setIsConnecting(false);
        });

        call.on('close', () => {
          handleCleanupOnDisconnect();
        });

        call.on('error', (error) => {
          console.error('Call error:', error);
          handleCleanupOnDisconnect();
        });
      };

      if (localStreamRef.current) {
        answerCall(localStreamRef.current);
      } else {
        navigator.mediaDevices
          .getUserMedia({
            video: true,
            audio: true,
          })
          .then((stream) => {
            localStreamRef.current = stream;

            if (myVideoRef.current) {
              myVideoRef.current.srcObject = stream;
            }

            answerCall(stream);
          })
          .catch((err) => {
            console.error(
              'Camera permission error:',
              err
            );

            setIsConnecting(false);
          });
      }
    });
  };

  // =========================================================
  // INITIAL SETUP
  // =========================================================

  useEffect(() => {
    initializePeer(peerId);

    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        localStreamRef.current = stream;

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error(
          'Error accessing webcam:',
          err
        );
      });

    return () => {
      clearPhotoTimers();

      if (partnerMsgTimeoutRef.current) {
        clearTimeout(partnerMsgTimeoutRef.current);
      }

      if (activeCallRef.current) {
        try {
          activeCallRef.current.close();
        } catch {
          // Ignore
        }
      }

      if (activeConnRef.current) {
        try {
          activeConnRef.current.close();
        } catch {
          // Ignore
        }
      }

      if (peerInstance.current) {
        try {
          peerInstance.current.destroy();
        } catch {
          // Ignore
        }
      }

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  // =========================================================
  // GENERATE NEW ID
  // =========================================================

  const handleGenerateNewId = () => {
    if (remainingAttempts <= 0) {
      setNotificationText(
        'Daily limit reached (7 attempts). Please try again tomorrow.'
      );

      setIdGeneratedMsg(true);

      setTimeout(() => {
        setIdGeneratedMsg(false);
      }, 3500);

      return;
    }

    if (cooldown > 0) {
      return;
    }

    // Clean old session first.
    cancelPhotoSessionLocally(false);

    if (activeCallRef.current) {
      try {
        activeCallRef.current.close();
      } catch {
        // Ignore
      }

      activeCallRef.current = null;
    }

    if (activeConnRef.current) {
      try {
        activeConnRef.current.close();
      } catch {
        // Ignore
      }

      activeConnRef.current = null;
    }

    const newId = generateCustomId();

    setPeerId(newId);
    setRemotePeerId('');

    setIsConnected(false);
    isConnectedRef.current = false;

    setIsConnecting(false);

    setShowResult(false);

    initializePeer(newId);

    const newAttempts = remainingAttempts - 1;

    setRemainingAttempts(newAttempts);

    const todayStr = new Date().toDateString();

    localStorage.setItem(
      'snapSync_id_gen',
      JSON.stringify({
        date: todayStr,
        attempts: newAttempts,
      })
    );

    setNotificationText(
      `New ID generated successfully (${newAttempts}/7 attempts remaining).`
    );

    setIdGeneratedMsg(true);

    setCooldown(5);

    setTimeout(() => {
      setIdGeneratedMsg(false);
    }, 3000);
  };

  // =========================================================
  // CALL PARTNER
  // =========================================================

  const callPartner = (remoteId) => {
    if (!peerInstance.current) {
      showPartnerMsg(
        'Your connection is still starting. Please wait.'
      );

      return;
    }

    const trimmedId = remoteId.trim().toUpperCase();

    if (!trimmedId) {
      showPartnerMsg(
        "Please enter your partner's code."
      );

      return;
    }

    if (trimmedId === peerId) {
      showPartnerMsg(
        'You cannot connect to your own code.'
      );

      return;
    }

    setIsConnecting(true);

    // Clean any old connection.
    if (activeConnRef.current) {
      try {
        activeConnRef.current.close();
      } catch {
        // Ignore
      }

      activeConnRef.current = null;
    }

    if (activeCallRef.current) {
      try {
        activeCallRef.current.close();
      } catch {
        // Ignore
      }

      activeCallRef.current = null;
    }

    // =====================================================
    // DATA CONNECTION
    // =====================================================

    let conn;

    try {
      conn =
        peerInstance.current.connect(trimmedId, {
          reliable: true,
        });
    } catch (error) {
      console.error(
        'Could not create data connection:',
        error
      );

      setIsConnecting(false);
      return;
    }

    setupDataConnection(conn);

    // =====================================================
    // VIDEO CALL
    // =====================================================

    const executeCall = (stream) => {
      if (!peerInstance.current) {
        setIsConnecting(false);
        return;
      }

      let call;

      try {
        call = peerInstance.current.call(
          trimmedId,
          stream
        );
      } catch (error) {
        console.error(
          'Could not call partner:',
          error
        );

        setIsConnecting(false);
        return;
      }

      if (!call) {
        setIsConnecting(false);
        return;
      }

      activeCallRef.current = call;

      call.on('stream', (remoteStream) => {
        if (partnerVideoRef.current) {
          partnerVideoRef.current.srcObject =
            remoteStream;
        }

        setIsConnected(true);
        isConnectedRef.current = true;

        setIsConnecting(false);
      });

      call.on('close', () => {
        handleCleanupOnDisconnect();
      });

      call.on('error', (error) => {
        console.error('Call error:', error);

        handleCleanupOnDisconnect();
      });
    };

    if (localStreamRef.current) {
      executeCall(localStreamRef.current);
    } else {
      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: true,
        })
        .then((stream) => {
          localStreamRef.current = stream;

          if (myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
          }

          executeCall(stream);
        })
        .catch((error) => {
          console.error(
            'Camera error:',
            error
          );

          setIsConnecting(false);
        });
    }
  };

  // =========================================================
  // DISCONNECT
  // =========================================================

  const handleDisconnect = () => {
    // Tell partner first.
    sendToPartner({
      type: 'CANCEL_SESSION',
    });

    cancelPhotoSessionLocally(false);

    if (activeCallRef.current) {
      try {
        activeCallRef.current.close();
      } catch {
        // Ignore
      }

      activeCallRef.current = null;
    }

    if (activeConnRef.current) {
      try {
        activeConnRef.current.close();
      } catch {
        // Ignore
      }

      activeConnRef.current = null;
    }

    handleCleanupOnDisconnect();
  };

  // =========================================================
  // DISCONNECT CLEANUP
  // =========================================================

  const handleCleanupOnDisconnect = () => {
    cancelPhotoSessionLocally(false);

    setIsConnected(false);

    isConnectedRef.current = false;

    setIsConnecting(false);

    if (partnerVideoRef.current) {
      partnerVideoRef.current.srcObject = null;
    }

    setRemotePeerId('');
  };

  // =========================================================
  // START DUO PHOTO SESSION
  // =========================================================

  const handleStartBooth = () => {
    if (isCapturing) {
      return;
    }

    if (!isConnectedRef.current) {
      showPartnerMsg(
        'You need to connect your partner to start your shots.'
      );

      return;
    }

    // ---------------------------------------------
    // CLEAN EVERYTHING FROM PREVIOUS SESSION
    // ---------------------------------------------

    clearPhotoTimers();

    receivedShotMessagesRef.current.clear();

    // ---------------------------------------------
    // CREATE UNIQUE SESSION ID
    // ---------------------------------------------

    const newSessionId =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    sessionIdRef.current = newSessionId;

    sessionActiveRef.current = true;

    currentShotRef.current = 0;

    isSessionControllerRef.current = true;

    // ---------------------------------------------
    // RESET UI
    // ---------------------------------------------

    setShots([
      null,
      null,
      null,
      null,
    ]);

    setShowResult(false);

    setIsCapturing(true);

    setShowFilterMenu(false);
    setShowTimerMenu(false);

    // ---------------------------------------------
    // SEND FIRST SHOT
    // ---------------------------------------------

    const sent = sendToPartner({
      type: 'START_COUNTDOWN',
      sessionId: newSessionId,
      shotIndex: 0,
    });

    if (!sent) {
      showPartnerMsg(
        'Partner connection is not ready. Please reconnect.'
      );

      cancelPhotoSessionLocally(false);

      return;
    }

    // ---------------------------------------------
    // START LOCAL COUNTDOWN
    // ---------------------------------------------

    runCountdownSequence(
      0,
      true,
      newSessionId
    );
  };

  // =========================================================
  // CANCEL BOOTH
  // =========================================================

  const handleCancelBooth = () => {
    const currentSessionId =
      sessionIdRef.current;

    sendToPartner({
      type: 'CANCEL_SESSION',
      sessionId: currentSessionId,
    });

    cancelPhotoSessionLocally(false);
  };

  // =========================================================
  // RUN COUNTDOWN
  // =========================================================

  const runCountdownSequence = (
    shotIndex,
    isController,
    sessionId
  ) => {
    // ---------------------------------------------
    // VALIDATE SESSION
    // ---------------------------------------------

    if (
      !sessionActiveRef.current ||
      !sessionId ||
      sessionIdRef.current !== sessionId
    ) {
      return;
    }

    // ---------------------------------------------
    // ALL 4 SHOTS COMPLETE
    // ---------------------------------------------

    if (shotIndex >= 4) {
      finishPhotoSession(sessionId);
      return;
    }

    currentShotRef.current = shotIndex;

    startSingleCountdown(
      () => {
        // -----------------------------------------
        // MAKE SURE SESSION IS STILL VALID
        // -----------------------------------------

        if (
          !sessionActiveRef.current ||
          sessionIdRef.current !== sessionId
        ) {
          return;
        }

        captureImage(shotIndex);

        // -----------------------------------------
        // WAIT A LITTLE AFTER CAPTURE
        // -----------------------------------------

        activeTimeoutRef.current =
          setTimeout(() => {
            activeTimeoutRef.current = null;

            if (
              !sessionActiveRef.current ||
              sessionIdRef.current !== sessionId
            ) {
              return;
            }

            const nextIndex =
              shotIndex + 1;

            // -------------------------------------
            // SHOT 4 FINISHED
            // -------------------------------------

            if (nextIndex >= 4) {
              setIsCapturing(false);
              setCountdown(null);

              // Controller tells partner session is done.
              if (isController) {
                sendToPartner({
                  type: 'END_SESSION',
                  sessionId,
                });
              }

              finishPhotoSession(sessionId);

              return;
            }

            // -------------------------------------
            // NEXT SHOT
            // -------------------------------------

            if (isController) {
              const sent = sendToPartner({
                type: 'START_COUNTDOWN',
                sessionId,
                shotIndex: nextIndex,
              });

              if (!sent) {
                showPartnerMsg(
                  'Partner disconnected. Reconnect to continue.'
                );

                cancelPhotoSessionLocally(true);

                return;
              }
            }

            runCountdownSequence(
              nextIndex,
              isController,
              sessionId
            );
          }, 900);
      },
      () => {
        // -----------------------------------------
        // ABORTED
        // -----------------------------------------

        if (
          sessionIdRef.current !== sessionId
        ) {
          return;
        }

        cancelPhotoSessionLocally(false);
      }
    );
  };

  // =========================================================
  // SINGLE COUNTDOWN
  // =========================================================

  const startSingleCountdown = (
    onComplete,
    onAbort
  ) => {
    clearPhotoTimers();

    if (!isConnectedRef.current) {
      showPartnerMsg(
        'Partner disconnected. Reconnect to continue.'
      );

      if (onAbort) {
        onAbort();
      }

      return;
    }

    let currentCount =
      timerDurationRef.current;

    setCountdown(currentCount);

    activeIntervalRef.current =
      setInterval(() => {
        // -----------------------------------------
        // PARTNER CHECK
        // -----------------------------------------

        if (!isConnectedRef.current) {
          clearPhotoTimers();

          setCountdown(null);

          showPartnerMsg(
            'Partner disconnected. Reconnect to continue.'
          );

          if (onAbort) {
            onAbort();
          }

          return;
        }

        currentCount -= 1;

        if (currentCount > 0) {
          setCountdown(currentCount);
          return;
        }

        clearInterval(
          activeIntervalRef.current
        );

        activeIntervalRef.current = null;

        setCountdown(null);

        onComplete();
      }, 1000);
  };

  // =========================================================
  // RETAKE SPECIFIC SHOT
  // =========================================================

  const handleRetakeSpecificShot = (index) => {
    if (isCapturing) {
      return;
    }

    if (!isConnectedRef.current) {
      showPartnerMsg(
        'Reconnect your partner before retaking a shot.'
      );

      return;
    }

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > 3
    ) {
      return;
    }

    // ---------------------------------------------
    // NEW RETAKE SESSION
    // ---------------------------------------------

    clearPhotoTimers();

    receivedShotMessagesRef.current.clear();

    const newSessionId =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    sessionIdRef.current =
      newSessionId;

    sessionActiveRef.current = true;

    currentShotRef.current = index;

    isSessionControllerRef.current = true;

    setShowResult(false);
    setIsCapturing(true);

    setShowFilterMenu(false);
    setShowTimerMenu(false);

    // ---------------------------------------------
    // TELL PARTNER TO RETAKE TOO
    // ---------------------------------------------

    const sent = sendToPartner({
      type: 'RETAKE_SHOT',
      sessionId: newSessionId,
      shotIndex: index,
    });

    if (!sent) {
      cancelPhotoSessionLocally(true);

      return;
    }

    // ---------------------------------------------
    // LOCAL RETAKE
    // ---------------------------------------------

    runCountdownSequence(
      index,
      true,
      newSessionId
    );
  };

  // =========================================================
  // PARTNER RETAKE
  // =========================================================

  const handlePartnerRetake = (
    index,
    incomingSessionId
  ) => {
    if (!isConnectedRef.current) {
      return;
    }

    clearPhotoTimers();

    const sessionId =
      incomingSessionId ||
      `${Date.now()}-partner`;

    sessionIdRef.current = sessionId;

    sessionActiveRef.current = true;

    currentShotRef.current = index;

    isSessionControllerRef.current = false;

    setShowResult(false);
    setIsCapturing(true);

    setShowFilterMenu(false);
    setShowTimerMenu(false);

    runCountdownSequence(
      index,
      false,
      sessionId
    );
  };

  // =========================================================
  // CANVAS FILTER
  // =========================================================

  const getCanvasFilter = () => {
    if (
      filterRef.current ===
      'filter-grayscale'
    ) {
      return 'grayscale(100%)';
    }

    if (
      filterRef.current ===
      'filter-sepia'
    ) {
      return 'sepia(100%)';
    }

    return 'none';
  };

  // =========================================================
  // DRAW VIDEO COVER
  // =========================================================

  const drawVideoCover = (
    ctx,
    video,
    dx,
    dy,
    dw,
    dh,
    mirror = false
  ) => {
    if (!video) {
      return false;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
      return false;
    }

    const targetRatio =
      dw / dh;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (vw / vh > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    ctx.save();

    if (mirror) {
      ctx.translate(
        dx + dw,
        dy
      );

      ctx.scale(-1, 1);

      ctx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        dw,
        dh
      );
    } else {
      ctx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        dx,
        dy,
        dw,
        dh
      );
    }

    ctx.restore();

    return true;
  };

  // =========================================================
  // CAPTURE IMAGE
  // =========================================================

  const captureImage = (index) => {
    const myVideo =
      myVideoRef.current;

    const partnerVideo =
      partnerVideoRef.current;

    if (!myVideo) {
      return;
    }

    const CELL_W = 800;
    const CELL_H = 600;

    const W = CELL_W * 2;
    const H = CELL_H;

    const canvas =
      document.createElement('canvas');

    canvas.width = W;
    canvas.height = H;

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    // Background
    ctx.fillStyle = '#0b0b0c';

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    // Filter
    ctx.filter =
      getCanvasFilter();

    // ---------------------------------------------
    // YOU - LEFT
    // ---------------------------------------------

    drawVideoCover(
      ctx,
      myVideo,
      0,
      0,
      CELL_W,
      CELL_H,
      true
    );

    // ---------------------------------------------
    // PARTNER - RIGHT
    // ---------------------------------------------

    const partnerReady =
      partnerVideo &&
      partnerVideo.srcObject &&
      partnerVideo.videoWidth > 0;

    if (partnerReady) {
      drawVideoCover(
        ctx,
        partnerVideo,
        CELL_W,
        0,
        CELL_W,
        CELL_H,
        false
      );
    }

    ctx.filter = 'none';

    // ---------------------------------------------
    // SAVE IMAGE
    // ---------------------------------------------

    const imageUrl =
      canvas.toDataURL(
        'image/jpeg',
        0.95
      );

    setShots((prev) => {
      const updated = [...prev];

      updated[index] = imageUrl;

      return updated;
    });
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="photobooth-main-wrapper duo-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="photobooth-top-header">

        <div className="header-left-group">

          <div>
            <h1 className="brand-title">
              SnapSync Photobooth
            </h1>

            <p className="brand-subtitle">
              Duo / LDR Session
            </p>
          </div>

        </div>

        <div className="header-buttons-group">

          <button
            className="btn-secondary"
            onClick={() =>
              navigate('/photobooth')
            }
          >
            Change Mode
          </button>

          <button
            className="btn-secondary"
            onClick={() =>
              navigate('/main')
            }
          >
            Back Home
          </button>

        </div>

      </div>

      {/* ===================================================
          CONNECTION PANEL
      =================================================== */}

      <div className="connection-panel">

        <div className="connection-top-row">

          <div className="peer-id-info-wrapper">

            <p className="peer-id-text">
              Your Code:{' '}
              <strong className="peer-id-highlight">
                {peerId}
              </strong>
            </p>

            <div
              className={`connection-status-pill ${
                isConnected
                  ? 'connected'
                  : 'waiting'
              }`}
            >
              <span className="status-dot"></span>

              <span>
                {isConnected
                  ? 'Connected'
                  : isConnecting
                  ? 'Connecting...'
                  : 'Waiting...'}
              </span>

            </div>

            {idGeneratedMsg && (
              <span
                className="id-notif-pill"
                role="status"
              >
                {notificationText}
              </span>
            )}

          </div>

          <div className="generate-section">

            <button
              onClick={
                handleGenerateNewId
              }
              disabled={cooldown > 0}
              className="btn-generate-id"
            >
              {cooldown > 0
                ? `Wait (${cooldown}s)`
                : 'Generate New ID'}
            </button>

          </div>

        </div>

        <div className="connection-form">

          <input
            type="text"
            placeholder="Paste partner's code here..."
            value={remotePeerId}
            onChange={(e) =>
              setRemotePeerId(
                e.target.value.toUpperCase()
              )
            }
            className="peer-input-field"
          />

          {isConnected ? (
            <button
              className="btn-disconnect"
              onClick={
                handleDisconnect
              }
            >
              Disconnect
            </button>
          ) : (
            <button
              className="btn-connect"
              onClick={() =>
                callPartner(
                  remotePeerId
                )
              }
            >
              {isConnecting
                ? 'Connecting...'
                : 'Connect'}
            </button>
          )}

        </div>

      </div>

      {/* ===================================================
          PHOTOBOOTH
      =================================================== */}

      <div className="photobooth-grid-layout">

        <div className="content-card">

          <div className="duo-video-grid">

            {countdown !== null && (
              <div className="duo-countdown">
                {countdown}
              </div>
            )}

            {/* YOU */}

            <div className="duo-half">

              <span className="duo-label">
                YOU
              </span>

              {partnerMsg && (
                <div
                  className="partner-needed-msg"
                  role="alert"
                >
                  {partnerMsg}
                </div>
              )}

              <video
                ref={myVideoRef}
                autoPlay
                playsInline
                muted
                className={`camera-video ${filter}`}
              />

            </div>

            {/* PARTNER */}

            <div className="duo-half">

              <span
                className={`duo-label ${
                  isConnected
                    ? 'live'
                    : ''
                }`}
              >
                {isConnected
                  ? 'PARTNER · LIVE'
                  : 'PARTNER'}
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

                    {isConnecting
                      ? 'Connecting'
                      : 'Waiting for partner'}

                    <span className="loading-dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>

                  </span>

                </div>
              )}

            </div>

          </div>

          {/* =================================================
              CONTROLS
          ================================================= */}

          {!isCapturing && (
            <div className="filters-control-bar">

              {/* FILTER */}

              <div className="dropdown-wrapper">

                <button
                  className="control-menu-btn"
                  onClick={() => {
                    setShowFilterMenu(
                      !showFilterMenu
                    );

                    setShowTimerMenu(false);
                  }}
                >
                  Filter:{' '}
                  <span className="highlight-text">
                    {filterName}
                  </span>
                </button>

                {showFilterMenu && (
                  <div className="dropdown-menu-box">

                    <button
                      className={`dropdown-item-btn ${
                        filterName ===
                        'NORMAL'
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => {
                        setFilter(
                          'filter-normal'
                        );

                        setFilterName(
                          'NORMAL'
                        );

                        setShowFilterMenu(
                          false
                        );
                      }}
                    >
                      Normal
                      <span className="dropdown-subtext">
                        Clean look
                      </span>
                    </button>

                    <button
                      className={`dropdown-item-btn ${
                        filterName ===
                        'GRAYSCALE'
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => {
                        setFilter(
                          'filter-grayscale'
                        );

                        setFilterName(
                          'GRAYSCALE'
                        );

                        setShowFilterMenu(
                          false
                        );
                      }}
                    >
                      Grayscale
                      <span className="dropdown-subtext">
                        Classic monochrome
                      </span>
                    </button>

                    <button
                      className={`dropdown-item-btn ${
                        filterName ===
                        'SEPIA'
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => {
                        setFilter(
                          'filter-sepia'
                        );

                        setFilterName(
                          'SEPIA'
                        );

                        setShowFilterMenu(
                          false
                        );
                      }}
                    >
                      Sepia
                      <span className="dropdown-subtext">
                        Vintage warm
                      </span>
                    </button>

                  </div>
                )}

              </div>

              {/* TIMER */}

              <div className="dropdown-wrapper">

                <button
                  className="control-menu-btn"
                  onClick={() => {
                    setShowTimerMenu(
                      !showTimerMenu
                    );

                    setShowFilterMenu(false);
                  }}
                >
                  Timer:{' '}
                  <span className="highlight-text">
                    {timerDuration}S
                  </span>
                </button>

                {showTimerMenu && (
                  <div className="dropdown-menu-box">

                    <button
                      className={`dropdown-item-btn ${
                        timerDuration === 3
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => {
                        setTimerDuration(3);

                        setShowTimerMenu(
                          false
                        );
                      }}
                    >
                      3 Seconds
                      <span className="dropdown-subtext">
                        Quick snap
                      </span>
                    </button>

                    <button
                      className={`dropdown-item-btn ${
                        timerDuration === 5
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => {
                        setTimerDuration(5);

                        setShowTimerMenu(
                          false
                        );
                      }}
                    >
                      5 Seconds
                      <span className="dropdown-subtext">
                        Standard pause
                      </span>
                    </button>

                  </div>
                )}

              </div>

            </div>
          )}

          {/* =================================================
              START / CANCEL
          ================================================= */}

          <div className="action-button-container">

            {isCapturing ? (
              <button
                className="btn-primary-action btn-cancel-session"
                onClick={
                  handleCancelBooth
                }
              >
                Cancel Session
              </button>
            ) : (
              <button
                className={`btn-primary-action ${
                  !isConnected
                    ? 'needs-partner'
                    : ''
                }`}
                onClick={
                  handleStartBooth
                }
              >
                Start Duo Photobooth
              </button>
            )}

          </div>

        </div>

      </div>

      {/* ===================================================
          RESULT MODAL
      =================================================== */}

      {showResult && (
        <div
          className="result-modal-backdrop"
          onClick={() =>
            setShowResult(false)
          }
        >

          <div
            className="result-modal-card"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3 className="result-modal-title">
              Your Photo Strip
            </h3>

            <div className="retake-instruction-banner">
              <p>
                Click any shot to retake
              </p>
            </div>

            <div className="strip-display-box">

              <div
                className={`photostrip-box ${frameStyle}`}
              >

                {[0, 1, 2, 3].map(
                  (idx) => (
                    <div
                      key={idx}
                      className="strip-slot-box"
                      onClick={() =>
                        handleRetakeSpecificShot(
                          idx
                        )
                      }
                    >

                      {shots[idx] ? (
                        <>
                          <img
                            src={shots[idx]}
                            alt={`Shot ${
                              idx + 1
                            }`}
                            className="strip-captured-img"
                          />

                          <span className="retake-overlay-hint">
                            Retake
                          </span>
                        </>
                      ) : (
                        <span className="strip-placeholder-text">
                          Shot {idx + 1}
                        </span>
                      )}

                    </div>
                  )
                )}

                <span className="strip-branding-label">
                  SNAPSYNC DUO
                </span>

              </div>

            </div>

            {/* FRAME */}

            <div className="result-frame-row">

              <button
                className={`result-frame-btn ${
                  frameStyle ===
                  'frame-classic-black'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setFrameStyle(
                    'frame-classic-black'
                  )
                }
              >
                Classic Black
              </button>

              <button
                className={`result-frame-btn ${
                  frameStyle ===
                  'frame-white'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setFrameStyle(
                    'frame-white'
                  )
                }
              >
                Clean White
              </button>

            </div>

            {!isConnected && (
              <p className="result-disconnected-note">
                Partner is disconnected.
                Reconnect to retake or
                take again.
              </p>
            )}

            {/* ACTIONS */}

            <div className="result-actions-row">

              <button
                className="result-btn-secondary"
                onClick={() =>
                  setShowResult(false)
                }
              >
                Close
              </button>

              <button
                className="result-btn-primary"
                onClick={
                  handleStartBooth
                }
                disabled={!isConnected}
                style={
                  !isConnected
                    ? {
                        opacity: 0.5,
                        cursor:
                          'not-allowed',
                      }
                    : undefined
                }
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