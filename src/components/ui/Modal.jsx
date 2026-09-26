// src/components/ui/Modal.jsx
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { IconButton } from "./Button";

// ✅ KEYFRAMES au module-level
const ModalKeyframes = (
  <style>{`
    @keyframes ui-modal-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ui-modal-slide-up {
      from { transform: translateY(30px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes ui-modal-zoom {
      from { transform: scale(0.96); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      [style*="ui-modal-fade"],
      [style*="ui-modal-slide-up"],
      [style*="ui-modal-zoom"] {
        animation: none !important;
      }
    }
  `}</style>
);

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 480,
  closeOnOverlay = true,
  closeOnEscape = true,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;

    const handleKey = (e) => {
      if (closeOnEscape && e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener("keydown", handleKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      panelRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
      if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
    };
  }, [open, onClose, closeOnEscape]);

  const handleOverlayClick = (e) => {
    if (!closeOnOverlay) return;
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!open) return null;

  return (
    <div
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        background: t.surface.overlay,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: isMobile ? 0 : 16,
        animation: "ui-modal-fade 0.2s ease-out",
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          background: t.surface.default,
          borderRadius: isMobile ? "20px 20px 0 0" : t.radius.lg,
          padding: isMobile ? "20px 16px" : 24,
          width: "100%",
          maxWidth: isMobile ? "100%" : maxWidth,
          maxHeight: isMobile ? "92vh" : "90vh",
          overflowY: "auto",
          boxShadow: t.shadow.lg,
          border: isMobile ? "none" : `1px solid ${t.border.default}`,
          outline: "none",
          paddingBottom: isMobile
            ? "calc(20px + env(safe-area-inset-bottom, 0px))"
            : 24,
          animation: isMobile
            ? "ui-modal-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)"
            : "ui-modal-zoom 0.2s ease-out",
        }}
      >
        {isMobile && (
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: t.border.default,
              margin: "0 auto 16px",
            }}
            aria-hidden="true"
          />
        )}

        {(title || onClose) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {title && (
              <h3
                id="modal-title"
                style={{
                  margin: 0,
                  fontSize: isMobile ? 17 : 18,
                  fontWeight: 700,
                  color: t.text.primary,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h3>
            )}
            <IconButton
              icon={<X size={20} />}
              label="Fermer"
              onClick={onClose}
              variant="ghost"
              size="sm"
            />
          </div>
        )}

        <div style={{ color: t.text.primary }}>{children}</div>

        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 24,
              paddingTop: 16,
              borderTop: `1px solid ${t.border.default}`,
              flexDirection: isMobile ? "column-reverse" : "row",
            }}
          >
            {footer}
          </div>
        )}
      </div>

      {/* ✅ Keyframes au module-level */}
      {ModalKeyframes}
    </div>
  );
}