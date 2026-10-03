// src/components/messagerie/ChatInput.jsx
import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Paperclip, Send, X, Loader } from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA helpers
// ════════════════════════════════════════════════════════════════════
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const ChatInputKeyframes = (
  <style>{`
    @keyframes ci-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes ci-fade-in {
      from { opacity: 0; transform: scale(0.96); }
      to   { opacity: 1; transform: scale(1); }
    }
    .ci-spin { animation: ci-spin 0.8s linear infinite; }
    .ci-fade-in { animation: ci-fade-in 0.15s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .ci-spin, .ci-fade-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// TOKENS
// ════════════════════════════════════════════════════════════════════
function buildTokens(dark) {
  return {
    surface: dark ? "#1E293B" : "#FFFFFF",
    surfaceHover: dark ? "#26334D" : "#F8FAFC",
    inputBg: dark ? "#0F172A" : "#F1F5F9",
    inputBorder: dark ? "#334155" : "#E2E8F0",
    inputText: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryHover: dark ? "#6366F1" : "#4338CA",
    primarySoft: dark ? "#312E81" : "#EEF2FF",
    primarySoftText: dark ? "#C7D2FE" : "#4F46E5",
    ghostHover: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    ghostActive: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    disabledBg: dark ? "#334155" : "#E2E8F0",
    disabledText: dark ? "#64748B" : "#94A3B8",
    danger: dark ? "#F87171" : "#EF4444",
    dangerSoft: dark ? "#7F1D1D" : "#FEE2E2",
    border: dark ? "#334155" : "#E2E8F0",
  };
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

/**
 * Bouton icône rond — ✨ feedback tap + hover + focus
 */
function CircleIconButton({
  icon,
  label,
  onClick,
  tokens,
  disabled = false,
  variant = "ghost",
  size = 44,
}) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  let bg;
  let color;

  if (disabled) {
    // ✨ Send désactivé : fond gris (au lieu de transparent)
    bg = variant === "primary" ? tokens.disabledBg : "transparent";
    color = tokens.disabledText;
  } else if (variant === "primary") {
    bg = pressed
      ? `linear-gradient(135deg, ${tokens.primaryHover}, ${tokens.primary})`
      : hovered
      ? `linear-gradient(135deg, ${tokens.primaryHover}, ${tokens.primary})`
      : `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryHover})`;
    color = "#FFFFFF";
  } else {
    bg = pressed
      ? tokens.ghostActive
      : hovered
      ? tokens.ghostHover
      : "transparent";
    color = tokens.textMuted;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        background: bg,
        border: "none",
        borderRadius: "50%",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        color,
        flexShrink: 0,
        transition:
          "background 0.12s ease, transform 0.1s ease, box-shadow 0.15s ease, opacity 0.15s ease",
        transform: pressed && !disabled ? "scale(0.92)" : "scale(1)",
        boxShadow:
          variant === "primary" && !disabled && !pressed
            ? "0 4px 12px rgba(79,70,229,0.25)"
            : "none",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
        opacity: disabled ? 0.75 : 1,
        padding: 0,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

/**
 * Chip d'une pièce jointe en attente
 * ✨ Bouton X plus gros sur mobile (tap target)
 */
function AttachmentChip({ attachment, onRemove, tokens, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const removeSize = isMobile ? 28 : 22;

  return (
    <span
      className="ci-fade-in"
      style={{
        background: tokens.primarySoft,
        color: tokens.primarySoftText,
        padding: isMobile ? "4px 6px 4px 12px" : "4px 4px 4px 10px",
        borderRadius: 14,
        fontSize: isMobile ? 12.5 : 11.5,
        display: "inline-flex",
        alignItems: "center",
        gap: isMobile ? 8 : 6,
        maxWidth: "100%",
        minWidth: 0,
        minHeight: isMobile ? 36 : 28,
        boxSizing: "border-box",
      }}
    >
      <Paperclip size={isMobile ? 13 : 12} style={{ flexShrink: 0 }} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
          maxWidth: isMobile ? 160 : 140,
        }}
        title={attachment.nom}
      >
        {attachment.nom}
      </span>
      <button
        type="button"
        onClick={onRemove}
        onMouseEnter={() => !isMobile && setHovered(true)}
        onMouseLeave={() => !isMobile && setHovered(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onTouchCancel={() => setPressed(false)}
        style={{
          background: pressed
            ? "rgba(0,0,0,0.15)"
            : hovered
            ? "rgba(0,0,0,0.1)"
            : "rgba(0,0,0,0.06)",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          color: "inherit",
          width: removeSize,
          height: removeSize,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.12s ease, transform 0.1s ease",
          transform: pressed ? "scale(0.85)" : "scale(1)",
          flexShrink: 0,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
        aria-label={`Retirer ${attachment.nom}`}
        title={`Retirer ${attachment.nom}`}
      >
        <X size={isMobile ? 14 : 12} />
      </button>
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function ChatInput({
  message,
  setMessage,
  onSend,
  fileInputRef,
  piecesJointes,
  setPiecesJointes,
  handleFileChange,
  placeholder = "Écrivez un message...",
  isUploading = false,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const textareaRef = useRef(null);
  const [textareaFocused, setTextareaFocused] = useState(false);

  const hasAttachments = piecesJointes?.length > 0;
  const hasText = Boolean(message?.trim());
  const disabled = !hasText && !hasAttachments;

  const buttonSize = isMobile ? 44 : 40;
  const inputFontSize = isMobile ? 16 : 14; // 16px évite le zoom iOS

  // ════════════════════════════════════════════════════════════════════
  // ✨ AUTO-RESIZE du textarea — RÉELLEMENT IMPLÉMENTÉ
  // Grandit jusqu'à ~5 lignes (maxHeight: 120px), puis scroll interne
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    // Reset puis mesure
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${nextHeight}px`;
  }, [message]);

  // ════════════════════════════════════════════════════════════════════
  // ✨ Scroll dans la vue au focus (attend l'ouverture du clavier mobile)
  // Utilise visualViewport si dispo pour attendre la vraie taille dispo
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!textareaFocused) return;
    const el = textareaRef.current;
    if (!el) return;

    const scrollIntoViewSafely = () => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    // Fallback timeout
    const timeoutId = setTimeout(scrollIntoViewSafely, 250);

    // Sur mobile, attendre que le clavier ait fini de s'ouvrir
    if (isMobile && typeof window !== "undefined" && window.visualViewport) {
      const vv = window.visualViewport;
      const handler = () => scrollIntoViewSafely();
      vv.addEventListener("resize", handler, { once: true });
      return () => {
        clearTimeout(timeoutId);
        vv.removeEventListener("resize", handler);
      };
    }

    return () => clearTimeout(timeoutId);
  }, [textareaFocused, isMobile]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleKeyDown = useCallback(
    (e) => {
      // ✨ Enter → envoyer (desktop ET mobile)
      // Sur mobile, le clavier affiche "Envoyer" (enterKeyHint="send")
      // donc l'utilisateur s'attend à ce que ça envoie le message.
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled) onSend();
        return;
      }
      // Escape → retirer le focus sans vider
      if (e.key === "Escape" && message?.trim()) {
        textareaRef.current?.blur();
      }
    },
    [disabled, onSend, message]
  );

  const handleRemoveAttachment = useCallback(
    (idx) => {
      setPiecesJointes((prev) => prev.filter((_, i) => i !== idx));
    },
    [setPiecesJointes]
  );

  const handleSendClick = useCallback(() => {
    if (disabled) return;
    onSend();
    if (!isMobile) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [disabled, onSend, isMobile]);

  const handleAttachClick = useCallback(() => {
    if (isUploading) return;
    fileInputRef?.current?.click();
  }, [isUploading, fileInputRef]);

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {ChatInputKeyframes}
      <div
        style={{
          padding: isMobile
            ? `8px calc(12px + ${SAFE_LEFT}) calc(8px + ${SAFE_BOTTOM}) calc(12px + ${SAFE_RIGHT})`
            : "10px 16px",
          borderTop: `1px solid ${tokens.border}`,
          background: tokens.surface,
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        {/* ═══ Bouton pièce jointe ═══ */}
        {fileInputRef && (
          <>
            <CircleIconButton
              icon={
                isUploading ? (
                  <Loader size={18} className="ci-spin" />
                ) : (
                  <Paperclip size={isMobile ? 20 : 19} />
                )
              }
              label={isUploading ? "Upload en cours…" : "Joindre un fichier"}
              onClick={handleAttachClick}
              tokens={tokens}
              disabled={isUploading}
              size={buttonSize}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              aria-hidden="true"
            />
          </>
        )}

        {/* ═══ Conteneur input ═══ */}
        <div
          style={{
            flex: 1,
            background: tokens.inputBg,
            border: `1.5px solid ${
              textareaFocused ? tokens.primary : tokens.inputBorder
            }`,
            borderRadius: 22,
            padding: isMobile ? "8px 14px" : "8px 16px",
            minWidth: 0,
            transition: "border-color 0.15s ease",
            // ✨ empêche le conteneur de "bouncer" quand il y a des chips
            overscrollBehavior: "none",
          }}
        >
          {/* Pièces jointes en attente */}
          {hasAttachments && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 6,
                flexWrap: "wrap",
                // ✨ pas de scroll parasite
                overscrollBehavior: "contain",
              }}
            >
              {piecesJointes.map((pj, idx) => (
                <AttachmentChip
                  key={`${pj.storageId || pj.url || pj.nom}-${idx}`}
                  attachment={pj}
                  onRemove={() => handleRemoveAttachment(idx)}
                  tokens={tokens}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )}

          {/* Textarea auto-resize */}
          <textarea
            ref={textareaRef}
            rows={1}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: inputFontSize,
              width: "100%",
              color: tokens.inputText,
              resize: "none",
              fontFamily: "inherit",
              lineHeight: 1.4,
              maxHeight: 120,
              boxSizing: "border-box",
              padding: 0,
              minHeight: 22,
              // ✨ Mobile : évite zoom + tap delay
              WebkitAppearance: "none",
              touchAction: "manipulation",
            }}
            placeholder={placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setTextareaFocused(true)}
            onBlur={() => setTextareaFocused(false)}
            aria-label={placeholder}
            // ✨ Mobile : clavier "Envoyer" au lieu de "Retour"
            enterKeyHint={isMobile ? "send" : "enter"}
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck="true"
          />
        </div>

        {/* ═══ Bouton envoyer ═══ */}
        <CircleIconButton
          icon={
            isUploading ? (
              <Loader size={isMobile ? 18 : 17} className="ci-spin" />
            ) : (
              <Send size={isMobile ? 19 : 18} />
            )
          }
          label="Envoyer le message"
          onClick={handleSendClick}
          tokens={tokens}
          disabled={disabled || isUploading}
          variant="primary"
          size={buttonSize}
        />
      </div>
    </>
  );
}