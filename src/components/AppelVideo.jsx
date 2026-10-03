// src/components/AppelVideo.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Clock, Loader2, Wifi, WifiOff, SwitchCamera,
  Volume2, VolumeX, Pause, Play, User,
} from "lucide-react";
import toast from "react-hot-toast";

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const MAX_CALL_DURATION_MINUTES = 60;

export function AppelVideo({
  channelName,
  userId,
  callId,
  onCallEnd,
  contactName,
  contactAvatar,
  callType = "video",
  isMobile = false,
}) {
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState("IDLE");
  const [networkQuality, setNetworkQuality] = useState("unknown");
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === "video");
  const [isOnHold, setIsOnHold] = useState(false);
  const [pressedBtn, setPressedBtn] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [wavePhase, setWavePhase] = useState(0);

  const endCallMutation = useMutation(api.appels.endCall);
  const generateToken = useAction(api.agora.generateToken);

  const localVideoRef = useRef(null);
  const timerRef = useRef(null);
  const clientRef = useRef(null);
  const localTracksRef = useRef([]);
  const screenTrackRef = useRef(null);
  const onCallEndRef = useRef(onCallEnd);
  const destroyedRef = useRef(false);
  const waveIntervalRef = useRef(null);

  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);

  // ✨ iOS Safari — détecter le blocage d'autoplay audio distant
  useEffect(() => {
    AgoraRTC.onAutoplayFailed = () => {
      console.warn("[AppelVideo] autoplay audio bloqué par le navigateur");
      setAutoplayBlocked(true);
    };
    return () => {
      AgoraRTC.onAutoplayFailed = undefined;
    };
  }, []);

  // ✨ Animation waveform (mode audio uniquement)
  useEffect(() => {
    if (!hasJoined || callType !== "audio") return;
    waveIntervalRef.current = setInterval(() => {
      setWavePhase((p) => (p + 1) % 4);
    }, 140);
    return () => {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    };
  }, [hasJoined, callType]);

  // ✨ Re-attacher la piste vidéo locale quand la zone change
  // (PiP ↔ plein écran, caméra on ↔ off)
  useEffect(() => {
    if (!hasJoined) return;
    const videoTrack = localTracksRef.current[1];
    if (!videoTrack) return;

    const el = localVideoRef.current;
    if (!el) return;

    let cancelled = false;

    const reattach = () => {
      if (cancelled) return;
      try {
        videoTrack.stop();
      } catch (e) {}
      try {
        videoTrack.play(el);
      } catch (e) {
        console.warn("[AppelVideo] reattach failed:", e);
      }
    };

    // Petit délai pour laisser React finir le montage du nouveau div
    const timeoutId = setTimeout(reattach, 50);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [hasJoined, remoteUsers.length, isVideoOff]);

  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  const cleanupLocal = useCallback(() => {
    if (clientRef.current) {
      try {
        clientRef.current.leave();
      } catch (e) {}
      clientRef.current = null;
    }
    localTracksRef.current.forEach((track) => {
      try {
        track.stop();
        track.close();
      } catch (e) {}
    });
    localTracksRef.current = [];
    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
      } catch (e) {}
      screenTrackRef.current = null;
    }
    clearInterval(timerRef.current);
    timerRef.current = null;
    clearInterval(waveIntervalRef.current);
    waveIntervalRef.current = null;
    setRemoteUsers([]);
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsOnHold(false);
    setAutoplayBlocked(false);
  }, []);

  const handleEndCall = useCallback(async () => {
    if (destroyedRef.current) return;
    destroyedRef.current = true;
    try {
      await endCallMutation({ callId, userId });
    } catch (err) {
      if (!err.message.includes("Appel introuvable")) {
        console.error("[AppelVideo] endCall failed:", err);
      }
    }
    cleanupLocal();
    if (onCallEndRef.current) onCallEndRef.current();
  }, [endCallMutation, callId, userId, cleanupLocal]);

  const generateTokenCallback = useCallback(
    async (channel, uid) => {
      try {
        return await generateToken({ channelName: channel, userId: uid });
      } catch (err) {
        console.error("[AppelVideo] generateToken failed:", err);
        throw new Error("Impossible de générer le token d'appel");
      }
    },
    [generateToken]
  );

  // ═══════════════════════════════════════════════════════════════
  // START CALL — déclenché par l'utilisateur (requis iOS Safari)
  // ═══════════════════════════════════════════════════════════════
  const startCall = useCallback(async () => {
    if (!APP_ID || !channelName) {
      toast.error("Configuration Agora manquante");
      handleEndCall();
      return;
    }

    destroyedRef.current = false;
    setPermissionError(null);

    let token;
    let agoraUid;
    try {
      setConnectionState("CONNECTING");
      const result = await generateTokenCallback(channelName, userId);
      token = result.token;
      agoraUid = result.uid;
    } catch (err) {
      setConnectionState("ERROR");
      toast.error(err.message);
      handleEndCall();
      return;
    }
    if (destroyedRef.current) return;

    const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = agoraClient;

    agoraClient.on("connection-state-change", (curState) => {
      if (curState === "CONNECTED") setConnectionState("CONNECTED");
      else if (curState === "DISCONNECTED" || curState === "DISCONNECTING")
        setConnectionState("DISCONNECTED");
    });

    agoraClient.on("network-quality", (stats) => {
      const down = stats.downlinkNetworkQuality ?? 0;
      const up = stats.uplinkNetworkQuality ?? 0;
      const worst = Math.max(down, up);
      setNetworkQuality(worst <= 2 ? "good" : worst === 3 ? "fair" : "poor");
    });

    try {
      console.log("[AppelVideo] joining with uid:", agoraUid);
      await agoraClient.join(APP_ID, channelName, token, agoraUid);
      if (destroyedRef.current) {
        try {
          agoraClient.leave();
        } catch (e) {}
        return;
      }
    } catch (err) {
      setConnectionState("ERROR");
      toast.error("Erreur de connexion à l'appel : " + err.message);
      handleEndCall();
      return;
    }

    try {
      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, AGC: true, ANS: true },
        { encoderConfig: "480p_1" }
      );
      if (destroyedRef.current) {
        tracks.forEach((t) => t.close());
        return;
      }
      localTracksRef.current = tracks;

      if (callType === "audio") {
        tracks[1].setEnabled(false);
        setIsVideoOff(true);
        await agoraClient.publish([tracks[0]]);
      } else {
        await agoraClient.publish([tracks[0], tracks[1]]);
      }

      if (callType === "video" && localVideoRef.current && tracks[1]) {
        tracks[1].play(localVideoRef.current);
      }

      setHasJoined(true);

      try {
        if (callType === "audio") {
          await AgoraRTC.setSpeakerphoneOn(false);
          setIsSpeakerOn(false);
        } else {
          await AgoraRTC.setSpeakerphoneOn(true);
          setIsSpeakerOn(true);
        }
      } catch (e) {
        console.warn("[AppelVideo] setSpeakerphoneOn init failed:", e);
      }
    } catch (err) {
      console.error("[AppelVideo] getUserMedia failed:", err);
      const code = err?.code || err?.name;
      let userMsg = "Impossible d'accéder à la caméra/micro.";

      if (code === "PERMISSION_DENIED" || err?.name === "NotAllowedError") {
        userMsg =
          "Autorisation refusée. Vérifie que Safari a l'accès à la caméra/micro dans Réglages iOS → Safari.";
      } else if (err?.name === "NotFoundError") {
        userMsg = "Aucune caméra/microphone détecté sur cet appareil.";
      } else if (err?.name === "NotReadableError") {
        userMsg =
          "Caméra/micro déjà utilisés par une autre app. Ferme les autres apps et réessaie.";
      } else if (err?.name === "OverconstrainedError") {
        userMsg = "Configuration vidéo non supportée par cet appareil.";
      }

      setPermissionError(userMsg);
      setConnectionState("ERROR");
      toast.error(userMsg);
      handleEndCall();
      return;
    }

    agoraClient.on("user-published", async (user, mediaType) => {
      if (destroyedRef.current) return;
      try {
        await agoraClient.subscribe(user, mediaType);
        if (mediaType === "audio" && user.audioTrack) {
          try {
            user.audioTrack.play();
          } catch (e) {
            console.warn("[AppelVideo] audio play blocked:", e);
          }
        }
        setRemoteUsers((prev) =>
          prev.find((u) => u.uid === user.uid) ? prev : [...prev, user]
        );
      } catch (err) {
        console.warn("subscribe error", err);
      }
    });

    agoraClient.on("user-unpublished", (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    });

    setTimeout(() => {
      if (destroyedRef.current || !agoraClient) return;
      agoraClient.remoteUsers.forEach((user) => {
        agoraClient.subscribe(user, "video").catch(() => {});
        agoraClient.subscribe(user, "audio").catch(() => {});
        setRemoteUsers((prev) =>
          prev.find((u) => u.uid === user.uid) ? prev : [...prev, user]
        );
      });
    }, 800);

    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [
    channelName,
    userId,
    callType,
    generateTokenCallback,
    handleEndCall,
  ]);

  useEffect(() => {
    return () => {
      destroyedRef.current = true;
      cleanupLocal();
    };
  }, [cleanupLocal]);

  useEffect(() => {
    if (callDuration >= MAX_CALL_DURATION_MINUTES * 60) {
      toast("Appel terminé (limite de 60 min)", { icon: "⏰" });
      handleEndCall();
    }
  }, [callDuration, handleEndCall]);

  const toggleMute = () => {
    if (localTracksRef.current.length > 0) {
      const newMuted = !isMuted;
      localTracksRef.current[0].setEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localTracksRef.current[1];
    if (!videoTrack) return;

    const newVideoOff = !isVideoOff;
    videoTrack.setEnabled(!newVideoOff);
    setIsVideoOff(newVideoOff);

    if (!newVideoOff && localVideoRef.current) {
      // ⚠️ Stop avant re-play (Agora exige)
      try {
        videoTrack.stop();
      } catch (e) {}
      try {
        videoTrack.play(localVideoRef.current);
      } catch (e) {
        console.warn("[AppelVideo] play after enable failed:", e);
      }

      if (callType === "audio" && clientRef.current) {
        clientRef.current.publish(videoTrack).catch((err) => {
          console.warn("Erreur publication vidéo", err);
          toast.error("Impossible d'activer la vidéo");
          videoTrack.setEnabled(false);
          setIsVideoOff(true);
        });
      }
    }
  };

  const switchCamera = async () => {
    if (localTracksRef.current[1]) {
      try {
        const cameras = await AgoraRTC.getCameras();
        const currentTrack = localTracksRef.current[1];
        const currentDeviceId =
          currentTrack?.getMediaStreamTrack?.()?.getSettings?.()?.deviceId || "";
        const currentIndex = cameras.findIndex(
          (cam) => cam.deviceId === currentDeviceId
        );
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextDeviceId = cameras[nextIndex]?.deviceId;
        if (nextDeviceId) {
          await localTracksRef.current[1].setDevice(nextDeviceId);
          setIsFrontCamera(nextIndex !== 1);
        }
      } catch (err) {
        console.error("[AppelVideo] switchCamera failed:", err);
        toast.error("Impossible de changer de caméra");
      }
    }
  };

  const toggleSpeaker = async () => {
    try {
      const newSpeakerState = !isSpeakerOn;
      await AgoraRTC.setSpeakerphoneOn(newSpeakerState);
      setIsSpeakerOn(newSpeakerState);
      if (newSpeakerState && isMobile) {
        toast("Utilisez un casque pour éviter l'écho", {
          icon: "🎧",
          duration: 3000,
        });
      }
    } catch (err) {
      console.warn("setSpeakerphoneOn non supporté", err);
    }
  };

  const toggleHold = () => {
    const newHold = !isOnHold;
    if (newHold) {
      localTracksRef.current.forEach((track) => track.setEnabled(false));
    } else {
      localTracksRef.current[0]?.setEnabled(!isMuted);
      if (localTracksRef.current[1]) {
        localTracksRef.current[1].setEnabled(!isVideoOff);
      }
    }
    setIsOnHold(newHold);
  };

  const startScreenShare = async () => {
    if (!clientRef.current || destroyedRef.current) return;
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        await clientRef.current.unpublish(screenTrackRef.current);
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await AgoraRTC.createScreenVideoTrack({}, "disable");
        screenTrackRef.current = screen;
        await clientRef.current.publish(screen);
        setIsScreenSharing(true);
      } catch (err) {
        console.error("[AppelVideo] screenShare failed:", err);
        toast.error("Impossible de partager l'écran");
      }
    }
  };

  const unlockRemoteAudio = useCallback(() => {
    console.log("[AppelVideo] tentative de déblocage audio distant");
    let played = 0;
    remoteUsers.forEach((user) => {
      if (user.audioTrack) {
        try {
          user.audioTrack.play();
          played++;
        } catch (e) {
          console.warn("[AppelVideo] audio play failed for", user.uid, e);
        }
      }
    });
    if (played === 0) {
      toast.error("En attente de l'audio du correspondant…");
      return;
    }
    setAutoplayBlocked(false);
  }, [remoteUsers]);

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const secs = (sec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const networkQualityLabel = {
    good: "Excellente",
    fair: "Moyenne",
    poor: "Faible",
    unknown: "—",
  }[networkQuality];

  const networkQualityColor = {
    good: "#10B981",
    fair: "#F59E0B",
    poor: "#EF4444",
    unknown: "#64748B",
  }[networkQuality];

  const isAudioCall = callType === "audio";

  const bgGradient = isAudioCall
    ? "radial-gradient(circle at 30% 20%, #1E293B 0%, #0F172A 60%)"
    : "radial-gradient(circle at 30% 20%, #1E1B4B 0%, #0F172A 60%)";

  const waveBars = [0.3, 0.7, 0.45, 0.9, 0.5, 0.8, 0.35, 0.65, 0.4];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        background: bgGradient,
        color: "white",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes av-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes av-pulse-orange {
          0%, 100% { box-shadow: 0 4px 16px rgba(245,158,11,0.4); }
          50%      { box-shadow: 0 4px 24px rgba(245,158,11,0.8); }
        }
        @keyframes av-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes av-wave {
          0%, 100% { transform: scaleY(0.4); }
          50%      { transform: scaleY(1); }
        }
        .av-spin { animation: av-spin 1s linear infinite; }
        .av-pulse-orange { animation: av-pulse-orange 1.5s ease-in-out infinite; }
        .av-pulse-dot { animation: av-pulse-dot 1.6s ease-in-out infinite; }
        .av-wave {
          animation: av-wave 1.1s ease-in-out infinite;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .av-spin, .av-pulse-orange, .av-pulse-dot, .av-wave {
            animation: none !important;
          }
        }
      `}</style>

      {/* Overlay CONNECTING */}
      {connectionState === "CONNECTING" && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.95)",
            zIndex: 20,
          }}
        >
          <Loader2 size={48} className="av-spin" style={{ color: "#818CF8" }} />
          <p style={{ marginTop: 16, fontSize: 16 }}>Connexion en cours…</p>
        </div>
      )}

      {/* Overlay ERROR */}
      {connectionState === "ERROR" && (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.95)",
            zIndex: 20,
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <WifiOff size={48} color="#EF4444" />
          <h2
            style={{
              marginTop: 16,
              textAlign: "center",
              fontSize: isMobile ? 18 : 20,
            }}
          >
            {permissionError
              ? "Accès caméra/micro refusé"
              : "Échec de la connexion"}
          </h2>
          {permissionError && (
            <p
              style={{
                marginTop: 12,
                color: "#94A3B8",
                fontSize: 14,
                textAlign: "center",
                maxWidth: 380,
              }}
            >
              {permissionError}
            </p>
          )}
          <button
            type="button"
            onClick={handleEndCall}
            onTouchStart={pressBtn("quit-error")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              background: "#EF4444",
              border: "none",
              borderRadius: 12,
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 15,
              minHeight: 44,
              transform:
                pressedBtn === "quit-error" ? "scale(0.97)" : "scale(1)",
              transition: "transform 0.1s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
            }}
          >
            Quitter
          </button>
        </div>
      )}

      {/* Écran pré-appel */}
      {!hasJoined &&
        connectionState !== "CONNECTING" &&
        connectionState !== "ERROR" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15,23,42,0.98)",
              zIndex: 15,
              gap: 20,
              padding: 24,
              boxSizing: "border-box",
              paddingTop: "calc(24px + env(safe-area-inset-top, 0px))",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "#1E293B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "3px solid #818CF8",
              }}
            >
              {contactAvatar ? (
                <img
                  src={contactAvatar}
                  alt={contactName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <User size={48} color="#94A3B8" />
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 22, textAlign: "center" }}>
              {contactName || (isAudioCall ? "Appel audio" : "Appel vidéo")}
            </h2>
            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 14,
                textAlign: "center",
                maxWidth: 340,
              }}
            >
              Appuie sur le bouton pour autoriser la caméra et le micro
            </p>
            <button
              type="button"
              onClick={startCall}
              style={{
                marginTop: 12,
                padding: "14px 32px",
                background: "#10B981",
                border: "none",
                borderRadius: 999,
                color: "white",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                minHeight: 52,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <PhoneOff size={20} style={{ transform: "rotate(135deg)" }} />
              {isAudioCall ? "Répondre" : "Rejoindre l'appel"}
            </button>
            <button
              type="button"
              onClick={handleEndCall}
              style={{
                marginTop: 4,
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 999,
                color: "#94A3B8",
                fontSize: 14,
                cursor: "pointer",
                minHeight: 44,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
              }}
            >
              Annuler
            </button>
          </div>
        )}

      {/* Top bar — pill glass */}
      <div
        style={{
          position: "absolute",
          top: isMobile
            ? "calc(12px + env(safe-area-inset-top, 0px))"
            : 16,
          left: isMobile ? 12 : 16,
          right: isMobile ? 12 : 16,
          zIndex: 10,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: isMobile ? "8px 12px" : "10px 16px",
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            pointerEvents: "auto",
            maxWidth: "100%",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#1E293B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              border: "1.5px solid rgba(255,255,255,0.15)",
            }}
          >
            {contactAvatar ? (
              <img
                src={contactAvatar}
                alt={contactName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <User size={16} color="#94A3B8" />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: isMobile ? 13 : 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                lineHeight: 1.2,
              }}
            >
              {contactName || "Appel"}
            </span>
            <span
              style={{
                fontSize: 10.5,
                color: "rgba(255,255,255,0.55)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                lineHeight: 1.2,
              }}
            >
              <span
                className={connectionState === "CONNECTED" ? "av-pulse-dot" : ""}
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background:
                    connectionState === "CONNECTED" ? "#10B981" : "#F59E0B",
                }}
              />
              {connectionState === "CONNECTED"
                ? "En communication"
                : "Connexion…"}
            </span>
          </div>

          <div
            style={{
              width: 1,
              height: 24,
              background: "rgba(255,255,255,0.12)",
              flexShrink: 0,
            }}
          />

          <div
            style={{
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              color: "#E2E8F0",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: 0.5,
              flexShrink: 0,
            }}
          >
            {formatDuration(callDuration)}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 999,
              background: `${networkQualityColor}22`,
              border: `1px solid ${networkQualityColor}55`,
              flexShrink: 0,
            }}
            title={`Qualité réseau : ${networkQualityLabel}`}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: networkQualityColor,
                boxShadow: `0 0 6px ${networkQualityColor}`,
              }}
            />
            {!isMobile && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: networkQualityColor,
                }}
              >
                {networkQualityLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Zone principale */}
      {isAudioCall ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: 16,
          }}
        >
          <div
            style={{
              position: "relative",
              width: isMobile ? 140 : 160,
              height: isMobile ? 140 : 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: -12,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(129,140,248,0.35) 0%, transparent 70%)",
                animation:
                  connectionState === "CONNECTED"
                    ? "av-pulse-dot 2.4s ease-in-out infinite"
                    : "none",
              }}
            />

            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "#1E293B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "3px solid rgba(129,140,248,0.5)",
                boxShadow: "0 20px 60px rgba(79,70,229,0.3)",
              }}
            >
              {contactAvatar ? (
                <img
                  src={contactAvatar}
                  alt={contactName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <User size={isMobile ? 64 : 72} color="#94A3B8" />
              )}
            </div>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? 22 : 26,
              fontWeight: 700,
              textAlign: "center",
              letterSpacing: "-0.02em",
            }}
          >
            {contactName || "Appel audio"}
          </h2>

          <div
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              height: 32,
              marginTop: 4,
            }}
          >
            {waveBars.map((h, i) => (
              <span
                key={i}
                className={isMuted ? "" : "av-wave"}
                style={{
                  display: "inline-block",
                  width: 4,
                  height: 32,
                  borderRadius: 2,
                  background: isMuted
                    ? "rgba(148,163,184,0.3)"
                    : "linear-gradient(180deg, #818CF8, #6366F1)",
                  transform: `scaleY(${isMuted ? 0.15 : h})`,
                  animationDelay: `${(i % 4) * 0.15}s`,
                  transition: "background 0.3s ease",
                }}
              />
            ))}
          </div>

          <p
            style={{
              margin: 0,
              color: isMuted ? "#F59E0B" : "#94A3B8",
              fontSize: isMobile ? 13 : 14,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isMuted ? (
              <>
                <MicOff size={14} />
                Micro coupé
              </>
            ) : (
              "En communication"
            )}
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {remoteUsers.length > 0 ? (
            <>
              <RemoteVideo
                key={remoteUsers[0].uid}
                user={remoteUsers[0]}
                fullscreen
              />

              {/* PiP local */}
              <div
                style={{
                  position: "absolute",
                  top: isMobile ? 80 : 96,
                  right: isMobile ? 12 : 16,
                  width: isMobile ? 96 : 128,
                  height: isMobile ? 132 : 176,
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow:
                    "0 20px 48px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  zIndex: 10,
                  background: "#1E293B",
                }}
              >
                <div
                  ref={localVideoRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: isFrontCamera ? "scaleX(-1)" : "scaleX(1)",
                  }}
                />
                {isVideoOff && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%,-50%)",
                      fontSize: 32,
                      opacity: 0.8,
                    }}
                  >
                    📷
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 10.5,
                    fontWeight: 600,
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Vous
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <div
                ref={localVideoRef}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: isFrontCamera ? "scaleX(-1)" : "scaleX(1)",
                }}
              />
              {isVideoOff && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    fontSize: 64,
                    opacity: 0.8,
                  }}
                >
                  📷
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  background: "rgba(15,23,42,0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: -60,
                }}
              >
                <span
                  className="av-pulse-dot"
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#F59E0B",
                  }}
                />
                En attente du correspondant…
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Vous
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bouton déblocage audio iOS */}
      {autoplayBlocked && (
        <button
          type="button"
          onClick={unlockRemoteAudio}
          style={{
            position: "absolute",
            bottom: isMobile ? 140 : 160,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 24px",
            background: "#F59E0B",
            border: "none",
            borderRadius: 999,
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            minHeight: 48,
            boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
            fontFamily: "inherit",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}
          className="av-pulse-orange"
          aria-label="Activer le son du correspondant"
        >
          🔊 Appuyez pour activer le son
        </button>
      )}

      {/* Barre de contrôle — pill glass */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile
            ? "calc(12px + env(safe-area-inset-bottom, 0px))"
            : 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          justifyContent: "center",
          width: "calc(100% - 24px)",
          maxWidth: "fit-content",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: isMobile ? 6 : 12,
            padding: isMobile ? "10px 12px" : "12px 16px",
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 28,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <ControlButton
            icon={
              isMuted ? (
                <MicOff size={isMobile ? 20 : 22} />
              ) : (
                <Mic size={isMobile ? 20 : 22} />
              )
            }
            label={isMobile ? "Micro" : ""}
            active={isMuted}
            activeColor="red"
            pressed={pressedBtn === "mute"}
            onPress={pressBtn("mute")}
            onRelease={releaseBtn}
            onClick={toggleMute}
            ariaLabel={isMuted ? "Activer le micro" : "Couper le micro"}
            isMobile={isMobile}
          />

          <ControlButton
            icon={
              isVideoOff ? (
                <VideoOff size={isMobile ? 20 : 22} />
              ) : (
                <Video size={isMobile ? 20 : 22} />
              )
            }
            label={isMobile ? "Caméra" : ""}
            active={isVideoOff}
            activeColor="red"
            pressed={pressedBtn === "video"}
            onPress={pressBtn("video")}
            onRelease={releaseBtn}
            onClick={toggleVideo}
            ariaLabel={isVideoOff ? "Activer la caméra" : "Couper la caméra"}
            isMobile={isMobile}
          />

          <ControlButton
            icon={
              isSpeakerOn ? (
                <Volume2 size={isMobile ? 20 : 22} />
              ) : (
                <VolumeX size={isMobile ? 20 : 22} />
              )
            }
            label={isMobile ? "Son" : ""}
            active={!isSpeakerOn}
            activeColor="red"
            pressed={pressedBtn === "speaker"}
            onPress={pressBtn("speaker")}
            onRelease={releaseBtn}
            onClick={toggleSpeaker}
            ariaLabel={
              isSpeakerOn
                ? "Couper le haut-parleur"
                : "Activer le haut-parleur"
            }
            isMobile={isMobile}
          />

          {!isAudioCall && (
            <ControlButton
              icon={<SwitchCamera size={isMobile ? 20 : 22} />}
              label={isMobile ? "Pivoter" : ""}
              active={false}
              activeColor="blue"
              pressed={pressedBtn === "switchCam"}
              onPress={pressBtn("switchCam")}
              onRelease={releaseBtn}
              onClick={switchCamera}
              ariaLabel="Changer de caméra"
              isMobile={isMobile}
            />
          )}

          <ControlButton
            icon={
              isOnHold ? (
                <Play size={isMobile ? 20 : 22} />
              ) : (
                <Pause size={isMobile ? 20 : 22} />
              )
            }
            label={isMobile ? "Pause" : ""}
            active={isOnHold}
            activeColor="blue"
            pressed={pressedBtn === "hold"}
            onPress={pressBtn("hold")}
            onRelease={releaseBtn}
            onClick={toggleHold}
            ariaLabel={isOnHold ? "Reprendre l'appel" : "Mettre en attente"}
            isMobile={isMobile}
          />

          {!isMobile && (
            <ControlButton
              icon={
                isScreenSharing ? (
                  <MonitorOff size={22} />
                ) : (
                  <Monitor size={22} />
                )
              }
              label=""
              active={isScreenSharing}
              activeColor="blue"
              pressed={pressedBtn === "screen"}
              onPress={pressBtn("screen")}
              onRelease={releaseBtn}
              onClick={startScreenShare}
              ariaLabel={
                isScreenSharing ? "Arrêter le partage" : "Partager l'écran"
              }
              isMobile={isMobile}
            />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={handleEndCall}
              onTouchStart={pressBtn("end")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                width: isMobile ? 52 : 60,
                height: isMobile ? 52 : 60,
                borderRadius: 20,
                border: "none",
                background: "linear-gradient(135deg, #EF4444, #DC2626)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(239,68,68,0.5)",
                transform:
                  pressedBtn === "end" ? "scale(0.92)" : "scale(1)",
                transition:
                  "transform 0.1s ease, box-shadow 0.15s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                padding: 0,
              }}
              aria-label="Terminer l'appel"
            >
              <PhoneOff size={isMobile ? 24 : 28} />
            </button>
            {isMobile && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Quitter
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CONTROL BUTTON
// ════════════════════════════════════════════════════════════════════
function ControlButton({
  icon,
  label,
  active,
  activeColor,
  pressed,
  onPress,
  onRelease,
  onClick,
  ariaLabel,
  isMobile,
}) {
  const size = isMobile ? 48 : 56;

  const activeStyle = (() => {
    if (!active) return {};
    if (activeColor === "red") {
      return {
        background: "rgba(239,68,68,0.22)",
        borderColor: "rgba(239,68,68,0.6)",
        color: "#FCA5A5",
      };
    }
    if (activeColor === "blue") {
      return {
        background: "rgba(59,130,246,0.22)",
        borderColor: "rgba(59,130,246,0.6)",
        color: "#93C5FD",
      };
    }
    return {};
  })();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        onTouchStart={onPress}
        onTouchEnd={onRelease}
        onTouchCancel={onRelease}
        aria-label={ariaLabel}
        style={{
          width: size,
          height: size,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          color: "#E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition:
            "background 0.15s ease, transform 0.1s ease, border-color 0.15s ease, color 0.15s ease",
          transform: pressed ? "scale(0.92)" : "scale(1)",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          padding: 0,
          flexShrink: 0,
          ...activeStyle,
        }}
      >
        {icon}
      </button>
      {label ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.55)",
            userSelect: "none",
          }}
        >
          {label}
        </span>
      ) : (
        <span style={{ height: 12 }} aria-hidden="true" />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// REMOTE VIDEO
// ════════════════════════════════════════════════════════════════════
function RemoteVideo({ user, fullscreen }) {
  const videoRef = useRef(null);
  const [videoTrack, setVideoTrack] = useState(user.videoTrack);

  useEffect(() => {
    setVideoTrack(user.videoTrack);
    if (videoRef.current && user.videoTrack) {
      user.videoTrack.play(videoRef.current);
    }
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [user.videoTrack]);

  useEffect(() => {
    if (videoRef.current && videoTrack) {
      videoTrack.play(videoRef.current);
    }
  }, [videoTrack]);

  return (
    <div
      style={{
        position: fullscreen ? "absolute" : "relative",
        top: fullscreen ? 0 : undefined,
        left: fullscreen ? 0 : undefined,
        right: fullscreen ? 0 : undefined,
        bottom: fullscreen ? 0 : undefined,
        flex: fullscreen ? "none" : "1 1 45%",
        minWidth: fullscreen ? "auto" : 280,
        background: "#1E293B",
        borderRadius: fullscreen ? 0 : 16,
        overflow: "hidden",
        boxShadow: fullscreen ? "none" : "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div
        ref={videoRef}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius: 999,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 600,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Participant {user.uid}
      </div>
    </div>
  );
}

export default AppelVideo;