import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Clock, Loader2, Wifi, WifiOff
} from "lucide-react";
import toast from "react-hot-toast";

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const MAX_CALL_DURATION_MINUTES = 60;

export function AppelVideo({ channelName, userId, callId, onCallEnd }) {
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState("CONNECTING"); // CONNECTING, CONNECTED, DISCONNECTED, ERROR

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
      try { clientRef.current.leave(); } catch (e) {}
      clientRef.current = null;
    }
    localTracksRef.current.forEach((t) => t.close());
    localTracksRef.current = [];
    screenTrackRef.current?.close();
    screenTrackRef.current = null;
    clearInterval(timerRef.current);
  }, []);

  const handleEndCall = useCallback(async () => {
    if (destroyedRef.current) return;
    destroyedRef.current = true;
    try {
      await endCallMutation({ callId, userId });
    } catch (err) {
      if (!err.message.includes("Appel introuvable")) {
        console.error("Erreur endCall:", err);
      }
    }
    cleanupLocal();
    if (onCallEndRef.current) onCallEndRef.current();
  }, [endCallMutation, callId, userId, cleanupLocal]);

  useEffect(() => {
    console.log("📞 AppelVideo – APP_ID:", APP_ID, "channel:", channelName);
    if (!APP_ID || !channelName) {
      toast.error("Configuration Agora manquante");
      handleEndCall();
      return;
    }

    destroyedRef.current = false;
    let agoraClient;

    const init = async () => {
      // 1. Token
      let token;
      try {
        setConnectionState("CONNECTING");
        token = await generateToken({ channelName, userId });
      } catch (err) {
        setConnectionState("ERROR");
        toast.error("Impossible de générer le token : " + err.message);
        handleEndCall();
        return;
      }
      if (destroyedRef.current) return;

      // 2. Créer le client
      agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = agoraClient;

      // Surveiller l'état de la connexion
      agoraClient.on("connection-state-change", (curState, prevState, reason) => {
        console.log("Connection state:", prevState, "->", curState);
        if (curState === "CONNECTED") setConnectionState("CONNECTED");
        else if (curState === "DISCONNECTED" || curState === "DISCONNECTING") setConnectionState("DISCONNECTED");
      });

      // 3. Join
      try {
        await agoraClient.join(APP_ID, channelName, token, null);
        if (destroyedRef.current) {
          try { agoraClient.leave(); } catch (e) {}
          return;
        }
      } catch (err) {
        setConnectionState("ERROR");
        toast.error("Erreur de connexion à l'appel : " + err.message);
        handleEndCall();
        return;
      }

      // 4. Créer et publier les pistes locales
      try {
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (destroyedRef.current) {
          tracks.forEach((t) => t.close());
          return;
        }
        localTracksRef.current = tracks;
        await agoraClient.publish([tracks[0], tracks[1]]);

        if (localVideoRef.current) {
          tracks[1].play(localVideoRef.current);
        }
      } catch (err) {
        toast.error("Erreur micro/caméra : " + err.message);
        handleEndCall();
        return;
      }

      // 5. Événements participants
      agoraClient.on("user-published", async (user, mediaType) => {
        if (destroyedRef.current) return;
        try {
          await agoraClient.subscribe(user, mediaType);
          setRemoteUsers((prev) => {
            if (prev.find((u) => u.uid === user.uid)) return prev;
            return [...prev, user];
          });
        } catch (err) {
          console.warn("subscribe error", err);
        }
      });

      agoraClient.on("user-unpublished", (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      // S'abonner aux utilisateurs existants après un court délai
      setTimeout(() => {
        if (destroyedRef.current || !agoraClient) return;
        agoraClient.remoteUsers.forEach((user) => {
          agoraClient.subscribe(user, "video").catch(() => {});
          agoraClient.subscribe(user, "audio").catch(() => {});
          setRemoteUsers((prev) => {
            if (prev.find((u) => u.uid === user.uid)) return prev;
            return [...prev, user];
          });
        });
      }, 800);

      // 6. Timer
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    init();

    return () => {
      destroyedRef.current = true;
      cleanupLocal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, userId]);

  // Raccrochage automatique
  useEffect(() => {
    if (callDuration >= MAX_CALL_DURATION_MINUTES * 60) {
      toast("Appel terminé (limite de 60 min)", { icon: "⏰" });
      handleEndCall();
    }
  }, [callDuration, handleEndCall]);

  // Contrôles
  const toggleMute = () => {
    if (localTracksRef.current.length > 0) {
      const newMuted = !isMuted;
      localTracksRef.current[0].setEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  };

  const toggleVideo = () => {
    if (localTracksRef.current.length > 0) {
      const newVideoOff = !isVideoOff;
      localTracksRef.current[1].setEnabled(!newVideoOff);
      setIsVideoOff(newVideoOff);
    }
  };

  const startScreenShare = async () => {
    if (!clientRef.current || destroyedRef.current) return;
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        await clientRef.current.unpublish(screenTrackRef.current);
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      if (localTracksRef.current[1] && localVideoRef.current) {
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
        toast.error("Impossible de partager l'écran");
      }
    }
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, "0");
    const secs = (sec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // État de connexion visuel
  if (connectionState === "ERROR") {
    return (
      <div style={{ position: "relative", width: "100%", height: "100vh", background: "#0F172A", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <WifiOff size={48} color="#EF4444" />
        <h2 style={{ fontSize: 24, fontWeight: 600 }}>Échec de la connexion</h2>
        <button onClick={handleEndCall} style={{ padding: "12px 24px", background: "#EF4444", border: "none", borderRadius: 12, color: "white", fontWeight: 600, cursor: "pointer" }}>
          Quitter
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "#0F172A", color: "white", fontFamily: "'Inter', sans-serif" }}>
      {/* Indicateur de chargement initial */}
      {connectionState === "CONNECTING" && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, zIndex: 10 }}>
          <Loader2 size={48} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 16, fontWeight: 500 }}>Connexion en cours…</p>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", height: "calc(100% - 90px)", padding: 16, gap: 12 }}>
        {/* Vidéo locale */}
        <div style={{ position: "relative", flex: "1 1 45%", minWidth: 280, background: "#1E293B", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          <div ref={localVideoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {isVideoOff && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 64, opacity: 0.8 }}>
              📷
            </div>
          )}
          <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 500 }}>
            Vous {isMuted ? "(muet)" : ""}
          </div>
        </div>

        {/* Vidéos distantes */}
        {remoteUsers.map((remoteUser) => (
          <RemoteVideo key={remoteUser.uid} user={remoteUser} />
        ))}
      </div>

      {/* Barre de contrôle */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 90, background: "rgba(15,23,42,0.95)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 20,
        borderTop: "1px solid rgba(255,255,255,0.08)"
      }}>
        <div style={{ position: "absolute", left: 24, display: "flex", alignItems: "center", gap: 8, color: "#94A3B8", fontSize: 15 }}>
          {connectionState === "CONNECTED" ? <Wifi size={16} color="#10B981" /> : <WifiOff size={16} color="#EF4444" />}
          <Clock size={18} />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(callDuration)}</span>
        </div>

        <button onClick={toggleMute} style={controlButtonStyle(isMuted ? "red" : "default")}>
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button onClick={toggleVideo} style={controlButtonStyle(isVideoOff ? "red" : "default")}>
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
        <button onClick={startScreenShare} style={controlButtonStyle(isScreenSharing ? "blue" : "default")}>
          {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
        </button>
        <button onClick={handleEndCall} style={{ ...controlButtonStyle("red"), background: "#EF4444", borderColor: "#EF4444", width: 56, height: 56 }}>
          <PhoneOff size={26} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RemoteVideo({ user }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && user.videoTrack) {
      user.videoTrack.play(ref.current);
    }
    return () => {
      user.videoTrack?.stop();
    };
  }, [user]);

  return (
    <div style={{ position: "relative", flex: "1 1 45%", minWidth: 280, background: "#1E293B", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
      <div ref={ref} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 500 }}>
        Participant {user.uid}
      </div>
    </div>
  );
}

function controlButtonStyle(variant) {
  const base = {
    width: 52,
    height: 52,
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
  };
  if (variant === "red") {
    return { ...base, background: "rgba(239,68,68,0.2)", borderColor: "#EF4444" };
  } else if (variant === "blue") {
    return { ...base, background: "rgba(59,130,246,0.2)", borderColor: "#3B82F6" };
  }
  return base;
}

export default AppelVideo;