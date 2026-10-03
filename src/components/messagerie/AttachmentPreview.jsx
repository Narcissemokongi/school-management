// src/components/messagerie/AttachmentPreview.jsx
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
// ✨ react-pdf retiré — lazy-loaded dans PdfPreviewInline.jsx (gain ~300 KB)
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  AlertCircle,
  X,
  ExternalLink,
  Download,
  Eye,
} from "lucide-react";

// ✨ PdfPreviewInline lazy-loaded (react-pdf + pdfjs-dist chargés à la demande)
const PdfPreviewInline = lazy(() =>
  import("./PdfPreviewInline").then((m) => ({ default: m.PdfPreviewInline }))
);

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES
// ════════════════════════════════════════════════════════════════════
const AttachmentKeyframes = (
  <style>{`
    @keyframes att-fade-in {
      from { opacity: 0; transform: scale(0.98); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes att-lightbox-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes att-lightbox-img-in {
      from { opacity: 0; transform: scale(0.94); }
      to   { opacity: 1; transform: scale(1); }
    }
    .att-fade-in { animation: att-fade-in 0.15s ease-out; }
    .att-lightbox-in { animation: att-lightbox-in 0.2s ease-out; }
    .att-lightbox-img-in { animation: att-lightbox-img-in 0.25s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .att-fade-in, .att-lightbox-in, .att-lightbox-img-in {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function isBrokenAttachmentUrl(url) {
  if (!url) return true;
  if (typeof url !== "string") return true;
  if (url.trim() === "") return true;
  if (url.includes("/api/storage/upload")) return true;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return true;
  return false;
}

function getFileMeta(type, nom) {
  const t = (type || "").toLowerCase();
  const n = (nom || "").toLowerCase();

  if (t.includes("pdf") || n.endsWith(".pdf")) {
    return { icon: FileText, label: "PDF", color: "#DC2626" };
  }
  if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(n)) {
    return { icon: ImageIcon, label: "Image", color: "#0EA5E9" };
  }
  if (
    t.includes("sheet") ||
    t.includes("excel") ||
    /\.(xlsx?|csv)$/.test(n)
  ) {
    return { icon: FileSpreadsheet, label: "Tableur", color: "#10B981" };
  }
  if (
    t.includes("word") ||
    t.includes("document") ||
    /\.(docx?|odt|rtf)$/.test(n)
  ) {
    return { icon: FileText, label: "Document", color: "#3B82F6" };
  }
  return { icon: File, label: "Fichier", color: "#6B7280" };
}

function isImageType(type, nom) {
  const t = (type || "").toLowerCase().trim();
  const n = (nom || "").toLowerCase().trim();

  if (t.startsWith("image/")) return true;
  if (/\.(png|jpe?g|gif|webp|svg|bmp|heic|heif|avif|tiff?)$/i.test(n))
    return true;
  if (
    (t === "application/octet-stream" || t === "") &&
    /\.(png|jpe?g|gif|webp|svg|bmp|heic|heif|avif|tiff?)$/i.test(n)
  )
    return true;

  return false;
}

function isPdfType(type, nom) {
  const t = (type || "").toLowerCase().trim();
  const n = (nom || "").toLowerCase().trim();

  if (t.includes("pdf")) return true;
  if (n.endsWith(".pdf")) return true;

  return false;
}

// ════════════════════════════════════════════════════════════════════
// LIGHTBOX IMAGE — plein écran
// ════════════════════════════════════════════════════════════════════
function ImageLightbox({ url, nom, onClose }) {
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 150);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [handleClose]);

  const [touchStartY, setTouchStartY] = useState(null);
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };
  const handleTouchEnd = (e) => {
    if (touchStartY === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (deltaY > 100) handleClose();
    setTouchStartY(null);
  };

  const content = (
    <div
      className={closing ? "" : "att-lightbox-in"}
      onClick={handleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${nom}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.94)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: closing ? 0 : 1,
        transition: "opacity 0.15s ease",
        padding:
          "calc(60px + env(safe-area-inset-top, 0px)) 16px calc(60px + env(safe-area-inset-bottom, 0px))",
        boxSizing: "border-box",
      }}
    >
      <img
        src={url}
        alt={nom}
        onClick={(e) => e.stopPropagation()}
        className={closing ? "" : "att-lightbox-img-in"}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 8,
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "auto",
        }}
        draggable={false}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        aria-label="Fermer"
        style={{
          position: "fixed",
          top: "calc(12px + env(safe-area-inset-top, 0px))",
          right: "calc(12px + env(safe-area-inset-right, 0px))",
          width: 44,
          height: 44,
          borderRadius: 22,
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "none",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          zIndex: 10000,
        }}
      >
        <X size={22} />
      </button>

      <a
        href={url}
        download={nom}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Télécharger"
        style={{
          position: "fixed",
          top: "calc(12px + env(safe-area-inset-top, 0px))",
          right: "calc(68px + env(safe-area-inset-right, 0px))",
          width: 44,
          height: 44,
          borderRadius: 22,
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "none",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          zIndex: 10000,
        }}
      >
        <Download size={20} />
      </a>

      <div
        style={{
          position: "fixed",
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "calc(100vw - 32px)",
          padding: "8px 16px",
          borderRadius: 20,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          pointerEvents: "none",
        }}
      >
        {nom}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ════════════════════════════════════════════════════════════════════
// CARTE PJ CASSÉE
// ════════════════════════════════════════════════════════════════════
function BrokenCard({ nom, tokens, isMobile }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: isMobile ? "9px 12px" : "7px 12px",
        borderRadius: 10,
        background: tokens.brokenBg,
        color: tokens.brokenColor,
        fontSize: isMobile ? 13 : 12.5,
        fontWeight: 500,
        maxWidth: "100%",
        cursor: "not-allowed",
        marginTop: 6,
        marginRight: 6,
      }}
      title="Fichier indisponible (envoyé avant la correction)"
    >
      <AlertCircle size={isMobile ? 15 : 14} style={{ flexShrink: 0 }} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: "line-through",
          minWidth: 0,
        }}
      >
        {nom || "Fichier"}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// APERÇU IMAGE — miniature cliquable
// ════════════════════════════════════════════════════════════════════
function ImagePreview({ attachment, isMine, tokens, isMobile, onOpen }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const maxWidth = isMobile ? 200 : 240;
  const maxHeight = isMobile ? 200 : 260;

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      aria-label={`Aperçu de l'image ${attachment.nom}`}
      style={{
        position: "relative",
        display: "block",
        marginTop: 6,
        marginRight: 6,
        padding: 0,
        border: "none",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        background: isMine ? "rgba(255,255,255,0.1)" : tokens.senderBg,
        maxWidth,
        maxHeight,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "transform 0.12s ease, box-shadow 0.15s ease",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        boxShadow:
          !isMobile && hovered ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
      }}
    >
      {!loaded && !error && (
        <div
          style={{
            width: maxWidth,
            height: 140,
            background: isMine
              ? "rgba(255,255,255,0.08)"
              : "rgba(100,116,139,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ImageIcon size={24} style={{ opacity: 0.4 }} />
        </div>
      )}

      {error && (
        <div
          style={{
            width: maxWidth,
            height: 140,
            background: tokens.brokenBg,
            color: tokens.brokenColor,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: 8,
            textAlign: "center",
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: 10 }}>Image indisponible</span>
        </div>
      )}

      {!error && (
        <img
          src={attachment.url}
          alt={attachment.nom || "Image"}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          style={{
            display: loaded ? "block" : "none",
            maxWidth,
            maxHeight,
            width: "auto",
            height: "auto",
            objectFit: "cover",
            pointerEvents: "none",
            userSelect: "none",
          }}
          draggable={false}
        />
      )}

      {!isMobile && hovered && loaded && !error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            transition: "opacity 0.15s ease",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: "rgba(255,255,255,0.9)",
              color: "#1E293B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Eye size={20} />
          </div>
        </div>
      )}

      {isMobile && loaded && !error && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            width: 26,
            height: 26,
            borderRadius: 13,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <Eye size={14} />
        </div>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE GÉNÉRIQUE (autres types)
// ════════════════════════════════════════════════════════════════════
function FileCard({ attachment, isMine, tokens, isMobile }) {
  const [pressed, setPressed] = useState(false);

  const { icon: Icon, label, color } = useMemo(
    () => getFileMeta(attachment.type, attachment.nom),
    [attachment.type, attachment.nom]
  );

  const bg = isMine ? "rgba(255,255,255,0.15)" : tokens.senderBg;
  const bgActive = isMine
    ? "rgba(255,255,255,0.28)"
    : tokens.attachmentOtherActiveBg || "#C7D2FE";
  const fg = isMine ? "#FFFFFF" : tokens.attachmentOtherColor;

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 6,
        marginRight: 6,
        padding: isMobile ? "10px 12px" : "8px 12px",
        borderRadius: 10,
        background: pressed ? bgActive : bg,
        color: fg,
        textDecoration: "none",
        maxWidth: isMobile ? 260 : 280,
        minWidth: 0,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "background 0.12s ease, transform 0.1s ease",
        transform: pressed ? "scale(0.98)" : "scale(1)",
      }}
      title={`Ouvrir ${attachment.nom}`}
      aria-label={`Ouvrir ${label} ${attachment.nom}`}
    >
      <div
        style={{
          width: isMobile ? 36 : 34,
          height: isMobile ? 36 : 34,
          borderRadius: 8,
          background: color,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 2px 6px ${color}40`,
        }}
        aria-hidden="true"
      >
        <Icon size={isMobile ? 20 : 18} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: isMobile ? 13 : 12.5,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {attachment.nom || "Fichier"}
        </div>
        <div
          style={{
            fontSize: 10.5,
            opacity: 0.7,
            marginTop: 1,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>{label}</span>
          <span>·</span>
          <span>Ouvrir</span>
        </div>
      </div>

      <ExternalLink
        size={14}
        style={{ flexShrink: 0, opacity: 0.7 }}
        aria-hidden="true"
      />
    </a>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL — Dispatch selon le type
// ════════════════════════════════════════════════════════════════════
export function AttachmentPreview({
  attachment,
  isMine,
  tokens,
  isMobile,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const broken = isBrokenAttachmentUrl(attachment?.url);

  // ─── 1. PJ cassée ───
  if (broken) {
    return (
      <>
        {AttachmentKeyframes}
        <BrokenCard
          nom={attachment?.nom}
          tokens={tokens}
          isMobile={isMobile}
        />
      </>
    );
  }

  // ─── 2. Image → miniature + lightbox ───
  if (isImageType(attachment.type, attachment.nom)) {
    return (
      <>
        {AttachmentKeyframes}
        <ImagePreview
          attachment={attachment}
          isMine={isMine}
          tokens={tokens}
          isMobile={isMobile}
          onOpen={() => setLightboxOpen(true)}
        />
        {lightboxOpen && (
          <ImageLightbox
            url={attachment.url}
            nom={attachment.nom || "Image"}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  // ─── 3. PDF → lazy-loaded avec Suspense ───
  if (isPdfType(attachment.type, attachment.nom)) {
    return (
      <>
        {AttachmentKeyframes}
        <Suspense
          fallback={
            <div
              style={{
                marginTop: 6,
                marginRight: 6,
                padding: 8,
                borderRadius: 12,
                background: isMine
                  ? "rgba(255,255,255,0.15)"
                  : tokens.senderBg,
                color: isMine ? "#FFFFFF" : tokens.attachmentOtherColor,
                maxWidth: isMobile ? 240 : 280,
                minHeight: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                opacity: 0.6,
              }}
            >
              Chargement de l'aperçu PDF…
            </div>
          }
        >
          <PdfPreviewInline
            attachment={attachment}
            isMine={isMine}
            tokens={tokens}
            isMobile={isMobile}
          />
        </Suspense>
      </>
    );
  }

  // ─── 4. Autres → carte générique ───
  return (
    <>
      {AttachmentKeyframes}
      <FileCard
        attachment={attachment}
        isMine={isMine}
        tokens={tokens}
        isMobile={isMobile}
      />
    </>
  );
}