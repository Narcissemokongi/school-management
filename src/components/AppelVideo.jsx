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
  const [connectionState, setConnectionState] = useState("CONNECTING");
  const [networkQuality, setNetworkQuality] = useState("unknown");
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);
  // ✨ Feedback tap sur les boutons de contrôle
  const [pressedBtn, setPressedBtn] = useState(null);

  const endCallMutation = useMutation(api.appels.endCall);
  const generateToken = useAction(api.agora.generateToken);

  const localVideoRef = useRef(null);
  const timerRef = useRef(null);
  const clientRef = useRef(null);
  const localTracksRef = useRef([]);
  const screenTrackRef = useRef(null);
  const onCallEndRef = useRef(onCallEnd);
  const destroyedRef = useRef(false);

  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);

  // ✨ Handlers touch génériques
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
    setRemoteUsers([]);
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsOnHold(false);
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

  useEffect(() => {
    if (!APP_ID || !channelName) {
      toast.error("Configuration Agora manquante");
      handleEndCall();
      return;
    }

    destroyedRef.current = false;
    let agoraClient;

    const init = async () => {
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

      agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
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
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (destroyedRef.current) {
          tracks.forEach((t) => t.close());
          return;
        }
        localTracksRef.current = tracks;

        if (callType === "audio") {
          tracks[1].setEnabled(false);
          setIsVideoOff(true);
        }

        if (callType === "audio") {
          await agoraClient.publish([tracks[0]]);
        } else {
          await agoraClient.publish([tracks[0], tracks[1]]);
        }

        if (callType === "video" && localVideoRef.current && tracks[1]) {
          tracks[1].play(localVideoRef.current);
        }
      } catch (err) {
        toast.error("Erreur micro/caméra : " + err.message);
        handleEndCall();
        return;
      }

      agoraClient.on("user-published", async (user, mediaType) => {
        if (destroyedRef.current) return;
        try {
          await agoraClient.subscribe(user, mediaType);
          setRemoteUsers((prev) => {
            if (!prev.find((u) => u.uid === user.uid)) {
              return [...prev, user];
            }
            return prev;
          });
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
          setRemoteUsers((prev) => {
            if (!prev.find((u) => u.uid === user.uid)) return [...prev, user];
            return prev;
          });
        });
      }, 800);

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    init();

    return () => {
      destroyedRef.current = true;
      cleanupLocal();
    };
  }, [channelName, userId, generateTokenCallback, handleEndCall, cleanupLocal, callType]);

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
    if (videoTrack) {
      const newVideoOff = !isVideoOff;
      videoTrack.setEnabled(!newVideoOff);
      setIsVideoOff(newVideoOff);
      if (!newVideoOff && localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
        if (callType === "audio" && clientRef.current) {
          clientRef.current.publish(videoTrack).catch((err) => {
            console.warn("Erreur publication vidéo", err);
            toast.error("Impossible d'activer la vidéo");
            videoTrack.setEnabled(false);
            setIsVideoOff(true);
          });
        }
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
    unknown: "",
  }[networkQuality];

  const networkQualityColor = {
    good: "#10B981",
    fair: "#F59E0B",
    poor: "#EF4444",
    unknown: "#94A3B8",
  }[networkQuality];

  const isAudioCall = callType === "audio";

  const localVideoMirrorStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: isFrontCamera && !isAudioCall ? "scaleX(-1)" : "scaleX(1)",
  };

  const localFloatingStyle = {
    position: "absolute",
    top: isMobile ? 12 : 16,
    right: isMobile ? 12 : 16,
    width: isMobile ? 96 : 120,
    height: isMobile ? 128 : 160,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
    border: "2px solid rgba(255,255,255,0.3)",
    zIndex: 10,
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        background: "#0F172A",
        color: "white",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Keyframes */}
      <style>{`
        @keyframes av-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .av-spin { animation: av-spin 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .av-spin { animation: none !important; }
        }
      `}</style>

      {/* ═══ Overlay CONNECTING ═══ */}
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

      {/* ═══ Overlay ERROR ═══ */}
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
          <h2 style={{ marginTop: 16, textAlign: "center" }}>
            Échec de la connexion
          </h2>
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

      {/* ═══ Bandeau supérieur ═══ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          // ✨ Safe-area top + left/right
          padding: isMobile
            ? `calc(12px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) 12px calc(16px + env(safe-area-inset-left, 0px))`
            : "12px 16px",
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 10,
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#1E293B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {contactAvatar ? (
              <img
                src={contactAvatar}
                alt={contactName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <User size={20} color="#94A3B8" />
            )}
          </div>
          <span
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 15 : 16,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {contactName || "Appel"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: networkQualityColor,
            fontSize: isMobile ? 12 : 13,
            flexShrink: 0,
          }}
        >
          <Wifi size={isMobile ? 14 : 16} />
          {networkQualityLabel && <span>{networkQualityLabel}</span>}
        </div>
      </div>

      {/* ═══ Zone principale ═══ */}
      {isAudioCall ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 16,
          }}
        >
          <div
            style={{
              width: isMobile ? 100 : 120,
              height: isMobile ? 100 : 120,
              borderRadius: "50%",
              background: "#1E293B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 700,
              color: "#94A3B8",
              overflow: "hidden",
            }}
          >
            {contactAvatar ? (
              <img
                src={contactAvatar}
                alt={contactName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <User size={isMobile ? 48 : 56} />
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 24, textAlign: "center" }}>
            {contactName || "Appel audio"}
          </h2>
          <p style={{ margin: 0, color: "#94A3B8", fontSize: isMobile ? 13 : 14 }}>
            {isMuted ? "Micro coupé" : "En communication"}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#94A3B8",
              fontSize: isMobile ? 18 : 20,
            }}
          >
            <Clock size={isMobile ? 18 : 20} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatDuration(callDuration)}
            </span>
          </div>
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

              <div style={localFloatingStyle}>
                <div ref={localVideoRef} style={localVideoMirrorStyle} />
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
                    bottom: 4,
                    left: 4,
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: 10,
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
              <div ref={localVideoRef} style={localVideoMirrorStyle} />
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
                  bottom: 12,
                  left: 12,
                  background: "rgba(0,0,0,0.6)",
                  borderRadius: 8,
                  padding: "4px 12px",
                  fontSize: 13,
                }}
              >
                Vous
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Barre de contrôle ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isMobile ? 8 : 20,
          padding: isMobile ? "8px 8px" : "12px 16px",
          paddingBottom: isMobile
            ? "calc(8px + env(safe-area-inset-bottom, 0px))"
            : "12px",
          background: "rgba(15,23,42,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
        {/* Compteur (desktop uniquement pour gagner de la place mobile) */}
        {!isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#94A3B8",
              fontSize: 15,
              marginRight: "auto",
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {connectionState === "CONNECTED" ? (
              <Wifi size={16} color="#10B981" />
            ) : (
              <WifiOff size={16} color="#EF4444" />
            )}
            <Clock size={18} />
            <span>{formatDuration(callDuration)}</span>
          </div>
        )}

        {/* Mute */}
        <button
          type="button"
          onClick={toggleMute}
          onTouchStart={pressBtn("mute")}
          onTouchEnd={releaseBtn}
          onTouchCancel={releaseBtn}
          style={controlButtonStyle(
            isMuted ? "red" : "default",
            isMobile,
            pressedBtn === "mute"
          )}
          aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
        >
          {isMuted ? (
            <MicOff size={isMobile ? 20 : 22} />
          ) : (
            <Mic size={isMobile ? 20 : 22} />
          )}
        </button>

        {/* Video toggle */}
        <button
          type="button"
          onClick={toggleVideo}
          onTouchStart={pressBtn("video")}
          onTouchEnd={releaseBtn}
          onTouchCancel={releaseBtn}
          style={controlButtonStyle(
            isVideoOff ? "red" : "default",
            isMobile,
            pressedBtn === "video"
          )}
          aria-label={isVideoOff ? "Activer la caméra" : "Couper la caméra"}
        >
          {isVideoOff ? (
            <VideoOff size={isMobile ? 20 : 22} />
          ) : (
            <Video size={isMobile ? 20 : 22} />
          )}
        </button>

        {/* Speaker (desktop uniquement) */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSpeaker}
            onTouchStart={pressBtn("speaker")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={controlButtonStyle(
              isSpeakerOn ? "default" : "red",
              isMobile,
              pressedBtn === "speaker"
            )}
            aria-label={
              isSpeakerOn
                ? "Couper le haut-parleur"
                : "Activer le haut-parleur"
            }
          >
            {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
        )}

        {/* Switch camera (desktop uniquement) */}
        {!isAudioCall && !isMobile && (
          <button
            type="button"
            onClick={switchCamera}
            onTouchStart={pressBtn("switchCam")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={controlButtonStyle(
              "default",
              isMobile,
              pressedBtn === "switchCam"
            )}
            aria-label="Changer de caméra"
          >
            <SwitchCamera size={22} />
          </button>
        )}

        {/* Hold */}
        <button
          type="button"
          onClick={toggleHold}
          onTouchStart={pressBtn("hold")}
          onTouchEnd={releaseBtn}
          onTouchCancel={releaseBtn}
          style={controlButtonStyle(
            isOnHold ? "blue" : "default",
            isMobile,
            pressedBtn === "hold"
          )}
          aria-label={isOnHold ? "Reprendre l'appel" : "Mettre en attente"}
        >
          {isOnHold ? (
            <Play size={isMobile ? 20 : 22} />
          ) : (
            <Pause size={isMobile ? 20 : 22} />
          )}
        </button>

        {/* Screen share (desktop uniquement) */}
        {!isMobile && (
          <button
            type="button"
            onClick={startScreenShare}
            onTouchStart={pressBtn("screen")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={controlButtonStyle(
              isScreenSharing ? "blue" : "default",
              isMobile,
              pressedBtn === "screen"
            )}
            aria-label={
              isScreenSharing ? "Arrêter le partage" : "Partager l'écran"
            }
          >
            {isScreenSharing ? (
              <MonitorOff size={22} />
            ) : (
              <Monitor size={22} />
            )}
          </button>
        )}

        {/* End call */}
        <button
          type="button"
          onClick={handleEndCall}
          onTouchStart={pressBtn("end")}
          onTouchEnd={releaseBtn}
          onTouchCancel={releaseBtn}
          style={{
            ...controlButtonStyle("red", isMobile, pressedBtn === "end"),
            background:
              pressedBtn === "end" ? "#DC2626" : "#EF4444",
            borderColor: "#EF4444",
            width: isMobile ? 48 : 56,
            height: isMobile ? 48 : 56,
          }}
          aria-label="Terminer l'appel"
        >
          <PhoneOff size={isMobile ? 22 : 26} />
        </button>
      </div>
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
          background: "rgba(0,0,0,0.6)",
          borderRadius: 8,
          padding: "4px 12px",
          fontSize: 13,
        }}
      >
        Participant {user.uid}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// HELPER — Style bouton de contrôle (44px mobile + feedback tap)
// ════════════════════════════════════════════════════════════════════
function controlButtonStyle(variant, isMobile, pressed = false) {
  const size = isMobile ? 44 : 52; // ✨ 44px mobile (WCAG)
  const base = {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.2)",
    background: pressed
      ? "rgba(255,255,255,0.16)"
      : "rgba(255,255,255,0.08)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition:
      "background 0.12s ease, transform 0.1s ease, border-color 0.15s ease",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    flexShrink: 0,
    padding: 0,
    // ✨ Feedback tap
    transform: pressed ? "scale(0.92)" : "scale(1)",
    // ✨ Neutralise délai 300ms + flash bleu
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    outline: "none",
  };

  if (variant === "red") {
    return {
      ...base,
      background: pressed ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.2)",
      borderColor: "#EF4444",
    };
  }
  if (variant === "blue") {
    return {
      ...base,
      background: pressed
        ? "rgba(59,130,246,0.35)"
        : "rgba(59,130,246,0.2)",
      borderColor: "#3B82F6",
    };
  }
  return base;
}

export default AppelVideo;