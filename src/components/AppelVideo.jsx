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

  // ✅ Retourne maintenant { token, uid } au lieu d'un string
  const generateTokenCallback = useCallback(
    async (channel, uid) => {
      try {
        return await generateToken({ channelName: channel, userId: uid });
      } catch (err) {
        // 🟡 FIX : ne pas propager le message backend au client
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
        // ✅ FIX : le backend retourne { token, uid }
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
        // ✅ FIX CRITIQUE : on utilise agoraUid (numérique stable) au lieu de null
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

        // Désactiver la caméra pour un appel audio
        if (callType === "audio") {
          tracks[1].setEnabled(false);
          setIsVideoOff(true);
        }

        // Publier uniquement la piste audio si appel audio
        if (callType === "audio") {
          await agoraClient.publish([tracks[0]]);
        } else {
          await agoraClient.publish([tracks[0], tracks[1]]);
        }

        // Jouer la vidéo locale seulement si vidéo active
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

  /**
   * 🟢 FIX : `getTrackLabel()` n'existe pas sur les tracks Agora.
   * Utilise la bonne API : `getMediaStreamTrack().getSettings().deviceId`
   */
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

  /**
   * 🟢 FIX : `?.` avant `()` était invalide — corrigé.
   */
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

  // ✅ Style miroir pour la caméra frontale (selfie = inversé comme iOS)
  const localVideoMirrorStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: isFrontCamera && !isAudioCall ? "scaleX(-1)" : "scaleX(1)",
  };

  // Style flottant pour la vidéo locale
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
        // ✅ FIX iOS : 100dvh (dynamic viewport) évite que la barre Safari cache le bas
        height: "100dvh",
        background: "#0F172A",
        color: "white",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 🟢 FIX : keyframes préfixés `av-*` */}
      <style>{`
        @keyframes av-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .av-spin { animation: av-spin 1s linear infinite; }
      `}</style>

      {/* Overlays */}
      {connectionState === "CONNECTING" && (
        <div
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

      {connectionState === "ERROR" && (
        <div
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
          <WifiOff size={48} color="#EF4444" />
          <h2 style={{ marginTop: 16 }}>Échec de la connexion</h2>
          <button
            onClick={handleEndCall}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              background: "#EF4444",
              border: "none",
              borderRadius: 12,
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Quitter
          </button>
        </div>
      )}

      {/* Bandeau supérieur */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            {contactName || "Appel"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: networkQualityColor,
            fontSize: 13,
          }}
        >
          <Wifi size={16} />
          {networkQualityLabel && <span>{networkQualityLabel}</span>}
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
            gap: 16,
            padding: 16,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
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
              <User size={56} />
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: 24 }}>
            {contactName || "Appel audio"}
          </h2>
          <p style={{ margin: 0, color: "#94A3B8" }}>
            {isMuted ? "Micro coupé" : "En communication"}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#94A3B8",
              fontSize: 20,
            }}
          >
            <Clock size={20} />
            <span>{formatDuration(callDuration)}</span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {remoteUsers.length > 0 ? (
            <>
              {/* Vidéo distante en plein écran */}
              <RemoteVideo
                key={remoteUsers[0].uid}
                user={remoteUsers[0]}
                fullscreen
              />

              {/* Miniature vidéo locale flottante */}
              <div style={localFloatingStyle}>
                <div
                  ref={localVideoRef}
                  style={localVideoMirrorStyle}
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
            /* Vidéo locale en plein écran (avant connexion du distant) */
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
                style={localVideoMirrorStyle}
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

      {/* Barre de contrôle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isMobile ? 10 : 20,
          padding: isMobile ? "8px 8px" : "12px 16px",
          // ✅ FIX iOS : safe-area pour le notch en bas
          paddingBottom: isMobile
            ? "calc(8px + env(safe-area-inset-bottom, 0px))"
            : "12px",
          background: "rgba(15,23,42,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#94A3B8",
            fontSize: isMobile ? 12 : 15,
            marginRight: "auto",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {connectionState === "CONNECTED" ? (
            <Wifi size={isMobile ? 12 : 16} color="#10B981" />
          ) : (
            <WifiOff size={isMobile ? 12 : 16} color="#EF4444" />
          )}
          <Clock size={isMobile ? 14 : 18} />
          <span>{formatDuration(callDuration)}</span>
        </div>

        <button
          onClick={toggleMute}
          style={controlButtonStyle(isMuted ? "red" : "default", isMobile)}
          aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
        >
          {isMuted ? (
            <MicOff size={isMobile ? 18 : 22} />
          ) : (
            <Mic size={isMobile ? 18 : 22} />
          )}
        </button>
        <button
          onClick={toggleVideo}
          style={controlButtonStyle(isVideoOff ? "red" : "default", isMobile)}
          aria-label={isVideoOff ? "Activer la caméra" : "Couper la caméra"}
        >
          {isVideoOff ? (
            <VideoOff size={isMobile ? 18 : 22} />
          ) : (
            <Video size={isMobile ? 18 : 22} />
          )}
        </button>
        {/* ✅ FIX : bouton haut-parleur caché sur mobile (hardware controls) */}
        {!isMobile && (
          <button
            onClick={toggleSpeaker}
            style={controlButtonStyle(isSpeakerOn ? "default" : "red", isMobile)}
            aria-label={isSpeakerOn ? "Couper le haut-parleur" : "Activer le haut-parleur"}
          >
            {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
        )}
        {/* ✅ FIX : bouton switch camera caché sur mobile (overflow) */}
        {!isAudioCall && !isMobile && (
          <button
            onClick={switchCamera}
            style={controlButtonStyle("default", isMobile)}
            aria-label="Changer de caméra"
          >
            <SwitchCamera size={22} />
          </button>
        )}
        <button
          onClick={toggleHold}
          style={controlButtonStyle(isOnHold ? "blue" : "default", isMobile)}
          aria-label={isOnHold ? "Reprendre l'appel" : "Mettre en attente"}
        >
          {isOnHold ? (
            <Play size={isMobile ? 18 : 22} />
          ) : (
            <Pause size={isMobile ? 18 : 22} />
          )}
        </button>
        {!isMobile && (
          <button
            onClick={startScreenShare}
            style={controlButtonStyle(isScreenSharing ? "blue" : "default", isMobile)}
            aria-label={isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
          >
            {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
          </button>
        )}
        <button
          onClick={handleEndCall}
          style={{
            ...controlButtonStyle("red", isMobile),
            background: "#EF4444",
            borderColor: "#EF4444",
            width: isMobile ? 46 : 56,
            height: isMobile ? 46 : 56,
          }}
          aria-label="Terminer l'appel"
        >
          <PhoneOff size={isMobile ? 22 : 26} />
        </button>
      </div>
    </div>
  );
}

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

function controlButtonStyle(variant, isMobile) {
  const size = isMobile ? 42 : 52;
  const base = {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    backdropFilter: "blur(4px)",
    flexShrink: 0,
  };
  if (variant === "red") {
    return {
      ...base,
      background: "rgba(239,68,68,0.2)",
      borderColor: "#EF4444",
    };
  }
  if (variant === "blue") {
    return {
      ...base,
      background: "rgba(59,130,246,0.2)",
      borderColor: "#3B82F6",
    };
  }
  return base;
}

export default AppelVideo;