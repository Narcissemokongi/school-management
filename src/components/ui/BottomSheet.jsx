// src/components/ui/BottomSheet.jsx
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";

/**
 * Bottom Sheet mobile — panneau glissant depuis le bas.
 *
 * Props :
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {string}   [title]              - Titre affiché en haut
 * @param {ReactNode} children
 * @param {string}   [maxHeight="85vh"]   - Hauteur max
 * @param {boolean}  [showHandle=true]    - Poignée de drag
 * @param {boolean}  [closeOnBackdrop=true]
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = "85vh",
  showHandle = true,
  closeOnBackdrop = true,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const sheetRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  // ─── ESC pour fermer ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ─── Lock scroll body ────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ─── Reset drag à l'ouverture ────────────────────
  useEffect(() => {
    if (open) {
      setDragY(0);
      setDragging(false);
    }
  }, [open]);

  // ─── Handlers drag ───────────────────────────────
  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    currentYRef.current = e.touches[0].clientY;
    const delta = currentYRef.current - startYRef.current;
    // Seulement vers le bas
    if (delta > 0) {
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    setDragging(false);
    // Si on a draggé de plus de 100px → fermer
    if (dragY > 100) {
      onClose?.();
    }
    setDragY(0);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeOnBackdrop ? onClose : undefined}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 3000,
          animation: "bs-fade-in 0.2s ease-out",
        }}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Panneau"}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight,
          background: t.surface.elevated,
          borderTopLeftRadius: isMobile ? 20 : 16,
          borderTopRightRadius: isMobile ? 20 : 16,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
          zIndex: 3001,
          display: "flex",
          flexDirection: "column",
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.25s ease-out",
          animation: dragging ? "none" : "bs-slide-up 0.3s ease-out",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Handle + Header */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            flexShrink: 0,
            touchAction: "none",
            cursor: "grab",
          }}
        >
          {/* Handle */}
          {showHandle && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: 10,
                paddingBottom: 6,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: t.border.default,
                }}
              />
            </div>
          )}

          {/* Titre + Close */}
          {title && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `8px ${t.space.md} 12px`,
                borderBottom: `1px solid ${t.border.subtle}`,
              }}
            >
              <h3
                style={{
                  fontSize: t.font.size.md,
                  fontWeight: 700,
                  color: t.text.primary,
                  margin: 0,
                }}
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: t.radius.sm,
                  color: t.text.secondary,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Contenu scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: t.space.md,
          }}
        >
          {children}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes bs-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bs-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes bs-fade-in { from { opacity: 1; } to { opacity: 1; } }
          @keyframes bs-slide-up { from { transform: translateY(0); } to { transform: translateY(0); } }
        }
      `}</style>
    </>
  );
}

export default BottomSheet;