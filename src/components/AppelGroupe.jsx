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
  const [connectionState, setConnectionState] = useState("CONNECTING");
  const [networkQuality, setNetworkQuality] = useState("unknown");
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);

  // ✅ FIX CRITIQUE : leaveGroupCall au lieu de endCall
  // endCall → termine pour TOUS les participants (bug)
  // leaveGroupCall → retire uniquement l'utilisateur courant
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

  // ✅ FIX CRITIQUE : utilise leaveGroupCall (n'éjecte que ce user)
  const handleEndCall = useCallback(async () => {
    if (destroyedRef.current) return;
    destroyedRef.current = true;
    try {
      await leaveGroupMutation({ callId, userId });
    } catch (err) {
      const msg = err?.message ?? "";
      // On ignore silencieusement les cas "déjà parti"
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

  // ✅ Retourne { token, uid }
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
          await agoraClient.publish([tracks[0]]);
        } else {
          await agoraClient.publish([tracks[0], tracks[1]]);
        }

        if (callType === "video" && localVideoRef.current && tracks[1]) {
          tracks[1].play(localVideoRef.current);
        }

        setIsFrontCamera(true);
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

      // Rattrapage : users déjà présents à l'arrivée
      const retrySubscribe = (attempt = 0) => {
        if (destroyedRef.current || !agoraClient) return;
        const existing = agoraClient.remoteUsers ?? [];
        existing.forEach((user) => {
          agoraClient.subscribe(user, "video").catch(() => {});
          agoraClient.subscribe(user, "audio").catch(() => {});
          setRemoteUsers((prev) => {
            if (!prev.find((u) => u.uid === user.uid)) return [...prev, user];
            return prev;
          });
        });
        if (attempt < 2) {
          setTimeout(() => retrySubscribe(attempt + 1), 800);
        }
      };
      setTimeout(() => retrySubscribe(0), 800);

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

  // Compteur réel (utilisateurs connectés)
  const connectedCount = remoteUsers.length + 1;
  const isWaitingForOthers = remoteUsers.length === 0;

  // Styles mobile
  const controlButtonSize = isMobile ? 42 : 52;
  const controlGap = isMobile ? 8 : 20;
  const topPadding = isMobile ? "8px 12px" : "12px 16px";
  const gridGap = isMobile ? 8 : 12;
  const gridPadding = isMobile ? 8 : 16;
  const gridMin = isMobile ? "140px" : "200px";
  const bottomPadding = isMobile ? "8px 8px" : "12px 16px";
  const iconSize = isMobile ? 18 : 22;

  // ✅ Miroir caméra frontale pour la vidéo locale
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

      {/* Overlay de connexion */}
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
          <Loader2 size={48} className="ag-spin" style={{ color: "#818CF8" }} />
          <p style={{ marginTop: 16, fontSize: 16, fontWeight: 500 }}>
            Connexion au groupe…
          </p>
        </div>
      )}

      {/* Overlay d'erreur */}
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
          <h2 style={{ marginTop: 16, fontSize: 24, fontWeight: 600 }}>
            Échec de la connexion
          </h2>
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
          padding: topPadding,
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
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

      {/* Grille vidéo */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${gridMin}, 1fr))`,
          gap: gridGap,
          padding: gridPadding,
          overflowY: "auto",
          position: "relative",
        }}
      >
        {isWaitingForOthers && connectionState === "CONNECTED" && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(79,70,229,0.15)",
              border: "1px solid rgba(129,140,248,0.4)",
              color: "#C7D2FE",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              zIndex: 5,
              pointerEvents: "none",
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
          <RemoteVideo key={remoteUser.uid} user={remoteUser} isMobile={isMobile} />
        ))}
      </div>

      {/* Barre de contrôle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: controlGap,
          padding: bottomPadding,
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: isMobile
            ? "calc(8px + env(safe-area-inset-bottom, 0px))"
            : "12px",
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
          style={controlButtonStyle(isMuted ? "red" : "default", controlButtonSize)}
          aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
        >
          {isMuted ? <MicOff size={iconSize} /> : <Mic size={iconSize} />}
        </button>
        <button
          onClick={toggleVideo}
          style={controlButtonStyle(isVideoOff ? "red" : "default", controlButtonSize)}
          aria-label={isVideoOff ? "Activer la caméra" : "Couper la caméra"}
        >
          {isVideoOff ? <VideoOff size={iconSize} /> : <Video size={iconSize} />}
        </button>
        {!isMobile && (
          <button
            onClick={switchCamera}
            style={controlButtonStyle("default", controlButtonSize)}
            title="Changer de caméra"
            aria-label="Changer de caméra"
          >
            <SwitchCamera size={iconSize} />
          </button>
        )}
        {!isMobile && (
          <button
            onClick={toggleSpeaker}
            style={controlButtonStyle(isSpeakerOn ? "default" : "red", controlButtonSize)}
            title="Haut-parleur"
            aria-label={isSpeakerOn ? "Couper le haut-parleur" : "Activer le haut-parleur"}
          >
            {isSpeakerOn ? <Volume2 size={iconSize} /> : <VolumeX size={iconSize} />}
          </button>
        )}
        <button
          onClick={toggleHold}
          style={controlButtonStyle(isOnHold ? "blue" : "default", controlButtonSize)}
          title="Mettre en attente"
          aria-label={isOnHold ? "Reprendre l'appel" : "Mettre en attente"}
        >
          {isOnHold ? <Play size={iconSize} /> : <Pause size={iconSize} />}
        </button>
        {!isMobile && (
          <button
            onClick={startScreenShare}
            style={controlButtonStyle(isScreenSharing ? "blue" : "default", controlButtonSize)}
            aria-label={isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
          >
            {isScreenSharing ? <MonitorOff size={iconSize} /> : <Monitor size={iconSize} />}
          </button>
        )}
        <button
          onClick={handleEndCall}
          style={{
            ...controlButtonStyle("red", controlButtonSize),
            background: "#EF4444",
            borderColor: "#EF4444",
            width: isMobile ? 46 : 56,
            height: isMobile ? 46 : 56,
          }}
          aria-label="Quitter l'appel"
        >
          <PhoneOff size={isMobile ? 22 : 26} />
        </button>
      </div>
    </div>
  );
}

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

function controlButtonStyle(variant, size = 52) {
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
  } else if (variant === "blue") {
    return {
      ...base,
      background: "rgba(59,130,246,0.2)",
      borderColor: "#3B82F6",
    };
  }
  return base;
}