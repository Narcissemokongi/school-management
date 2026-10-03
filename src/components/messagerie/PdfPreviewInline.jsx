// src/components/messagerie/PdfPreviewInline.jsx
import { useState, useCallback } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FileText, AlertCircle, ExternalLink, Eye } from "lucide-react";

export function PdfPreviewInline({ attachment, isMine, tokens, isMobile }) {
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const maxWidth = isMobile ? 240 : 280;
  const pageHeight = isMobile ? 180 : 200;
  const pageWidth = maxWidth - 16;

  const bg = isMine ? "rgba(255,255,255,0.15)" : tokens.senderBg;
  const bgActive = isMine
    ? "rgba(255,255,255,0.28)"
    : tokens.attachmentOtherActiveBg || "#C7D2FE";
  const fg = isMine ? "#FFFFFF" : tokens.attachmentOtherColor;

  const handleLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n);
    setLoading(false);
  }, []);

  const handleLoadError = useCallback((err) => {
    console.warn("PDF load error:", err);
    setError(true);
    setLoading(false);
  }, []);

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        display: "block",
        marginTop: 6,
        marginRight: 6,
        padding: 8,
        borderRadius: 12,
        background: pressed ? bgActive : bg,
        color: fg,
        textDecoration: "none",
        maxWidth,
        minWidth: 0,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "background 0.12s ease, transform 0.1s ease",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        boxShadow:
          !isMobile && hovered ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
        position: "relative",
        overflow: "hidden",
      }}
      title={`Ouvrir ${attachment.nom}`}
      aria-label={`Aperçu du PDF ${attachment.nom}`}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "#DC2626",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(220,38,38,0.3)",
          }}
          aria-hidden="true"
        >
          <FileText size={16} />
        </div>
        <div
          style={{
            fontSize: isMobile ? 12.5 : 12,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            flex: 1,
            lineHeight: 1.3,
          }}
        >
          {attachment.nom || "Document PDF"}
        </div>
        <ExternalLink
          size={14}
          style={{ flexShrink: 0, opacity: 0.6 }}
          aria-hidden="true"
        />
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: pageHeight,
          borderRadius: 8,
          overflow: "hidden",
          background: isMine
            ? "rgba(255,255,255,0.08)"
            : "rgba(100,116,139,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {loading && !error && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              color: fg,
              opacity: 0.5,
              position: "absolute",
              zIndex: 2,
            }}
            aria-hidden="true"
          >
            <FileText size={24} />
            <span style={{ fontSize: 10 }}>Chargement…</span>
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              color: fg,
              opacity: 0.6,
              padding: 8,
              textAlign: "center",
            }}
          >
            <AlertCircle size={20} />
            <span style={{ fontSize: 10 }}>Aperçu indisponible</span>
          </div>
        )}

        {!error && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            <Document
              file={attachment.url}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
              loading={null}
              error={null}
            >
              <Page
                pageNumber={1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                devicePixelRatio={
                  typeof window !== "undefined"
                    ? Math.min(window.devicePixelRatio || 1, 2)
                    : 1
                }
                loading={null}
              />
            </Document>
          </div>
        )}

        {!isMobile && hovered && !loading && !error && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              transition: "opacity 0.15s ease",
              zIndex: 3,
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

        {isMobile && !loading && !error && numPages > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              padding: "2px 8px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 600,
              pointerEvents: "none",
              zIndex: 3,
            }}
            aria-hidden="true"
          >
            {numPages} page{numPages > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 10.5,
          opacity: 0.7,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span>PDF</span>
        <span>·</span>
        <span>Ouvrir dans un nouvel onglet</span>
      </div>
    </a>
  );
}

export default PdfPreviewInline;