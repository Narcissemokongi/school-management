// src/components/ui/Modal.jsx
import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { IconButton } from "./Button";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL (classes CSS au lieu de [style*="..."])
// ════════════════════════════════════════════════════════════════════
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
    .ui-modal-overlay {
      animation: ui-modal-fade 0.2s ease-out;
    }
    .ui-modal-panel-mobile {
      animation: ui-modal-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .ui-modal-panel-desktop {
      animation: ui-modal-zoom 0.2s ease-out;
    }
    @media (prefers-reduced-motion: reduce) {
      .ui-modal-overlay,
      .ui-modal-panel-mobile,
      .ui-modal-panel-desktop {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// ════════════════════════════════════════════════════════════════════
// HOOK — Focus trap (Tab / Shift+Tab restent dans le panel)
// ════════════════════════════════════════════════════════════════════
function useFocusTrap(panelRef, isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      const focusables = panel.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [panelRef, isOpen]);
}

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
  const titleId = useId();

  // ✅ Focus trap
  useFocusTrap(panelRef, open);

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

    // ✅ Body scroll lock robuste (iOS Safari)
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const focusTimer = setTimeout(() => {
      panelRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
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
      aria-labelledby={title ? titleId : undefined}
      className="ui-modal-overlay"
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
        overscrollBehavior: "contain",
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={
          isMobile ? "ui-modal-panel-mobile" : "ui-modal-panel-desktop"
        }
        style={{
          background: t.surface.default,
          borderRadius: isMobile ? "20px 20px 0 0" : t.radius.lg,
          padding: isMobile ? "20px 16px" : 24,
          width: "100%",
          maxWidth: isMobile ? "100%" : maxWidth,
          maxHeight: isMobile ? "92vh" : "90vh",
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          boxShadow: t.shadow.lg,
          border: isMobile ? "none" : `1px solid ${t.border.default}`,
          outline: "none",
          paddingBottom: isMobile
            ? "calc(20px + env(safe-area-inset-bottom, 0px))"
            : 24,
        }}
      >
        {isMobile && (
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: t.border.default,
              margin: "0 auto 16px",
            }}
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
                id={titleId}
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
              icon={<X size={20} aria-hidden="true" />}
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

      {ModalKeyframes}
    </div>
  );
}