// src/components/AppelGroupe.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  PhoneOff, Mic, MicOff, Video, VideoOff, Users, Loader2,
  Wifi, WifiOff, Clock, SwitchCamera, Volume2, VolumeX, Pause, Play,
  Monitor, MonitorOff,
} from "lucide-react";
import toast from "react-hot-toast";

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const MAX_CALL_DURATION_MINUTES = 60;

export function AppelGroupe({
  channelName,
  userId,
  callId,
  participants = [],
  onCallEnd,
  callType = "video",
  groupName,
}) {
  const isMobile = useIsMobile();

  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState("IDLE");
  const [networkQuality, setNetworkQuality] = useState("unknown");
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);
  // ✨ Feedback tap sur les boutons de contrôle
  const [pressedBtn, setPressedBtn] = useState(null);
  // ✨ iOS Safari — écran pré-appel obligatoire (user gesture pour getUserMedia)
  const [hasJoined, setHasJoined] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  const leaveGroupMutation = useMutation(api.appels.leaveGroupCall);
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
      await leaveGroupMutation({ callId, userId });
    } catch (err) {
      const msg = err?.message ?? "";
      if (
        !msg.includes("Appel introuvable") &&
        !msg.includes("ne participez pas") &&
        !msg.includes("alreadyEnded")
      ) {
        console.error("[AppelGroupe] leaveGroupCall failed:", err);
      }
    }
    cleanupLocal();
    if (onCallEndRef.current) onCallEndRef.current();
  }, [leaveGroupMutation, callId, userId, cleanupLocal]);

  const generateTokenCallback = useCallback(
    async (channel, uid) => {
      try {
        return await generateToken({ channelName: channel, userId: uid });
      } catch (err) {
        console.error("[AppelGroupe] generateToken failed:", err);
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
      console.log("[AppelGroupe] joining with uid:", agoraUid);
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

    // ═══ getUserMedia — DOIT être dans le user gesture (iOS) ═══
    try {
      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, AGC: true, ANS: true }, // Configuration audio
        { encoderConfig: "480p_1" }          // Configuration vidéo (optionnel)
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

      setIsFrontCamera(true);
      setHasJoined(true);
    } catch (err) {
      console.error("[AppelGroupe] getUserMedia failed:", err);
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

    const retrySubscribe = (attempt = 0) => {
      if (destroyedRef.current || !agoraClient) return;
      const existing = agoraClient.remoteUsers ?? [];
      existing.forEach((user) => {
        agoraClient.subscribe(user, "video").catch(() => {});
        agoraClient.subscribe(user, "audio").catch(() => {});
        setRemoteUsers((prev) =>
          prev.find((u) => u.uid === user.uid) ? prev : [...prev, user]
        );
      });
      if (attempt < 2) {
        setTimeout(() => retrySubscribe(attempt + 1), 800);
      }
    };
    setTimeout(() => retrySubscribe(0), 800);

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

  // Cleanup au démontage uniquement (pas au mount)
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
      videoTrack.play(localVideoRef.current);
      if (callType === "audio" && clientRef.current) {
        clientRef.current.publish(videoTrack).catch((err) => {
          console.warn("[AppelGroupe] publish video failed:", err);
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
        console.error("[AppelGroupe] switchCamera failed:", err);
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
      localTracksRef.current[1]?.setEnabled(!isVideoOff);
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
      if (localTracksRef.current[1] && !isVideoOff && localVideoRef.current) {
        localTracksRef.current[1].play(localVideoRef.current);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await AgoraRTC.createScreenVideoTrack({}, "disable");
        screenTrackRef.current = screen;
        await clientRef.current.publish(screen);
        if (localVideoRef.current) {
          screen.play(localVideoRef.current);
        }
        setIsScreenSharing(true);
      } catch (err) {
        console.error("[AppelGroupe] screenShare failed:", err);
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

  const connectedCount = remoteUsers.length + 1;
  const isWaitingForOthers = remoteUsers.length === 0;

  // ✨ Tailles
  const controlButtonSize = isMobile ? 44 : 52; // ✅ 44px mobile
  const controlGap = isMobile ? 8 : 20;
  const gridGap = isMobile ? 8 : 12;
  const gridPadding = isMobile ? 8 : 16;
  const gridMin = isMobile ? "140px" : "200px";
  const iconSize = isMobile ? 20 : 22;

  const localVideoMirrorStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: isFrontCamera && !isVideoOff ? "scaleX(-1)" : "scaleX(1)",
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
      <style>{`
        @keyframes ag-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ag-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .ag-spin { animation: ag-spin 1s linear infinite; }
        .ag-pulse { animation: ag-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ag-spin, .ag-pulse { animation: none !important; }
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
          <Loader2 size={48} className="ag-spin" style={{ color: "#818CF8" }} />
          <p style={{ marginTop: 16, fontSize: 16, fontWeight: 500 }}>
            Connexion au groupe…
          </p>
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
          <h2
            style={{
              marginTop: 16,
              fontSize: isMobile ? 20 : 24,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {permissionError ? "Accès caméra/micro refusé" : "Échec de la connexion"}
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

      {/* ═══ Écran pré-appel (iOS Safari — user gesture) ═══ */}
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
                border: "3px solid #818CF8",
              }}
            >
              <Users size={48} color="#94A3B8" />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, textAlign: "center" }}>
              {groupName || "Appel de groupe"}
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
            {participants.length > 0 && (
              <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>
                {participants.length} participant
                {participants.length > 1 ? "s" : ""} attendu
                {participants.length > 1 ? "s" : ""}
              </p>
            )}
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
              Rejoindre le groupe
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

      {/* ═══ Bandeau supérieur ═══ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile
            ? `calc(8px + env(safe-area-inset-top, 0px)) calc(12px + env(safe-area-inset-right, 0px)) 8px calc(12px + env(safe-area-inset-left, 0px))`
            : "12px 16px",
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 10,
          gap: 8,
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
              width: isMobile ? 32 : 36,
              height: isMobile ? 32 : 36,
              borderRadius: "50%",
              background: "#1E293B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Users size={isMobile ? 16 : 20} color="#94A3B8" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: isMobile ? 14 : 16,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {groupName || "Appel de groupe"}
            </div>
            <div
              style={{
                fontSize: isMobile ? 11 : 12,
                color: "#94A3B8",
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexWrap: "wrap",
              }}
            >
              {connectedCount} connecté{connectedCount > 1 ? "s" : ""}
              {participants.length + 1 > connectedCount && (
                <span style={{ color: "#F59E0B" }}>
                  · {participants.length + 1 - connectedCount} en attente
                </span>
              )}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: networkQualityColor,
            fontSize: isMobile ? 11 : 13,
            flexShrink: 0,
          }}
        >
          <Wifi size={isMobile ? 14 : 16} />
          {networkQualityLabel && <span>{networkQualityLabel}</span>}
        </div>
      </div>

      {/* ═══ Grille vidéo ═══ */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${gridMin}, 1fr))`,
          gap: gridGap,
          padding: gridPadding,
          overflowY: "auto",
          position: "relative",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {isWaitingForOthers && connectionState === "CONNECTED" && (
          <div
            style={{
              position: "absolute",
              top: isMobile ? 8 : 12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(79,70,229,0.15)",
              border: "1px solid rgba(129,140,248,0.4)",
              color: "#C7D2FE",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: isMobile ? 11 : 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              zIndex: 5,
              pointerEvents: "none",
              maxWidth: "calc(100% - 24px)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <span className="ag-pulse">●</span>
            En attente des autres participants…
          </div>
        )}

        {/* Vidéo locale */}
        <div
          style={{
            background: "#1E293B",
            borderRadius: 16,
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            aspectRatio: isMobile ? "4/3" : "16/9",
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
                fontSize: isMobile ? 40 : 64,
                opacity: 0.8,
              }}
            >
              📷
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: isMobile ? 6 : 12,
              left: isMobile ? 6 : 12,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              borderRadius: 8,
              padding: isMobile ? "2px 8px" : "4px 12px",
              fontSize: isMobile ? 11 : 13,
              fontWeight: 500,
            }}
          >
            Vous {isMuted ? "(muet)" : ""} {isOnHold ? "(en attente)" : ""}
          </div>
        </div>

        {/* Vidéos distantes */}
        {remoteUsers.map((remoteUser) => (
          <RemoteVideo
            key={remoteUser.uid}
            user={remoteUser}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* ═══ Barre de contrôle ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: controlGap,
          padding: isMobile ? "8px 8px" : "12px 16px",
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: isMobile
            ? "calc(8px + env(safe-area-inset-bottom, 0px))"
            : "12px",
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
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

        <button
          type="button"
          onClick={toggleMute}
          onTouchStart={pressBtn("mute")}
          onTouchEnd={releaseBtn}
          onTouchCancel={releaseBtn}
          style={controlButtonStyle(
            isMuted ? "red" : "default",
            controlButtonSize,
            pressedBtn === "mute"
          )}
          aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
        >
          {isMuted ? <MicOff size={iconSize} /> : <Mic size={iconSize} />}
        </button>

        <button
          type="button"
          onClick={toggleVideo}
          onTouchStart={pressBtn("video")}
          onTouchEnd={releaseBtn}
          onTouchCancel={releaseBtn}
          style={controlButtonStyle(
            isVideoOff ? "red" : "default",
            controlButtonSize,
            pressedBtn === "video"
          )}
          aria-label={isVideoOff ? "Activer la caméra" : "Couper la caméra"}
        >
          {isVideoOff ? (
            <VideoOff size={iconSize} />
          ) : (
            <Video size={iconSize} />
          )}
        </button>

        {!isMobile && (
          <button
            type="button"
            onClick={switchCamera}
            onTouchStart={pressBtn("switchCam")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={controlButtonStyle(
              "default",
              controlButtonSize,
              pressedBtn === "switchCam"
            )}
            title="Changer de caméra"
            aria-label="Changer de caméra"
          >
            <SwitchCamera size={iconSize} />
          </button>
        )}

        {!isMobile && (
          <button
            type="button"
            onClick={toggleSpeaker}
            onTouchStart={pressBtn("speaker")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={controlButtonStyle(
              isSpeakerOn ? "default" : "red",
              controlButtonSize,
              pressedBtn === "speaker"
            )}
            title="Haut-parleur"
            aria-label={
              isSpeakerOn
                ? "Couper le haut-parleur"
                : "Activer le haut-parleur"
            }
          >
            {isSpeakerOn ? (
              <Volume2 size={iconSize} />
            ) : (
              <VolumeX size={iconSize} />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={toggleHold}
          onTouchStart={pressBtn("hold")}
          onTouchEnd={releaseBtn}
          onTouchCancel={releaseBtn}
          style={controlButtonStyle(
            isOnHold ? "blue" : "default",
            controlButtonSize,
            pressedBtn === "hold"
          )}
          title="Mettre en attente"
          aria-label={isOnHold ? "Reprendre l'appel" : "Mettre en attente"}
        >
          {isOnHold ? <Play size={iconSize} /> : <Pause size={iconSize} />}
        </button>

        {!isMobile && (
          <button
            type="button"
            onClick={startScreenShare}
            onTouchStart={pressBtn("screen")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={controlButtonStyle(
              isScreenSharing ? "blue" : "default",
              controlButtonSize,
              pressedBtn === "screen"
            )}
            aria-label={
              isScreenSharing ? "Arrêter le partage" : "Partager l'écran"
            }
          >
            {isScreenSharing ? (
              <MonitorOff size={iconSize} />
            ) : (
              <Monitor size={iconSize} />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={handleEndCall}
          onTouchStart={pressBtn("end")}
          onTouchEnd={releaseBtn}
          onTouchCancel={releaseBtn}
          style={{
            ...controlButtonStyle(
              "red",
              controlButtonSize,
              pressedBtn === "end"
            ),
            background: pressedBtn === "end" ? "#DC2626" : "#EF4444",
            borderColor: "#EF4444",
            width: isMobile ? 48 : 56,
            height: isMobile ? 48 : 56,
          }}
          aria-label="Quitter l'appel"
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
function RemoteVideo({ user, isMobile }) {
  const videoRef = useRef(null);
  const [videoTrack, setVideoTrack] = useState(user.videoTrack);

  useEffect(() => {
    setVideoTrack(user.videoTrack);
    if (videoRef.current && user.videoTrack) {
      user.videoTrack.play(videoRef.current);
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [user.videoTrack]);

  useEffect(() => {
    if (videoRef.current && videoTrack) {
      videoTrack.play(videoRef.current);
    }
    return () => {
      if (videoTrack) {
        videoTrack.stop();
      }
    };
  }, [videoTrack]);

  return (
    <div
      style={{
        background: "#1E293B",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        aspectRatio: isMobile ? "4/3" : "16/9",
      }}
    >
      <div
        ref={videoRef}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: isMobile ? 6 : 12,
          left: isMobile ? 6 : 12,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          borderRadius: 8,
          padding: isMobile ? "2px 8px" : "4px 12px",
          fontSize: isMobile ? 11 : 13,
          fontWeight: 500,
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
function controlButtonStyle(variant, size = 52, pressed = false) {
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
    transform: pressed ? "scale(0.92)" : "scale(1)",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    outline: "none",
  };

  if (variant === "red") {
    return {
      ...base,
      background: pressed
        ? "rgba(239,68,68,0.35)"
        : "rgba(239,68,68,0.2)",
      borderColor: "#EF4444",
    };
  } else if (variant === "blue") {
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